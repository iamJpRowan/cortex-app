[Docs](../README.md) / [Design](./README.md) / UI Guide

# UI Guide

Cortex uses **[shadcn/ui](https://ui.shadcn.com/docs)** (React components, Tailwind). UI components live in `src/renderer/src/components/ui/`; import from `@/components/ui/...`. They use our design tokens and support light/dark themes.

## Cortex-specific conventions

**Colors:** Use semantic tokens, not raw Tailwind colors. See [Design Tokens](./design-tokens.md) for the full set.

- Do: `text-text-primary`, `bg-bg-primary`, `border-border-primary`, `text-text-secondary`
- Don’t: `text-gray-900`, `bg-white`, `bg-blue-500` (no raw grays or accent colors except where we define accent)

**Layout/form helpers:** Use the utility classes in `src/renderer/src/main.css` when they fit: `card-padded`, `form-group`, `form-label`, `container-center`.

**Animation:** Use **tailwindcss-animate** (e.g. `animate-in`, `fade-in-0`, `slide-in-from-*`, `duration-200`). Don’t introduce a different animation system.

**New components:** Prefer shadcn components when one exists. Use design tokens for color; Tailwind for spacing/typography. Mobile-first; test both themes. Layout terms (Sidebars, Panels, Views): see [Terminology](./terminology.md). Implementation examples: `src/renderer/src/components/`.

## See also

- [Design Tokens](./design-tokens.md) — Token reference
- [Terminology](./terminology.md) — Layout and UI terms
- [Accessibility](./accessibility.md) — Guidelines
- [shadcn/ui](https://ui.shadcn.com/docs) · [Tailwind](https://tailwindcss.com/docs)
