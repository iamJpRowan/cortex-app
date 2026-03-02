[Docs](../README.md) / [Development](../README.md) / AI Elements

# Installing AI Elements Components

This project uses [AI Elements](https://elements.ai-sdk.dev) (Vercel) for AI-oriented UI components (e.g. Chain of Thought, message, conversation). The renderer lives under `src/renderer/`, so components must install into that tree.

## Why not `npx ai-elements@latest add`?

The AI Elements CLI runs `shadcn@latest add <url>` under the hood. The AI Elements **registry** hardcodes install targets like `components/ai-elements/...`, so files end up at the project root in `components/`, not in `src/renderer/src/components/`. Your `components.json` is only used when the registry does *not* override the path.

## Correct approach: use shadcn with `--path`

Call the **shadcn** CLI directly and pass the install path that matches your layout:

```bash
npx shadcn@latest add https://elements.ai-sdk.dev/api/registry/<component>.json \
  --path src/renderer/src/components/ai-elements \
  -y
```

Replace `<component>` with the component name (e.g. `chain-of-thought`, `message`, `conversation`, `code-block`).

**Examples:**

```bash
# Chain of Thought
npx shadcn@latest add https://elements.ai-sdk.dev/api/registry/chain-of-thought.json \
  --path src/renderer/src/components/ai-elements -y

# Message
npx shadcn@latest add https://elements.ai-sdk.dev/api/registry/message.json \
  --path src/renderer/src/components/ai-elements -y
```

All files for that component (and its registry dependencies) are written under `src/renderer/src/components/ai-elements/`. No manual move or path fixes if your `tsconfig.json` already has `"@/*": ["./src/renderer/src/*"]`.

## Prerequisites

- **components.json** at project root with `aliases` pointing at the renderer (e.g. `components`: `src/renderer/src/components`, `ui`: `src/renderer/src/components/ui`, `lib`: `src/renderer/src/lib`).
- **tsconfig.json** (or jsconfig.json) with `paths` resolving `@/` to `./src/renderer/src/*` so generated imports work.

## After install

- If the registry emits imports like `@/registry/default/ui/...`, change them to your UI alias (e.g. `@/components/ui/...`) so they resolve.
- Install any new npm dependencies the CLI reports (e.g. `@radix-ui/react-use-controllable-state`).

## Registry index

Available components and URLs: [elements.ai-sdk.dev](https://elements.ai-sdk.dev). Install by name: `https://elements.ai-sdk.dev/api/registry/<name>.json`.
