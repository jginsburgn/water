import { Group } from "three";
import { Particle, Particles } from "./Particle";

export class Fluid extends Group {
  particles: Particles = [];

  getParticles(): Particles {
    return this.particles;
  }

  getNeighborhoodFor(particle: Particle): Particles {
    // TODO: Do efficient neighborhood search by voxels
    return this.getParticles().reduce(
      (prev, current) => {
        if (particle != current && particle.withinSmoothingRadius(current.position)) {
          prev.push(current);
        }
        return prev;
      },
      []
    );
  }
}