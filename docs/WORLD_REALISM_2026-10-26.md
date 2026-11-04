# World realism — October 26, 2026

Request: make the Echoes world look realistic, preserving the approved camera and all builder features. Baseline: `9adb27d`.

## What changed

- The ground combines its existing broad grass/earth/sand variation with a compact, repeating 128 × 128 short-grass/soil detail tile. Matching shallow bump detail provides relief. Color multiplication stays neutral in sand/earth areas, so Desert keeps its warm soil palette. The standard Three.js PBR lighting, shadows, fog, roughness and reflections remain in use.
- Distant terrain has lower irregular slopes and low passes, replacing the coarse, continuous bowl profile. Its inner radius remains 48 scene units; the editable plane and every building's geometry/position stay unchanged. Winding and normals face upward, with matching position and normal values across the circular seam.
- Grass and boulder colors are lighter, making existing blade and mineral detail readable. All 54 fine-leaved trees, 64 background rocks and 5,600 grass instances retain their positions, geometry and instance counts. Placed grass retains its geometry and picking surface.
- Rivers/creeks have subtler shallow-water coloring, less uniform shoreline widths and a third ripple direction. Their existing centerlines, lengths, saved transforms and selectable identities remain. This is static surface detail, with no additional animation loop or rendering passes.
- Grid starts hidden for a clear world view. Its existing button still turns it on/off.

## Camera and preservation

The camera controller and all camera/gesture/framing code remain unchanged. The existing camera source SHA-256 values are retained. The frozen preview region includes scenery setup; the lock now lists exactly two rendering substitutions (terrain material factory and distant-terrain construction), which the test reverses before checking the original checksum. It rejects any other changes to that region. The default grid state and new imports sit outside the protected regions.

No builder pieces, templates, menus, levels, ownership links, save fields or app content were removed. Both the standalone builder and Echoes' vendored copy receive this pass; Echoes' existing draft integration and live-release prerequisites remain separate.

## Verification

- 63 builder checks pass, including camera fingerprints, gestures, placement safeguards, all footprint/trim combinations, tree/grass instance budgets, saved piece geometry, water and resource cleanup.
- Two new checks cover the compact terrain tile/PBR shader integration and finite, upward-facing distant relief with unchanged inner clearance and joined seams.
- TypeScript and production builds pass.
- `scripts/verify-world.cjs` compares all six templates with the baseline: exact architecture mesh geometry/transforms, selection tags and camera state. It captures desktop/portrait views, all three themes, checks the grid toggle and verifies saved-design reload without JavaScript/WebGL errors.
- Echoes integration checks verify the pinned vendor fingerprints, import/export/Undo/storage isolation, companion collections, visitor sessions and unrelated source/assets. The static studio packaging build includes the same updated world.

Reproduce after `npm run build`:

```sh
npm test
npm run typecheck
CHROMIUM_PATH=/path/to/chrome QA_OUTPUT=/tmp/world-after QA_COMPARE=/tmp/world-before/result.json node scripts/verify-world.cjs
```

Generate `world-before/result.json` from a baseline production build with the same script (omit `QA_COMPARE`, set `QA_EXPECT_GRID=true` for the old default). `PLAYWRIGHT_MODULE` selects an installed Playwright module; otherwise QA uses the primary runtime's module.

## Cost and limits

One additional shared 128 × 128 RGBA texture: 64 KiB before mipmaps (about 85 KiB including mipmaps). Distant relief uses 4,257 vertices / 8,192 triangles versus the previous 485 vertices / 768 triangles. It remains one terrain mesh/draw call; no new dependencies, downloaded art, postprocessing, animation loop, tree instances or grass instances.

These are improved procedural surfaces, not scanned photogrammetry or a claim of photorealism. Browser checks use software WebGL; physical Android/iPhone frame rate, battery/thermal behavior and display appearance remain untested. Rivers remain surface ribbons rather than excavated riverbeds. Ground stays flat where the builder places structures.
