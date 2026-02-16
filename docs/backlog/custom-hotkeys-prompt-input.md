---
status: considering
---

[Docs](../README.md) / [Backlog](./README.md) / Custom Hotkeys for Prompt Input

# Custom Hotkeys for Prompt Input

## Goal

Allow users to view and override all keyboard shortcuts for the chat prompt input (composer). Overrides apply to **both** Plaintext and Live Preview modes so that the same logical action is triggered by the same key in either mode (e.g. “bold” is Cmd+B in both; in plaintext it wraps selection in `**`, in rich it toggles bold).

## Scope

- **Settings:** All prompt-input hotkeys (including TipTap’s current defaults) are configurable under the existing view-specific pattern (e.g. `chatView.hotkeys.*`). Users can see every binding and, in a later phase, edit them.
- **Rich editor (Live Preview):** TipTap’s built-in keybindings are replaced (or overridden) by a single key handler that reads bindings from settings and runs the corresponding editor commands. This allows overriding every default (bold, italic, code, code block, headings, lists, undo/redo, etc.).
- **Plaintext editor:** The same hotkey bindings from settings are applied: when the user presses a configured shortcut, the same logical action runs in plaintext (e.g. “bold” = wrap selection in `**` or insert `****` with cursor between; “toggle list” = insert `- ` or continue list). Behavior is consistent with the rich editor in terms of *which key does what*, with mode-appropriate implementation (markdown syntax in plaintext vs. ProseMirror commands in rich).

## Requirements (explicit)

- **Single source of truth:** All prompt-input shortcuts (toggle composer mode, bold, italic, strike, code, code block, headings, paragraph, lists, hard break, undo, redo, etc.) are defined in settings (e.g. `chatView.hotkeys.toggleComposerMode`, `chatView.hotkeys.tiptap.bold`, …) with sensible defaults matching current TipTap and app behavior.
- **Override TipTap defaults:** No reliance on TipTap’s hardcoded shortcuts for the composer; all bindings are driven by settings so the user can override any of them.
- **Consistent across modes:** The same setting key (e.g. “bold”) is used in both Plaintext and Live Preview. The *effect* is mode-appropriate (markdown syntax vs. rich formatting), but the *key* is the same.
- **Settings UI:** Shortcuts tab already has a “Chat view” subsection; it should list all prompt-input hotkeys (toggle composer + all TipTap-style actions) so users can see and, when implemented, edit them.
- **Conflict handling:** If the user binds the same shortcut to two actions, the UI or validation should make this clear; default bindings should avoid conflicts (e.g. toggle composer uses Cmd+Alt+E to avoid TipTap’s Cmd+E for code).

## Prerequisites

- **[Chat Rich Markdown Input](./chat-rich-markdown-input.md)** — Done. Composer has Plaintext and Live Preview; toggle hotkey (`chatView.hotkeys.toggleComposerMode`) and view-specific hotkey pattern exist.
- **Hotkey parser** supports modifiers (e.g. Cmd+Alt+E) as implemented for the toggle composer hotkey.

## Out of scope (for this item)

- Making shortcuts editable in the UI (can be a follow-up; this item can phase “display only” first, then “edit”).
- Global (OS-level) hotkeys; all bindings are in-app and view-scoped when appropriate.

## Success criteria

- All prompt-input-related hotkeys (toggle composer + full set of TipTap-style actions) are defined in settings with defaults and shown in the Shortcuts tab under Chat view.
- In Live Preview, pressing a configured shortcut runs the corresponding TipTap command (or equivalent), using settings as the source of truth (TipTap’s built-in keymap not used for those actions).
- In Plaintext, pressing the same shortcut performs the corresponding markdown-level action (e.g. wrap in `**`, insert list marker) so behavior is consistent with the rich editor.
- Users can later change bindings in settings and have both modes respect the new bindings.

## See also

- [Chat Rich Markdown Input](./chat-rich-markdown-input.md) — Composer implementation; toggle hotkey.
- [docs/development/ui-state-persistence.md](../development/ui-state-persistence.md) — Settings and view keys.
- TipTap StarterKit and extension keymaps (e.g. bold Mod-b, italic Mod-i, code Mod-e, code block Mod-Alt-c, headings Mod-Alt-1..3, paragraph Mod-Alt-0, bullet list Mod-Shift-8, ordered list Mod-Shift-7, undo/redo Mod-z / Shift-Mod-z, hard break Mod-Enter, etc.) as reference for the full set of actions to support.
