# River and creek refinement — October 24, 2026

Baseline: `e7cd49f`. Next step in the realism plan: improve both automatically generated waterways and individually placed rivers/creeks without changing builder controls or the approved fine foliage.

## Changes

- Share water/bank geometry and materials between the two water systems. Keep placed pieces' established winding centerlines and lengths and retain their existing IDs, positions, rotations, scales and controls.
- Add darker central pool shading, lighter shallows, subtle variation in width and feathered, wet-to-dry bank colors. Bank-edge alpha fades to zero; opaque water remains free of transparency-sorting problems at intersections.
- Use nonmetallic water with a small procedural normal map and outdoor environment reflections. Ripple normal maps are mipmapped to soften distant sampling. The first visual comparison caught excessive ripple banding; normal strength was reduced and distance filtering added before publication.
- Replace the raised rectangular ripple highlights with thin curved surface highlights, instanced per course. Keep the bank stones. Water and bank sheets do not cast artificial ground shadows; other pieces retain their existing shadow behavior.
- The water material owns and disposes its normal map when deleted/rebuilt. Background courses share their material. No asset downloads, new dependencies, shader animation or continuous render loop.

This is static visual depth/ripple shading. It does not carve terrain, simulate fluid flow, introduce physically deep water, or add underwater refraction. Physical phone frame rate, battery use and thermal behavior remain unmeasured.

## Verification

- Production build and TypeScript checks pass in an isolated copy.
- `npm test`: 35 checks, including existing leaf size/count/triangle-budget, camera/gesture/selection, building/perimeter geometry, scenery and lighting checks. New water checks cover preserved paths, finite geometry, upward normals, shallows/pool colors, transparent bank edges, nonmetallic material, normal-map filtering/disposal and flat ripple highlights.
- `scripts/verify-water.cjs`: before/after portrait and landscape screenshots; actual mounted surface and bank material checks; deliberate dragging moves only the grabbed river; saved transforms survive reload; Clear Site/Undo restores water exactly; no JavaScript/WebGL console errors.
- Existing scenery browser checks cover all five scenery additions, rotation/scale/position controls, duplication/deletion, reload and Clear Site/Undo. Environment browser checks cover tree species persistence and Garden/Desert/Twilight behavior.

Camera logic, menus, saved-data format, building pieces, lighting/ground settings and fine-leaf geometry are outside this change. The historical approved studio checkpoint remains available.
