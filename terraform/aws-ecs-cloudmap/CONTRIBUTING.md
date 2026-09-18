# Contributing

- Keep this example self-contained. Use the root mise toolchain and the tasks in
  this directory's `mise.toml`.
- Run `mise run init`, `mise run fmt`, and `mise run check` from this directory
  before submitting changes. `check` does not provision AWS resources.
- Read the Terraform plan before applying it. Live checks use the current AWS
  profile and the region recorded in Terraform outputs.
- Keep the Caddy image pinned by digest. When upgrading it, update the native
  Caddy version in the root `mise.toml` and verify both local and deployed behavior.
- Keep SRV discovery, ECS container health checks, and private task networking
  intact. Explain changes to these integration requirements in the README.
- Do not commit state, saved plans, credentials, or personal variable files.
