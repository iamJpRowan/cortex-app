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
#   ./scripts/runner.sh --max-tasks 3   # Stop after completing 3 implementation tasks
#   ./scripts/runner.sh --once           # Run one pass then exit (old behavior)
#   ./scripts/runner.sh --dry-run        # Show what would run without spawning agents
#
# Monitor the active Claude session (in another terminal):
#   tail -f $(cat scripts/sessions/.current)
# Or: tail -f scripts/runner.log  (runner events) and tail -f scripts/sessions/task-*.log (session output)
#
# Requires: claude (Claude Code CLI) installed and logged in. Run 'claude auth login' if needed.

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

LOG_FILE="$REPO_ROOT/scripts/runner.log"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
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
if ! command -v claude &>/dev/null; then
  echo "Error: runner.sh requires 'claude' (Claude Code CLI) to be installed and on PATH." >&2
  echo "  Install from: https://claude.com/code" >&2
  exit 1
fi
AUTH_JSON=$(claude auth status 2>/dev/null || echo "")
if ! echo "$AUTH_JSON" | jq -e '.loggedIn == true' &>/dev/null; then
  echo "Error: Claude Code is not logged in. Runner cannot spawn sessions." >&2
  echo "  Run: claude auth login" >&2
  exit 1
fi

SESSIONS_DIR="$REPO_ROOT/scripts/sessions"
CURRENT_SESSION_FILE="$SESSIONS_DIR/.current"
ATTEMPTS_FILE="$SESSIONS_DIR/.attempts"
MAX_TASK_RETRIES=3
mkdir -p "$SESSIONS_DIR"

# Per-session failure count: skip tasks that have failed MAX_TASK_RETRIES times this run
get_fail_count() {
  local id="$1"
  if [[ -f "$ATTEMPTS_FILE" ]]; then
    local line
    line=$(grep -m1 "^${id} " "$ATTEMPTS_FILE" 2>/dev/null)
    [[ -n "$line" ]] && echo "${line##* }" || echo "0"
  else
    echo "0"
  fi
}
set_fail_count() {
  local id="$1" count="$2"
  local tmp
  tmp=$(mktemp)
  if [[ -f "$ATTEMPTS_FILE" ]]; then
    grep -v "^${id} " "$ATTEMPTS_FILE" 2>/dev/null > "$tmp" || true
  fi
  echo "$id $count" >> "$tmp"
  mv -f "$tmp" "$ATTEMPTS_FILE"
}
clear_fail_count() {
  local id="$1"
  [[ ! -f "$ATTEMPTS_FILE" ]] && return
  grep -v "^${id} " "$ATTEMPTS_FILE" 2>/dev/null > "${ATTEMPTS_FILE}.tmp" || true
  mv -f "${ATTEMPTS_FILE}.tmp" "$ATTEMPTS_FILE"
}

# Trap SIGINT for clean exit; remove session-scoped attempts file
trap 'rm -f "$ATTEMPTS_FILE"; log "Interrupted. Completed $DECOMPOSITIONS_COMPLETED decomposition(s) and $TASKS_COMPLETED task(s)."; exit 0' INT

