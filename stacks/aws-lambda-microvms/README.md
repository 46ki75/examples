# AWS Lambda MicroVMs

A runnable example of [AWS Lambda MicroVMs][announce] — a serverless compute
primitive (distinct from Lambda **Functions**) for running untrusted user- or
AI-generated code in VM-isolated, stateful sandboxes that launch in ~1s, keep
memory/disk state across a session, and suspend to low idle cost. It reuses the
same Firecracker virtualization that powers Lambda Functions, but exposes direct
lifecycle control, snapshot suspend/resume, long sessions (up to 8h), arbitrary
ports/protocols, and customer-provided images.

This stack builds a **code-execution sandbox**: a MicroVM image that accepts
Python over HTTP and runs it in a persistent session. The session's variables
live in memory, so they survive **suspend/resume** — the headline MicroVMs
capability.

```txt
  operator (control CLI, boto3)
    │  create-microvm-image  ── zip(Dockerfile+src) ─▶ S3 ─▶ Lambda builds image
    │                                                        (runs Dockerfile,
    │                                                         calls /ready, snapshots)
    │  run-microvm ───────────────────────────────────▶ MicroVM  (resumes snapshot)
    │  create-microvm-auth-token ─▶ JWE token                │
    │                                                        │
    ▼  HTTPS  https://<id>.lambda-microvm.<region>.on.aws    │
       POST /exec   X-aws-proxy-auth: <token>  ──▶ :8080 ── sandbox app
                                                   :9000 ── lifecycle hooks
                                                            /run /resume
                                                            /suspend /terminate
    │  suspend-microvm  (memory+disk snapshot; session state preserved)
    │  resume-microvm   (state restored; /resume hook reseeds ephemerals)
    ▼  terminate-microvm
```

## Layout

| Path         | What                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `image/`     | uv-workspace member — the sandbox baked into the MicroVM image. `/exec` on the 8080 traffic port; the four lifecycle hooks on the 9000 control port. `Dockerfile` is built **by Lambda**, not locally. |
| `control/`   | uv-workspace member — the boto3 + httpx operator CLI (`microvm-control`) driving the imperative lifecycle.                                                                                             |
| `terraform/` | supporting infra only: S3 artifact bucket + build/execution IAM roles. The lifecycle itself is imperative and lives in the CLI, not in IaC.                                                            |
| `justfile`   | wires terraform outputs into the CLI: `infra` → `build` → `run`/`demo`.                                                                                                                                |

## Why no Terraform for the MicroVM itself

`run`/`suspend`/`resume`/`terminate` are control-plane _operations_, not
declarative state, so they don't map onto Terraform. Terraform here only
provisions the durable supporting resources (bucket, roles); everything with a
lifecycle is driven through `microvm-control` (boto3 `lambda-microvms`).

## Prerequisites

