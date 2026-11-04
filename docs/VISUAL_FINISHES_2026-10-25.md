# Architectural finish refinement — October 25, 2026

Baseline: `781c83c610ece43c7cd11d603e03ac860766ba9b`.

Jeremy requested the best possible appearance while explicitly protecting the working camera.
This pass improves the existing architectural finishes. It adds no new pieces or rendering framework.

## Changes

- Marble has fine, low-contrast mineral veins and shallow relief instead of heavy, raised-looking contours.
- Stone, sandstone, limestone, travertine, granite, masonry, timber and metals retain all fourteen existing material choices, with restrained mineral variation and normalized roughness maps.
- Texture scale follows local piece dimensions: one tile spans approximately 2.4 scene units. Small trim and masonry blocks no longer each stretch an entire texture tile over their face. Curved primitives retain their original continuous UV layout, scaled to their dimensions.
- Roof cornices, roof surfaces, Gothic ribs, tapered temple walls, window casings, door surrounds and portico columns use the chosen building finish. Timber and bronze doors use the corresponding textured surface.
- UV preparation runs once per cached geometry. Shell merging retains its prepared UVs. Position/normal/index buffers, mesh transforms, attachment tags and saved records are not edited by surface preparation.
- Shared maps remain 256 × 256 pixels with three maps per material. Their existing last-preview disposal lifecycle is preserved. No downloaded texture packs, extra post-processing passes, animation loop or dependency upgrade was introduced.
- Placed and automatic boulders gain muted mineral mottling. Grass gains shaded stems and lighter tips. Both use small vertex-color attributes on the existing geometry, with unchanged positions, instance layouts and drawing counts. Trees and their small numerous leaves are untouched.
- Browser QA allows 90 seconds for screenshots because software-rendered baseline captures exceeded the former 30-second limit. This affects QA only.

## Camera protection

`docs/CAMERA_LOCK_2026-10-25.json` records SHA-256 fingerprints of the approved camera controller and preview regions containing the mounted renderer/gesture/canvas-sizing path and the framing/focus/selection path. `npm test` checks those exact bytes.

The camera controller, centering, orbit, pan, pinch, view presets, projection, UI reserve measurements and canvas sizing were not changed. Lighting, scenery placement, tree geometry, the small numerous leaves, menus and persistence code were also not changed.

## Verification

- Production build and TypeScript checks pass.
- All 51 automated checks pass, including the existing 44 checks for gestures, ownership-related geometry, trees, terrain and water.
- Seven new checks cover compact shared material maps/color spaces/cleanup, controlled marble relief, UV-only changes with preserved buffers and tags, shell batching with curved UVs, protected camera source fingerprints, deterministic boulder colors with unchanged seams/bounds, and grass gradients with unchanged blade geometry.
- `scripts/verify-appearance.cjs` captures the six templates from fresh browser contexts. With `QA_COMPARE`, it compares the approved baseline's camera state, per-mesh vertex/index counts, local transforms, coordinate sums and selectable tags against the updated build. All six template comparisons pass.
- Visual inspection compares the actual rendered baseline and updated templates, including marble columns/roof finishes and sandstone/stone temple surfaces. Portrait capture is included alongside desktop views.
- All fourteen finishes render without JavaScript/WebGL errors. The six template comparisons retain their original vertex and draw-call counts; compact additional door maps share the existing map cache.
- The unchanged camera browser suite passes touch-pinch cycles, Center, selection, whole-stack movement, portrait/landscape and pixel densities 1, 1.25, 2 and 3 in both quality modes.
- The final production build passes the builder browser suite: foundation placement, deliberate movement without mesh rebuilding, orbit/pinch isolation, owned stacked levels, selection without reframing, view presets, JSON/PNG export, save/reload, all six templates and the complete attachment fixture (roofs, stairs, walls, columns, doors, windows, arches, trim and pediments). No JavaScript/WebGL errors are reported.

Reproduce after `npm run build`:

```sh
npm test
npm run typecheck
QA_OUTPUT=/tmp/appearance-before npm run verify:appearance
# Run the changed build separately, with the baseline result available:
QA_OUTPUT=/tmp/appearance-after QA_COMPARE=/tmp/appearance-before/result.json npm run verify:appearance
```

Playwright and a WebGL-capable Chromium executable are QA prerequisites. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` for another installation.

## Limits

These remain compact procedural surfaces, not photogrammetry or scanned PBR assets. Existing architecture/style approximations and all earlier audit findings remain outside this finish pass. Browser QA uses software WebGL; actual Android/iPhone frame rate, thermal behavior and appearance on different displays remain untested. The highest-detail templates already contain many selectable meshes, so this pass does not claim to solve their draw-call cost.
