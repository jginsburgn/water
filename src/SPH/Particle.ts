import { Object3D, Vector3 } from "three";
import { Fluid } from "./Fluid";

export type Particles = Array<Particle>;

export class Particle extends Object3D {
  // TODO: Add constructor to create a sphere

  static readonly VISCOSITY_COEFFICIENT: number = 1;
  static readonly DENSITY_COEFFICIENT: number = 1;
  static readonly BASE_DENSITY: number = 1;
  static readonly SMOOTHING_RADIUS: number = 1;
  static readonly SPH_DENSITY_COEFFICIENT: number = 315 / (64 * Math.PI * Particle.SMOOTHING_RADIUS ** 9);
  static readonly SPH_PRESSURE_GRADIENT_COEFFICIENT: number = -45 / (Math.PI * Particle.SMOOTHING_RADIUS ** 6);
  static readonly SPH_VISCOSITY_COEFFICIENT: number = - Particle.SPH_PRESSURE_GRADIENT_COEFFICIENT;

  fluid: Fluid = undefined;
  mass: number = 0;
  velocity: Vector3 = new Vector3();

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
    return this.getNeighborhood().reduce(
      (accumulated, current) => {
        const distance = this.distanceTo(current.position);
        const mass = current.mass;
        const contribution = Particle.SPH_DENSITY_COEFFICIENT * mass * (Particle.SMOOTHING_RADIUS ** 2 - distance ** 2) ** 3;
        return accumulated + contribution;
      },
      0
    );
  }

  getPressure(): number {
    return Particle.DENSITY_COEFFICIENT * (this.getDensity() - Particle.BASE_DENSITY);
  }

  getExternalForce(): Vector3 {
    // Gravity for now
    return new Vector3(0, -9.81, 0);
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
    return this.getNeighborhood().reduce(
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
    ).multiplyScalar(Particle.VISCOSITY_COEFFICIENT / this.getDensity());
  }

  getAcceleration(): Vector3 {
    const acceleration = new Vector3();
    acceleration.add(this.getExternalForce());
    acceleration.sub(this.getPressureGradientTerm());
    acceleration.add(this.getViscousTerm());
    return acceleration;
  }

  step(timeChange: number) {
    // TODO: Implement boundary conditions
    this.velocity.add(this.getAcceleration().multiplyScalar(timeChange));
    this.position.add(this.velocity.clone().multiplyScalar(timeChange));
  }
}