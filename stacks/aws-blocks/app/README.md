# AWS Blocks App

Real-time todo app with authentication, per-user data isolation, live sync across tabs, a queued activity feed, and persisted user settings.

## Getting Started

```bash
pnpm run dev          # Start local dev server (mocks, no AWS needed)
pnpm run test:e2e     # Run API tests
pnpm run sandbox      # Deploy to AWS sandbox
```

Open http://localhost:3000 after `pnpm run dev`.

## Project Structure

| Path | Purpose |
|------|---------|
| `aws-blocks/index.ts` | Backend: auth, data model, API, real-time channels |
| `src/index.tsx` | Frontend: todo UI with live updates (React + ReactDOM) |
| `test/e2e.test.ts` | Tests: auth, CRUD, conflicts, real-time |
| `index.html` | HTML shell |

## What's Included

- **AuthBasic** — sign up / sign in / sign out with JWT sessions
- **DistributedTable** — todos stored in DynamoDB with Zod schema validation
- **Optimistic locking** — `version` field + `ifFieldEquals` prevents lost updates
- **Realtime** — todo changes and activity entries broadcast to all connected tabs via WebSocket
- **AsyncJob** — todo mutations queue an activity-log job (SQS + Lambda on AWS) instead of writing inline, and the handler publishes the entry to Realtime once it runs
- **KVStore** — two independent stores: queued activity entries (for `listActivity()`) and per-user settings (default sort, theme) via `getSettings()`/`updateSettings()`, which follow the signed-in user across sessions and devices

## Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Local dev with mock storage |
| `pnpm run test:e2e` | Test API via direct imports |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run sandbox` | Deploy backend to AWS, serve frontend locally |
| `pnpm run deploy` | Full production deploy |
| `pnpm run sandbox:destroy` | Tear down sandbox resources |

## Building on this template

The test file (`test/e2e.test.ts`) is structured in sections — Auth, CRUD, Conflicts, Realtime. Add your own tests by copying a `test(...)` block and changing the assertion. The API methods in `aws-blocks/index.ts` follow a consistent pattern: authenticate → do work → broadcast.

To replace the todo domain with your own: update the Zod schema, rename the API methods, and adjust the tests. The auth and real-time wiring stays the same.

## Stack naming

Your CloudFormation stack names are derived from the `stackId` in `.blocks/config.json` — generated at scaffold time from your project name plus a random suffix (e.g., `my-app-a3x9kf`). Production deploys as `<stackId>-prod` and sandbox as `<stackId>-<username>-<random>`, where the sandbox identifier is per-machine and stored in `.blocks-sandbox/sandbox-id.txt` (gitignored). This lets multiple developers share a testing account without colliding.

To change the stack name, edit `stackId` in `.blocks/config.json`. For dynamic naming logic, modify `aws-blocks/index.cdk.ts` directly.

## For Agents

Full Building Block documentation: `node_modules/@aws-blocks/blocks/README.md`

**Do not use local files or in-memory storage** — use Building Blocks for all data persistence and cloud abstractions (they mock locally and deploy to AWS automatically).

Start in `aws-blocks/index.ts` (backend) and `src/index.tsx` (frontend). Test via `pnpm run test:e2e`. The API transport (JSON-RPC) is auto-generated and intentionally invisible — do not curl endpoints directly. Testing is best done through the e2e tests which use the same typed client as the frontend.
