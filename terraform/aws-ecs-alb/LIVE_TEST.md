# Live AWS verification

Read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes.

## Test environment

- Date: October 23, 2026.
- Region: `ap-northeast-1`; isolated prefix: `examples-ecs-alb-live`.
- Terraform 1.16.2, AWS provider 6.70.0, AWS CLI 2.36.46.
- Three AZs, three same-AZ NAT gateways, and three private ARM64 Fargate tasks.
- HTTP demo mode; production and test ingress restricted to the test machine's
  public IPv4 `/32`. No sensitive application data was sent.
- One-minute bake period for successful releases; five minutes for the alarm
  rollback test.

## Completed checks

| Check | Result |
| --- | --- |
| Initial `v1` deployment | Three healthy private tasks, one per AZ; GET/POST smoke tests passed. |
| `v1 → v2` | Test listener served `v2` before production; production changed green → blue. |
| `v2 → v3` | Test listener served `v3` before production; production changed blue → green. |
| Health traffic during both updates | 357 production and 357 test-listener samples; no failed samples. |
| Terraform drift | No changes after `v1`, `v2`, or `v3`, using the matching release variables. |
| CloudWatch alarm rollback | 906 deliberate backend 503 responses triggered the real alarm; ECS reached `ROLLBACK_SUCCESSFUL` and restored the exact `v3` task revision with three healthy tasks. |
| Health traffic during rollback | 280 production and 280 test-listener health samples; no failed health samples. The deliberate 503 requests are counted separately. |
| Rollback error reporting | Terraform returned nonzero with the active-alarm rollback reason; `smoke` refused to report the failed desired release as successful. |
| Cleanup | Terraform destroyed 53 tracked resource instances. Late telemetry recreated the performance log group once; supplemental deletion and direct AWS checks confirmed cleanup. |

Health probes ran throughout both updates at approximately one-second intervals,
with periodic ECS and ALB API inspection. This is sampled evidence, not proof of
zero downtime or a load/soak test. Smoke checks also verified release headers,
GET/POST echo behavior, the exact running task revision, target health, private
ENIs, and balanced AZ placement.

## Controlled alarm test

A temporary `v4-alarm` revision added only this route to `Caddyfile`:

```caddyfile
respond /intentional-failure "intentional rollback test" 503
```

Health and normal application routes remained healthy. After production served
`v4-alarm`, requests to that route generated real ALB target 5xx metrics; the
alarm was not forced with `SetAlarmState`. ECS reported the alarm as `TRIGGERED`
and automatically restored `v3` on the green target group. GET/POST responses,
release headers, three healthy tasks, and task-definition revision `:3` confirmed
recovery. The source `Caddyfile` was restored byte-for-byte after the test.

The first deliberate 503 was observed at 12:49:48 UTC, rollback in progress at
12:53:02, and production back on `v3` at 12:53:11. These are sampling timestamps,
not exact control-plane transition times. Alarm detection took multiple minutes;
the one-minute bake used for successful-release tests would not have been a safe
assumption for this alarm test.

## Cleanup findings

Enabling Container Insights automatically created
`/aws/ecs/containerinsights/<cluster>/performance` outside Terraform state. The
stack now creates and manages that group before the cluster, with one-day
retention. Mock tests cover both log groups and their retention settings. For
this already-running fixture, the existing group was imported before cleanup;
fresh precreation ordering is covered by the mock apply, not another full live
bootstrap.

Terraform successfully deleted all 53 tracked resource instances, but delayed
Fargate telemetry then recreated the performance group. Its new streams contained
12:56 UTC events ingested around 12:58:38–12:58:44, after Terraform had deleted
the original group. Managing the group does **not** prevent this asynchronous
recreation. After confirming the cluster was inactive with zero tasks and late
delivery had stopped, the recreated group was deleted separately.

Direct AWS checks confirmed the VPC, ALB, target groups, NAT gateways, allocated
Elastic IPs, dedicated IAM roles, alarm, and both log groups were removed; the
ECS cluster was inactive and Terraform state was empty. The README documents the
post-destroy log-group check and safe prefix reuse.

## Limits

This run does not verify HTTPS/certificate/DNS setup, optional Lambda validation
hooks, manual rollback, startup-failure circuit-breaker rollback, autoscaling,
long-lived connection draining, database migrations, or production load. Those
still require workload-specific acceptance testing.
