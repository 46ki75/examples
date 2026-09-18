# API Gateway → Cloud Map → ECS / Caddy

A Terraform example with an API Gateway HTTP API, Cloud Map service discovery,
and Caddy on private ECS Fargate tasks. Read [CONTRIBUTING.md](CONTRIBUTING.md)
before making changes.

```text
Client ── HTTPS ──► API Gateway HTTP API
                     │          │ DiscoverInstances
                     │          ▼
                     │       Cloud Map ◄── ECS task registration and health
                     ▼
                  VPC Link
                     │ HTTP :8080 over private IPs
                     ▼
                  ECS Fargate / Caddy
                     │ outbound HTTPS for image pulls and logs
                     ▼
                  Regional NAT gateway ──► Internet
```

Cloud Map is the discovery service; requests flow directly from the VPC Link to
the discovered tasks. API Gateway distributes requests across healthy instances.

## Defaults

- Region: `ap-northeast-1`; credentials come from the current AWS profile.
- Three AZs, with one private subnet and one healthy Caddy task per AZ. Each
  ARM64 Fargate task has 0.25 vCPU, 512 MiB RAM, and platform version 1.4.0.
  ECS Availability Zone rebalancing is enabled.
- One regional NAT gateway in automatic mode. AWS manages its EIPs and its
  internet-gateway route; no public subnets are needed. Tasks have no public IPs.
  Automatic NAT expansion into a newly used AZ can take up to 60 minutes; traffic
  can temporarily cross AZs before expansion finishes.
- Task ingress: TCP 8080 only from the VPC Link security group. Task egress:
  HTTPS for pulling the public image and delivering CloudWatch logs.
- Caddy 2.11.4 Alpine, pinned by image digest, pulled from the Docker Official
  Images mirror in ECR Public. The checked-in Caddyfile becomes an ECS environment
  variable and is written at startup; changing it creates a task revision.
- Public, unauthenticated demo endpoint with a `$default` route/stage, 100 requests
  per second and a burst limit of 200. TLS terminates at API Gateway. The default
  workload test targets 30 requests/second, below these configured limits.
- Seven-day CloudWatch log retention for API access logs and Caddy stdout/stderr.
- Independent **local Terraform state**, ignored by Git. Keep this directory's
  state until resources are destroyed. This example does not use the historical
  shared state bucket mentioned in the parent README.

## Deploy

Install the repository's mise toolchain as described in the
[root README](../../README.md), then run these commands from this directory:

```sh
mise run init
mise run check
mise run plan
mise run apply
mise run smoke
```

`plan` previews the current changes. `apply` generates a fresh plan and prompts
for confirmation when changes are needed, so it can also be run directly.

Docker and a custom image build are not required. The root mise configuration
supplies native Caddy for local validation, as well as Terraform, Python, and
the AWS CLI.

Set overrides in a gitignored `terraform.tfvars`, for example:

```hcl
region                  = "ap-northeast-1"
prefix                  = "examples-ecs-cloudmap"
availability_zone_count = 3
# Omit task_count (or set null) to run one task per selected AZ.
task_count = null
```

`availability_zone_count` accepts 1–3. Set it to `1` for a single-AZ deployment,
then increase it to expand subnets, the VPC Link, and the default task count.
An explicit `task_count` must be at least the AZ count and at most 10.

If changing regions, verify that the selected alphabetically sorted standard
Availability Zones support [API Gateway VPC Links V2](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-vpc-links-v2.html).
Changing the VPC Link subnet set replaces the link. Terraform creates the new
link and switches the integration before deleting the old one. Regional NAT's
automatic expansion follows the VPC ENI footprint, including VPC Link ENIs.

From the repository root, tasks are also available as
`mise run //terraform/aws-ecs-cloudmap:check` (and similarly `plan`, `apply`, etc.).

## Exercise the API and discovery

```sh
URL=$(mise exec -- terraform output -raw api_url)
curl "$URL/health"
curl "$URL/nested/path?hello=world&number=42"
mise run discover
mise run smoke
```

`/health` returns `ok`. Other paths return the container hostname, method, path,
and query string as plain text; `X-Backend-Id` identifies the responding task.
The smoke check verifies GET/POST routing, healthy IP/port discovery, agreement
between discovery and task ENIs, absence of public task IPs, balanced placement
across every selected AZ, VPC Link subnet coverage, regional NAT mode, and request
distribution across the configured number of backends. It retries during
discovery convergence.

### Workload and outbound connectivity

```sh
mise run workload
mise run egress
```

`workload` sends 1,800 GET/POST requests at 30 requests/second, with up to 16
concurrent workers. It validates response content, records status counts and
p50/p95/p99 latency, and maps responding backends to their AZs. Each request uses
a fresh client connection; measured latency includes the client network and TLS
handshake. There are no retries to hide failures. These measurements exercise
the current Caddy demo endpoints.

Override the traffic parameters or allow errors during a recovery experiment:

```sh
mise run workload --requests 3600 --rate 30 --concurrency 16 --allow-errors
```

