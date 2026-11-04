# Floor placement safety · October 25, 2026

The supplied phone recording shows a swipe over an existing building while positioning a new floor. The parent enables renderer movement with `moveMode || !!pendingBuilding`. The renderer previously applied that permission to every hit object, so placement silently permitted moving existing buildings and their attachments.

## Correction

- Include the existing `pendingLevelIndex` in the live event-handler state.
- During placement, only that pending ground-level piece may arm a drag. Existing buildings, doors, arches, windows, columns, stairs, pediments, trim, statues and placed scenery remain protected. A pinch over the existing perimeter navigates rather than resizing it.
- Entering Add and staging a new foundation/floor clears leftover explicit Move mode. Normal explicit Move remains available outside placement.
- No stored design schema, geometry, building ownership, rendering, materials, leaves, camera controller, projection, fit, canvas dimensions, navigation calculations or gesture thresholds changed.

The original camera fingerprint remains unchanged. Its protected renderer block includes movement dispatch as well as camera code; the lock manifest now enumerates seven exact movement-permission substitutions. The test reverses only those substitutions before comparing the original full-block hash. All remaining bytes retain the original protection; the camera controller and structural-framing fingerprints are unchanged.

## Verification

- All 55 builder checks pass, including four placement regressions. Against the pre-fix renderer, three new regression checks fail: existing-building swipe, attachment swipe and wall pinch. Pending-piece movement passes before and after.
- TypeScript passes.
- Integrated production-browser check passes with real emulated CDP touch events over ray-verified existing geometry: swipe rotates, existing draft and blue-floor coordinates stay unchanged, blue floor remains draggable, stale Move mode resets, Cancel keeps the prior draft, Confirm appends only the new floor, and reload restores it.
- Portrait/landscape canvas centering, explicit Move, stacked levels, export and app re-entry also pass in the integrated preview.

Existing accidentally saved moves are not rewritten: there is insufficient information to infer the user’s intended original positions. Hardware testing on the reporting phone remains pending.
