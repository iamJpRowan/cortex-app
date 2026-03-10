#!/usr/bin/env bash
#
# bead-reset.sh — Unstick in-progress beads and/or kill a stuck runner
#
# Usage:
#   ./scripts/bead-reset.sh               # Show status only
#   ./scripts/bead-reset.sh --reset <id>  # Reset a specific bead to open
#   ./scripts/bead-reset.sh --reset-all   # Reset ALL in-progress beads to open
#   ./scripts/bead-reset.sh --sync-jsonl     # Force ALL beads to match .beads/issues.jsonl
#   ./scripts/bead-reset.sh --reset-worktree # Reset worktree branch to match origin/main
#   ./scripts/bead-reset.sh --kill           # Kill any running runner.sh process
#   ./scripts/bead-reset.sh --kill --reset-all  # Both at once

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SESSIONS_DIR="$REPO_ROOT/scripts/sessions"
CURRENT_SESSION_FILE="$SESSIONS_DIR/.current"

RESET_ID=""
RESET_ALL=false
SYNC_JSONL=false
RESET_WORKTREE=false
KILL_RUNNER=false

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --reset)
      RESET_ID="$2"
      shift 2
      ;;
    --reset-all)
      RESET_ALL=true
      shift
      ;;
    --sync-jsonl)
      SYNC_JSONL=true
      shift
      ;;
    --reset-worktree)
      RESET_WORKTREE=true
      shift
      ;;
    --kill)
      KILL_RUNNER=true
      shift
      ;;
    -h|--help)
      echo "Usage: bead-reset.sh [--reset <id>] [--reset-all] [--kill]"
      echo ""
      echo "  (no args)        Show status: in-progress beads + runner process"
      echo "  --reset <id>     Reset a specific bead back to open"
      echo "  --reset-all      Reset ALL in-progress beads back to open"
      echo "  --sync-jsonl     Force ALL beads to match statuses in .beads/issues.jsonl"
      echo "  --reset-worktree Reset the runner worktree branch to match origin/main"
      echo "  --kill           Kill any running runner.sh process"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if ! command -v bd &>/dev/null; then
  echo "Error: bd (beads) not found on PATH." >&2
  exit 1
fi
if ! command -v jq &>/dev/null; then
  echo "Error: jq not found on PATH." >&2
  exit 1
fi

# --- Show runner status ---
echo "=== Runner Process ==="
RUNNER_PIDS=$(pgrep -f "scripts/runner.sh" 2>/dev/null || true)
if [[ -n "$RUNNER_PIDS" ]]; then
  echo "RUNNING (PIDs: $RUNNER_PIDS)"
  if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    CURRENT_LOG=$(cat "$CURRENT_SESSION_FILE" 2>/dev/null || echo "")
    [[ -n "$CURRENT_LOG" ]] && echo "  Active session log: $CURRENT_LOG"
  fi
else
  echo "Not running"
fi
echo ""

# --- Show in-progress beads ---
JSONL="$REPO_ROOT/.beads/issues.jsonl"
echo "=== In-Progress Beads ==="
if [[ -s "$JSONL" ]]; then
  IP_TASKS=$(jq -rs '[.[] | select(.status == "in_progress")] | if length == 0 then "none" else .[] | "\(.id)  \(.title)  [assignee: \(.assignee // "none")]" end' "$JSONL" 2>/dev/null || echo "none")
else
  IP_TASKS="(no issues.jsonl found at $JSONL)"
fi
echo "$IP_TASKS"
echo ""

