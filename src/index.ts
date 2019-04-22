import "./SPH/Particle";

import { scene } from "./general";
import { Fluid } from "./SPH/Fluid";

const fluid = new Fluid();
scene.add(fluid);