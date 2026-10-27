# Scanned stone, compressed textures and optional diagnostics

Base: `9036681444a4e49f2a0d85709410026ee7eca74e`. The world-realism update is
preserved; the initial template geometry/camera comparison used `9adb27d`.

## Result

The existing Stone finish now uses the CC0 **Stone Wall 02** material from Poly
Haven: photography by Charlotte Baglioni, processing by Dario Barresi. All fourteen
material choices remain available. No new model, category, editor or saved-data
field is added. The stone maps replace surface appearance only; roofs, levels,
walls and interactive attachments retain their existing geometry and picking.

Color, OpenGL normal and roughness maps are 512 x 512 KTX2 textures, each with ten
mip levels. They total **414,397 bytes**. The local Basis decoder adds **584,862
bytes** before HTTP compression (JS + WASM; licenses separate). Decoder and maps
are fetched only when a Stone material is present, use one decoding worker and
are shared by that preview's Stone materials. No third-party server is contacted
by the running builder. A complete successful map set is required before replacing
any procedural maps. A failed load leaves the existing finish usable.

The color map uses sRGB; normal and roughness maps use data color space. Normal
strength is restrained to 0.55, texture anisotropy respects the renderer's limit,
and existing dimension-based UVs are retained. The maps are released on unmount,
including late completions and partial failures. This improves visual detail;
it does **not** claim a measured phone FPS gain. It adds texture allocations over
the small procedural baseline. GPU compression support depends on the device;
Three.js can fall back to an uncompressed target when necessary.

## Diagnostics

Append `?diagnostics=1` to the builder URL for an optional read-only display of
last-frame draw calls/triangles, GPU texture/geometry counts and drawing-buffer
dimensions. It cannot intercept touches and does not schedule rendering, alter
camera state, add scene objects or write saved data. Counters update once per
second and are not an FPS benchmark. Normal visits show no diagnostics UI.

## Preserved behavior

The approved camera controller, setup, gestures, projection, viewport measurements,
framing and selection regions still match the original camera-lock fingerprints.
The lock manifest is unchanged. Explicit Move and pending-floor placement protection
were already implemented in the base and are retained. Existing leaves, trees,
scenery, geometry, building ownership and saved-design handling are preserved.

An engine migration, WebGPU rewrite, additional post-processing and unprofiled
high-resolution models are not part of this change. The briefing did not establish
that they would improve this builder.

## Source and reproduction

- Asset and authors: https://polyhaven.com/a/stone_wall_02
- License: https://polyhaven.com/license
- Three.js loader: https://threejs.org/docs/pages/KTX2Loader.html
- Normal/roughness behavior: https://threejs.org/docs/pages/MeshStandardMaterial.html
- Source and output SHA-256 hashes: `public/materials/stone-wall-02/provenance.json`
- Public credits: `public/ASSET_CREDITS.txt`; Basis Apache and Three.js MIT licenses
  are included beside the decoder.

Source 4K JPG maps were resized to 512 using Pillow Lanczos. The color map's chroma
was reduced to 30% and channel means shifted to [126,122,113], retaining the
existing neutral Stone palette while preserving scanned luminance detail. Resized normal RGB
values were decoded to [-1,1], normalized per pixel and encoded back to RGB. The
offline Basis encoder from `@gpu-tex-enc/basis@1.16.4` (binary reports v1.15) used:

```sh
basisu -ktx2 -mipmap -q 255 -file stone-color.png -output_file color.ktx2
basisu -ktx2 -mipmap -linear -normal_map -uastc -uastc_level 2 -file stone-normal.png -output_file normal.ktx2
basisu -ktx2 -mipmap -linear -q 255 -file stone-roughness.png -output_file roughness.ktx2
```

Decoder JS and WASM are copied unchanged from the pinned Three.js dependency's
`examples/jsm/libs/basis/` directory. The encoder is an offline preparation tool,
not an application dependency.

## Verification

- 68 automated checks pass, including the unchanged camera fingerprints, existing
  gesture/placement/geometry/environment checks and five new asset lifecycle checks.
- TypeScript and the production build pass on the combined world-realism source.
- Six template comparisons retain exact architecture geometry/transforms, picking
  tags and camera state against the initial base. All fourteen finishes render.
- The builder browser suite passes placement, intentional movement, orbit/pinch
  isolation, stacked ownership, selection, portrait/landscape, JSON/PNG downloads,
  save/reload, all six templates and the full attachment fixture without reported
  JavaScript/WebGL errors.
- Real browser KTX2 decoding succeeds with ten mip levels, correct color spaces
  and one shared map set. Assets are absent from non-Stone visits. The read-only
  diagnostics do not intercept touches or keep an idle scene rendering. Failed
  texture responses retain the complete procedural finish.
- The same targeted check passes against an exported `/temple-studio/` build,
  including real relative asset loads and the offline fallback. This checks the
  static embedding boundary; it is not a live authenticated Echoes deployment test.

Run the ordinary tests and production build, then the existing builder/appearance
checks and the new targeted browser check:

```sh
npm test
npm run typecheck
npm run build
npm run verify:browser
QA_OUTPUT=/tmp/echoes-after QA_COMPARE=/tmp/echoes-before/result.json npm run verify:appearance
node scripts/verify-stone.cjs
```

The baseline appearance result must come from the base commit's production build.
Browser checks require Playwright and WebGL Chromium; their paths can be supplied
using the existing PLAYWRIGHT_MODULE and CHROMIUM_PATH settings. Physical Android
and iPhone FPS, thermal behavior and display differences remain unverified.
