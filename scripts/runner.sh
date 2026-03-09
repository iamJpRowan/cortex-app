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
#   ./scripts/runner.sh --worktree /path/to/worktree  # Use a specific git worktree (default: ../cortex-app-runner)
#   ./scripts/runner.sh --model MODEL [--ollama]      # Override model and/or use Ollama
#   ./scripts/runner.sh --no-ollama                  # Use Anthropic Claude instead of default Ollama
#
# Default: Ollama with model danielsheep/Qwen3-Coder-30B-A3B-Instruct-1M-Unsloth:UD-Q4_K_XL.
# Use --no-ollama to use Anthropic Claude (requires claude auth login). Use --model to override the model.
#
# Git worktree: The runner uses a separate worktree so you can stay on main in the main repo while
# agents work on backlog branches. Beads state (.beads) is shared via a symlink in the worktree.
# Set RUNNER_WORKTREE or use --worktree to override the default worktree path.
#
# Ollama: Default backend is local Ollama. Ensure Ollama is running (e.g. ollama serve) and the model is pulled.
#
# Monitor the active Claude session (in another terminal):
#   tail -f $(cat scripts/sessions/.current)
# Or: tail -f scripts/runner.log  (runner events) and tail -f scripts/sessions/task-*.log (session output)
#
# Requires: claude (Claude Code CLI) installed and logged in. Run 'claude auth login' if needed. (Not required when using --ollama.)

set -euo pipefail

MAX_TASKS=0  # 0 = unlimited
DRY_RUN=false
ONCE=false
POLL_INTERVAL=30  # seconds between polls when idle
TASKS_COMPLETED=0
DECOMPOSITIONS_COMPLETED=0
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Default: local Ollama model (override with --model; use --no-ollama for Anthropic Claude)
DEFAULT_OLLAMA_MODEL="danielsheep/Qwen3-Coder-30B-A3B-Instruct-1M-Unsloth:UD-Q4_K_XL"
CLAUDE_MODEL="$DEFAULT_OLLAMA_MODEL"
USE_OLLAMA=true

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
    --worktree)
      RUNNER_WORKTREE="$2"
      shift 2
      ;;
    --model)
      CLAUDE_MODEL="$2"
      shift 2
      ;;
    --ollama)
      USE_OLLAMA=true
      shift
      ;;
    --no-ollama)
      USE_OLLAMA=false
      shift
      ;;
    -h|--help)
      echo "Usage: runner.sh [--poll SECONDS] [--max-tasks N] [--once] [--dry-run] [--worktree PATH] [--model MODEL] [--ollama]"
      echo ""
      echo "Options:"
      echo "  --poll N        Seconds between polls when idle (default: 30)"
      echo "  --max-tasks N   Stop after completing N implementation tasks (default: unlimited)"
      echo "  --once          Run one pass then exit (don't poll)"
      echo "  --dry-run       Show what would run without spawning agents (implies --once)"
      echo "  --worktree PATH Git worktree path for agent work (default: REPO_ROOT/../cortex-app-runner or RUNNER_WORKTREE env)"
      echo "  --model MODEL   Model for Claude Code (default: $DEFAULT_OLLAMA_MODEL when using Ollama)"
      echo "  --ollama        Use local Ollama as backend (default)"
      echo "  --no-ollama     Use Anthropic Claude instead of Ollama (requires claude auth login)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Resolve runner worktree path (absolute); may be set by --worktree or RUNNER_WORKTREE env
