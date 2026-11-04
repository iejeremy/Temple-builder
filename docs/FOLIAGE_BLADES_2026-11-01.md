# Fine leaf blades — November 1, 2026

Reported symptom: tree foliage appears as a blotch in the deployed 3D view.
The exact device rendering cause has not been reproduced. This targeted candidate
replaces solid 20-triangle leaf polyhedra with thin pointed, folded four-triangle
blades, rendered on both sides. Leaf widths are smaller; instance positions,
angles, counts (360/320/340), colors, timber, species, placement and camera are
preserved. Two meshes per tree remain. Shadow settings are unchanged.

Validation: Three.js 0.186.1 and TypeScript 5.9.3. Twelve existing environment
and scenery preset checks passed; three focused species checks passed across
three seeds each. The foliage module passed strict TypeScript checking.
Tests verify thin geometry, finite deterministic transforms, original counts,
small instances, palette preservation between identical seeds and triangle budget.
CI runs the focused tests; the builder also runs its full suite, types and build.

Limitations: live visual reproduction was blocked because the cloud browser has
WebGL disabled. Tests do not establish visual quality or physical-device behavior.
Keep this candidate on a review branch until Vercel build and visual review.
