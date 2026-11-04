# Approved foliage restored — October 24, 2026

The user had approved small, numerous individual tree leaves and rejected large canopy clumps. The automatic landscape upgrade at `5866988` replaced that preferred detail with 96 larger clumps per tree. That was an unintended visual regression.

Restore fine, individually instanced foliage for background and placed trees: 360 leaves for broadleaf trees, 320 for pine, and 340 for cypress. Use the original small faceted leaf geometry and six-color palette, varied leaf angles, and small elongated leaf shapes. Scatter pine leaves along its tapered crown instead of forming stacked large clumps. Tree selection, species, timber, transforms, placement, and the expanded landscape are outside this correction.

The foliage regression checks now require at least 300 individual leaves per tree and reject any leaf instance with a scale over 0.19 units. The rejected canopy clumps ranged from roughly 0.23 to 0.57 units and would fail these checks. Preserve this design preference during future scenery work unless the user requests a change.

Verification: production build and TypeScript; full automated suite; environment browser checks and screenshots. Physical phone performance is not measured by the software-rendered browser checks. Instancing remains two draw calls per tree. The 320–360 small leaves use fewer triangles in total than the 96 former clumps (20 triangles per leaf instead of 80 per clump). The environment browser check uses reduced motion for stable screenshots and allows longer screenshot/navigation waits for the slower software renderer used by the test environment.

Verified results: all 26 automated checks pass; a production build in an isolated temporary copy passes; rendered portrait and wider-scene screenshots show fine individual leaves instead of the rejected clumps. The working copy's build reached successful compilation/type checking but hit a local `.next/export` cleanup race; the isolated copy and Vercel build succeeded.

Untested/inconclusive: the complete software-browser save/reload flow did not finish within the test environment's waits (screenshot, reload, and canvas wait timeouts). The live cloud browser also reports `GL_RENDERER = Disabled` and cannot create a WebGL context. These runs do not verify physical-device performance or a complete live WebGL flow. Do not describe the full browser flow as passed for this correction.