RUNNER_WORKTREE="${RUNNER_WORKTREE:-$REPO_ROOT/../cortex-app-runner}"
if [[ "$RUNNER_WORKTREE" != /* ]]; then
  RUNNER_WORKTREE="$(cd "$REPO_ROOT" && cd "$RUNNER_WORKTREE" && pwd)"
fi
export RUNNER_WORKTREE

# Prevent using the main repo as worktree so backlog updates stay on backlog branches
REPO_ROOT_CANON=$(cd "$REPO_ROOT" && pwd -P)
RUNNER_WORKTREE_CANON=$(cd "$RUNNER_WORKTREE" && pwd -P 2>/dev/null) || true
if [[ -n "$RUNNER_WORKTREE_CANON" && "$REPO_ROOT_CANON" == "$RUNNER_WORKTREE_CANON" ]]; then
  echo "Error: Runner worktree must not be the main repo. Use a separate worktree (e.g. default: $REPO_ROOT/../cortex-app-runner)." >&2
  exit 1
fi

# When using Ollama, point Claude Code at the local Ollama server (Anthropic-compatible API)
if $USE_OLLAMA; then
  export ANTHROPIC_AUTH_TOKEN=ollama
  export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-http://localhost:11434}"
  export ANTHROPIC_API_KEY=""
fi

# Extra args for every claude invocation (e.g. --model MODEL)
# When using Ollama we always pass the model; when using Anthropic we only pass if user set a different model
CLAUDE_EXTRA_ARGS=()
if [[ -n "$CLAUDE_MODEL" ]] && { $USE_OLLAMA || [[ "$CLAUDE_MODEL" != "$DEFAULT_OLLAMA_MODEL" ]]; }; then
  CLAUDE_EXTRA_ARGS=(--model "$CLAUDE_MODEL")
fi

# BACKLOG_DIR is in the worktree so we read/write backlog docs there
BACKLOG_DIR="$RUNNER_WORKTREE/docs/product/backlog"

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
if ! command -v gh &>/dev/null; then
  echo "Error: runner.sh requires 'gh' (GitHub CLI) to be installed and on PATH." >&2
  echo "  Install with: brew install gh" >&2
  exit 1
fi
# When using Ollama we don't need Anthropic login; otherwise require it
if ! $USE_OLLAMA; then
  AUTH_JSON=$(claude auth status 2>/dev/null || echo "")
  if ! echo "$AUTH_JSON" | jq -e '.loggedIn == true' &>/dev/null; then
    echo "Error: Claude Code is not logged in. Runner cannot spawn sessions." >&2
    echo "  Run: claude auth login" >&2
    exit 1
  fi
fi

SESSIONS_DIR="$REPO_ROOT/scripts/sessions"
CURRENT_SESSION_FILE="$SESSIONS_DIR/.current"
ATTEMPTS_FILE="$SESSIONS_DIR/.attempts"
MAX_TASK_RETRIES=3
mkdir -p "$SESSIONS_DIR"

# Ensure the runner worktree exists and shares beads state with the main repo.
# Use a branch 'runner-main' (from main) because the same branch cannot be checked out in two worktrees.
ensure_runner_worktree() {
  if [[ ! -d "$RUNNER_WORKTREE" ]]; then
    log "Creating runner worktree at $RUNNER_WORKTREE (branch runner-main from main)"
    err=$(git -C "$REPO_ROOT" worktree add -b runner-main "$RUNNER_WORKTREE" main 2>&1) || true
    if [[ ! -d "$RUNNER_WORKTREE" ]]; then
      echo "Error: Failed to create worktree at $RUNNER_WORKTREE" >&2
      echo "$err" >&2
      exit 1
    fi
  fi
  # Share .beads so beads state is canonical in the main repo
  if [[ -e "$RUNNER_WORKTREE/.beads" ]] && [[ ! -L "$RUNNER_WORKTREE/.beads" ]]; then
    rm -rf "$RUNNER_WORKTREE/.beads"
  fi
  if [[ ! -e "$RUNNER_WORKTREE/.beads" ]]; then
    ln -s "$REPO_ROOT/.beads" "$RUNNER_WORKTREE/.beads"
    log "Linked $RUNNER_WORKTREE/.beads -> $REPO_ROOT/.beads"
  fi
}
ensure_runner_worktree

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

# Find backlog items with a given status by reading frontmatter (returns first match only to avoid SIGPIPE with head -1).
# Optional second arg: directory to search (default: BACKLOG_DIR). Use REPO_ROOT for refined-items so we see user's main repo.
find_backlog_items_by_status() {
  local status="$1"
  local dir="${2:-$BACKLOG_DIR}"
  for file in "$dir"/*.md; do
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

# Get epic ID for a task (parent in parent-child dependency). bd show can return a single object or array of one. Run bd from main repo.
get_epic_for_task() {
  local task_id="$1"
  local raw
  raw=$(cd "$REPO_ROOT" && bd show "$task_id" --json 2>/dev/null)
  echo "$raw" | jq -r 'if type == "array" then .[0] else . end | [.dependencies[]? | select(.type == "parent-child") | .depends_on_id][0] // empty' 2>/dev/null
}

# Get backlog doc path from epic description (expects "Backlog: docs/product/backlog/<slug>.md"). bd show can return array of one. Run bd from main repo.
get_backlog_path_for_epic() {
  local epic_id="$1"
  local raw desc path
  raw=$(cd "$REPO_ROOT" && bd show "$epic_id" --json 2>/dev/null)
  desc=$(echo "$raw" | jq -r 'if type == "array" then .[0].description else .description end // ""' 2>/dev/null)
  path=$(echo "$desc" | grep -oE 'docs/product/backlog/[a-zA-Z0-9_.-]+\.md' | head -1)
  if [[ -z "$path" ]]; then
    path=$(echo "$desc" | grep -oE 'Backlog:[[:space:]]*docs/product/backlog/[^[:space:]]+\.md' | sed 's/^Backlog:[[:space:]]*//' | head -1)
  fi
  echo "$path"
}

# Ensure the runner worktree is on branch backlog/<slug> for the given backlog path; create from main if needed
ensure_backlog_branch() {
  local backlog_path="$1"
  local slug
  slug=$(basename "$backlog_path" .md)
  local branch="backlog/$slug"
  local current
  current=$(git -C "$RUNNER_WORKTREE" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [[ "$current" != "$branch" ]]; then
    if git -C "$RUNNER_WORKTREE" show-ref --quiet "refs/heads/$branch" 2>/dev/null; then
      git -C "$RUNNER_WORKTREE" checkout "$branch" 2>/dev/null || true
    else
      git -C "$RUNNER_WORKTREE" fetch origin main 2>/dev/null || true
      git -C "$RUNNER_WORKTREE" checkout -b "$branch" origin/main 2>/dev/null || git -C "$RUNNER_WORKTREE" checkout -b "$branch" runner-main 2>/dev/null || true
    fi
    log "Switched worktree to branch $branch for backlog item $slug"
  fi
}

# Output lines "EPIC_ID BACKLOG_PATH" for epics that are complete (all children closed) and not yet ready for review. Run bd from main repo.
list_epics_ready_for_review_handoff() {
  local export_file
  export_file=$(mktemp)
  (cd "$REPO_ROOT" && bd export -o "$export_file" 2>/dev/null) || true
  [[ ! -s "$export_file" ]] && rm -f "$export_file" && return

  local issues
  issues=$(jq -R -s 'split("\n") | map(select(length > 0)) | map(fromjson)' "$export_file" 2>/dev/null)
  rm -f "$export_file"
  [[ -z "$issues" ]] && return

  local epics
  epics=$(echo "$issues" | jq -r '.[] | select(.issue_type == "epic") | .id' 2>/dev/null)
  for epic in $epics; do
    local children
    children=$(echo "$issues" | jq --arg e "$epic" '[.[] | select(.dependencies != null and (.dependencies | any(.type == "parent-child" and .depends_on_id == $e)))]' 2>/dev/null)
    local nchild closed
    nchild=$(echo "$children" | jq 'length' 2>/dev/null)
    closed=$(echo "$children" | jq 'all(.status == "closed")' 2>/dev/null)
    if [[ "$nchild" -gt 0 && "$closed" == "true" ]]; then
      local backlog_path
      backlog_path=$(get_backlog_path_for_epic "$epic")
      if [[ -n "$backlog_path" ]]; then
        local full_path="$RUNNER_WORKTREE/$backlog_path"
        if [[ -f "$full_path" ]]; then
          local status
          status=$(awk '/^---$/{if(n++) exit} /^status:/{print $2}' "$full_path" 2>/dev/null)
          if [[ "$status" != "ready for review" ]]; then
            echo "$epic $backlog_path"
          fi
        fi
      fi
    fi
  done
}

log "Runner started. poll=${POLL_INTERVAL}s, max-tasks=${MAX_TASKS:-unlimited}, once=$ONCE, dry-run=$DRY_RUN"
log "Runner worktree: $RUNNER_WORKTREE (main repo: $REPO_ROOT)"
if $USE_OLLAMA; then
  log "Backend: Ollama (ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-http://localhost:11434})"
  log "Model: $CLAUDE_MODEL"
else
  if [[ -n "$CLAUDE_MODEL" ]] && [[ "$CLAUDE_MODEL" != "$DEFAULT_OLLAMA_MODEL" ]]; then
    log "Model: $CLAUDE_MODEL"
  else
    log "Model: (Anthropic default)"
  fi
fi
log "Sessions dir: $SESSIONS_DIR — to watch live: tail -f \$(cat $CURRENT_SESSION_FILE 2>/dev/null || echo $SESSIONS_DIR/*.log | head -1)"

while true; do
  DID_WORK=false

  # --- Phase 1: Decompose any 'refined' backlog items into Beads tasks ---

  REFINED_ITEM=$(find_backlog_items_by_status "refined" "$REPO_ROOT/docs/product/backlog" | head -1)

  if [[ -n "$REFINED_ITEM" ]]; then
    ITEM_NAME=$(basename "$REFINED_ITEM" .md)
    log "Found refined backlog item: $ITEM_NAME"
    DID_WORK=true
    git -C "$RUNNER_WORKTREE" checkout runner-main 2>/dev/null || true
    # Copy refined doc from main repo to worktree so the decompose agent sees the latest
    cp -f "$REFINED_ITEM" "$RUNNER_WORKTREE/docs/product/backlog/$ITEM_NAME.md" 2>/dev/null || true

    if $DRY_RUN; then
      log "[DRY RUN] Would decompose: $ITEM_NAME ($REFINED_ITEM)"
    else
      DECOMPOSE_PROMPT="You are working on the cortex-app project.

Your task: Decompose the backlog item '$ITEM_NAME' into Beads tasks.

Follow the decompose-backlog-item workflow in docs/development/agents/decompose-backlog-item.md.

The backlog item is at: docs/product/backlog/$ITEM_NAME.md (relative to the project root you are given).

Steps:
1. Read the backlog item and all docs it references (implements, references, depends_on items).
2. Create a Beads epic with description that includes: Backlog: docs/product/backlog/$ITEM_NAME.md (so the runner can link epic to branch and ready-for-review).
3. Break into session-sized tasks (~10-30 min each) with dependencies (bd create, bd dep add).
4. Tag each task as auto-advance or review-required in the description.
5. Update the backlog item status to 'ready' in frontmatter.

Do not implement anything. Only create the Beads task graph."

      SESSION_LOG="$SESSIONS_DIR/decompose-${ITEM_NAME}-$(date '+%Y%m%d-%H%M%S').log"
      echo "$SESSION_LOG" > "$CURRENT_SESSION_FILE"
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Session started — decompose $ITEM_NAME" >> "$SESSION_LOG"
      log "Spawning Claude Code to decompose $ITEM_NAME..."
      log "  Session log: $SESSION_LOG (watch: tail -f $SESSION_LOG)"
      if echo "$DECOMPOSE_PROMPT" | claude "${CLAUDE_EXTRA_ARGS[@]}" -p --dangerously-skip-permissions --add-dir "$RUNNER_WORKTREE" 2>&1 | tee -a "$SESSION_LOG"; then
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

  READY_JSON=$(cd "$REPO_ROOT" && bd ready --json 2>/dev/null || echo "[]")
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
    CLAIM_OUTPUT=$(cd "$REPO_ROOT" && bd update "$CANDIDATE_ID" --claim 2>&1)
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
    TASK_DESC=$(cd "$REPO_ROOT" && bd show "$TASK_ID" --json 2>/dev/null | jq -r 'if type == "array" then .[0].description else .description end // ""' 2>/dev/null || echo "")
    DID_WORK=true

    log "Claimed task: $TASK_ID — $TASK_TITLE"

    # Ensure we're on the branch for this backlog item (branch per backlog item)
    EPIC_ID=$(get_epic_for_task "$TASK_ID")
    if [[ -n "$EPIC_ID" ]]; then
      BACKLOG_PATH=$(get_backlog_path_for_epic "$EPIC_ID")
      if [[ -n "$BACKLOG_PATH" ]]; then
        ensure_backlog_branch "$BACKLOG_PATH"
      fi
    fi

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
4. Create or update the devlog for this backlog item (one devlog per item; append as you complete beads).
5. When done: close or set ready_to_test per the workflow, then run prepare-to-commit and commit (see work-backlog-item close out). Fix any pre-commit hook failures and retry until commit succeeds. Do not push.
6. For auto-advance tasks: close with 'bd update $TASK_ID --status closed'. For review-required: 'bd update $TASK_ID --status ready_to_test' and summarize what to test."

      SESSION_LOG="$SESSIONS_DIR/task-${TASK_ID}-$(date '+%Y%m%d-%H%M%S').log"
      echo "$SESSION_LOG" > "$CURRENT_SESSION_FILE"
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Session started — task $TASK_ID — $TASK_TITLE" >> "$SESSION_LOG"
      log "Spawning Claude Code session for $TASK_ID — $TASK_TITLE"
      log "  Session log: $SESSION_LOG (watch: tail -f $SESSION_LOG)"
      if echo "$PROMPT" | claude "${CLAUDE_EXTRA_ARGS[@]}" -p --dangerously-skip-permissions --add-dir "$RUNNER_WORKTREE" 2>&1 | tee -a "$SESSION_LOG"; then
        TASKS_COMPLETED=$((TASKS_COMPLETED + 1))
        clear_fail_count "$TASK_ID"
        log "Task $TASK_ID session complete. Total completed: $TASKS_COMPLETED"

        # Phase 2b: If any epic has all children closed and is not yet "ready for review", spawn set-backlog-item-ready-for-review agent
        while IFS= read -r line; do
          [[ -z "$line" ]] && continue
          EPIC_FOR_REVIEW=$(echo "$line" | awk '{print $1}')
          BACKLOG_FOR_REVIEW=$(echo "$line" | cut -d' ' -f2-)
          # Ensure we're on the backlog branch so the backlog doc update is committed there (same branch as prior beads)
          ensure_backlog_branch "$BACKLOG_FOR_REVIEW"
          log "Epic $EPIC_FOR_REVIEW complete; spawning set-backlog-item-ready-for-review for $BACKLOG_FOR_REVIEW"
          REVIEW_PROMPT="You are working on the cortex-app project.

The epic $EPIC_FOR_REVIEW has all tasks closed. Prepare the backlog item for human review.

Follow the workflow in docs/development/agents/set-backlog-item-ready-for-review.md.

Epic ID: $EPIC_FOR_REVIEW
Backlog document path: $BACKLOG_FOR_REVIEW

Do only what that workflow describes. Do not implement code or set the item to completed/archive."
          SESSION_LOG_REVIEW="$SESSIONS_DIR/ready-for-review-${EPIC_FOR_REVIEW}-$(date '+%Y%m%d-%H%M%S').log"
          echo "$SESSION_LOG_REVIEW" > "$CURRENT_SESSION_FILE"
          if echo "$REVIEW_PROMPT" | claude "${CLAUDE_EXTRA_ARGS[@]}" -p --dangerously-skip-permissions --add-dir "$RUNNER_WORKTREE" 2>&1 | tee -a "$SESSION_LOG_REVIEW"; then
            log "Set backlog item ready for review complete for $EPIC_FOR_REVIEW"

            REVIEW_SLUG=$(basename "$BACKLOG_FOR_REVIEW" .md)
            REVIEW_BRANCH="backlog/$REVIEW_SLUG"

            # Commit any uncommitted backlog doc changes so they're on the same branch as the implementation
            if git -C "$RUNNER_WORKTREE" status --porcelain -- "$BACKLOG_FOR_REVIEW" "docs/product/backlog/review/${REVIEW_SLUG}.md" 2>/dev/null | grep -q .; then
              log "Committing backlog doc updates for $REVIEW_SLUG..."
              git -C "$RUNNER_WORKTREE" add "$BACKLOG_FOR_REVIEW"
              [[ -f "$RUNNER_WORKTREE/docs/product/backlog/review/${REVIEW_SLUG}.md" ]] && git -C "$RUNNER_WORKTREE" add "docs/product/backlog/review/${REVIEW_SLUG}.md"
              if ! git -C "$RUNNER_WORKTREE" diff --cached --quiet 2>/dev/null; then
                git -C "$RUNNER_WORKTREE" commit -m "chore(backlog): set $REVIEW_SLUG ready for review" 2>&1 | tee -a "$SESSION_LOG_REVIEW" || log "WARNING: commit failed for backlog doc"
              fi
            fi

            # Push branch and create PR for human review
            log "Pushing $REVIEW_BRANCH and creating PR..."
            if git -C "$RUNNER_WORKTREE" push -u origin "$REVIEW_BRANCH" 2>&1 | tee -a "$SESSION_LOG_REVIEW"; then
              # Extract review summary from backlog doc for PR body
              BACKLOG_FULL_PATH="$RUNNER_WORKTREE/$BACKLOG_FOR_REVIEW"
              PR_BODY=""
              if [[ -f "$BACKLOG_FULL_PATH" ]]; then
                # Extract everything from "## Review summary" to the next h2 or end of file
                PR_BODY=$(awk '/^## Review summary/{found=1; next} found && /^## /{exit} found{print}' "$BACKLOG_FULL_PATH" 2>/dev/null)
              fi
              if [[ -z "$PR_BODY" ]]; then
                PR_BODY="All beads for **$REVIEW_SLUG** are complete. See the backlog doc at \`$BACKLOG_FOR_REVIEW\` for details."
              fi
              if gh pr create \\
                --repo "$(git -C "$RUNNER_WORKTREE" remote get-url origin 2>/dev/null)" \\
                --head "$REVIEW_BRANCH" \\
                --base main \\
                --title "backlog: $REVIEW_SLUG" \\
                --body "$PR_BODY" \\
                2>&1 | tee -a "$SESSION_LOG_REVIEW"; then
                log "PR created for $REVIEW_BRANCH"
              else
                log "WARNING: Failed to create PR for $REVIEW_BRANCH — push succeeded, create PR manually"
              fi
            else
              log "WARNING: Failed to push $REVIEW_BRANCH — create PR manually"
            fi
          else
            log "WARNING: Set-backlog-item-ready-for-review session exited with error for $EPIC_FOR_REVIEW — check $SESSION_LOG_REVIEW"
          fi
        done < <(list_epics_ready_for_review_handoff)
      else
        FAIL_CNT=$(get_fail_count "$TASK_ID")
        FAIL_CNT=$((FAIL_CNT + 1))
        set_fail_count "$TASK_ID" "$FAIL_CNT"
        # Clear status and assignee so the task is claimable again (--status open alone does not clear assignee)
        (cd "$REPO_ROOT" && bd update "$TASK_ID" --status open --assignee "" 2>/dev/null) || true
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
