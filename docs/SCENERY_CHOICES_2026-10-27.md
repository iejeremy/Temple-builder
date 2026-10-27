# Six scenery choices — October 27, 2026

Request: let people choose different sceneries. Baseline: `e0f3fb7` (including the scanned Stone finish and optional diagnostics).

## Choices

| Saved ID | Choice | Environment |
| --- | --- | --- |
| garden | Garden | Existing green woodland, streams and gentle hills |
| desert | Desert | Existing warm ground and dry landscape |
| twilight | Twilight | Existing evening sky and lighting |
| autumn | Autumn Forest | Amber broadleaf foliage, warm soil and woodland light |
| alpine | Alpine Meadow | Mostly pine groves, cooler meadow colors and higher snowy distant peaks |
| coast | Coast | Pale ground, cypress groves, a feathered sandy shore and open water |

Use **+ Add → Scenery**, then swipe the preview cards. Selection is immediate, reversible, saved with the design and exported through Save copy. Existing scenery placement controls remain below the choices.

## Implementation and preservation

- `sceneryPresets.ts` supplies typed names, colors, lighting, reflection palettes and habitat configuration. Page state, saved-value loading and renderer types accept all six stable IDs. The existing three IDs remain valid.
- Seasonal color and species changes apply to the automatic environment. User-placed trees, scenery, buildings, levels and attachments keep their original saved records, geometry and positions.
- Background species changes keep 54 trees, two meshes per tree and hundreds of small leaves per tree. Replaced automatic tree meshes are disposed. Original leaf colors and instanced layout buffers are restored on returning to Garden.
- Coastal water and its beach sit beyond the complete editable clearing, following moved/enlarged sites. Dry automatic vegetation, rocks and hills that would overlap the sea are hidden only in Coast. Background streams are hidden there; independently placed water pieces remain.
- Alpine snow blends onto elevated distant terrain using world height. Ground under buildings remains flat. Low hills use each setting's ground color instead of retaining green patches in dry/warm themes.
- The flat ground and coastal water extend beyond normal views, avoiding the old visible square edge. Ground UVs retain their original world scale (`x/256 + .5`, `.5 - z/256`), rather than stretching the material.
- The chooser is a touch-scrollable horizontal carousel with named buttons, `aria-pressed` selection and decorative thumbnails hidden from accessibility names. It adds no image/asset downloads or dependency changes.
- Existing camera-controller checksums remain unchanged. The broad frozen preview region now includes exact reversible substitutions for the scenery-setup block and extended ground construction. No orbit, pan, zoom, fit, selection, gesture, sizing or framing logic changes.
- Scanned Stone/KTX2 assets, fallback behavior and optional diagnostics remain present.

## Verification

- 72 automated builder checks pass, including original camera fingerprints, placement gestures, ownership/attachments, fine foliage, water and scanned Stone. Four new tests cover stable IDs, exact Garden restoration, distinct habitats and coastal clearing/culling.
- Production build and TypeScript pass.
- `scripts/verify-scenery-presets.cjs` mounts a complete temple plus a placed tree, then selects every setting. It verifies exact saved-piece data, exact placed geometry, unchanged camera state during each selection, six saved IDs/reload, coastal visibility, all 54 tree slots and the extended terrain. Desktop views and mobile carousel/Coast views are captured; Coast export retains the chosen ID. No JavaScript/WebGL errors.
- Echoes' portable-design boundary accepts and round-trips all six IDs without filtering any pieces; unknown scenery IDs are still rejected. Static studio packaging carries the same renderer and assets to the existing integration preview.

Reproduce: `npm test`, `npm run typecheck`, `npm run build`, then `node scripts/verify-scenery-presets.cjs`. Set `CHROMIUM_PATH` and/or `PLAYWRIGHT_MODULE` for another installed browser/runtime.

## Limits

These are procedural settings. The snow and sea are static surface treatments, with no extra animation loop or postprocessing. Coast adds two decorative meshes when visible; other themes hide them. Species switching rebuilds only automatic tree meshes, without increasing the fixed tree/grass budgets. Lighting/ground maps are cached by the six settings. Physical Android/iPhone frame rate, battery/thermal behavior and display appearance remain untested. Echoes' existing account-backed production-release requirements remain unchanged.
