# Natural lighting and ground — October 24, 2026

Baseline: `a8199b0`. First step of the agreed realism plan: improve lighting and ground materials while preserving the approved fine leaves and builder behavior.

## Changes

- Replace the indoor RoomEnvironment reflections with a small procedural outdoor sky/ground radiance map. Cache the generated reflection target per theme and dispose it on teardown. Garden, Desert and Twilight retain their theme choices.
- Balance direct sunlight, sky fill, exposure and reflected light to retain detail on bright stone and in architectural recesses. Twilight remains warm and readable for editing.
- Add blended grass, earth, dry grass and gravel colors, plus separate fine bump and roughness textures. The flat building surface, distant ridge geometry and their shared world-space UV alignment remain unchanged. Color maps use sRGB; surface data remains in linear/non-color space. These are improved procedural materials, not photographic/scanned asset sets.
- Add soft contact marks beneath environmental trees and boulders, in two instanced draws. They stay outside editable geometry and camera-fit bounds. Tree contact marks follow tree visibility in Desert. Shadows update with the existing environment layout and do not introduce a continuous animation loop.
- Keep the existing 1024px sun shadow map and pixel-ratio limits. No new external assets, dependencies or network downloads. Reflection maps and ground textures are small and cached; shared ground textures and contact maps have explicit disposal.

The foliage source, camera controller, UI, saved-data format, building geometry, levels and attachments are unchanged. The existing selection/movement handlers are unchanged. The approved studio checkpoint remains available.

## Verification

- `npm test`: 30 checks, including the existing fine-leaf size/count/triangle-budget safeguards and camera/gesture/selection/geometry checks. New tests cover bounded deterministic ground variation, texture color spaces, cached texture reuse/disposal, outdoor reflection orientation, finite radiance and soft contact-map edges.
- Production build and TypeScript checks pass in an isolated temporary copy of the repository.
- `scripts/verify-lighting-ground.cjs`: the same six-level Temple of Unity design rendered before and after the change; Garden/Desert/Twilight switching preserves saved levels exactly; portrait and landscape views render; no JavaScript/WebGL console errors. Matching screenshots were captured and reviewed.
- Physical Android/iPhone frame rate, battery use and thermal behavior remain untested. The browser checks use reduced motion and a software WebGL renderer; they are not a physical-phone performance measurement.

Further realism work remains separate: photographic material assets, water depth/flow and shoreline refinement, richer ecological placement and architectural weathering. This change does not claim those later steps are complete.
