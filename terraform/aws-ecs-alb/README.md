# ALB → ECS / Caddy with native blue/green deployment

A self-contained Terraform example of **Amazon ECS-managed blue/green deployment**
for private Fargate tasks behind an internet-facing Application Load Balancer.
Read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes.

This uses the `ECS` deployment controller and `BLUE_GREEN` strategy, **not
CodeDeploy**. It does not use API Gateway or Cloud Map. ALB is a good fit for
HTTP applications that need managed traffic cutover, health checks, and rollback;
this example demonstrates those mechanisms rather than providing a complete
production platform.

```text
Production clients ── HTTP :80 / HTTPS :443 ──► ALB production rule
                                                   │
Allowed testers ── HTTP(S) :8081 ──► ALB test rule   │
                                         │         │
                                         ▼         ▼
                                    Two IP target groups
                                         │         │
                                    Private Fargate tasks
                                    (one ECS service)
                                         │
                                    Same-AZ NAT → image pulls/logs

ECS updates the rules and task registrations during deployment.
Terraform creates the initial rules but does not reset their forwarding actions.
```

## Defaults and boundaries

- Region `ap-northeast-1`, three standard AZs, one public and one private subnet
  per AZ. Set `availability_zone_count = 2` for a smaller two-AZ footprint;
  single-AZ deployments are not supported by ALB.
- One public, **zonal NAT gateway per AZ**, with private routes to the same AZ's
  gateway. This is independent of the regional NAT used in the Cloud Map example.
- Three private ARM64 Fargate tasks: 0.25 vCPU, 512 MiB, platform 1.4.0. ECS AZ
  rebalancing is enabled. `task_count = null` means one task per selected AZ.
  Blue/green temporarily needs capacity for both revisions (six tasks by default).
- Official Caddy 2.11.4 Alpine image pinned by digest. No custom image build or
  Docker installation is needed. `Caddyfile`, image, and `release` changes create
  task-definition revisions managed by Terraform.
- `/health` returns `ok`. Other paths echo the method, path, query, hostname,
  and release. `X-Release` and `X-Backend-Id` identify the responding revision/task.
- Both target groups use IP targets and `/health` checks. Tasks also have ECS
  container health checks. Task ingress is TCP 8080 **only from the ALB security
  group**; egress is HTTPS through NAT for image pulls and CloudWatch Logs.
- The initial production and test rules both forward to the initial revision.
  ECS sends test traffic to the new revision before switching production traffic.
  The `blue` and `green` target-group names are **reusable slots**, not permanent
  indicators of which group currently serves production.
- Five-minute post-cutover bake time; the old revision is retained during that
  period, then stopped. Configure `bake_time_in_minutes` from 1–30 minutes.
- ECS deployment circuit breaker with rollback for startup/health failures, plus
  a CloudWatch deployment alarm: five backend HTTP 5xx responses in one minute.
  This is a demo threshold, includes both listeners, and needs traffic to detect
  application errors. Missing data is non-breaching.
  Container Insights is enabled. Terraform manages both log groups: seven-day
  Caddy logs and one-day Container Insights performance logs.
- Independent **local Terraform state**, ignored by Git. Do not delete the state
  before destroying the resources. This does not use the historical shared state
  bucket mentioned in the parent README.

**The default endpoint is public, unauthenticated HTTP demo traffic.** Enable
HTTPS before sending sensitive data. The test listener has no ingress rules by
default; explicitly allow tester CIDRs when needed.

## Deploy

Install the root [mise toolchain](../../README.md). From this directory:

```sh
mise trust
mise run --silent init
mise run --silent check
mise run --silent plan
mise run --silent apply
mise run --silent smoke
```

`apply` generates a fresh plan and prompts for confirmation. These commands
provision billable AWS resources; local `check` does not. Credentials come from
the current AWS profile. The deployer needs permission to create the resources,
create/use the ECS service-linked role, and `iam:PassRole` for the task execution
role and ECS infrastructure role (plus the validation role when configured).

Overrides belong in a gitignored `terraform.tfvars`, for example:

```hcl
region                  = "ap-northeast-1"
prefix                  = "examples-ecs-alb"
availability_zone_count = 3
task_count              = null
release                 = "v1"
bake_time_in_minutes    = 5
# Restrict these for a non-public application.
client_cidrs = ["0.0.0.0/0"]
# Optional: replace with your actual test runner's public egress /32.
# test_client_cidrs = ["203.0.113.10/32"]
```

