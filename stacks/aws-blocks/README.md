# AWS Blocks — Todo App

A runnable example of [AWS Blocks (Preview)][whats-new] — an open-source
TypeScript framework for composing an app's backend from **Blocks**: npm
packages that each bundle cloud infrastructure, Lambda runtime code, and a
local mock behind one typed API. You write one file
(`aws-blocks/index.ts`, the "IFC layer" — Infrastructure From Code), it runs
entirely on your laptop with **no AWS account**, and the same code deploys
unchanged to Lambda/DynamoDB/API Gateway/CloudFront when you're ready. AWS
Blocks apps are [AWS CDK][cdk] apps under the hood — drop into
`aws-blocks/index.cdk.ts` any time you need a raw CDK construct AWS Blocks
doesn't have a Block for.

This stack starts from the **stock output of the official scaffolder**
(`npm create @aws-blocks/blocks-app@latest`, template `default`): a real-time
todo app with username/password auth, per-user data isolation,
optimistic-locking updates, and live sync across browser tabs. Four things
were changed from the scaffolder's defaults: the frontend is rewritten from
the default lit-html renderer to **React + ReactDOM**; the package manager is
**pnpm**, not npm (see
[Why a scoped pnpm workspace](#why-a-scoped-pnpm-workspace)); every todo
mutation now queues a background **`AsyncJob`** that writes an activity-log
entry off the request path instead of inline; and a second **`KVStore`**
persists per-user settings (default sort, light/dark theme) that follow the
signed-in user across sessions (see
[How the pieces fit](#how-the-pieces-fit)). Everything else in
`aws-blocks/index.ts` is untouched scaffolder output.

```txt
  local (pnpm run dev, no AWS account) ──────────────────────────────────────
    src/index.tsx ──import 'aws-blocks'──▶  aws-blocks/client.js (generated)
                                               └─ local HTTP + WS server, running aws-blocks/index.ts:
                                                    ├─ AuthBasic         → JWT, in-memory users
                                                    ├─ DistributedTable  → in-memory table + indexes
                                                    ├─ KVStore (×2)      → in-memory activity log + settings
                                                    ├─ Realtime          → in-process WebSocket (todos + activity)
                                                    └─ AsyncJob          → queued, runs via setTimeout

  AWS (pnpm run sandbox | pnpm run deploy) ──────────────────────────────────
    same aws-blocks/index.ts, same src/index.tsx — only the conditional-exports
    resolution changes, via aws-blocks/index.cdk.ts (CDK synth). Every Block
    wires into ONE shared Lambda (see "AWS resources" below for the full list):
                                          ┌─ API Gateway REST  ─┐
                                          ├─ API Gateway WS     ├─▶ 1 Lambda ("Handler")
                                          └─ SQS event source  ─┘
                                          6× DynamoDB · 2× SQS · 2× SSM secrets
                                          + S3 + CloudFront (deploy only, not sandbox)
```

## Local vs AWS, at a glance

| Block                                 | Local (`pnpm run dev`)                                                                                         | AWS (`sandbox` / `deploy`)                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthBasic`                           | Local JWT signing; internal `KVStore` pair, file-backed                                                        | JWT secret in SSM SecureString; internal `KVStore` pair → DynamoDB `users`, `codes` tables                                                                             |
| `DistributedTable` (`todos`)          | File-backed store; `byPriority`/`byTitle` indexes simulated                                                    | DynamoDB table (`PAY_PER_REQUEST`) + 2 GSIs via a shared custom-resource Lambda                                                                                        |
| `KVStore` ×2 (`activity`, `settings`) | File-backed, one file per store                                                                                | 2 DynamoDB tables (`PAY_PER_REQUEST`), one per store                                                                                                                   |
| `Realtime`                            | In-process WebSocket server, same port as everything else (3000)                                               | API Gateway WebSocket API + stage; connections tracked via an internal `DistributedTable` → DynamoDB `connections` table (1 GSI, TTL); auth secret in SSM SecureString |
| `AsyncJob`                            | `setTimeout`-scheduled handler; retries up to `maxRetries` then moves the entry to an in-memory `failed` array | SQS main queue + DLQ (2 total), triggering the shared Lambda via an event source                                                                                       |
| `ApiNamespace`                        | Local HTTP server, port 3000                                                                                   | API Gateway REST API, single proxy integration                                                                                                                         |
| Compute                               | One local dev-server process (Node, no AWS calls)                                                              | 1 shared Lambda (2048 MB / 15-min timeout) backs every Block above — see [AWS resources](#aws-resources)                                                               |
| `Hosting` (deploy only)               | n/a — Vite serves the frontend directly                                                                        | S3 (private) + CloudFront (OAC) + SNS topic + CloudWatch 5xx alarm; skipped by `sandbox`, only created by `deploy`                                                     |

Full breakdowns, counts, and CDK-source citations: [Local resources](#local-resources) and [AWS resources](#aws-resources) below.

## Layout

| Path   | What                                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/` | The scaffolded AWS Blocks project — a **scoped pnpm workspace** (own `pnpm-workspace.yaml`), not a member of this repo's root pnpm workspace (see [Why a scoped pnpm workspace](#why-a-scoped-pnpm-workspace)) |

Inside `app/`:

| Path                            | What                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aws-blocks/index.ts`           | Backend: `Scope`, `AuthBasic`, `DistributedTable`, `KVStore` (×2), `Realtime`, `AsyncJob`, and the `ApiNamespace` RPC methods — the IFC layer AWS Blocks derives all infrastructure from |
| `aws-blocks/index.cdk.ts`       | Optional CDK layer: wraps the IFC layer in a `BlocksStack`, adds `Hosting` for the frontend, and relaxes removal policies in sandbox mode                                                |
| `aws-blocks/index.handler.ts`   | The Lambda entry point (`createLambdaHandler`)                                                                                                                                           |
| `src/index.tsx`                 | Frontend (React + ReactDOM): `import { api, authApi } from 'aws-blocks'` — no client generation, no REST/URL config                                                                      |
| `test/e2e.test.ts`              | Tests against the real typed client, run with `pnpm run test:e2e`                                                                                                                        |
| `.blocks/config.json`           | The committed `stackId` your CloudFormation stack names derive from                                                                                                                      |
| `pnpm-workspace.yaml`, `.npmrc` | Make this project's own `aws-blocks` local-alias package resolve under pnpm — see [Why a scoped pnpm workspace](#why-a-scoped-pnpm-workspace)                                            |

## Prerequisites

- **Node.js ≥ 22** and **pnpm ≥ 10** (`corepack enable` or `npm i -g pnpm`)
  for local dev — that's it, no AWS account needed.
- For `sandbox`/`deploy` only: the **AWS CLI** configured with credentials, and
  the account/Region pair bootstrapped once for CDK
  (`just cdk-bootstrap <account-id>`).

## Local dev (no AWS account)

```sh
cd stacks/aws-blocks
just install
just dev     # http://localhost:3000 — sign up, add todos, open a second tab
```

```sh
just typecheck
just test     # 16 e2e tests: auth, CRUD, secondary-index sorts, optimistic-locking
               # conflicts, the AsyncJob-queued activity log, and KVStore settings
```

<a id="local-resources"></a>

## Local resources

Nothing here touches AWS — every Block resolves to an in-process or
file-backed local implementation instead of the CDK construct in
[AWS resources](#aws-resources).

| Block                                 | Local behavior                                                                                                                                                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthBasic`                           | Local JWT signing; users, sessions, and verification codes live in its own internal `KVStore` pair (local, not the DynamoDB `users`/`codes` tables from the AWS side)                                                                                                                  |
| `DistributedTable` (`todos`)          | Local file-backed store; the 2 secondary indexes (`byPriority`, `byTitle`) are simulated in the mock, not real DynamoDB GSIs                                                                                                                                                           |
| `KVStore` ×2 (`activity`, `settings`) | Local file-backed store, one file per store                                                                                                                                                                                                                                            |
| `Realtime`                            | In-process WebSocket server — part of the same local dev server on port 3000, not a separate process or connection-tracking table                                                                                                                                                      |
| `AsyncJob`                            | `submit()` schedules the handler via `setTimeout` (no real SQS). On error it retries up to `maxRetries` (default 3, logged to the console each attempt) and then moves the entry to an in-memory `failed` array — a faithful simulation of the AWS DLQ behavior, just not a real queue |
| `ApiNamespace`                        | Routes calls through a local HTTP server, also on port 3000                                                                                                                                                                                                                            |

Data lives under `app/.bb-data/` (gitignored) — one subdirectory per Block —
and hot-reloads with your code. Delete the directory to reset all local state
(signed-up users, todos, activity log, settings). The frontend's Vite dev
server runs on a second port (3100), proxied through the AWS Blocks dev
server on 3000 so frontend and backend appear same-origin.

No AWS account, no credentials, no outbound network calls, no cost.

> [!NOTE]
> Verified on 2026-07-02 against the live `@aws-blocks/create-blocks-app@0.1.10`
> / `@aws-blocks/blocks@0.1.6` packages, with the React frontend, pnpm switch,
> AsyncJob queuing, and KVStore settings all applied: `pnpm install` →
> `typecheck` → `dev` (HTTP 200) → `build` → all 16 `test:e2e` cases pass —
> plus a real Playwright session confirming the theme toggle and default-sort
> preference both survive a full page reload. **Not** verified: `sandbox` /
> `deploy` against a real AWS account (this environment has none) — read
> [Deploy your application to AWS][deploy-docs] before running them, and
> expect preview-stage rough edges since every `@aws-blocks/*` package is
> still pre-1.0.

## Deploy to AWS

```sh
just cdk-bootstrap <account-id>   # once per account + Region
just sandbox                      # ephemeral, per-developer, Lambda hot-swap (seconds)
just sandbox-destroy

just deploy                       # full CloudFormation stack, incl. CloudFront/S3 hosting
just destroy
```

`sandbox` and `deploy` both regenerate `aws-blocks/client.js` (gitignored)
with AWS-runtime middleware before running — `build` alone will fail on a
fresh checkout until you've run `dev`, `sandbox`, or `deploy` at least once
locally.

<a id="aws-resources"></a>

## AWS resources

Confirmed by reading the actual CDK source in each installed `@aws-blocks/bb-*`
package (`node_modules/.pnpm/.../dist/index.cdk.js`), not just the prose
docs — the Developer Guide describes some of this at a higher level, and one
detail below (the shared Lambda) isn't documented at all as of this writing.

**Compute — one shared Lambda, not one per Block.** `@aws-blocks/core`'s
`setupBlocksInfra` creates a single `NodejsFunction` ("Handler": Node.js
runtime, 2048 MB, 15-min timeout) that backs _everything_ — every
`ApiNamespace` method, the WebSocket `$connect`/`$disconnect`/`$default`
routes, and the SQS event source for `AsyncJob`. Every Block's CDK construct
just wires another trigger onto that same function via `Scope`'s inherited
`this.handler` getter; nothing here provisions a second Lambda.

| Resource                          | Count                | Provisioned by              | Notes                                                                                               |
| --------------------------------- | -------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Lambda function                   | 1                    | shared (`@aws-blocks/core`) | 2048 MB / 15-min timeout, serves REST + WebSocket + SQS                                             |
| API Gateway REST API              | 1                    | shared                      | single proxy integration, not one resource per method                                               |
| API Gateway WebSocket API + stage | 1 + 1                | `Realtime`                  | routes point at the same shared Lambda                                                              |
| DynamoDB table                    | 6                    | see below                   | all `PAY_PER_REQUEST`                                                                               |
| SQS queue                         | 2                    | `AsyncJob`                  | main (`activity-log`) + DLQ (14-day retention, kicks in after `maxRetries`, default 3)              |
| SSM SecureString parameter        | 2                    | `AuthBasic`, `Realtime`     | JWT signing secret, WebSocket auth token secret                                                     |
| Custom-resource Lambda + IAM role | 1 shared, invoked ×2 | `DistributedTable`          | adds GSIs after table creation (`todos`, and `Realtime`'s internal `connections` table)             |
| S3 bucket                         | 1                    | `Hosting` (deploy only)     | private, blocked public access; reachable only via CloudFront (Origin Access Control)               |
| CloudFront distribution           | 1                    | `Hosting` (deploy only)     | `PRICE_CLASS_100` by default                                                                        |
| SNS topic + CloudWatch alarm      | 1 + 1                | `Hosting` (deploy only)     | monitoring is **on by default** (`props.monitoring?.enabled ?? true`) — a CloudFront 5xx-rate alarm |

The 6 DynamoDB tables:

- `todos` (our `DistributedTable`) — 2 GSIs: `byPriority`, `byTitle`
- `activity`, `settings` — our two `KVStore`s
- `users`, `codes` — `AuthBasic` composes its _own_ internal `KVStore` pair
  (`codes` is provisioned even though this app never uses email/code
  verification — it's part of `AuthBasic`'s shared implementation)
- `connections` — `Realtime` composes an internal `DistributedTable` (1 GSI,
  TTL) to track WebSocket connections; created once and shared across however
  many `Realtime` namespaces you declare (this app has 2: `todos`, `activity`)

`sandbox` skips `Hosting` entirely (`app/aws-blocks/index.cdk.ts`'s
`if (!sandboxMode)`), so the S3/CloudFront/SNS/alarm resources only appear
after a full `just deploy`. Also created regardless of the above: an
auto-generated Lambda execution role with scoped grants (DynamoDB, SQS, API
Gateway `postToConnection`, SSM read), CloudWatch log groups per Lambda, and
an AWS Resource Groups group tagging everything for console visibility.

## How the pieces fit

- **Conditional exports, not codegen.** `import { DistributedTable } from
'@aws-blocks/blocks'` resolves to a different file depending on context: an
  in-memory store in local dev, a CDK construct during `cdk synth`, and an AWS
  SDK client inside the deployed Lambda. This is the mechanism that makes one
  `aws-blocks/index.ts` work everywhere — see [AWS Blocks concepts][concepts].
- **`ApiNamespace` is the whole API layer.** Backend methods defined inside
  `new ApiNamespace(scope, 'api', (context) => ({ ... }))` are called directly
  from the frontend (`api.createTodo(...)`) with full TypeScript types and no
  REST client, OpenAPI spec, or URL config — locally over a local HTTP server,
  in production over API Gateway → Lambda.
- **Optimistic locking.** `todos.put(todo, { ifFieldEquals: { version } })`
  does a conditional write; a stale `version` throws, and the frontend just
  reloads and lets the user retry — see the `toggleTodo`/`updatePriority`
  handlers in `app/aws-blocks/index.ts`.
- **Queuing via `AsyncJob`.** `createTodo`/`toggleTodo`/`updatePriority`/
  `deleteTodo` all call `activityJob.submit({ ... })`, which enqueues and
  returns immediately — it does not wait for the handler. The handler (the
  `AsyncJob`'s `handler` option) writes the activity entry to a `KVStore` and
  publishes it on a second `Realtime` namespace, and runs asynchronously: via
  `setTimeout` locally, via the same shared Lambda on AWS (triggered by an SQS
  event source — see [AWS resources](#aws-resources); there's no dedicated
  Lambda per queue). That's why the frontend's activity feed lands entries a
  moment after the action that queued them, not synchronously with it —
  `test/e2e.test.ts`'s `waitForActivity()` helper polls for exactly this
  reason.
- **Stack naming.** `.blocks/config.json`'s `stackId` (committed) plus a
  suffix determines your CloudFormation stack name: `<stackId>-prod` for
  `deploy`, `<stackId>-<per-machine sandbox id>` for `sandbox` — so
  teammates share an AWS account without colliding. Renaming a Block's ID
  (the second constructor argument, e.g. `'todos'`) deletes and recreates
  its resource on the next deploy — **permanent data loss** for stateful
  Blocks. Treat Block IDs as immutable once deployed.
- **Agent-friendly by design.** The scaffolder ships `app/AGENTS.md` and
  comments in `app/aws-blocks/index.ts` steering AI coding assistants toward
  using Blocks for persistence instead of ad hoc local files — one of the
  framework's stated design goals.
- **Settings via a second `KVStore`.** `getSettings()`/`updateSettings()` key
  a `KVStore<UserSettings>` by `user.username` — the classic KVStore use case
  (config values, feature flags, session state): fast single-key get/put, no
  schema required (the generic type parameter is enough since there's no
  runtime-validation need here). `updateSettings` does a read-merge-write so a
  patch like `{ theme: 'dark' }` doesn't clobber `defaultSort`. The frontend
  applies `theme` to `document.body.dataset.theme` (not a wrapper element) so
  the themed background covers the full viewport, and seeds `TodoApp`'s sort
  state from `defaultSort` on mount — both confirmed via a live Playwright
  session to survive a full page reload.
- **No React binding, so the auth widget stays vanilla DOM.** AWS Blocks
  ships `AccountMenuBar`/`Authenticator` (`@aws-blocks/blocks/ui`) as
  framework-agnostic functions that return a plain `HTMLElement` — there's no
  React-specific package. `src/index.tsx`'s `AccountMenuBarWidget` mounts it
  via a `ref` + `useEffect` (a standard vanilla-DOM/React interop shim); the
  rest of the UI (todo list, forms, sorting) is idiomatic React state driven
  directly off `api`/`authApi`/`onAuthChange`.

<a id="why-a-scoped-pnpm-workspace"></a>

### Why a scoped pnpm workspace

`app/` has its own `pnpm-workspace.yaml`, deliberately **not** wired into this
repo's root one — it stays the same self-contained project shape
`npm create @aws-blocks/blocks-app@latest` produces anywhere, just pnpm- instead
of npm-managed. Two things npm did implicitly that pnpm requires spelling out:

- **The local `aws-blocks` alias package.** `import { api, authApi } from
'aws-blocks'` resolves via a `node_modules/aws-blocks` symlink to the
  project's own `aws-blocks/` directory. npm's `workspaces` field
  auto-links every workspace member; pnpm only links members that are
  declared as an actual dependency, hence `"aws-blocks": "workspace:*"` in
  `app/package.json` alongside `app/pnpm-workspace.yaml`'s
  `packages: [aws-blocks]`.
- **Transitive `@aws-blocks/bb-*` imports.** The generated
  `aws-blocks/client.js` imports specific sub-Block packages directly (e.g.
  `@aws-blocks/bb-realtime/mock-middleware`) as transitive dependencies of
  `@aws-blocks/blocks`, not declared dependencies of this project — and which
  ones depends on which Blocks your `aws-blocks/index.ts` uses, so pinning
  each individually is a moving target. `app/.npmrc`'s
  `shamefully-hoist=true` restores flat node_modules resolution for these
  (the same tradeoff npm/yarn classic always made) while keeping pnpm's
  content-addressable store.

## Cost & notes

- **AWS Blocks itself is free.** You only pay standard AWS pricing for what
  gets provisioned — DynamoDB, Lambda, API Gateway (REST + WebSocket), SQS
  (the `AsyncJob` queue), CloudFront/S3 for `Hosting`, and CloudWatch.
  `sandbox` avoids a full CloudFormation deploy (Lambda hot-swap) but still
  creates and bills for real resources; remember `just sandbox-destroy`.
- Per the [announcement][whats-new], AWS Blocks **deploys to all commercial
  AWS Regions**; no GovCloud/China statement was published at preview launch.
- This is a **preview**: every `@aws-blocks/*` package is versioned `0.1.x`
  and the framework, CLI surface, and docs can change before GA. Re-check
  the [Developer Guide][devguide] against this README before relying on it.

[whats-new]: https://aws.amazon.com/about-aws/whats-new/2026/06/aws-blocks-preview/
[devguide]: https://docs.aws.amazon.com/blocks/latest/devguide/
[concepts]: https://docs.aws.amazon.com/blocks/latest/devguide/concepts.html
[deploy-docs]: https://docs.aws.amazon.com/blocks/latest/devguide/deploy-to-aws.html
[cdk]: https://docs.aws.amazon.com/cdk/v2/guide/home.html
