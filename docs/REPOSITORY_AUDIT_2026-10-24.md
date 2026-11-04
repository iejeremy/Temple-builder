# Repository path audit — October 24, 2026

Baseline: `388732b`. Scope: all **52 tracked files** and all tracked folders in `iejeremy/Temple-builder`, including inactive duplicates, configuration, test tooling and documentation. First-party source was read in full, imports were traced from the App Router entries, and the generated lockfile was parsed entry by entry. The JSON companion records baseline line counts, SHA-256 identities and per-file review notes. This is a code/path audit with targeted runtime verification, not a proof that every possible input combination or third-party implementation is defect-free.

## Confirmed display and navigation defects

**F01 — Fixed: high-density display sizing outside the camera controller.** `page.tsx` → dynamic `Temple3DPreview` → `window.devicePixelRatio` → `renderer.setPixelRatio` → resize → `renderer.setSize(w,h,false)` → canvas intrinsic CSS size → main `overflow-hidden` clipping. DPR 2 produced a 540 × 1003 CSS canvas inside a 360 × 669 host even with correct focus and zero pan. Use `setSize(w,h)` to synchronize CSS size and retain a denser buffer. See `CANVAS_DENSITY_2026-10-24.md` for baseline failure and verification.

**F02 — Fixed: pinch/pan integration drift.** Pointer moves arrive separately for each finger. Incremental pan used the radius already changed by the first finger, so the second finger used another scale. Six closed pinch cycles left an unintended pan of approximately `(1.725, -0.957, 0.638)` in the production-handler harness despite unchanged final finger positions. A shared start-of-gesture snapshot now computes absolute pan displacement and zoom ratio. Pointer-count changes rebase the snapshot. Deliberate two-finger translation, wall resizing and third-finger/cancellation protections remain.

**F03 — Corrected test gap.** Earlier checks defaulted to DPR 1 and projected into the host instead of checking the canvas's actual rectangle. Camera checks now compare actual CSS canvas/host bounds, actual displayed midpoint and backing-buffer size at DPR 1, 1.25, 2 and 3, both quality settings and orientations. The complete studio script defaults to DPR 2. The camera check also uses a real emulated touch tap on Center and closed touch-pinch cycles.

## Complete active path map

- Startup/styles: `src/app/layout.tsx` → `src/app/globals.css`; `src/app/page.tsx` → `next/dynamic` → `Temple3DPreview.tsx`. The actual page uses its own level/ownership schema, not either preserved piece catalogue.
- Data: localStorage `echoes-temple-builder-v1` → `ensureBuildingIds` → page state → preview props → cached level groups and independent site groups. UI edit/Move callbacks update owner-scoped records → autosave/export. Clear Site snapshots all user objects; Undo is in-session.
- View controls: button → current selection-bounds calculation → `TempleCameraController.center` → clear pan, choose structural pivot, fit rendered radius and choose angle → scheduled render → controller `apply` → renderer. Selection alone updates tags/highlighting/bounds without invoking a new fit.
- Geometry updates: page state → cached/rebuilt groups → structural/rendered/site bounds → reset-fit metadata and existing framed-owner midpoint following. Building drag holds the pivot while active and synchronizes after release; unrelated selection does not switch owners.
- Gestures/picking: canvas CSS rectangle → normalized coordinates → main camera ray → one nearest hit → attachment/site/owner identity → tap selection or deliberate Move callback. Single-finger orbit, two-finger pan/pinch, wall pinch, cancellation and pointer-count transitions share this path.
- Display: host/header/dock measurements → camera view offset/projection plus renderer CSS/buffer size. Quality changes update only pixel ratio. Preview also adjusts the main camera far plane for wide scenes; it does not set a second position/rotation.
- Scenery/materials: preview → geometry/material/lighting/tree/water helpers. Decorative environment is a sibling of editable geometry, outside picking and normal fit bounds. Texture canvases are 2D asset generators, not extra camera renderers.
- Lifecycle: one WebGLRenderer and one main PerspectiveCamera; on-demand RAF; geometry/material/instance disposal, texture ownership and observer/listener cleanup. The sun's shadow camera is separate lighting infrastructure.
- Downloads: Save copy → JSON Blob/object URL; Capture → current renderer canvas PNG. No JSON import flow is implemented. No app-defined authentication/database/API/worker/service-worker control path exists in this tracked builder.

## Other findings and remaining risks

**F04 — Framework dependency update:** baseline Next 15.3.9 has published advisories. The maintenance update to 15.5.28 retains React 18.3.1 and Three 0.186.1. The dependency diff changes Next/@next packages and removes obsolete transitive packages only. Build/type checks, production-handler tests and browser checks validate compatibility. Official source: https://nextjs.org/blog/nextjs-security-update-october-14-2026 . This clears the audit's critical-severity package classification; it does **not** clear all advisories.

