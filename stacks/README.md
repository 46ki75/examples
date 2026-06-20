# stacks

Polyglot, deployable units. Where the single-language directories (`crates/`,
`packages/`, `python/`, …) group projects by **language**, `stacks/` groups by
**deployable unit**: one directory per thing you deploy, holding every language
and tool it needs side by side.

## Convention

```
stacks/{unit}/
  README.md          # what it is, architecture, deploy order
  justfile           # orchestration across the sub-parts
  terraform/         # infrastructure as code
  agent/ | app/ | …  # application code (a member of the repo-root workspace)
```

Each sub-part is its own project (`pyproject.toml`, `Cargo.toml`, `package.json`, …)
that joins the matching repo-root workspace (uv / cargo / pnpm) as a member, so dev
tooling and the lockfile are shared with the rest of the repo while the stack still
deploys independently. Deployable members export a pinned dependency set at build
time (e.g. `uv export` → `requirements.txt`) rather than shipping the whole workspace.

## Stacks

| Stack                                            | What                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| [`agentcore-web-search`](./agentcore-web-search) | Web Search on Amazon Bedrock AgentCore: Gateway + web-search connector, ECR, Runtime, and Strands web-search + synthesize agents. |
