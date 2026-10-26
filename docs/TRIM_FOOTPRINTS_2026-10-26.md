# Trim follows building footprints · October 26, 2026

## Cause and correction

Every trim attachment was rendered as a rectangular-face box using the overall width/depth, regardless of building shape. Four trim faces therefore made a floating square around a round temple, as shown in the supplied phone screenshot; concave and polygonal buildings had the same underlying mismatch.

`buildingTrim.ts` now builds wall-attached bands from the existing footprint dimensions. Round/oval/polygon/star bands follow their actual contours. Compound rectangular shapes use the exposed union boundary; courtyard and ring openings remain open, with their inner wall contours included. Shared miter points join corners without bridging empty space.

The existing four face choices own disjoint compass sectors, splitting edges where needed. This keeps all four choices usable even on a triangle. Saved IDs, faces, styles, ownership and collection contents remain unchanged. Every trim record, including its ornament blocks, is one tagged pickable mesh. Existing `u` values phase ornaments along the attached band; they no longer slide an entire wall-length band off its wall. Bands remain attached for every saved offset.

No camera controller, camera/gesture/framing code, movement gate, level/roof/wall geometry, door/window/column/stair/pediment geometry, material, leaf, scene layout or save format changes are included. Roof cornices and other architectural systems are outside this trim-only correction.

## Verification

- All 60 builder checks and TypeScript pass. The original camera fingerprints still pass without changing their lock manifest.
- Five new geometry tests cover all 20 saved footprints, all four faces and all 10 trim styles at two aspect ratios (1,600 combinations), finite/nonempty geometry, actual compound-wall contact, holes, joined bands without wall-length gaps, removal of the round building's square frame and anchored ornament movement.
- Production-browser comparison passes for the same six complete saved templates and a 20-footprint fixture: every saved piece and every non-trim mesh position/normal checksum, local transform and selection tag matches the pre-fix version.
- A real ray-picked curved trim selects its existing editor without changing navigation state. Adding and exporting a new trim preserves all 20 buildings and their existing data. Portrait/landscape screenshots show the corrected round temple.
- Integrated regression results are recorded in the Echoes preview evidence and `scripts/verify-trim.cjs` in the Echoes app repository.

Physical-phone confirmation remains pending. Existing designs retain their data and acquire corrected trim geometry when reopened.
