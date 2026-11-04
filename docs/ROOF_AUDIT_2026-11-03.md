# Temple Builder roof audit — November 3, 2026

## Result and scope

Audited `iejeremy/Temple-builder` at `38e2fa15c1f46f430e6dab707526b946ee20441f`, which was also the default branch head when retrieved. The October 29 commit changes only `src/components/Temple3DPreview.tsx`: 19 additions and one deletion. It replaces the rectangular tiered roof inside `addFootprintRoof` with four scaled polygon extrusions and a conical crown. It does not establish that every roof style follows every building shape.

Two small corrections are included: footprint roofs retain their roof selection identity through batching, and polygon pyramid faces point outward/upward. Camera code, gestures, building shapes, template pieces, persistence, and level-management behavior are unchanged.

This audit concerns the standalone Temple Builder repository. It does not certify a separate copy integrated into Echoes-app or any live deployment.

## Shape and roof coverage

| Building shape | Tiered roof after 38e2fa1 | Flat / pyramid | Other roof styles |
| --- | --- | --- | --- |
| Square | Existing four rectangular tiers; commit does not change this route. Tested. | Existing rectangular cornices / pyramid, with designed overhang. | Existing generic silhouettes. |
| Circle | Four shrinking 32-sided footprint tiers. Tested. | Polygon cap / tapered polygon surface. | Dome, cone and steeple use circular bases; curved and ornate still introduce rectangular geometry. |
| Star | Four shrinking star tiers. Tested. Crown remains a regular cone, not a star. | Star cap / star-to-center surface. Pyramid face direction corrected. | Generic circular/rectangular silhouettes do not trace the star outline. |
| Triangle | Four shrinking triangle tiers. Tested. Crown remains a separate regular cone. | Triangle cap / triangle-to-center surface. Pyramid face direction corrected. | Generic circular/rectangular silhouettes do not trace the triangle outline. |
| L-shaped | Unchanged: separate tiered roofs on two rectangular body sections. Their first tiers cover the body; upper tiers shrink independently. Tested. | Separate rectangular caps / pyramids on each section. | Separate generic roofs on each section. |
| T-shaped | Same separate-section route as L-shaped. First tiers cover the body; upper tiers shrink independently. Tested. | Separate rectangular caps / pyramids on each section. | Separate generic roofs on each section. |

The polygon branch also covers six-point star, diamond, hexagon, oval, octagon, rotunda and ring. A ring's flat cap preserves its hole; its non-flat roofs do not use that hole. `none` produces no ordinary roof.

## Confirmed defects corrected

1. **Polygon roofs lost roof selection identity.** The footprint branch used the general shell `add` function without `detailCategory: "roof"` or a mesh-level index. Shell batching could merge those roof pieces into the body. The tap handler at `Temple3DPreview.tsx:409` dispatches roof controls only for a tagged first hit; otherwise it dispatches building selection. The new `addFootprintRoofPiece` helper tags polygon flat, tiered, pyramid and ring-flat roofs, including the tiered crown, so batching preserves them as independently pickable roofs. The rectangular helper already did this. No pointer handler was edited.

2. **Polygon pyramid faces pointed inward/downward.** The perimeter-to-apex triangle order yielded negative Y normals. With the existing front-sided material, these surfaces could disappear or fail picking from above. Reversing each perimeter edge fixes the normal direction without moving any vertex or changing the roof footprint. This was a pre-existing issue, not introduced by the tiered-roof commit.

The selection correction preserves separate roof meshes instead of merging them into the shell. That can modestly increase draw calls on polygon buildings; mobile GPU performance was not measured.

## Connected paths verified

