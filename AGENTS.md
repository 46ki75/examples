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
