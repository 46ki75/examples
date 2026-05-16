default:
    @just --list

fmt:
    cargo fmt --all

fmt-check:
    cargo fmt --all -- --check

lint:
    cargo clippy --workspace --all-targets -- -D warnings

test:
    cargo test --workspace

ci: fmt-check lint test

# Instrumented test run (no report yet)
test-cov:
    cargo llvm-cov --no-report --workspace

# AI-friendly: per-file table (drop 100% files) + uncovered line numbers
coverage: test-cov
    cargo llvm-cov report --show-missing-lines --color=always 2>&1 | grep -v " 100.00%"

# Local HTML drilldown
coverage-html: test-cov
    cargo llvm-cov report --html --open

# CI / Codecov upload
coverage-ci: test-cov
    cargo llvm-cov report --lcov --output-path lcov.info

test-live:
    cargo test --workspace -- --ignored

test-live-cov:
    cargo llvm-cov --no-report --workspace -- --ignored

coverage-live: test-live-cov
    cargo llvm-cov report --show-missing-lines --color=always 2>&1 | grep -v " 100.00%"

ci-live: fmt-check lint test test-live