- `terraform`, `just`, and `uv`. **No Docker** — the image is built server-side
  by Lambda. (The `aws` CLI is optional; the control plane is driven through
  boto3, and older CLI builds don't yet ship the `lambda-microvms` command.)
- AWS credentials in a MicroVMs Region (default `us-east-1`).
- `boto3`/`botocore` **≥ 1.43.36** (the first release with the `lambda-microvms`
  client; pinned in `control/pyproject.toml`). Verify:
  `uv run --package microvm-control python -c "import boto3; print('lambda-microvms' in boto3.session.Session().get_available_services())"`
- Operator IAM permissions — see [Operator permissions](#operator-permissions).

> [!NOTE]
> Verified end-to-end on 2026-06-28 in `us-east-1`: `infra` → `build` → `demo`
> (run → exec → suspend → resume → exec → terminate) with `counter` surviving the
> snapshot at `105`.

## Deploy and run

```sh
cd stacks/aws-lambda-microvms

just init          # terraform init
just infra         # S3 bucket + build/execution roles
just build         # zip image/ -> S3 -> create-microvm-image -> wait for CREATED
just demo          # run -> exec -> suspend -> resume -> exec -> terminate
```

`just demo` proves the point: it sets `counter = 100`, increments it, **suspends
and resumes** the MicroVM, then reads `counter` back — still `105`, because the
session lives in the snapshotted memory.

Step through it manually instead:

```sh
just run                       # prints microvmId + endpoint (cached in .microvm-last.json)
just exec code='x = 21'
just exec code='print(x * 2)'  # -> 42  (state from the previous call)
just suspend
just resume
just exec code='print(x * 2)'  # -> 42  (survived the snapshot)
just terminate
just destroy                   # tear down the bucket + roles
```

## How it works

- **Image build = snapshot.** `create-microvm-image` uploads `image/` (the
  Dockerfile plus `src/`) to S3; Lambda runs the Dockerfile, starts the app, polls
  the `/ready` hook, and captures a Firecracker snapshot of the initialized memory
  and disk. Every `run-microvm` resumes from that snapshot (hence ~1s launches).
- **Two ports.** The sandbox serves traffic on `8080` (the default routing
  target) and the lifecycle hooks on `9000` (declared as `hooks.port` at image
  creation). Both bind `0.0.0.0`; Lambda reaches the hook port from outside the
  guest. See `image/src/microvm_sandbox/main.py`.
- **Lifecycle hooks** (`image/src/microvm_sandbox/hooks.py`), all `POST` under
  `/aws/lambda-microvms/runtime/v1`:
  - `/ready` — build-time gate; 503 until the app is up, then 200.
  - `/run` — fires once per launch _before_ traffic is forwarded; starts a fresh
    session (every MicroVM resumes the **shared** build snapshot, so per-session
    state must be reset). Receives `{"microvmId", "runHookPayload"}`.
  - `/resume` — fires on SUSPENDED→RUNNING; the VM stays SUSPENDED until it
    returns 200. Session state is kept; this is where a real app reseeds RNGs and
    re-opens connections that shouldn't outlive a snapshot.
  - `/suspend`, `/terminate` — checkpoint / clean up. Made idempotent (Lambda may
    retry them).
- **Data plane.** `run-microvm` returns the endpoint _without_ a scheme. Prefix
  `https://`, send the `create-microvm-auth-token` value as the
  `X-aws-proxy-auth` header (no unauthenticated access), and optionally
  `X-aws-proxy-port` to target a non-default port.

## Operator permissions

The credentials that run `microvm-control` (your own, not the Lambda roles) need,
in addition to the `lambda-microvms` control-plane actions:

- `iam:PassRole` on the build role (passed to `create-microvm-image`) and the
  execution role (passed to `run-microvm`).
- `lambda:PassNetworkConnector` — required on **every** `run-microvm` call, even
  with no explicit connectors (defaults are passed at run time).
- `s3:PutObject` on the artifact bucket (the CLI uploads the zip).

> [!WARNING]
> **Verify the control-plane action prefix before locking down a policy.** AWS
> primary docs did not confirm whether the actions are `lambda:RunMicrovm…` or
> `lambda-microvms:RunMicrovm…` (CloudTrail logs them under `lambda:`). Check the
> AWS Service Authorization Reference and scope your operator policy accordingly.
> This example does **not** ship a guessed caller policy.

## Notes from the live run

- **Identifiers are not uniform.** MicroVM ops (`get`/`suspend`/`resume`/
  `terminate`/`create-microvm-auth-token`) accept the bare `microvmId`, but the
  **image** ops (`get-microvm-image`) require the **full image ARN** —
  `arn:aws:lambda:<region>:<acct>:microvm-image:<name>`, not the bare name. The
  control CLI resolves a name to its ARN via `list-microvm-images`.
- **`base_image_arn`** — confirmed `arn:aws:lambda:us-east-1:aws:microvm-image:al2023-1`
  via `list-managed-microvm-images`. Re-check per Region; the suffix can change.
- **`run-microvm` auto-attaches default connectors** (`HTTP_INGRESS`,
  `INTERNET_EGRESS`), which is why the caller needs `lambda:PassNetworkConnector`.

## Caveats / still to verify

- **Operator action prefix** — see the warning above; tested here only with
  `AdministratorAccess`, so a least-privilege caller policy is still unverified.
- **`runHookPayload`** — AWS docs self-conflict on the cap (4096 vs 16384 bytes);
  the CLI assumes the safe ≤4096.
- **Regions** — GA in `us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
  `eu-west-1`.
- **Snapshot/OpenSSL** — apps that do TLS or generate unique secrets at init must
  reseed in `/run` and `/resume`; the AWS-provided `public.ecr.aws/lambda/microvms`
  base image carries snapshot-safe fixes if you hit this.

[announce]: https://aws.amazon.com/about-aws/whats-new/2026/06/aws-lambda-microvms/
