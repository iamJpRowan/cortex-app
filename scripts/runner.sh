#!/usr/bin/env bash
#
# runner.sh — Continuous agent execution daemon
#
# Runs persistently in the background. Polls for:
#   1. 'refined' backlog items to decompose into Beads tasks
#   2. Ready Beads tasks to work via Claude Code sessions
#
# When nothing is ready, it sleeps and polls again. Stays alive until you stop it.
#
# Usage:
#   ./scripts/runner.sh                  # Run persistently (polls every 30s when idle)
#   ./scripts/runner.sh --poll 60        # Poll every 60s when idle
#   ./scripts/runner.sh --max-tasks 3    # Stop after completing 3 implementation tasks
#   ./scripts/runner.sh --once           # Run one pass then exit (old behavior)
#   ./scripts/runner.sh --dry-run        # Show what would run without spawning agents

set -euo pipefail

MAX_TASKS=0  # 0 = unlimited
DRY_RUN=false
ONCE=false
POLL_INTERVAL=30  # seconds between polls when idle
TASKS_COMPLETED=0
DECOMPOSITIONS_COMPLETED=0
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKLOG_DIR="$REPO_ROOT/docs/product/backlog"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --max-tasks)
      MAX_TASKS="$2"
      shift 2
      ;;
    --poll)
      POLL_INTERVAL="$2"
      shift 2
      ;;
    --once)
      ONCE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      ONCE=true  # dry-run implies single pass
      shift
      ;;
    -h|--help)
      echo "Usage: runner.sh [--poll SECONDS] [--max-tasks N] [--once] [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --poll N        Seconds between polls when idle (default: 30)"
      echo "  --max-tasks N   Stop after completing N implementation tasks (default: unlimited)"
      echo "  --once          Run one pass then exit (don't poll)"
      echo "  --dry-run       Show what would run without spawning agents (implies --once)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Require dependencies so we don't exit silently in the loop (set -e + pipefail)
if ! command -v jq &>/dev/null; then
  echo "Error: runner.sh requires 'jq' to be installed and on PATH." >&2
  echo "  Install with: brew install jq" >&2
  exit 1
fi
if ! command -v bd &>/dev/null; then
  echo "Error: runner.sh requires 'bd' (beads) to be installed and on PATH." >&2
  echo "  See project README or AGENTS.md for setup." >&2
  exit 1
fi

# Trap SIGINT for clean exit
trap 'log "Interrupted. Completed $DECOMPOSITIONS_COMPLETED decomposition(s) and $TASKS_COMPLETED task(s)."; exit 0' INT

