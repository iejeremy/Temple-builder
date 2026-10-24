# Natural scenery — October 23, 2026

Baseline: `25bb71d`. The approved studio checkpoint, existing assets, camera and building features are retained.

Added five placeable kinds under **Add → Scenery**:

- **Boulder**: irregular stone mesh with a small moss cap.
- **Grass**: 240 varied blades in one instanced mesh, plus an invisible touch-picking surface that does not cast a shadow.
- **Hill**: smooth raised mound with a gently sloping edge and vertex color variation. It is an independent scenery piece, not a destructive edit to the base terrain.
- **River**: broad winding water ribbon with banks, ripples and bank stones.
- **Creek**: a narrower, shorter winding watercourse using the same lightweight ribbon system.

The water has reflective material and static surface highlights. This does not introduce fluid simulation, animated flow, terrain excavation, or water collision. Geometry is generated locally with no third-party asset downloads or continuous render loop.

All five kinds inherit object picking, deliberate Move-mode dragging, rotation, uniform scale, duplication, individual deletion, local saving, design export, Whole Site framing and Clear Site/full-scene Undo. New pieces are placed near the selected temple, with staggered positions to reduce overlap. Position and scale inputs reject non-finite values; scale matches the renderer's existing 0.3–4 range. Existing rock, pond, fountain, garden, path and tree choices remain. The welcome overlay disappears as soon as any object is placed, so scenery-only designs remain visible.

Validation:

- TypeScript and production build.
- `npm test`: 20 checks, including seven new checks for finite geometry, ground placement, instanced grass, upward water normals and distinct river/creek dimensions.
- `node scripts/verify-scenery.cjs`: actual browser placement of all five kinds; transform edits; duplication/deletion; reload persistence; rendered instanced grass and multi-part water geometry; landscape framing; exact Clear Site/Undo restoration; and runtime error checks.
- Physical-device GPU performance is not measured by these browser tests.
