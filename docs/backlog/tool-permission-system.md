[Docs](../README.md) / [Backlog](./README.md) / Tool Permission System

# Tool Permission System

## Goal

Implement user-controlled tool permission system that allows users to authorize which tools the LLM can use, either through pre-configuration or runtime approval. Ensures users maintain control over what actions the LLM can take on their behalf.

## Relation to LangChain Integration

The LangChain integration exposes `tools.list()` via IPC specifically to support this future permission system. The tool registry pattern enables filtering tools by permission before passing to the agent. This backlog item would:
- Add permission metadata to tool definitions
- Implement pre-authorization via user settings
- Add runtime approval flow (LLM requests tool → user approves/denies)
- Store permission decisions in user preferences
- Filter tool registry based on permissions before agent initialization
- Add UI for managing tool permissions (checkboxes, allow/deny lists)

The agent would only receive tools the user has authorized, maintaining transparency and control.

## Key Capabilities

- Pre-authorize tools through settings UI
- Runtime permission requests with approve/deny prompts
- Remember permission decisions per tool
- Granular control (per-tool, per-category, global policies)
- Permission audit log (what tools were used when)
- Revoke permissions and clear history
- Safe defaults (conservative permissions out of box)

## Notes

Critical for user trust and safety, especially when plugin ecosystem enables community-contributed tools. Should be implemented before allowing user-installable plugins.
