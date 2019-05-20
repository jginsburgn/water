import { Group, Vector3 } from "three";
import { Particle, Particles } from "./Particle";
import { subscribeToAnimationLoop } from "../general";

export type Voxels = { [voxelSignature: string]: Array<Particle> };

export class Fluid extends Group {
  static readonly VOXEL_EDGE_LENGTH: number = 1;

  voxels: Voxels = {};

  constructor() {
    super();
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 25; j++) {
        for (let k = 0; k < 5; k++) {
          const p = new Particle(this);
          const x = i;
          const y = j;
          const z = k;
          p.position.set(x, y, z);
          this.add(p);
        }
      }
    }
    subscribeToAnimationLoop((at, td) => {
      this.step(at, td);
    });
  }

  buildVoxels() {
    this.voxels = {};
    for (let p of this.children) {
      const particle = p as Particle;
      particle.shadowPosition.copy(particle.position);
      particle.clearCaches();
      const voxelSignature = particle.getVoxelSignature();
      if (!this.voxels[voxelSignature]) {
        this.voxels[voxelSignature] = [];
      }
      this.voxels[voxelSignature].push(particle);
    }
  }

  step(absoluteAccumulatedTime: number, timeDifference: number) {
    this.buildVoxels();
    for (let p of this.children) {
      const particle = p as Particle;
      particle.step(absoluteAccumulatedTime, timeDifference);
    }
  }

  getNeighborhoodFor(particle: Particle): Particles {
    const neighborhoodVoxelSignatures = particle.getNeighborhoodVoxelSignatures();
    const neighborhood = [];
    for (let voxelSignature of neighborhoodVoxelSignatures) {
      const voxel = this.voxels[voxelSignature];
      if (!voxel) {
        continue;
      }
      for (let p of voxel) {
        const currentParticle = p as Particle;
        if (currentParticle == particle) {
          continue;
        }
        if (currentParticle.withinSmoothingRadius(currentParticle.shadowPosition)) {
          neighborhood.push(currentParticle);
        }
      }
    }
    return neighborhood;
  }
}