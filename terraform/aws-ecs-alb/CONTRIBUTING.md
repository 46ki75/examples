# Contributing

- Keep this example self-contained and use the root mise toolchain.
- Run `mise run init`, `mise run fmt`, and `mise run check` from this directory
  before submitting changes. Local checks and mock Terraform tests do not provision
  AWS resources; `smoke`, `status`, and `rollback` use the current AWS profile.
- Read the Terraform plan before applying it. Do not provision resources as part
  of a code-only change without explicit permission.
- Preserve native ECS `BLUE_GREEN`, the two IP target groups, private tasks,
  restricted test ingress, and the ECS-owned listener actions. Explain ownership
  or deployment-workflow changes in the README and extend the mock tests.
- Keep the Caddy image pinned by digest. When upgrading it, update native Caddy
  in the root `mise.toml` and verify local and deployed behavior.
- Do not commit state, saved plans, credentials, or personal variable files.