**F05 — Partly corrected; schema recovery remains open.** The baseline overwrites unreadable JSON with empty state after restore fails. The catch path now reports a save error and leaves autosave disabled, preserving the original value. Users can export a separately built design without overwriting it. The browser recovery check reproduces the baseline loss and verifies the guard, separate export and ordinary valid save/reload. Parsed records also lack full field/schema validation: missing attachment arrays, unknown materials or non-finite numeric fields can fail later in counters/rendering. Full schema validation and a deliberate original-data recovery/import interface still need follow-up before normalization. This audit does not silently filter, migrate or delete the user's saved pieces.

**F06 — Open, architectural contract gaps:** upper-level masonry doorway exclusion compares absolute y against a level-local doorway height (missing base elevation); some named styles share approximate geometry, spire perimeter towers fall through to the round-tower geometry, and nonrectangular/compound openings and attachment alignment are limited. The UI does not enforce the older 'doors only with a patio' preference. Those are documented code/contract findings, not claims that all such combinations have been visually reproduced. Changing that policy or replacing asset geometry needs targeted preservation checks; no existing style/piece has been removed here.

**F07 — Open, finite-world/performance limits:** placement/pan can exceed the finite 256-unit ground; shadow coverage is bounded; many independently editable pieces can raise draw count; physical phone FPS, thermal and battery behavior remain unmeasured. Center/Whole Site are recovery controls, not infinite terrain.

**F08 — Open, verification/dependency limits:** npm still reports advisory entries for Next (moderate), nested PostCSS (high), Sharp (high), postcss-nested (moderate), postcss-selector-parser (moderate) and Tailwind (moderate): 0 critical, 2 high, 4 moderate vulnerable packages after the maintenance update. These are dependency scan results, not proof of exploitable paths in this app. The page has no user-provided CSS/image-upload or app-defined API flows. Additional patches or major framework/CSS upgrades need their own compatibility review; no forced major upgrade was applied. There is no GitHub Actions regression workflow; a Vercel green check proves deployment/build, not that these browser scripts ran in CI. Browser tooling is environment-provided, not an installed production dependency.

**F09 — Preserved inactive/history files:** root `builderMaterialMaps.ts`, `catalog.ts`, `types.ts`, `globals.css`, and `src/lib/temple-builder/{catalog,types}.ts` are outside the live page's runtime import chain. They do not contain a second camera path. `next-env.d.ts` is compiler input. Older improvement/deferred notes describe earlier states and are not a current acceptance checklist (for example Alt fine snapping is not present in current handlers). The audit inventory prevents confusing these files with the live implementation; none were deleted.

## Verification boundaries

Production build and TypeScript checks; 44 production-source/geometry/material checks; high-DPR camera/touch/display suite; full studio flow including all six templates, levels/ownership, attachment meshes, save/reload and downloads. Runtime checks use isolated test storage and software WebGL, never the user's stored design. Physical Android/iPhone hardware, the user's exact saved record, every named style/shape/material combination, full malformed-schema recovery and remaining advisory exploitability are not established by these checks.

## File-by-file inventory

Baseline line counts below identify the reviewed input. Changed files and added audit documents are reviewed again as part of the final diff. The JSON companion contains complete SHA-256 values.

