# Clear Site — October 23, 2026

Baseline: `5639def`, with the approved visual checkpoint preserved on `checkpoint/approved-studio-2026-10-23`.

Added **Clear site** beside the save status in the bottom dock, accessible from every editor without horizontal scrolling. It is disabled when the site is empty.

After confirmation, it clears all placed temples, levels and attached details, perimeter walls/features, free-standing columns, statues, landscaping/fountains, and any unconfirmed building. Selection and Move mode reset. The chosen environmental backdrop remains unchanged. Existing automatic saving persists the empty design.

**Undo** restores the full design snapshot, including ownership IDs, attachments, perimeter, site objects, scenery choice and pending placement. The existing individual-building and level deletion controls continue to work. If new pieces have been added after clearing, restoring the old site asks for confirmation before replacing that work. The confirmation explains that Undo is available until leaving/reloading the page; it is an in-session snapshot, not an additional persisted save slot.

Validation: TypeScript, production build and `node scripts/verify-clear-site.cjs`. Browser coverage includes dismissal without changes; complete clearing; exact full-scene Undo; existing individual-building deletion/Undo; empty-site persistence after reload; pending placement clearing/Undo; and confirmation before replacing newly added work. Tests use isolated browser storage and never clear the user's actual site.

The approved camera, materials, template geometry and appearance are unchanged.