# Find backlog items with a given status by reading frontmatter (returns first match only to avoid SIGPIPE with head -1)
find_backlog_items_by_status() {
  local status="$1"
  for file in "$BACKLOG_DIR"/*.md; do
    [[ "$(basename "$file")" == "README.md" ]] && continue
    [[ "$(basename "$file")" == "TEMPLATE.md" ]] && continue
    local file_status
    file_status=$(awk '/^---$/{if(n++) exit} /^status:/{print $2}' "$file" 2>/dev/null)
    if [[ "$file_status" == "$status" ]]; then
      echo "$file"
      return 0
    fi
  done
}

log "Runner started. poll=${POLL_INTERVAL}s, max-tasks=${MAX_TASKS:-unlimited}, once=$ONCE, dry-run=$DRY_RUN"
log "Sessions dir: $SESSIONS_DIR — to watch live: tail -f \$(cat $CURRENT_SESSION_FILE 2>/dev/null || echo $SESSIONS_DIR/*.log | head -1)"

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

      SESSION_LOG="$SESSIONS_DIR/decompose-${ITEM_NAME}-$(date '+%Y%m%d-%H%M%S').log"
      echo "$SESSION_LOG" > "$CURRENT_SESSION_FILE"
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Session started — decompose $ITEM_NAME" >> "$SESSION_LOG"
      log "Spawning Claude Code to decompose $ITEM_NAME..."
      log "  Session log: $SESSION_LOG (watch: tail -f $SESSION_LOG)"
      if echo "$DECOMPOSE_PROMPT" | claude -p --dangerously-skip-permissions --add-dir "$REPO_ROOT" 2>&1 | tee -a "$SESSION_LOG"; then
        DECOMPOSITIONS_COMPLETED=$((DECOMPOSITIONS_COMPLETED + 1))
        log "Decomposition of $ITEM_NAME complete. Total decompositions: $DECOMPOSITIONS_COMPLETED"
      else
        log "WARNING: Claude Code session exited with error for decomposition of $ITEM_NAME — check $SESSION_LOG"
      fi
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
  READY_COUNT=$(echo "$READY_JSON" | jq 'length' 2>/dev/null || echo "0")

  # Try to claim the first ready task we can (skip already claimed, or at max retries this session)
  TASK_ID=""
  TASK_TITLE=""
  i=0
  while [[ $i -lt $READY_COUNT ]]; do
    CANDIDATE_ID=$(echo "$READY_JSON" | jq -r ".[$i].id // empty" 2>/dev/null)
    i=$((i + 1))
    [[ -z "$CANDIDATE_ID" ]] && continue
    FAIL_CNT=$(get_fail_count "$CANDIDATE_ID")
    if [[ "${FAIL_CNT:-0}" -ge $MAX_TASK_RETRIES ]]; then
      log "Skip $CANDIDATE_ID — failed $FAIL_CNT times this session (max $MAX_TASK_RETRIES). Trying next ready task."
      continue
    fi
    CANDIDATE_TITLE=$(echo "$READY_JSON" | jq -r ".[$((i-1))].title // \"Untitled\"" 2>/dev/null)
    set +e
    CLAIM_OUTPUT=$(bd update "$CANDIDATE_ID" --claim 2>&1)
    CLAIM_RC=$?
    set -euo pipefail
    if [[ $CLAIM_RC -eq 0 ]]; then
      TASK_ID="$CANDIDATE_ID"
      TASK_TITLE="$CANDIDATE_TITLE"
      break
    fi
    log "Skip $CANDIDATE_ID — $CLAIM_OUTPUT. Trying next ready task."
  done

  if [[ $READY_COUNT -gt 0 && -z "$TASK_ID" ]]; then
    log "No ready task could be claimed (all already claimed?). Idle."
  fi

  if [[ -n "$TASK_ID" ]]; then
    TASK_DESC=$(bd show "$TASK_ID" --json 2>/dev/null | jq -r '.description // ""' 2>/dev/null || echo "")
    DID_WORK=true

    log "Claimed task: $TASK_ID — $TASK_TITLE"

    if $DRY_RUN; then
      log "[DRY RUN] Would work: $TASK_ID — $TASK_TITLE"
      REMAINING=$(echo "$READY_JSON" | jq -r '.[1:][] | "  \(.id) — \(.title)"' 2>/dev/null || echo "")
      if [[ -n "$REMAINING" ]]; then
        log "[DRY RUN] Also ready:"
        echo "$REMAINING"
      fi
    else
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

      SESSION_LOG="$SESSIONS_DIR/task-${TASK_ID}-$(date '+%Y%m%d-%H%M%S').log"
      echo "$SESSION_LOG" > "$CURRENT_SESSION_FILE"
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Session started — task $TASK_ID — $TASK_TITLE" >> "$SESSION_LOG"
      log "Spawning Claude Code session for $TASK_ID — $TASK_TITLE"
      log "  Session log: $SESSION_LOG (watch: tail -f $SESSION_LOG)"
      if echo "$PROMPT" | claude -p --dangerously-skip-permissions --add-dir "$REPO_ROOT" 2>&1 | tee -a "$SESSION_LOG"; then
        TASKS_COMPLETED=$((TASKS_COMPLETED + 1))
        clear_fail_count "$TASK_ID"
        log "Task $TASK_ID session complete. Total completed: $TASKS_COMPLETED"
      else
        FAIL_CNT=$(get_fail_count "$TASK_ID")
        FAIL_CNT=$((FAIL_CNT + 1))
        set_fail_count "$TASK_ID" "$FAIL_CNT"
        # Clear status and assignee so the task is claimable again (--status open alone does not clear assignee)
        bd update "$TASK_ID" --status open --assignee "" 2>/dev/null || true
        log "WARNING: Claude Code session exited with error for $TASK_ID — unclaimed. Fail count this session: $FAIL_CNT/$MAX_TASK_RETRIES. Check $SESSION_LOG"
        if [[ $FAIL_CNT -ge $MAX_TASK_RETRIES ]]; then
          log "Task $TASK_ID will be skipped for the rest of this session (max retries reached)."
        fi
      fi
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

rm -f "$ATTEMPTS_FILE"
log "Runner finished. $DECOMPOSITIONS_COMPLETED decomposition(s), $TASKS_COMPLETED task(s)."
