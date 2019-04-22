import { Group } from "three";
import { Particle, Particles } from "./Particle";

export class Fluid extends Group {
  particles: Particles = [];

  constructor() {
    super();
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 5; j++) {
        for (let k = 0; k < 10; k++) {
          const p = new Particle(this);
          const x = i * Particle.PARTICLE_RADIUS;
          const y = j * Particle.PARTICLE_RADIUS;
          const z = k * Particle.PARTICLE_RADIUS;
          p.position.set(x, y, z);
          this.particles.push(p);
          this.add(p);
        }
      }
    }
  }

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