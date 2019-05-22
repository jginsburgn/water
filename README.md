# Water

[View Live](https://jginsburgn.github.io/water/)

This project is intended to be a fluid simulator based on the Smoothed Particle Hydrodynamics technique.

## How to Run It?

```
npm start
```

## Modify

Change the "Physical properties" of `Particle` class to see new behaviour. Also try updating the boundary conditions in the same class' `step` method.

## Areas of Opportunity

Ideas to make it better (not sequential and possibly exclusive):

1. Use `BufferGeometry` of *Three* and draw using `Points`; this instead of making every particle be an `Object3D` heir.
1. Get rid of *Three* and use vanilla WebGL.
1. Delegate SPH computing to shaders.
1. Explore the possibility of using:

    * WebWorkers
    * [gpu.js](https://github.com/gpujs/gpu.js)
    * WebAssembly

## Contribute

If you want to contribute, you are more than welcome. Please fork and submit a fork request.

## See Also

* [SPH_3D](https://github.com/Hagen23/SPH_3D)

## License

This project is licensed under GNU GPLv3.

## Contributors

* Jonathan Ginsburg <jginsburgn@gmail.com>
* [Sebastian Galgera](https://github.com/legalgui)
* [Ph.D. Octavio Navarro](https://github.com/Hagen23)