| Path | Evidence and result |
| --- | --- |
| Roof construction | `Temple3DPreview.tsx:443` is the generic roof helper; `:540` is the polygon helper; `:617` starts shape dispatch; `:687` applies generic roofs to rectangular sections. |
| Resize / shape / roof changes | Cache key at `:517` includes width, depth, height, elevation, shape and roof. Tests execute the production construction path and confirm these edits rebuild only the edited level. |
| Rotation / movement | The cache excludes x, z and rotation; these update the common level group. Tests confirm body and roof retain their shared transform and cached group. Ground movement propagates to levels with the same building ID in `page.tsx:439`. |
| Adding levels | `page.tsx:382` copies the top level's shape, owner, position and rotation, reduces dimensions to 84% with a minimum of 16, sets the new roof to flat, and clears new attachments. Tests execute this handler. Existing roofs are preserved. |
| Removing levels | `page.tsx:358` removes only the chosen owned story, lowers higher owned stories by its height, and preserves remaining roof styles and attachments. Tests execute this handler and confirm roof selection indices are refreshed after array reindexing. |
| Selecting roofs / stories | Tagged roofs dispatch the existing roof editor through `onSelectDetail` at `page.tsx:438`. The roof carousel at `:567` changes only the selected level. Tests execute the real pointer handlers and verify the roof category. Highlighting changes no roof vertices, transforms or geometry identities. |
| Camera preservation | Existing camera integrity tests confirm the protected controller, gestures, projection and framing remain byte-for-byte unchanged. |

## Remaining confirmed limitations and risks

- **Generic roofs still do not guarantee matching outlines.** Dome/cone/steeple use circular or regular polygon bases; curved roofs extrude a rectangular span; ornate roofs use box cornices. On a star or triangle these are not footprint-shaped roofs. This routing is confirmed in code; appearance on the deployed app is unverified.
- **L/T upper tiers are not a unified L/T roof.** Both rectangles shrink about their own centers. The top courses separate; they do not form a continuous scaled L/T outline. Changing that requires a compound-outline roof design rather than another rectangular size adjustment.
- **The Hindu template has a second roof construction path.** At `Temple3DPreview.tsx:588`, small Hindu tiered levels receive seven extra box-shaped shikhara courses and ornaments regardless of shape. The Celestial Shrine template includes an octagonal tiered level that meets that condition. Its ordinary tiers match the octagon, but those extra courses remain rectangular. Preserved here to avoid redesigning or removing existing template pieces.
- **Lower roofs stay when a story is added.** The new story starts at the previous wall top while the lower roof extends above it. Roof/story intersection is therefore possible and is not resolved by 38e2fa1. No roof was automatically hidden or removed.
- **Building resize and rotation UI are absent in this baseline.** The page exposes perimeter resizing and rotation for other objects, but no editable building width/depth/height or rotation control. Building dimensions and rotation were tested through model changes and level handlers, not a nonexistent touch flow. A normal two-finger canvas gesture remains camera navigation.
- **Special outlines retain existing behavior.** Ring non-flat roofs span the center hole; raised-level transition plinths use generic circular/rectangular geometry and can appear inconsistent with star/triangle/compound outlines. These are separate from the corrected roof picking and face direction.

These remaining cases are not claimed fixed. Unifying all roof styles, changing specialized temple courses, changing lower-roof visibility, or adding building manipulation controls is outside this minimal correction.

## Validation

- `npm ci --ignore-scripts --no-audit --no-fund`: passed; dependency files unchanged.
- `npm run typecheck`: passed.
- `npm run build`: passed, including type validation and static page generation.
- Final `npm test`: **78/78 passed**, including six new roof tests and the protected-camera integrity test.
- New tests cover all 20 saved shapes × 9 roof styles for finite geometry and roof identity; all four tier contours and first-tier coverage for the six requested shapes at three sizes and three rotations (54 cases), with elevation; polygon pyramid normals/eaves and downward ray picking; cache invalidation/reuse; index changes; selection immutability; and level ownership/customization preservation.
- `git diff --check`: passed.
- Browser attempt: Chromium failed before opening a page with `socket() failed: Operation not permitted`. No browser, physical-phone, visual screenshot, deployed Vercel, or mobile performance verification is claimed.

Before claiming full visual parity, verify the corrected build on a phone and separately decide the desired treatment of compound roofs, specialized Hindu courses, generic roof silhouettes, and lower roofs under added stories.

## Change log

- `src/components/Temple3DPreview.tsx`: add footprint-roof picking tags; preserve polygon roofs through batching; reverse polygon pyramid face winding.
- `tests/roof-audit.mjs`: execute production geometry, cache, selection and level handlers against regression cases.
- `tests/interaction-audit.cjs`: include roof in existing tagged-detail tap tests.
- `package.json`: include roof audit in `npm test`; dependencies unchanged.
- This report records coverage, evidence and remaining limitations. No existing builder piece or feature was removed.

Source commit: https://github.com/iejeremy/Temple-builder/commit/38e2fa15c1f46f430e6dab707526b946ee20441f
