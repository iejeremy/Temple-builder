# Dependency audit — October 27, 2026

The Echoes app audit also checked this separately installed studio dependency tree. Its initial lockfile reported three advisories (Next/PostCSS/Sharp). Updated PostCSS within major 8, enforced the same version for Next's nested copy, and refreshed compatible lockfile resolutions including Sharp. No scene, camera, pointer, geometry, texture or UI source changed.

`npm audit` reports zero advisories for the resulting lockfile. The Echoes integration runs all 72 builder tests, the complete static export build and embedded browser flows against these same dependency versions. Zero reported advisories is a dated registry result, not a security guarantee.

Inactive root catalogue/type/style helpers and `src/lib/temple-builder/{catalog,types}.ts` remain historical source retained under the existing no-removal instruction. The active App Router imports `src/app/globals.css` and `src/components/builderMaterialMaps.ts`; the old alternatives are not bundled. Their exact paths and purpose were already recorded in `docs/REPOSITORY_AUDIT_2026-10-24.md`. This audit does not silently discard those retained sources.
