# Examples

A polyglot collection of examples organized by language and deployable stack.
See [AGENTS.md](AGENTS.md) for the directory layout and package-manager conventions.

## Development setup

Install [mise](https://mise.jdx.dev/getting-started.html) 2026.9.9 or newer, then
run from the repository root:

```sh
mise trust
mise run setup
mise tasks --all
```

`setup` installs the pinned toolchains, then installs the root pnpm and uv
workspace dependencies using their frozen lockfiles.

The root `mise.toml` pins Node.js, pnpm, Python, uv, Rust (including rustfmt,
Clippy, and LLVM coverage tools), cargo-llvm-cov, Java, Go, .NET, Terraform,
the AWS CLI, and Caddy. Gradle uses the checked-in wrapper. pnpm, uv, Cargo, and
Go still manage project dependencies and their lockfiles.

Activate mise in your shell (for example, `eval "$(mise activate zsh)"`) to use
the selected tools directly, or prefix commands with `mise exec --`:

```sh
mise exec -- pnpm install --frozen-lockfile
mise exec -- uv sync --frozen
```

mise loads the root `.env` when present. uv uses the mise-managed Python version
and does not download another interpreter. Machine-specific overrides can go in
the gitignored `mise.local.toml`.

The dev container installs mise and runs `mise run setup` after creation, using
the same tool versions and workspace dependencies. Docker/Buildx is required
separately for container-based examples; the dev container provides
Docker-outside-of-Docker integration.

## Tasks

```sh
mise run setup                       # Install tools and root workspace dependencies
mise run ci                          # Rust → Python → Node → Java → Terraform
mise run //crates:ci
mise run //python:ci
mise run //packages:ci
mise run //java:ci
mise run //stacks:ci
mise run //pulumi/aws-ec2-public:ci   # separate Pulumi/Go pipeline
mise run //terraform/aws-ecs-cloudmap:check
```

Tasks live in each group's or stack's `mise.toml`. Workspace tasks run from the
repository root, Java tasks from `java/aws`, and stack tasks from their stack
directory. The CI pipelines run stages sequentially and stop at the first failure.

You can also run tasks from a subdirectory:

```sh
mise -C python run ci
mise -C stacks/aws-blocks run dev
mise -C stacks/agentcore-web-search run invoke --help
```

### Migrating existing commands

| Previous command                   | mise equivalent                        |
| ---------------------------------- | -------------------------------------- |
| `just ci`                          | `mise run ci`                          |
| `just -f python/justfile ci`       | `mise run //python:ci`                 |
| `just push v2`                     | `mise run push v2`                     |
| `just invoke prompt="..."`         | `mise run invoke --prompt "..."`       |
| `just exec code='print(2+2)'`      | `mise run exec --code 'print(2+2)'`    |
| `just auth_mode=openrouter deploy` | `AUTH_MODE=openrouter mise run deploy` |
| `just region=us-east-2 run`        | `REGION=us-east-2 mise run run`        |

Stack commands in this table run from the corresponding stack directory. The
MicroVM image name can be overridden with `IMAGE_NAME`. CDK bootstrap keeps its
positional account and optional region: `mise run cdk-bootstrap <account-id> us-east-1`.

GitHub Actions uses `jdx/mise-action` to install only the tools each job needs,
then runs these same tasks with tool auto-install disabled for that job.