| File | Baseline lines | Review |
|---|---:|---|
| `.gitignore` | 5 | Checked build/dependency/generated/environment exclusions. |
| `DEFERRED_IMPROVEMENTS.md` | 107 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `IMPROVEMENTS_OCT_2026.md` | 16 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `README.md` | 18 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `builderMaterialMaps.ts` | 68 | Read legacy root procedural texture helper; inactive in the live runtime import chain. |
| `catalog.ts` | 76 | Read legacy root piece catalogue; not used by the active page. |
| `docs/CAMERA_CENTERING_2026-10-24.md` | 38 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/CLEAR_SITE_2026-10-23.md` | 13 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/ECHOES_3D_INTEGRATION.md` | 31 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/LANDSCAPE_UPGRADE_2026-10-23.md` | 24 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/LIGHTING_GROUND_2026-10-24.md` | 22 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/NATURAL_LANDSCAPE_2026-10-24.md` | 33 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/NATURAL_SCENERY_2026-10-23.md` | 30 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/STUDIO_UPGRADE_2026-10-23.md` | 76 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/TREE_FOLIAGE_CORRECTION_2026-10-24.md` | 13 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `docs/WATER_REFINEMENT_2026-10-24.md` | 22 | Read complete historical document and compare claims/limits against current code; prior change notes remain historical, not proof that all features currently satisfy every requirement. |
| `globals.css` | 14 | Read legacy root stylesheet; not imported by the live App Router layout. |
| `next-env.d.ts` | 2 | Checked ambient Next/image declarations; compiler input, not runtime camera code. |
| `package-lock.json` | 2211 | Parsed every package entry and checked package versions, resolution URLs/integrity fields, framework-only version changes and npm advisory output; generated data review rather than handwritten-code review. |
| `package.json` | 29 | Checked commands, exact engine/framework/React pins, peer compatibility and maintenance update; build command does not run regression tests automatically. |
| `postcss.config.js` | 6 | Read complete build/compiler/style configuration and trace its entry-point effect. |
| `scripts/verify-camera-center.cjs` | 45 | Read full browser script, selectors, test storage, projections, viewport/DPR defaults, error checks and server/browser teardown; limitations recorded in report. |
| `scripts/verify-clear-site.cjs` | 43 | Read full browser script, selectors, test storage, projections, viewport/DPR defaults, error checks and server/browser teardown; limitations recorded in report. |
| `scripts/verify-environment.cjs` | 34 | Read full browser script, selectors, test storage, projections, viewport/DPR defaults, error checks and server/browser teardown; limitations recorded in report. |
| `scripts/verify-lighting-ground.cjs` | 13 | Read full browser script, selectors, test storage, projections, viewport/DPR defaults, error checks and server/browser teardown; limitations recorded in report. |
| `scripts/verify-scenery.cjs` | 34 | Read full browser script, selectors, test storage, projections, viewport/DPR defaults, error checks and server/browser teardown; limitations recorded in report. |
| `scripts/verify-studio.cjs` | 101 | Read full browser script, selectors, test storage, projections, viewport/DPR defaults, error checks and server/browser teardown; limitations recorded in report. |
| `scripts/verify-water.cjs` | 29 | Read full browser script, selectors, test storage, projections, viewport/DPR defaults, error checks and server/browser teardown; limitations recorded in report. |
| `src/app/globals.css` | 43 | Read complete responsive studio CSS, overlays, touch/focus and reduced-motion rules; no canvas size constraint was present. |
| `src/app/layout.tsx` | 18 | Checked actual App Router entry, active CSS import, metadata and children rendering. |
| `src/app/page.tsx` | 680 | Read all state, restoration/autosave, six templates, ownership, placement, levels, attachment menus, perimeter, site objects, Clear/Undo and export paths. Storage/contract risks remain recorded below. |
| `src/components/Temple3DPreview.tsx` | 1068 | Read complete scene initialization, render scheduling, all pointer handlers, resize/display/quality paths, architectural/scenery generation, caches/disposal, bounds, selection and view controls. Canvas-size and pinch-integration defects corrected. |
| `src/components/TempleCameraController.ts` | 99 | Read all target, orbit, damping, fitting, ground limits, owner-following and projection methods; controller is the sole main-camera transform owner. |
| `src/components/TempleGlyph.tsx` | 6 | Read all SVG shape/thumbnail branches; no renderer or camera state. |
| `src/components/builderGeometry.ts` | 45 | Read batching/tag preservation and rotated perimeter/gate planning; geometric invariants tested. |
| `src/components/builderMaterialMaps.ts` | 110 | Read all map generation, colors/data spaces, cache/retain/release paths; no camera mutation. |
| `src/components/environmentLandscape.ts` | 161 | Read all scenery construction, spatial indexing, clearings, clustering, instancing, themes and disposal paths; decorative group excluded from pick/fit. |
| `src/components/naturalLighting.ts` | 86 | Read all ground, radiance, theme constants, contact-map creation and disposal paths. |
| `src/components/naturalScenery.ts` | 77 | Read every placeable boulder/grass/hill/river/creek branch and legacy fallback. |
| `src/components/sceneryTrees.ts` | 46 | Read every species, timber, fine leaf, color and instancing branch; approved size/count budget preserved. |
| `src/components/sceneryWater.ts` | 82 | Read every curve, bank/surface color-alpha, normals, filtering, ownership/disposal and ripple path. |
| `src/lib/temple-builder/catalog.ts` | 76 | Read preserved catalogue and type import; not used by active page. |
| `src/lib/temple-builder/types.ts` | 38 | Read preserved v2 piece schema; not the active page level model. |
| `tailwind.config.js` | 10 | Read complete build/compiler/style configuration and trace its entry-point effect. |
| `tests/environment-audit.mjs` | 105 | Read full production-source extraction/VM setup, test fixtures and every assertion; test scope distinguished from hardware and exhaustive-path proof. |
| `tests/geometry-audit.mjs` | 27 | Read full production-source extraction/VM setup, test fixtures and every assertion; test scope distinguished from hardware and exhaustive-path proof. |
| `tests/interaction-audit.cjs` | 150 | Read full production-source extraction/VM setup, test fixtures and every assertion; test scope distinguished from hardware and exhaustive-path proof. |
| `tests/lighting-ground-audit.mjs` | 32 | Read full production-source extraction/VM setup, test fixtures and every assertion; test scope distinguished from hardware and exhaustive-path proof. |
| `tests/scenery-audit.mjs` | 24 | Read full production-source extraction/VM setup, test fixtures and every assertion; test scope distinguished from hardware and exhaustive-path proof. |
| `tests/water-audit.mjs` | 27 | Read full production-source extraction/VM setup, test fixtures and every assertion; test scope distinguished from hardware and exhaustive-path proof. |
| `tsconfig.json` | 21 | Read complete build/compiler/style configuration and trace its entry-point effect. |
| `types.ts` | 38 | Read legacy piece schema; not the active page level model. |
