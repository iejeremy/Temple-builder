# Phone canvas display-size correction — October 24, 2026

Baseline: `388732b`. The user confirmed that the view stayed off-center immediately after tapping Center, and supplied `1000000127.png`.

## Confirmed cause outside the camera controller

`Temple3DPreview.tsx` sets a rendering pixel ratio of up to 1.5 in Balanced mode and up to 2 in Fine detail. Its resize callback then called `renderer.setSize(w,h,false)`. Three.js r186 updates the canvas backing-buffer width/height, but the false argument prevents it from assigning a CSS width/height. No other stylesheet constrained this canvas. Its intrinsic buffer size therefore became its displayed size.

At browser device scale factor 2, the baseline produced:

- Host and camera viewport: **360 × 669 CSS px**.
- Canvas backing buffer: **540 × 1003 physical px**.
- Incorrect displayed canvas: **540 × 1003 CSS px**.
- Structural camera focus: correct; pan: zero. The display-size assertion still failed.

The camera was centering in an oversized image that the visible page clipped on the right and bottom. Replacing the camera controller alone could not correct that display path.

## Minimal correction

Use `renderer.setSize(w,h)` so Three.js assigns the intended logical CSS dimensions while keeping the higher-resolution backing buffer. Pixel-ratio changes preserve those CSS dimensions. No new camera controller, changed target math, saved-data migration, geometry changes or removed builder pieces are involved.

## Verification and corrected test coverage

- Production build, TypeScript and all 44 automated checks pass.
- The old build fails the real canvas-versus-host DOM rectangle assertion at phone DPR 2, with the dimensions above.
- Camera browser checks now project into the canvas's actual displayed rectangle and explicitly compare that rectangle with its host. The previous checks projected only into the host and defaulted to DPR 1; they did not detect this defect.
- The two-level moved rectangle/circle case passes at DPR 2, including Center after pan, repeated touch orbit, placement, movement, saved state and portrait/landscape.
- DPR **1, 1.25, 2 and 3** pass both Balanced/Fine detail and portrait/landscape checks. Buffer dimensions follow the rendering quality cap; displayed dimensions remain exactly equal to the host. The displayed midpoint matches the unobstructed viewport midpoint.
- The complete studio browser check now defaults to DPR 2. All six templates, levels and ownership, wall/column/door/window/stair/roof/detail meshes, movement, save/reload and exports pass without JavaScript/WebGL console errors.

These are browser tests using a software GPU and emulated device densities/touches. They do not measure the user's physical phone's frame rate, battery use or thermal behavior. The broader repository audit is recorded separately.
