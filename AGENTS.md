# AGENTS.md

## Repository Overview

This repository is a collection of project examples that are implemented in various languages.

## Directory Structure

- `crates/{project_name}/`: Projects written in Rust
- `java/{project_name}/`: Projects written in JVM family languages (Java, Kotlin, Scala)
- `others/{project_name}/`: Projects written in other languages or only configuration
- `packages/{project_name}/`: Projects written in TypeScript
- `pulumi/{project_name}/`: Projects using Pulumi
- `python/{project_name}/`: Projects written in Python
- `stacks/{deployable_unit}/`: Polyglot projects grouped by deployable unit (e.g. `terraform/` + `agent/`), rather than by language

## Package Manager

- Node.js/TypeScript projects use **pnpm** (see `packageManager` in the root
  `package.json`), not npm or yarn, for installs and running scripts.
- A project that embeds its own scaffolded tool with npm-specific assumptions
  (e.g. a generator that only auto-links npm's `workspaces` field) may still
  need its own scoped `pnpm-workspace.yaml` and `.npmrc` rather than joining
  the root workspace — see `stacks/aws-blocks/README.md` for a worked example.

## Toolchains and Tasks

- **mise** manages development tool versions and repository tasks. Run `mise trust`
  and `mise run setup` in a fresh checkout to install tools and root pnpm/uv
  dependencies; versions are pinned in root `mise.toml`.
- Run `mise run ci` for the root pipeline, or `mise run //python:ci` (and similarly
  `//crates:ci`, `//packages:ci`, `//java:ci`, `//stacks:ci`) for one group.
- Per-stack operations live in `stacks/<name>/mise.toml`. Use `mise tasks --all`
  to discover tasks and `mise run <task> --help` for arguments.
- Use `mise exec -- <command>` for direct tool invocations when the shell is not
  activated. See `README.md` for setup and argument migration examples.
