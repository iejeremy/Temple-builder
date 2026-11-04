# Camera target and visible-area correction — October 24, 2026

Baseline: `085c379`. Trigger: the user's `1000000119.mp4` recording shows a two-level building drifting across the screen during orbit and partly hidden behind the dock.

## Reproduced defects

The recording alone does not expose the saved coordinates or touch events. Browser reproduction against the baseline confirmed two paths that leave a stale pivot:

- Dragging and confirming a foundation moved its structural midpoint to x = 1.75 while the camera focus stayed at x = 0.
- Adding the upper level moved the complete building midpoint from y = 1.57142857 to y = 3.14285714 while the vertical camera target stayed at the single-story value.

The previous rule that geometry edits must never update camera focus was too broad. It protected against unwanted selection reframes but also left the pivot behind after moving the framed building or changing its level count.

There was a separate visible-area mismatch: the preview reserved a fixed 65 px for the header, and the controller capped top reserve at 20% of viewport height. In short landscape viewports, the real header could exceed that cap, shifting the optical center below the midpoint of the actual available area.

## Correction

- Record which building was explicitly framed, or initially loaded. Follow that building's structural midpoint after its position or level structure changes. Do not switch owners merely because another object/level is selected.
- Keep orbit angle, zoom and deliberate pan offsets. While a building is being dragged, keep its camera target fixed so the drag ray remains stable. Synchronize its pivot after release/cancellation, when no pointers remain. A subsequent geometry effect also synchronizes the final rendered transform.
- Center, Front and Plan explicitly bind to the selected building. Whole site and Scenery retain site framing without following an individual building. Explicit Center continues to clear pan and fit all rendered roofs and attachments around the structural pivot.
- Measure and observe both the real header and bottom dock. Respect those measurements in portrait and landscape, keeping at least 24 px of usable height in extreme viewport sizes.
- Show a persistent **Center** label on the first view-control button, preserving its existing `Center Temple` accessible name and action.

This changes navigation and its regression checks only. No saved-data format, levels, architectural parts, menus, material maps, scenery geometry, fine leaves, templates or ownership data were removed or changed.

## Verified

- Production build and TypeScript checks pass using an isolated copy of the final source.
- `npm test`: 41 passing checks, including the existing interaction, camera fitting/ground constraints, attachment selection, geometry, scenery, foliage and water checks. New checks cover focused-owner following, preserved navigation state, unrelated/empty owner protection, site-view behavior and exact projected midpoint through a full orbit in multiple viewport sizes.
- `scripts/verify-camera-center.cjs`: the baseline reproduction described above fails the desired centering invariant. With the correction, moved pending foundations and confirmed two-level buildings retain cached geometry; pivot stays fixed during drag and follows on release; adding a circular upper story puts the pivot at the full building midpoint without automatic zoom; Center clears an emulated two-finger pan; repeated actual touch events orbit around a fixed on-screen midpoint; selecting levels does not reframe. Saved levels/coordinates survive these checks. Both 390 × 724 and 360 × 669 portrait profiles and 844 × 390 landscape were checked, including the actual measured header/dock midpoint. No JavaScript/WebGL console errors.
- `scripts/verify-studio.cjs`: placement, real drag movement with cached geometry, two-finger pinch, level stacking/ownership, non-reframing edit selection, all view presets, orientation changes, save/reload, design export and PNG capture pass. All six templates render/save. A complete scene retains tagged roofs, stairs, walls, columns, doors, windows, arches, trims and pediments. No JavaScript/WebGL console errors.
- Portrait and landscape screenshots of the rectangle/circle two-level case were inspected.

## Limits

These are real browser/WebGL checks with emulated touches and a software GPU. The user's physical phone, exact saved design and frame-rate/thermal behavior have not been tested directly. Intentional two-finger pan still moves the orbit target away from the building; explicit Center resets it. Structural edits preserve the user's zoom, so Center remains the explicit way to refit a substantially taller building.

The approved studio checkpoint remains at `checkpoint/approved-studio-2026-10-23`.
