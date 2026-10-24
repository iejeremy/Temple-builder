# Automatic landscape upgrade — October 23, 2026

Baseline: `3655752`. Requested change: make the surrounding scenery rich automatically, including more trees, boulders, grasses, hills, rivers and creeks.

## Changes

- Replaced the sparse environmental tree crowns with fuller, branched broadleaf, pine and cypress trees. Expanded the background from 26 tree positions to 54; trees that overlap water are relocated or hidden. Each tree uses two instanced meshes, reducing tree draw calls despite the denser canopies.
- Added 64 instanced boulders, 5,600 grass-blade positions in organic patches, eight nearby rolling hill instances, and a winding river connected to a creek. Some grass instances are hidden to keep the site and waterways clear.
- The environment reserves a clear rectangle around all editable objects, including courtyard walls. Its layout adjusts to site bounds after a drag settles, so grass and water geometry are not rebuilt on every pointer move; translating the same bounds reuses the generated geometry. Decorative scenery does not participate in object selection, save records, Clear Site, or Whole Site camera bounds. Individually placeable scenery remains editable and removable.
- Added a labeled Scenery view button beside Center Temple. It explicitly frames extra landscape context; existing camera views and selection behavior retain their previous fit rules.
- Replaced the obviously repeating ground pattern with a larger organic texture and matched the distant ridgeline to the ground material/UVs so it blends into the terrain.
- Added broadleaf, pine and cypress choices for placed trees; old saved trees default to broadleaf. Existing positions, rotation, scale, duplication and deletion remain. Species saves and exports with the existing design schema.
- Garden and Twilight show woodland, grass and water. Desert retains dry scenery, boulders and hills. Water has static reflective shading and surface highlights; this is decorative scenery, not fluid simulation or terrain excavation.
- Dispose instanced-mesh GPU buffers alongside existing geometry and material cleanup. No asset downloads, added dependencies, or continuous animation loop.

## Verification

- Production build and TypeScript checks pass.
- `npm test`: 26 checks, including new tree instance/bounds checks, clearing around translated sites, upward water normals, theme behavior and explicit Scenery framing without mutation of temple bounds.
- `scripts/verify-environment.cjs`: real mounted scene contains the automatic environment on load; existing temple template renders; Scenery view works; tree species survives saving/reload; Garden/Desert/Twilight work; portrait/landscape screenshots; no browser runtime errors.
- Existing studio and scenery browser regression scripts exercise foundations, level ownership, movement, camera gestures, templates, saving/export and Clear Site/Undo.
- Reviewed phone-sized and landscape screenshots. Physical Android/iPhone frame rates and thermal behavior are not measured by the software-rendered browser checks.

No builder category or saved design was removed. Existing simple tree geometry was replaced with the requested fuller trees; the approved studio checkpoint remains available unchanged.
