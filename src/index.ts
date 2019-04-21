import "./SPH/Particle";

import * as Three from "three";
import { scene } from "./general";

const ballGeometry = new Three.SphereGeometry();
const material = new Three.MeshBasicMaterial({ color: 0xFFFFFF, opacity: 0.5 });
const ball = new Three.Mesh(ballGeometry, material);
scene.add(ball);