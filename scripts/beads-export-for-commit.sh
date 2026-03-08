#!/usr/bin/env bash
#
# Export beads issues to .beads/issues.jsonl so they can be included in git commits.
# Run before committing so issue state is versioned with the repo.
#
# Usage:
#   ./scripts/beads-export-for-commit.sh
#   git add .beads/issues.jsonl
#   git commit -m "..."
#

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$REPO_ROOT/.beads/issues.jsonl"

if ! command -v bd &>/dev/null; then
  echo "Error: bd (beads) not found. Install beads to export issues." >&2
  exit 1
fi

cd "$REPO_ROOT"
bd export -o "$OUTPUT"
echo "Exported beads to .beads/issues.jsonl — add and commit to include in git:"
echo "  git add .beads/issues.jsonl"