From the repository root, use `mise run //terraform/aws-ecs-alb:check` and
similarly `init`, `plan`, `apply`, `status`, and `smoke`.

### HTTPS

Supply an **existing, issued ACM certificate in the stack's region** and a DNS
name covered by that certificate:

```hcl
certificate_arn = "arn:aws:acm:ap-northeast-1:123456789012:certificate/REPLACE-ME"
domain_name     = "app.example.com"
```

The stack then serves HTTPS on port 443, redirects HTTP port 80 to HTTPS, and
uses HTTPS on test port 8081. Create an ALIAS/CNAME from your domain to the
`alb_dns_name` output separately. Certificates, DNS zones/records, and domain
ownership are not managed here. `smoke` verifies TLS normally; it does not bypass
certificate or hostname checks.

## Exercise blue/green deployment

1. Deploy `release = "v1"` and run `smoke` to establish a healthy baseline.
2. Change `release` to `"v2"` in `terraform.tfvars`. This changes the task
   environment, creating a new immutable task revision without rebuilding Caddy.
3. Run `plan`, inspect it, and run `apply`.
4. In another terminal, run `status` to inspect the latest ECS deployment and
   **actual** production/test target weights during rollout and the bake period.
5. After deployment completes, run `smoke`. Verify `X-Release: v2` and run `plan`
   again to check for unintended drift.

```sh
mise run --silent plan
mise run --silent apply
mise run --silent status
mise run --silent smoke
URL=$(mise exec -- terraform output -raw production_url)
curl -i "$URL/nested/path?hello=world"
```

ECS starts the new revision in the alternate group, waits for health, shifts test
traffic, shifts production traffic, retains the old revision during the bake
period, and then retires it. The first deployment has no previous revision to
roll back to. Blue/green is not a substitute for backward-compatible database
migrations, session handling, or correctly draining long-lived connections.

### Testing before production cutover

**A test listener alone does not pause deployment or run validation.** Without a
hook, ECS proceeds after its health and lifecycle checks. Port 8081 is not a
permanent endpoint for the next release and may have no healthy targets outside
the relevant deployment stages.

To gate cutover, supply an existing Lambda using `validation_hook_arn`. The stack
creates a scoped Lambda invocation role and runs the function at
`POST_TEST_TRAFFIC_SHIFT`, before production cutover. It passes these fields in
`hookDetails`:

```json
{
  "test_url": "https://app.example.com:8081",
  "expected_release": "v2"
}
```

Implement the [ECS lifecycle-hook response contract](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-lifecycle-hooks.html)
in that function: `hookStatus` is `SUCCEEDED`, `FAILED`, or `IN_PROGRESS`.
Validate health, expected release, and application behavior, not just HTTP 200.
The function and its tests are external inputs; this stack does not deploy one.

If the function calls the test URL, allow its **public egress CIDR** in
`test_client_cidrs` and configure its networking/DNS accordingly. An internet-facing
ALB resolves to public addresses; a VPC Lambda generally needs working NAT egress
for that path. The stack's `nat_public_ips` output can help allowlist a test runner
using those NAT gateways. Do not expose the test listener to all clients. A manual
`curl` without a blocking validation hook is observational, not a release gate.

### Rollback

The deployment circuit breaker handles startup failures; the CloudWatch alarm
requests rollback for application errors during deployment. Both enable rollback.
Alarms are not sufficient without representative traffic; an alarm already in
`ALARM` at deployment start can also be ignored by ECS. Add workload-specific
latency, availability, and business-metric alarms for production. Size the bake
window for metric publication, alarm evaluation, and ECS polling latency; the
[live alarm test](LIVE_TEST.md) took multiple minutes to initiate rollback.

For manual rollback **while a deployment is in progress**, inspect status, then
request rollback from a separate terminal:

```sh
mise run --silent status
mise run --silent rollback -- --confirm
mise run --silent status
```

`rollback` requires exactly one `IN_PROGRESS` deployment and a previous service
revision, calls `StopServiceDeployment` with `ROLLBACK`, and returns after the
request is accepted. Monitor `status` until rollback completes. Do not run another
apply or destroy while deployment/rollback is active. After the bake period and
successful completion, reverting requires a new deployment of the last good
image/configuration rather than a traffic-only switch.

