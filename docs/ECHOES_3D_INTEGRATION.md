# Echoes 3D World Integration — implementation contract

Status: planning and repository reconnaissance (2026-10-22). No 2D feature is removed by this document.

## Product intent
The Temple Builder becomes the 3D world editor and ultimately the 3D presentation layer of Echoes. Existing Echoes interactions remain: tapping a temple opens the corresponding legacy/profile page; tapping a statue opens its associated music or dedication. Other interactable objects may acquire content links. The 3D world must work on portrait and landscape mobile.

## Verified code locations
- Existing application: `iejeremy/Echoes-app`, Next.js; `src/app/page.tsx` currently renders a flat `/scene/echoes-jungle.jpg` background and routes authenticated users to `/home` or `/setup`.
- Builder: `iejeremy/Temple-builder`; `src/app/page.tsx` owns levels, optional perimeter, statues, site columns, landscape items and localStorage persistence. `src/components/Temple3DPreview.tsx` owns Three.js scene and pointer gestures.
- These are separate repositories. Data model and authenticated navigation integration have **not yet been verified**.

## Implementation sequence
1. Inventory existing Echoes home/temple/statue pages, music playback, data records, and authorization rules. Record actual routes and data IDs before wiring events.
2. Define stable object identity and typed interactions: `temple.openPage`, `statue.openMusic`, `decoration.none`. Bind references to real existing Echoes records, never hard-code user IDs or guess URLs.
3. Extract builder 3D renderer into a reusable, read-only `WorldViewer` and an editable `WorldEditor` sharing the same scene format. Keep builder-specific edit menus out of the visitor experience.
4. Add opt-in 3D world behind a feature flag to Echoes-app. Preserve current 2D scenery and routes as fallback until interaction parity and mobile testing pass.
5. Migrate saved world data deliberately, preserving legacy scenes and user content. Add reversible rollout and verification checklist before removing 2D UI.

## Acceptance tests
- Tap temple => correct existing temple page, including permissions.
- Tap statue => correct existing music/dedication, without accidental camera drag or auto-play policy violations.
- One finger orbit, two fingers pan, pinch zoom; selection only on tap.
- Empty world remains empty: no automatic perimeter walls, temples or statues.
- Portrait/landscape camera starts centered, stays above ground, and does not reframe on tap.
- Builder editing cannot delete or overwrite existing legacy content.
- Old 2D experience remains available until the user explicitly approves its removal.

## Change policy
Do not remove existing features or data without explicit approval. Every implementation change must have a commit and regression notes.