# --- Kill runner ---
if $KILL_RUNNER; then
  echo "=== Killing Runner ==="
  if [[ -n "$RUNNER_PIDS" ]]; then
    for pid in $RUNNER_PIDS; do
      kill "$pid" 2>/dev/null && echo "Killed PID $pid" || echo "Could not kill PID $pid"
    done
    # Also kill any child claude processes spawned by runner
    sleep 1
    CLAUDE_PIDS=$(pgrep -f "claude.*--dangerously-skip-permissions" 2>/dev/null || true)
    if [[ -n "$CLAUDE_PIDS" ]]; then
      echo "Found spawned claude processes: $CLAUDE_PIDS"
      read -rp "Kill these claude processes too? [y/N] " confirm
      if [[ "$confirm" =~ ^[Yy]$ ]]; then
        for pid in $CLAUDE_PIDS; do
          kill "$pid" 2>/dev/null && echo "Killed claude PID $pid" || true
        done
      fi
    fi
  else
    echo "No runner process found."
  fi
  echo ""
fi

# --- Reset a specific bead ---
reset_bead() {
  local id="$1"
  cd "$REPO_ROOT"
  echo "Resetting $id -> open (clearing assignee)..."
  bd update "$id" --status open --assignee "" 2>&1 && echo "  Done." || echo "  Failed — check bd output above."
}

if [[ -n "$RESET_ID" ]]; then
  echo "=== Resetting Bead: $RESET_ID ==="
  reset_bead "$RESET_ID"
  echo ""
fi

# --- Reset all in-progress beads (via bd export / live state) ---
if $RESET_ALL; then
  echo "=== Resetting All In-Progress Beads ==="
  EXPORT_TMP=$(mktemp)
  cd "$REPO_ROOT"
  bd export -o "$EXPORT_TMP" 2>/dev/null || true
  if [[ -s "$EXPORT_TMP" ]]; then
    IP_IDS=$(jq -rs '.[] | select(.status == "in_progress") | .id' "$EXPORT_TMP" 2>/dev/null || true)
    rm -f "$EXPORT_TMP"
    if [[ -z "$IP_IDS" ]]; then
      echo "No in-progress beads found."
    else
      for id in $IP_IDS; do
        reset_bead "$id"
      done
    fi
  else
    rm -f "$EXPORT_TMP"
    echo "(could not export beads state)"
  fi
  echo ""
fi

# --- Sync all beads to match .beads/issues.jsonl ---
if $SYNC_JSONL; then
  echo "=== Syncing All Beads to Match $JSONL ==="
  if [[ ! -s "$JSONL" ]]; then
    echo "No issues.jsonl found at $JSONL — cannot sync."
  else
    cd "$REPO_ROOT"
    SYNC_IDS=$(jq -rs '.[] | "\(.id) \(.status)"' "$JSONL" 2>/dev/null || true)
    if [[ -z "$SYNC_IDS" ]]; then
      echo "No issues found in $JSONL."
    else
      COUNT=0
      while IFS=' ' read -r id status; do
        [[ -z "$id" ]] && continue
        echo "Setting $id -> $status..."
        bd update "$id" --status "$status" --assignee "" 2>&1 && echo "  Done." || echo "  Failed."
        COUNT=$((COUNT + 1))
      done <<< "$SYNC_IDS"
      echo "Synced $COUNT beads."
    fi
  fi
  echo ""
fi

# --- Reset worktree to match origin/main ---
if $RESET_WORKTREE; then
  RUNNER_WORKTREE="${RUNNER_WORKTREE:-$REPO_ROOT/../cortex-app-runner}"
  echo "=== Resetting Worktree to origin/main ==="
  if [[ ! -d "$RUNNER_WORKTREE" ]]; then
    echo "Worktree not found at $RUNNER_WORKTREE — nothing to reset."
  else
    echo "Fetching origin/main..."
    git -C "$RUNNER_WORKTREE" fetch origin main 2>&1
    echo "Checking out runner-main..."
    git -C "$RUNNER_WORKTREE" checkout runner-main 2>&1 || git -C "$RUNNER_WORKTREE" checkout -b runner-main origin/main 2>&1
    echo "Hard resetting to origin/main..."
    git -C "$RUNNER_WORKTREE" reset --hard origin/main 2>&1
    echo "Done. Worktree is now at: $(git -C "$RUNNER_WORKTREE" rev-parse --short HEAD)"
  fi
  echo ""
fi
