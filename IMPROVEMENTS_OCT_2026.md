# Echoes Temple Builder — detailed architecture update

This update retains the existing project structure, templates, controls, saving, backup and restore functionality.

## Added
- Window stone surrounds, sills, lintels, mullions and crossbars on rectangular window styles.
- Door jambs, lintels, raised panels and metallic knobs.
- Column fluting, shaft rings, Ionic/Corinthian-inspired scrolls and tiered capitals.
- Balustrade details on supported wide, split, grand and ceremonial stair variants.
- Seven-pixel pointer movement threshold for moving doors, arches and detail pieces, reducing unintended movement when tapping.
- Hold Alt while dragging a movable building to use a finer 0.05-unit snap instead of 0.25 units (desktop).

## Scope and caveats
- Architectural detailing is procedural geometry, not imported high-poly assets or true wall cutouts. Windows and doors still sit on the surface of the existing walls.
- Existing interactions were retained; this update does not replace the selection model.
- Build/typecheck and phone touch testing have not been completed in this environment. Run `npm install`, `npm run typecheck`, `npm run build` and test on the target phone before deployment.

## Echoes account integration · October 26, 2026

Added an optional same-origin hosted studio adapter for account drafts and read-only published sanctuaries. Anonymous standalone editing retains its original storage key and controls. Read-only object selection emits temple/music/people/companion events to its host; camera/controller and gesture renderer remain byte-identical. Added six original procedural companion counterparts (dog, cat, rabbit, fox, bird, tortoise), validated for grounded finite geometry and existing landscape picking identity. Fine leaf meshes, every builder footprint, attachment and material remain.
