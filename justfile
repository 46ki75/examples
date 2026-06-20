# Repo-root orchestrator. Each target directory owns a justfile with a `ci`
# recipe; the language-specific recipes (fmt, coverage, …) live there, not here.
# Run a single group with e.g. `cd crates && just ci`.
targets := "crates python packages go java stacks"

default:
    @just --list

# Run every target directory's `ci` recipe (fails fast if any is missing).
ci:
    #!/usr/bin/env bash
    set -euo pipefail
    for dir in {{targets}}; do
        # Require a justfile in the target itself. Without this guard, `just` in a
        # justfile-less dir walks up and re-runs THIS orchestrator (infinite loop).
        if [ ! -f "$dir/justfile" ]; then
            echo "error: $dir has no justfile (expected $dir/justfile with a 'ci' recipe)" >&2
            exit 1
        fi
        echo "==> ($dir) just ci"
        ( cd "$dir" && just ci )
    done
