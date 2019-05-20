import { Object3D, Vector3, MeshBasicMaterial, Mesh, SphereGeometry } from "three";
import { Fluid } from "./Fluid";

export type Particles = Array<Particle>;

export class Particle extends Object3D {

  // Physical properties
  static readonly VISCOSITY_COEFFICIENT: number = 0.5; // µ
  static readonly DENSITY_COEFFICIENT /*aka stiffness*/: number = 10; // k
  static readonly BASE_DENSITY: number = 0.2; // ρ_0
  static readonly SMOOTHING_RADIUS: number = 1.5; // h
  static readonly MAXIMUM_SPEED: number = 9;

  // Mathematical shortcuts
  static readonly SPH_DENSITY_COEFFICIENT: number = 315 / (64 * Math.PI * Particle.SMOOTHING_RADIUS ** 9);
  static readonly SPH_PRESSURE_GRADIENT_COEFFICIENT: number = -45 / (Math.PI * Particle.SMOOTHING_RADIUS ** 6);
  static readonly SPH_VISCOSITY_COEFFICIENT: number = - Particle.SPH_PRESSURE_GRADIENT_COEFFICIENT;

  // Drawing matters
  static readonly PARTICLE_RADIUS: number = 1;
  static readonly GEOMETRY = new SphereGeometry(Particle.PARTICLE_RADIUS * 0.3);
  static readonly MATERIAL = new MeshBasicMaterial({ color: 0x2FA1D6, opacity: 0.8, transparent: true });
  static readonly MESH = new Mesh(Particle.GEOMETRY, Particle.MATERIAL);

  fluid: Fluid = undefined;
  mass: number = 0.5;
  velocity: Vector3 = new Vector3();
  shadowPosition: Vector3 = new Vector3();

  private cachedNeighborhood: Particles = undefined;
  private cachedDensity: number = undefined;

  constructor(fluid: Fluid) {
    super();
    this.fluid = fluid;
    this.add(Particle.MESH.clone());
  }

  withinSmoothingRadius(position: Vector3): boolean {
    return this.distanceTo(position) < Particle.SMOOTHING_RADIUS;
  }

  clearCaches() {
    // Stale caches
    this.cachedNeighborhood = undefined;
    this.cachedDensity = undefined;
  }

  getVoxelIndices(): Vector3 {
    const vel = Fluid.VOXEL_EDGE_LENGTH;
    const vi = this.shadowPosition.clone();
    const x = Math.floor(vi.x / vel);
    const y = Math.floor(vi.y / vel);
    const z = Math.floor(vi.z / vel);
    vi.set(x, y, z);
    return vi;
  }

  getVoxelSignature(): string {
    return this.getVoxelIndices().toArray().toString();
  }

  getNeighborhoodVoxelSignatures(): Array<string> {
    const voxelSignatures = [];
    const voxelIndices = this.getVoxelIndices();
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        for (let k = -1; k < 2; k++) {
          const x = voxelIndices.x + i;
          const y = voxelIndices.y + j;
          const z = voxelIndices.z + k;
          const voxelSignature = new Vector3(x, y, z).toArray().toString();
          voxelSignatures.push(voxelSignature);
        }
      }
    }
    return voxelSignatures;
  }

  getNeighborhood(): Particles {
    if (!this.cachedNeighborhood) {
      this.cachedNeighborhood = this.fluid.getNeighborhoodFor(this);
    }
    return this.cachedNeighborhood as Particles;
  }

  distanceTo(position: Vector3): number {
    const distance = this.shadowPosition.clone().sub(position).length();
    return distance;
  }

  getDensity(): number {
    if (!this.cachedDensity) {
      const neighborhood = this.getNeighborhood().concat(this);
      this.cachedDensity = neighborhood.reduce(
        (accumulated, current) => {
          const distance = this.distanceTo(current.shadowPosition);
          const mass = current.mass;
          const contribution = Particle.SPH_DENSITY_COEFFICIENT * mass * (Particle.SMOOTHING_RADIUS ** 2 - distance ** 2) ** 3;
          return accumulated + contribution;
        },
        0
      );
    }
    return this.cachedDensity;
  }

  getPressure(): number {
    const pressure = Particle.DENSITY_COEFFICIENT * (this.getDensity() - Particle.BASE_DENSITY);
    return pressure;
  }

  getExternalForceTerm(): Vector3 {
    return new Vector3(0, -9.82, 0);
  }

  getPressureGradientTerm(): Vector3 {
    return this.getNeighborhood().reduce(
      (accumulated, current) => {
        const distance = this.distanceTo(current.shadowPosition);
        const mass = current.mass;
        const pressureFactor = this.getPressure() / this.getDensity() ** 2 + current.getPressure() / current.getDensity() ** 2;
        const smoothingRadiusDistanceFactor = (Particle.SMOOTHING_RADIUS - distance) ** 2;
        const normalizedPositionDifference = current.shadowPosition.clone().sub(this.shadowPosition).normalize();
        const contributionScale = mass * pressureFactor * Particle.SPH_PRESSURE_GRADIENT_COEFFICIENT * smoothingRadiusDistanceFactor;
        const contribution = normalizedPositionDifference.multiplyScalar(contributionScale);
        return accumulated.add(contribution);
      },
      new Vector3()
    );
  }

  getViscousTerm(): Vector3 {
    const viscousTerm = this.getNeighborhood().reduce(
      (accumulated, current) => {
        const distance = this.distanceTo(current.shadowPosition);
        const mass = current.mass;
        const smoothingRadiusDistanceFactor = Particle.SMOOTHING_RADIUS - distance;
        const currentDensity = current.getDensity();
        const velocityDifference = current.velocity.clone().sub(this.velocity);
        const contributionScale = mass / currentDensity * Particle.SPH_VISCOSITY_COEFFICIENT * smoothingRadiusDistanceFactor;
        const contribution = velocityDifference.multiplyScalar(contributionScale);
        return accumulated.add(contribution);
      },
      new Vector3()
    );
    viscousTerm.multiplyScalar(Particle.VISCOSITY_COEFFICIENT / this.getDensity());
    return viscousTerm;
  }

  getAcceleration(): Vector3 {
    const acceleration = new Vector3();
    const externalForceTerm = this.getExternalForceTerm();
    const pressureGradientTerm = this.getPressureGradientTerm();
    const viscousTerm = this.getViscousTerm();
    acceleration.add(externalForceTerm);
    acceleration.sub(pressureGradientTerm);
    acceleration.add(viscousTerm);
    return acceleration;
  }

  step(absoluteAccumulatedTime: number, timeDifference: number) {
    // Velocity
    const newVelocity = this.velocity.clone().add(this.getAcceleration().multiplyScalar(0.005));

    // Speed limit
    const speed = newVelocity.length();
    if (speed > Particle.MAXIMUM_SPEED) {
      const multiplier = Particle.MAXIMUM_SPEED / speed;
      newVelocity.multiplyScalar(multiplier);
    }

    // Position
    const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(0.005));

    // Boundary conditions
    const xCondition = newPosition.x < -50 || newPosition.x > 55;
    if (xCondition) {
      newVelocity.setX(-1 * newVelocity.x);
    }
    const yCondition = newPosition.y < -10;
    if (yCondition) {
      newVelocity.setY(-0.6 * newVelocity.y);
    }
    const zCondition = newPosition.z < 0 || newPosition.z > 5;
    if (zCondition) {
      newVelocity.setZ(-1 * newVelocity.z);
    }

    // Numerical integration
    this.velocity.copy(newVelocity);
    if (!(xCondition || yCondition || zCondition)) {
      this.position.copy(newPosition);
    }
  }
}