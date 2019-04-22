import { Object3D, Vector3, MeshBasicMaterial, Mesh, SphereGeometry } from "three";
import { Fluid } from "./Fluid";
import { subscribeToAnimationLoop } from "../general";

export type Particles = Array<Particle>;

export class Particle extends Object3D {

  // Physical properties
  static readonly VISCOSITY_COEFFICIENT: number = 5; // µ
  static readonly DENSITY_COEFFICIENT /*aka stiffness*/: number = 10; // k
  static readonly BASE_DENSITY: number = 998; // ρ_0
  static readonly SMOOTHING_RADIUS: number = 16; // h

  // Mathematical shortcuts
  static readonly SPH_DENSITY_COEFFICIENT: number = 315 / (64 * Math.PI * Particle.SMOOTHING_RADIUS ** 9);
  static readonly SPH_PRESSURE_GRADIENT_COEFFICIENT: number = -45 / (Math.PI * Particle.SMOOTHING_RADIUS ** 6);
  static readonly SPH_VISCOSITY_COEFFICIENT: number = - Particle.SPH_PRESSURE_GRADIENT_COEFFICIENT;

  // Drawing matters
  static readonly PARTICLE_RADIUS: number = Particle.SMOOTHING_RADIUS / 2;
  static readonly GEOMETRY = new SphereGeometry(Particle.PARTICLE_RADIUS * 0.3);
  static readonly MATERIAL = new MeshBasicMaterial({color: 0x2FA1D6, opacity: 0.5, transparent: true});
  static readonly MESH = new Mesh(Particle.GEOMETRY, Particle.MATERIAL);

  fluid: Fluid = undefined;
  mass: number = 500 * .13;
  velocity: Vector3 = new Vector3();

  constructor(fluid: Fluid) {
    super();
    this.fluid = fluid;
    this.add(Particle.MESH.clone());
    subscribeToAnimationLoop((at, td) => { this.step(at, td) });
  }

  withinSmoothingRadius(position: Vector3): boolean {
    return this.distanceTo(position) < Particle.SMOOTHING_RADIUS;
  }

  getNeighborhood(): Particles {
    return this.fluid.getNeighborhoodFor(this);
  }

  distanceTo(position: Vector3): number {
    const distance = this.position.clone().sub(position).length();
    return distance;
  }

  getDensity(): number {
    const neighborhood = this.getNeighborhood();
    neighborhood.push(this);
    const density = neighborhood.reduce(
      (accumulated, current) => {
        const distance = this.distanceTo(current.position);
        const mass = current.mass;
        const contribution = Particle.SPH_DENSITY_COEFFICIENT * mass * (Particle.SMOOTHING_RADIUS ** 2 - distance ** 2) ** 3;
        return accumulated + contribution;
      },
      0
    );
    return density;
  }

  getPressure(): number {
    const pressure = Particle.DENSITY_COEFFICIENT * (this.getDensity() - Particle.BASE_DENSITY);
    return pressure;
  }

  getExternalForceTerm(): Vector3 {
    // Gravity for now
    return new Vector3(0, -120000 * 9.82 * this.getDensity(), 0);
  }

  getPressureGradientTerm(): Vector3 {
    return this.getNeighborhood().reduce(
      (accumulated, current) => {
        const distance = this.distanceTo(current.position);
        const mass = current.mass;
        const pressureFactor = this.getPressure() / this.getDensity() ** 2 + current.getPressure() / current.getDensity() ** 2;
        const smoothingRadiusDistanceFactor = (Particle.SMOOTHING_RADIUS - distance) ** 2;
        const normalizedPositionDifference = current.position.clone().sub(this.position).normalize();
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
        const distance = this.distanceTo(current.position);
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
    // TODO: Implement boundary conditions
    const newVelocity = this.velocity.clone().add(this.getAcceleration().multiplyScalar(0.006));
    const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(0.006));
    // Temporary floor boundary condition
    if (newPosition.y < -10) {
      newVelocity.multiplyScalar(-0.8);
    }
    this.velocity.copy(newVelocity);
    this.position.copy(newPosition);
  }
}