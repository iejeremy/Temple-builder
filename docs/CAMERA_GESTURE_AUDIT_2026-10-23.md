# Camera and interaction audit — October 23, 2026

Reviewed main at `053a083bf5434c8d6959e51582a4a7ca8607848a`, including `6e017a4`, `c6c772d`, `e1ee62d`, `9602b36`, `a2ce570` and intervening/newer fixes. Commit timestamps for the listed changes are October 23 UTC / October 22 Pacific.

## Verified by automated execution

`node --test tests/interaction-audit.cjs`: 10 passing checks. The harness executes the production pointer handlers with real Three.js math, a fake canvas, and controlled raycast hits. It does not render WebGL or emulate physical touch hardware.

- Tap jitter selects without moving; normal camera swipes do not move buildings.
- Crossing the drag threshold and returning to the starting point never selects on release.
- Repeated snapped building positions emit once.
- Canceled touches clear selection eligibility and object drag state.
- A second finger immediately disarms single-object movement, even without an intervening move event.
- Three-finger gestures suspend motion and rebase two-finger coordinates on release/cancellation.
- One-pointer orbit and middle-button pan dispatch correctly.
- Coincident pinch positions keep zoom finite.
- Tagged doors, windows, attached columns, stairs, arches, trim and pediments select their existing editor.
- At 390×844 and 844×390, sampled points on an enclosing sphere fit inside the configured unobscured region over four orbit directions and three elevations; structural pivot stays horizontally centered and projects above screen center.

Against the unmodified reviewed main, the same suite passes 5/10 checks. The five failures reproduce drag-return selection, delayed object-drag cancellation, stale three-to-two-finger pan, middle-button orbit instead of pan, and landscape fit behind controls. With corrections, 10/10 pass.

`npm run typecheck`: passed. `npm run build`: passed, including type validation and static page generation. Existing main has a successful Vercel status; that status does not validate these corrections or mobile interactions.

## Small corrections

Only `src/components/Temple3DPreview.tsx` changes application behavior:

- Latch drag activation for the complete gesture so returning near the start cannot open an editor.
- Disarm object movement immediately on additional pointer contact; suspend gestures above two pointers and rebase when returning to two.
- Detect a held middle mouse button with `buttons`, which remains meaningful during pointer movement.
- Scale pan using the actual virtual camera viewport height.
- Fit the enclosing sphere using the configured top/bottom UI reserves, replacing a fixed 25% allowance that was insufficient in landscape.

No objects, menus, data fields, material definitions, geometry generation, stack movement callbacks or existing builder categories were removed. Tests and this change log are added.

## Verified by source inspection only

- Levels, floors, perimeter walls/towers/gates, columns, doors, windows, stairs, roofs, statues and landscaping still have rendering paths. Page callbacks remain connected for selection and supported movement.
- Ground-floor movement also translates elevated stories at the same coordinates; upper stories cannot be dragged independently. This relies on coordinate matching rather than explicit stack ownership.
- One authoritative camera transform orbits a structural-bounds center; roof and trim bounds contribute to fit distance. Selecting a level does not trigger the geometry rebuild effect or reset target/radius.
- Real portrait/landscape transitions intentionally recenter. Ordinary same-orientation resizes preserve the manual view.
- Terrain/grid are 64×64; static scenery is outside the central construction area.

## Remaining risks and untested behavior

- Physical Android/iPhone pinch, cancellation, orientation changes, GPU performance, and live Vercel interaction remain untested. Local browser smoke testing could not launch because Chromium is absent in this environment.
- Full visual alignment and all-piece selection/movement in a rendered multi-level scene remain unverified; controlled tagged-mesh tests do not establish that every visible submesh is tagged.
- Window casings/mullions, ornamental column caps and other sibling decoration meshes lack their attachment's selection tags. A hit on these can select or move the building instead of the intended detail. Door surround child meshes also lack direct tags. Fixing this consistently needs attachment ownership/tagging coverage beyond these camera/gesture corrections.
- Panning changes target height without a floor clamp; angle limits alone cannot prevent the camera being panned below ground.
- Center Temple frames building geometry, not the perimeter/statues/site objects. Distant decorations and walls can remain outside the fitted view. Terrain is finite while pan/placement are not bounded to it.
- UI reserve values are estimates capped at 85/190 px; tall edit panels may still obscure geometry. Same-orientation viewport shrink does not recompute fit distance until an explicit recenter or a geometry update.
- Adding the first building after an empty site triggers a fit, even after manual empty-site framing, because fit initialization was cleared. Later edits preserve the existing pivot until Center Temple, so moving a building can leave the pivot at its previous position.
- The pending-building ghost replaces materials without disposing the replaced materials at that point; pending selection highlighting also lacks a pending-index dependency. These are separate rendering lifecycle concerns.

No claim of live mobile regression clearance is made. No removals are proposed.
