import * as $ from "jquery";
import * as Three from "three";
import * as OrbitControls from "three-orbitcontrols";

interface AnimationLoopSubscriber {
  (absoluteAccumulatedTime: number, timeDifference: number): any;
}

enum AnimationState {
  Animating,
  Paused,
  Step,
}

const { width, height } = getWidthAndHeight();
const ratio = width / height;

let renderer: Three.WebGLRenderer = new Three.WebGLRenderer();
let scene: Three.Scene = new Three.Scene();
let camera = new Three.PerspectiveCamera(17, ratio, 0.1, 10000);
let absoluteAnimatedTime: number = 0;
let absolutePausedTime: number = 0;

let animationState = AnimationState.Animating;

let subscribers: AnimationLoopSubscriber[] = [];

$(function () {
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls( camera );
  controls.update();

  updateViewport();
  $("#canvas-container").append(renderer.domElement);
  renderer.setAnimationLoop(animationLoop);

  $(window).keypress((event) => {
    if (event.key == "n") {
      animationState = AnimationState.Step;
    }
    else if (event.key == "r") {
      animationState = AnimationState.Animating;
    }
    else if (event.key == "p") {
      animationState = AnimationState.Paused;
    }
  });
});

function animationLoop(accumulatedTime) {
  const timeDifference = accumulatedTime - (absoluteAnimatedTime + absolutePausedTime);
  if (animationState == AnimationState.Paused) {
    absolutePausedTime += timeDifference;
  }
  else {
    for (let f of subscribers) {
      f(absoluteAnimatedTime, timeDifference);
    }
    absoluteAnimatedTime += timeDifference;
    if (animationState == AnimationState.Step) {
      animationState = AnimationState.Paused;
    }
  }
  renderer.render(scene, camera);
}

function getWidthAndHeight() {
  const width = $("#canvas-container").width();
  const height = $("#canvas-container").height();
  return { width, height };
}

function updateViewport() {
  // A trial-and-error-deduced multiplier to achieve a FOV for an average user in front of a computer screen
  const ANGLE_MULTIPLIER = 2.25E-2;
  const { width, height } = getWidthAndHeight();
  const fov = height * ANGLE_MULTIPLIER;
  camera.aspect = width / height;
  camera.fov = fov;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

$(window).on(
  "resize",
  updateViewport
);

function subscribeToAnimationLoop(listener: AnimationLoopSubscriber) {
  subscribers.push(listener);
}

function unsubscribeFromAnimationLoop(listener: AnimationLoopSubscriber) {
  const subscriberIndex = subscribers.indexOf(listener);
  if (subscriberIndex != -1) {
    subscribers.splice(subscriberIndex, 1);
  }
}

export { renderer, camera, scene, subscribeToAnimationLoop, unsubscribeFromAnimationLoop };