**After any rollback, restore the last good image, release, and Caddy configuration
in Terraform before applying again.** Otherwise Terraform may redeploy the failed
revision. The provider's steady-state waiter is not proof that the intended
release is serving: `smoke` additionally checks the newest deployment status,
actual running task-definition ARN, release header/body, active production
rule, target health, private ENIs, and balanced AZ placement. It intentionally
fails when the service has rolled back to a different revision.

## Terraform ownership and validation

ECS owns production/test forwarding targets and weights after creation. Both rules
use `ignore_changes = [action[0].forward[0].target_group]`, following the AWS
provider's native blue/green acceptance tests. The ECS service's load-balancer
configuration, task definition, and desired task count remain Terraform-managed;
this is not the CodeDeploy pattern that ignores task-definition changes.

This prevents a later apply from resetting traffic to the original target group.
Because the ignored target-group sets include ARNs as well as weights, replacing
target groups requires a deliberate migration of the service and rule wiring.
Do not remove the ignores just to make a plan look clean after a cutover.

```sh
mise run --silent fmt
mise run --silent check
```

`check` runs Terraform formatting/validation, Caddy validation, Python lint/type
checks, mocked Terraform apply/plans, and Python unit tests. Tests cover native
deployment configuration, initial forwarding weights, private networking,
restricted test ingress, TLS, hook wiring, invalid inputs, swapped production
slots, rollback detection, pagination, and confirmation before mutation. They use
no AWS credentials and create no infrastructure. CI runs the same checks.

Offline checks do **not** demonstrate live AWS traffic shifting, alarm/hook
timing, rollback, IAM propagation, or a drift-free second deployment. See
[LIVE_TEST.md](LIVE_TEST.md) for scoped live AWS results and remaining gaps. Before
production, run workload-specific acceptance tests covering successive releases,
a failing validation hook, and alarm-triggered rollback under traffic, then
inspect a fresh Terraform plan.

## Production hardening and cost

Before production, configure HTTPS, appropriate client restrictions and application
authentication/WAF; enable ALB access logs and operational alert delivery; move
state to an access-controlled, encrypted remote backend with locking; tune task
sizing, autoscaling, alarms, grace periods, and connection draining; scope the
AWS-managed infrastructure policy to your resources where appropriate; and test
release/database rollback procedures. Add your blocking validation hook.
Deletion protection is not enabled so this example can be cleaned up easily.

Ongoing costs include an ALB and LCUs, **three NAT gateway hourly charges by
default** plus NAT data processing and public IPv4 addresses, Fargate, Container
Insights, CloudWatch alarms/logs, and data transfer. Both task revisions incur
charges during bake time. NAT, ALB, and Fargate cost money while idle.

```sh
# Capture these before destroy removes Terraform outputs.
REGION=$(mise exec -- terraform output -raw region)
CLUSTER=$(mise exec -- terraform output -raw ecs_cluster_name)
mise run --silent destroy
```

Wait for any deployment/rollback to finish before cleanup. Terraform deletes its
tracked resources, including both log groups, but **late Fargate telemetry can
recreate the Container Insights group after deletion**; this occurred in the
[live test](LIVE_TEST.md). After the cluster is inactive, tasks have stopped,
and late log delivery has settled, check the exact group in the same account
and region:

```sh
aws logs describe-log-groups --region "$REGION" \
  --log-group-name-prefix "/aws/ecs/containerinsights/$CLUSTER/performance"
# Only if this deleted stack's group was recreated:
aws logs delete-log-group --region "$REGION" \
  --log-group-name "/aws/ecs/containerinsights/$CLUSTER/performance"
```

Confirm absence before reusing the prefix; if a matching group already exists
on a later deployment, import it rather than attempting to create it again.
Destroy does not delete your externally supplied certificate, DNS, or validation
function.

## References

- [Create an ECS blue/green service (including circuit-breaker options)](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deploy-blue-green-service.html)
- [Native ECS blue/green deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-blue-green.html)
- [ALB resources and traffic flow](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb-resources-for-blue-green.html)
- [ECS load-balancer infrastructure IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AmazonECSInfrastructureRolePolicyForLoadBalancers.html)
- [Terraform ECS service reference](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service)
