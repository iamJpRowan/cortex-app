[Docs](../README.md) / [Design](./README.md) / App Components

# App Components and UI Consistency

**Primitives** (shadcn/ui, AI Elements) are the foundation. **App components** are Cortex-specific patterns that keep the interface **consistent** so it stays **intuitive** for users.

## Why app components matter

- **Consistency → intuitiveness.** When the same actions and concepts are presented the same way across the app, users learn once and apply everywhere. Variations and bespoke patterns force the user to figure out each place and add cognitive effort.
- App component reuse is a **UX requirement** for an intuitive interface, not just code reuse.

## Definitions

- **Primitives:** Low-level building blocks. shadcn components live in `src/renderer/src/components/ui/`; AI Elements in `components/ai-elements/`. Use them consistently via design tokens (see [Design Tokens](./design-tokens.md), [UI Guide](./ui-guide.md)).
- **App components:** Cortex-specific, product-level patterns (e.g. list with empty state, section with header + actions, provider/model selector). They live in `src/renderer/src/components/` **outside** `ui/` and `ai-elements/`. Views and panels compose primitives and app components; when the same pattern appears in multiple places, it should be (or become) an app component.

## Rules for implementers

1. **Before adding new UI:** Review existing app components (`src/renderer/src/components/`, excluding `ui/` and `ai-elements/`) and the [UI Guide](./ui-guide.md). Prefer reusing or extending an app component.
2. **If you add bespoke UI:** Justify in the devlog or a brief comment (e.g. "No existing X" or "Y not suitable because …"). Document so future work can consider extracting.
3. **When touching existing UI:** When you modify a view or panel, consider whether this or other screens repeat a pattern that should be an app component. If so: extract or adopt an existing app component, or document an extraction candidate in the devlog. We improve the app component layer incrementally.

## See also

- [UI Guide](./ui-guide.md) — Styling and reuse (primitives first, then app components)
- [Terminology](./terminology.md) — Primitive vs app component
- [Work a backlog item](../agents/work-backlog-item.md) — When the item includes UI