# Find backlog items with a given status by reading frontmatter
find_backlog_items_by_status() {
  local status="$1"
  for file in "$BACKLOG_DIR"/*.md; do
    [[ "$(basename "$file")" == "README.md" ]] && continue
    [[ "$(basename "$file")" == "TEMPLATE.md" ]] && continue
    local file_status
    file_status=$(awk '/^---$/{if(n++) exit} /^status:/{print $2}' "$file" 2>/dev/null)
    if [[ "$file_status" == "$status" ]]; then
      echo "$file"
    fi
  done
}

log "Runner started. poll=${POLL_INTERVAL}s, max-tasks=${MAX_TASKS:-unlimited}, once=$ONCE, dry-run=$DRY_RUN"

while true; do
  DID_WORK=false

  # --- Phase 1: Decompose any 'refined' backlog items into Beads tasks ---

  REFINED_ITEM=$(find_backlog_items_by_status "refined" | head -1)

  if [[ -n "$REFINED_ITEM" ]]; then
    ITEM_NAME=$(basename "$REFINED_ITEM" .md)
    log "Found refined backlog item: $ITEM_NAME"
    DID_WORK=true

    if $DRY_RUN; then
      log "[DRY RUN] Would decompose: $ITEM_NAME ($REFINED_ITEM)"
    else
      DECOMPOSE_PROMPT="You are working on the cortex-app project.

Your task: Decompose the backlog item '$ITEM_NAME' into Beads tasks.

Follow the decompose-backlog-item workflow in docs/development/agents/decompose-backlog-item.md.

The backlog item is at: $REFINED_ITEM

Steps:
1. Read the backlog item and all docs it references (implements, references, depends_on items).
2. Create a Beads epic: bd create \"$ITEM_NAME\" -t epic
3. Break into session-sized tasks (~10-30 min each) with dependencies (bd create, bd dep add).
4. Tag each task as auto-advance or review-required in the description.
5. Update the backlog item status to 'ready' in frontmatter.

Do not implement anything. Only create the Beads task graph."

      log "Spawning Claude Code to decompose $ITEM_NAME..."
      claude --task "$DECOMPOSE_PROMPT" || {
        log "WARNING: Claude Code session exited with error for decomposition of $ITEM_NAME"
      }

      DECOMPOSITIONS_COMPLETED=$((DECOMPOSITIONS_COMPLETED + 1))
      log "Decomposition of $ITEM_NAME complete. Total decompositions: $DECOMPOSITIONS_COMPLETED"
    fi

    sleep 2
    $ONCE && break || continue
  fi

  # --- Phase 2: Execute ready Beads tasks ---

  # Check task limit
  if [[ $MAX_TASKS -gt 0 && $TASKS_COMPLETED -ge $MAX_TASKS ]]; then
    log "Reached max-tasks limit ($MAX_TASKS). Stopping."
    break
  fi

  READY_JSON=$(bd ready --json 2>/dev/null || echo "[]")
  TASK_ID=$(echo "$READY_JSON" | jq -r '.[0].id // empty' 2>/dev/null || echo "")

  if [[ -n "$TASK_ID" ]]; then
    TASK_TITLE=$(echo "$READY_JSON" | jq -r '.[0].title // "Untitled"' 2>/dev/null || echo "Untitled")
    TASK_DESC=$(bd show "$TASK_ID" --json 2>/dev/null | jq -r '.description // ""' 2>/dev/null || echo "")
    DID_WORK=true

    log "Found ready task: $TASK_ID — $TASK_TITLE"

    if $DRY_RUN; then
      log "[DRY RUN] Would claim and work: $TASK_ID — $TASK_TITLE"
      REMAINING=$(echo "$READY_JSON" | jq -r '.[1:][] | "  \(.id) — \(.title)"' 2>/dev/null || echo "")
      if [[ -n "$REMAINING" ]]; then
        log "[DRY RUN] Also ready:"
        echo "$REMAINING"
      fi
    else
      log "Claiming task $TASK_ID..."
      bd update "$TASK_ID" --claim

      PROMPT="You are working on the cortex-app project.

Your Beads task: $TASK_ID — $TASK_TITLE

Task description:
$TASK_DESC

Instructions:
1. Run 'bd show $TASK_ID' to get full task details.
2. Read the linked backlog item and referenced docs before starting.
3. Follow the work-backlog-item workflow in docs/development/agents/work-backlog-item.md.
4. Create a devlog for this session.
5. When done:
   - For auto-advance tasks: close with 'bd update $TASK_ID --status closed'
   - For review-required tasks: set 'bd update $TASK_ID --status ready_to_test' and summarize what to test."

      log "Spawning Claude Code session for $TASK_ID..."
      claude --task "$PROMPT" || {
        log "WARNING: Claude Code session exited with error for $TASK_ID"
      }

      TASKS_COMPLETED=$((TASKS_COMPLETED + 1))
      log "Task $TASK_ID session complete. Total completed: $TASKS_COMPLETED"
    fi

    sleep 2
    $ONCE && break || continue
  fi

  # --- Nothing to do ---

  if $ONCE || $DRY_RUN; then
    log "No refined items or ready tasks. Exiting (--once mode)."
    break
  fi

  if ! $DID_WORK; then
    log "Idle. No refined items or ready tasks. Polling again in ${POLL_INTERVAL}s..."
    sleep "$POLL_INTERVAL"
  fi
done

log "Runner finished. $DECOMPOSITIONS_COMPLETED decomposition(s), $TASKS_COMPLETED task(s)."
