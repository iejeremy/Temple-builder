# Temple Builder — Deferred Improvements Log

This file records improvements we intentionally have **not** completed yet, why they were deferred, and what should trigger revisiting them. Existing working features should not be removed to implement these items without approval.

Last updated: 2026-10-08

## Visual / material work

### 1. Production scanned PBR texture sets
**Status:** Deferred. Current builder uses lightweight procedural color/roughness/bump maps for major stone materials.

**Still wanted:** Proper seamless albedo/base-color, normal, roughness, ambient-occlusion, and (where appropriate) metallic maps for marble, sandstone, limestone, travertine, granite, stone, brick, concrete/stucco/plaster, timber, bronze and gold.

**Why not done yet:** We do not yet have vetted production texture files in the repository. A reference sheet is not suitable as a texture source. Assets should have clear commercial licensing and should be optimized before being added.

**Revisit when:** We have suitable licensed/CC0 texture sets and can test their download size, GPU memory use, and appearance on phones.

### 2. Consistent real-world texture scale / UV mapping
**Status:** Not implemented.

**Still wanted:** Material grain, brick size, marble veins and wood grain should remain physically believable when buildings are resized.

**Why not done yet:** Best implemented together with final texture assets and improved UV mapping; tuning against temporary maps would create rework.

**Revisit when:** Production PBR maps are selected.

### 3. Ambient occlusion / stronger contact depth
**Status:** Partially addressed with soft shadows and fill/bounce lighting; dedicated AO is not implemented.

**Still wanted:** Subtle contact darkening where columns meet floors, trim meets walls, wings intersect, stairs meet platforms, etc.

**Why not done yet:** SSAO/post-processing adds GPU cost and complexity, especially on mobile. Baked AO depends on final geometry/UVs.

**Revisit when:** We can profile representative Android/iPhone devices and choose SSAO, baked AO, or selective contact-shadow techniques.

### 4. Beveled architectural edges
**Status:** Not implemented globally.

**Still wanted:** Small bevels/chamfers on walls, steps, arches, trim and other hard architectural edges so highlights behave naturally.

**Why not done yet:** This changes geometry and polygon counts. A blanket bevel could hurt mobile performance or distort modular joins.

**Revisit when:** Core modular geometry is stable and we can apply selective/optimized bevels.

### 5. True/recessed door, window and arch openings
**Status:** Not implemented. Current details are primarily attached to wall surfaces.

**Still wanted:** Actual openings/recesses so windows, doors and arches feel constructed into the wall rather than pasted onto it.

**Why not done yet:** Requires robust wall geometry modification/CSG or a purpose-built modular wall system. It can affect dragging, wall selection, joins, materials and performance.

**Revisit when:** Building/wall architecture is stable enough to redesign openings without breaking existing placement behavior.

### 6. HDR/environment reflections
**Status:** Not implemented. Current scene uses direct, hemisphere and fill lighting.

**Still wanted:** Lightweight environment reflections for marble, glass, bronze, gold and polished surfaces.

**Why not done yet:** Needs an appropriate licensed HDR environment plus PMREM/environment-map setup and mobile performance testing.

**Revisit when:** We have a suitable HDR asset and can profile it with the final PBR materials.

### 7. Higher-quality ground, paving and landscaping
**Status:** Not implemented beyond the current basic ground and existing builder content.

**Still wanted:** Better terrain/ground materials, paving/path options and richer environmental integration.

**Why not done yet:** Architectural building interaction and material quality are higher priorities; adding environment assets now would increase scope and download/render cost.

**Revisit when:** Core building workflow and architectural materials are stable.

## Interaction / architecture work

### 8. Explicit building Move/Edit mode
**Status:** Partially deferred. Accidental movement from normal building taps was disabled.

**Still wanted:** Tap = select/inspect. Camera gestures = view. A deliberate Move/Edit action = reposition the selected building.

**Why not done yet:** Needs a clear interaction design that does not conflict with direct manipulation of doors, windows, arches, columns, statues and other details.

**Revisit when:** We next focus on interaction/UX rather than visual materials.

### 9. Separate structures/wings from stories in the data model
**Status:** Current level array can contain both ground-floor building pieces and elevated levels.

**Still wanted:** A clearer model such as structures/wings containing stories, allowing a circular building with attached halls/wings and independent upper levels.

**Why not done yet:** This is a meaningful data-model refactor and could affect existing saved state, selection, movement, rendering and the Add Level flow.

**Revisit when:** Multiple-building placement is stable enough to migrate without losing user-created work.

### 10. Joined/intersecting building geometry
**Status:** Separate building pieces can be positioned together; automatic clean joins are not complete.

**Still wanted:** Connected wings should visually and structurally join without overlapping interior walls, seams or awkward intersections.

**Why not done yet:** Depends on the final structures/wings model and wall/opening system.

**Revisit when:** Items 5 and 9 are being addressed.

## Performance rule

Visual improvements should be tested on phones before increasing texture resolution, shadow resolution, post-processing or polygon counts. Prefer selective quality improvements over making every object expensive.

## Preservation rule

Do not intentionally remove existing working features, objects, materials, controls, saved-data behavior or assets while implementing these improvements without explicit approval. Log future deferred items here as they are identified.
