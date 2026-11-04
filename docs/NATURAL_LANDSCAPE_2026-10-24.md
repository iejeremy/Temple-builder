# Natural landscape placement — October 24, 2026

Baseline: `b90620f`. This continues the approved realism plan after lighting, ground and water refinement.

## Changes

- Arrange the existing 54 background tree slots in nine loose groves. Vary tree scale, keep space between trunks and preserve the established broadleaf/pine/cypress assets, hundreds of small leaves per tree, leaf palette and triangle budget. The representative six-level template renders all 54 trees.
- Redistribute the existing 64 boulders into irregular bank groups and inland clusters. Vary size, lean and rotation, partly bury their bases and darken stones near water. Soft contact marks continue to follow them.
- Keep the existing 5,600 grass instances, with 80 patch centers computed once per layout. Half the patches follow watercourses. Vary blade height, width, color and patch density; bank vegetation is taller and greener on average, while dry areas retain bare ground. Visible blades stay outside the water and building clearing.
- Keep eight background hills, with broader, lower slopes and safer positions away from waterways, tree trunks and rock clusters. Both automatic and placeable hills use asymmetric slopes, ground-derived colors and feathered RGBA edges. Placed hills retain their footprint, editable transforms, ownership and controls.
- Use sampled water segments and a small spatial index for habitat distances. Environment updates still use the existing 180 ms debounce after edits, rather than running each drag frame. Equal-size site translations reuse geometry and instance buffers.

No new dependencies, external asset downloads, continuous animation or additional instance slots were introduced. The hill color attribute gains an alpha component and its material now blends at the outer edge. No builder pieces were removed. The fine-leaf source, camera controller, preview interaction handlers, water source, page UI, saved-data format, levels, architectural geometry and attachment code are unchanged.

## Verified

- Production build and TypeScript checks pass in an isolated copy of the final source.
- `npm test`: 38 passing checks. These include the existing camera, gesture, selection, geometry, scenery, foliage, ground and water checks, plus deterministic ecological placement, translated/wide clearing protection, exposed/buried rock bounds, water/grass separation, bank-versus-dry grass height, hill separation from waterways/trunks, buffer reuse and eased/faded hill edges.
- `scripts/verify-environment.cjs`: real mounted scene contains all 54 fine-leaved trees, 64 partly buried rocks and 5,600 grass slots; the representative six-level Temple of Unity renders in portrait and landscape. Species edits and the complete saved design survive reload. Garden, Desert and Twilight retain their existing behavior. No JavaScript/WebGL console errors.
- `scripts/verify-scenery.cjs`: all five scenery choices are visible at 360 × 640; placement, transforms, duplication, deletion, save/reload, landscape framing and exact Clear Site/Undo restoration pass.
- `scripts/verify-water.cjs`: mounted river/creek materials, deliberate object drag, ownership isolation, saved transforms, portrait/landscape and exact Clear Site/Undo restoration pass without JavaScript/WebGL console errors.
- Matching before/after template and Scenery-view screenshots were captured and reviewed. Review prompted softer hill edges before publication.

One initial test failure came from treating hidden, zero-scale grass instances as visible: Three r186 `Matrix4.decompose` returns unit scale for singular matrices. The check now excludes zero-determinant instances before decomposition. The independent distance checks then confirmed that visible grass stays on dry banks.

## Limits and remaining work

- Browser checks use reduced motion and software WebGL. Physical Android/iPhone frame rate, battery use and thermal behavior remain untested.
- A local CPU microbenchmark of repeated environment-bound changes was approximately 90–100 ms after spatial indexing versus 200–220 ms for the baseline. This measures layout calculation in one test environment, not browser or phone frame rate and not a guaranteed performance target.
- Decorative hills do not deform the flat editable building surface or excavate riverbeds. User-placed scenery remains independently movable, so users can deliberately overlap those pieces.
- This release completes the ecological-placement pass. Photographic material assets, deeper architectural recesses/bevels, restrained weathering and physical-phone performance tuning remain separate work.

The historical approved studio checkpoint is preserved at `checkpoint/approved-studio-2026-10-23`.