`egress` launches one disposable Fargate task in each private subnet using the
same Caddy image, execution role, and security group. Each task performs an HTTPS
request to `checkip.amazonaws.com`, logs the observed public IP, and exits. The
script verifies successful execution and that every observed IP belongs to the
regional NAT gateway in the same AZ. If automatic expansion is still pending,
wait for it to finish and rerun `egress`. The probes incur brief Fargate usage.

For more tasks per AZ, set `task_count = 6` and rerun `plan`, `apply`, `smoke`, and
`workload`. Restore `task_count = null` to return to one task per AZ.

### Task replacement under traffic

Run the longer workload command above in one terminal, then stop one service
task from another terminal:

```sh
REGION=$(mise exec -- terraform output -raw region)
CLUSTER=$(mise exec -- terraform output -raw ecs_cluster_name)
SERVICE=$(mise exec -- terraform output -raw ecs_service_name)
TASK=$(mise exec -- aws ecs list-tasks --region "$REGION" --cluster "$CLUSTER" \
  --service-name "$SERVICE" --query 'taskArns[0]' --output text)
mise exec -- aws ecs stop-task --region "$REGION" --cluster "$CLUSTER" \
  --task "$TASK" --reason "Cloud Map replacement experiment"
mise exec -- aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER" \
  --tasks "$TASK"
mise exec -- aws ecs wait services-stable --region "$REGION" --cluster "$CLUSTER" \
  --services "$SERVICE"
mise run discover
mise run smoke
```

With a single-AZ, one-task configuration, stopping it causes downtime until its
replacement becomes healthy and discovery caches converge. Abrupt stops can also
produce transient 503 responses with multiple tasks while discovery caches
converge. A normal rolling deployment starts a replacement before stopping the
old task. The ECS deployment
circuit breaker enables rollback. This experiment tests task replacement and
discovery convergence, rather than simulating an entire AZ outage.

### Observed POC results

Live runs on 2026-09-18 (UTC), using the current Caddy demo, three private Fargate
tasks across `ap-northeast-1a`, `ap-northeast-1c`, and `ap-northeast-1d`, and regional
NAT in automatic mode:

| Scenario                                    | Requests | Rate | HTTP 200 | Errors |      p50 |      p95 |      p99 |
| ------------------------------------------- | -------: | ---: | -------: | -----: | -------: | -------: | -------: |
| Steady traffic, 60 seconds                  |    1,800 | 30/s |    1,800 |      0 | 33.24 ms | 39.95 ms | 73.77 ms |
| Task replacement under traffic, 120 seconds |    3,600 | 30/s |    3,600 |      0 | 34.19 ms | 40.40 ms | 56.71 ms |

The steady run reached all three AZs: 588 requests in `1a`, 629 in `1c`, and 583
in `1d`. During the second run, the task in `1d` was stopped about 15 seconds into
the test. A replacement was observed healthy and registered in the same AZ after
67.62 seconds; the other two tasks continued serving traffic. These are observed
results for this traffic level and client, not a maximum-throughput assessment or
a guarantee of interruption-free recovery.

Separate disposable probes verified outbound HTTPS through a different regional
NAT public IP local to each AZ. Smoke checks confirmed balanced task placement,
healthy SRV discovery, private task ENIs, and VPC Link coverage across all three
subnets. All egress probes exited, and the post-deployment Terraform plan reported
no changes.

## Integration details and diagnostics

- [HTTP API Cloud Map integrations](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html)
  require registered IP addresses and ports. SRV records make ECS publish both
  `AWS_INSTANCE_IPV4` and `AWS_INSTANCE_PORT`; A records alone are insufficient.
- ECS probes `/health` inside the container and reports custom health to Cloud
  Map. API Gateway uses `DiscoverInstances`, rather than resolving the SRV name.
- The Cloud Map service uses `aws_cloudcontrolapi_resource` from the same AWS
  provider. Its JSON configuration sets `HealthCheckCustomConfig.FailureThreshold`
  to AWS's fixed value of `1`, which the Cloud Control handler still requires.
  This enables ECS health reporting without using the deprecated Terraform
  `failure_threshold` argument. Simply removing that argument from the typed
  `aws_service_discovery_service` resource disables health reporting in provider
  6.65.0; an empty Cloud Control object also fails during creation.
- `overwrite:path = "$request.path"` preserves client paths without a stage prefix.
- API Gateway, the VPC Link, and Cloud Map service are in the same account/region.
- `mise exec -- terraform output log_groups` shows log group names. Inspect Caddy
  logs for container startup or health errors and API logs for integration errors.
- Image pull failures usually indicate NAT routing or HTTPS egress issues.
  Successful startup with API errors calls for checking Cloud Map health/ports,
  the VPC Link state, and the two security groups.

## Cleanup and cost

```sh
mise run destroy
```

This deletes the resources tracked by this project's state, including its log
groups. Regional NAT is billed per provisioned AZ, not once for the whole region;
budget for three AZs of NAT hourly charges with this default footprint. Ongoing
charges also include its public IPv4 addresses, Fargate, the Cloud Map private
hosted zone, and usage-based API Gateway, discovery, logging, and data transfer.
NAT and Fargate continue to incur charges while idle.
