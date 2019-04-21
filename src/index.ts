import * as Three from "three";
import { subscribeToAnimationLoop, scene } from "./general";

const light = new Three.PointLight(0xFFFFFF);
light.position.set(0, 30, 0);
scene.add(light);

const ballGeometry = new Three.SphereGeometry();
const material = new Three.MeshPhongMaterial({ color: 0x00FFFF });
const ball = new Three.Mesh(ballGeometry, material);
scene.add(ball);

subscribeToAnimationLoop(() => {
  ball.position.setX(ball.position.x + 0.01);
});