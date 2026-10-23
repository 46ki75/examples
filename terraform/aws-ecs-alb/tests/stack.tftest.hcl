# All runs use a mocked provider: no AWS credentials, API calls, or resources.
mock_provider "aws" {
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }

  mock_data "aws_availability_zones" {
    defaults = { names = ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"] }
  }

  # Valid computed ARNs let downstream provider validation run during mock apply.
  mock_resource "aws_lb" {
    defaults = {
      arn        = "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/demo/1111111111111111"
      arn_suffix = "app/demo/1111111111111111"
    }
  }
  mock_resource "aws_lb_listener" {
    defaults = { arn = "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:listener/app/demo/1111111111111111/2222222222222222" }
  }
  mock_resource "aws_lb_listener_rule" {
    defaults = { arn = "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:listener-rule/app/demo/1111111111111111/2222222222222222/3333333333333333" }
  }
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/demo" }
  }
  mock_resource "aws_cloudwatch_log_group" {
    defaults = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/ecs/demo" }
  }
  mock_resource "aws_ecs_cluster" {
    defaults = { arn = "arn:aws:ecs:ap-northeast-1:123456789012:cluster/demo" }
  }
  mock_resource "aws_ecs_task_definition" {
    defaults = { arn = "arn:aws:ecs:ap-northeast-1:123456789012:task-definition/demo:1" }
  }
}

override_resource {
  target = aws_lb_target_group.caddy["blue"]
  values = {
    arn = "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:targetgroup/blue/1111111111111111"
  }
}

override_resource {
  target = aws_lb_target_group.caddy["green"]
  values = {
    arn = "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:targetgroup/green/2222222222222222"
  }
}

run "native_blue_green" {
  # Mock apply makes generated IDs available for topology assertions; no AWS calls.
  command = apply

  assert {
    condition     = aws_ecs_service.caddy.deployment_controller[0].type == "ECS" && aws_ecs_service.caddy.deployment_configuration[0].strategy == "BLUE_GREEN"
    error_message = "Use native ECS blue/green, not CodeDeploy or rolling deployment."
  }

  assert {
    condition     = tonumber(aws_ecs_service.caddy.deployment_configuration[0].bake_time_in_minutes) == 5 && aws_ecs_service.caddy.wait_for_steady_state
    error_message = "Retain the old revision for five minutes and wait for deployment completion."
  }

  assert {
    condition     = aws_ecs_service.caddy.deployment_circuit_breaker[0].enable && aws_ecs_service.caddy.deployment_circuit_breaker[0].rollback && aws_ecs_service.caddy.alarms[0].enable && aws_ecs_service.caddy.alarms[0].rollback
    error_message = "Enable both native ECS startup-failure and alarm-based rollback."
  }

  assert {
    condition = (
      length(aws_lb_target_group.caddy) == 2 &&
      alltrue([for group in aws_lb_target_group.caddy : group.target_type == "ip" && group.health_check[0].path == "/health"]) &&
      one(aws_ecs_service.caddy.load_balancer).target_group_arn == aws_lb_target_group.caddy["blue"].arn &&
      one(aws_ecs_service.caddy.load_balancer).advanced_configuration[0].alternate_target_group_arn == aws_lb_target_group.caddy["green"].arn
    )
    error_message = "Wire the Fargate service to two distinct, health-checked IP target groups."
  }

  assert {
    condition = alltrue([
      for rule in [aws_lb_listener_rule.production, aws_lb_listener_rule.test] :
      one([for group in rule.action[0].forward[0].target_group : group if group.arn == aws_lb_target_group.caddy["blue"].arn]).weight == 100 &&
      one([for group in rule.action[0].forward[0].target_group : group if group.arn == aws_lb_target_group.caddy["green"].arn]).weight == 0
    ])
    error_message = "Both listeners must start on the initial revision, with the alternate group at zero."
  }

  assert {
    condition = (
      length(aws_subnet.public) == 3 && length(aws_subnet.private) == 3 && length(aws_nat_gateway.main) == 3 &&
      alltrue([for zone, route in aws_route.nat : route.nat_gateway_id == aws_nat_gateway.main[zone].id]) &&
      !aws_ecs_service.caddy.network_configuration[0].assign_public_ip &&
      aws_ecs_service.caddy.desired_count == 3
    )
    error_message = "Keep three public/private AZ pairs, same-AZ NAT routes, and private tasks."
  }

  assert {
    condition = (
      aws_vpc_security_group_ingress_rule.tasks_from_alb.from_port == 8080 &&
      aws_vpc_security_group_ingress_rule.tasks_from_alb.to_port == 8080 &&
      aws_vpc_security_group_ingress_rule.tasks_from_alb.referenced_security_group_id == aws_security_group.alb.id &&
      length(aws_vpc_security_group_ingress_rule.test) == 0
    )
    error_message = "Only the ALB may reach tasks; test ingress is disabled by default."
  }

  assert {
    condition     = aws_lb_listener.production.port == 80 && aws_lb_listener.production.protocol == "HTTP" && length(aws_lb_listener.redirect) == 0
    error_message = "The certificate-free configuration is explicitly HTTP demo mode."
  }

  assert {
    condition     = endswith(aws_iam_role_policy_attachment.load_balancer.policy_arn, ":iam::aws:policy/AmazonECSInfrastructureRolePolicyForLoadBalancers") && jsondecode(aws_iam_role.load_balancer.assume_role_policy).Statement[0].Principal.Service == "ecs.amazonaws.com"
    error_message = "ECS needs its dedicated infrastructure role and load-balancer permissions."
  }

  assert {
    condition     = aws_cloudwatch_log_group.insights.name == "/aws/ecs/containerinsights/${var.prefix}/performance" && aws_cloudwatch_log_group.insights.retention_in_days == 1 && aws_cloudwatch_log_group.caddy.retention_in_days == 7
    error_message = "Manage both application and ECS-created performance logs with bounded retention and Terraform cleanup."
  }

  assert {
    condition     = jsondecode(aws_ecs_task_definition.caddy.container_definitions)[0].environment[1].value == "v1" && length(aws_ecs_service.caddy.deployment_configuration[0].lifecycle_hook) == 0
    error_message = "Default to release v1 without pretending an automatic validation hook is installed."
  }
}

run "https_and_validation" {
  command = plan

  variables {
    certificate_arn     = "arn:aws:acm:ap-northeast-1:123456789012:certificate/123abc"
    domain_name         = "app.example.com"
    test_client_cidrs   = ["203.0.113.10/32"]
    validation_hook_arn = "arn:aws:lambda:ap-northeast-1:123456789012:function:validate:live"
    release             = "v2"
  }

  assert {
    condition = (
      aws_lb_listener.production.port == 443 && aws_lb_listener.production.protocol == "HTTPS" &&
      aws_lb_listener.test.protocol == "HTTPS" && aws_lb_listener.redirect[0].port == 80 &&
      aws_lb_listener.redirect[0].default_action[0].redirect[0].protocol == "HTTPS" &&
      output.production_url == "https://app.example.com" && output.test_url == "https://app.example.com:8081"
    )
    error_message = "Use HTTPS and redirect HTTP when a domain/certificate is provided."
  }

  assert {
    condition     = length(aws_vpc_security_group_ingress_rule.test) == 1 && aws_vpc_security_group_ingress_rule.test["203.0.113.10/32"].from_port == 8081
    error_message = "Allow test traffic only on port 8081 from the configured tester."
  }

  assert {
    condition = (
      length(aws_iam_role.validation) == 1 &&
      one(aws_ecs_service.caddy.deployment_configuration[0].lifecycle_hook).lifecycle_stages == tolist(["POST_TEST_TRAFFIC_SHIFT"]) &&
      jsondecode(one(aws_ecs_service.caddy.deployment_configuration[0].lifecycle_hook).hook_details).expected_release == "v2" &&
      jsondecode(aws_iam_role_policy.validation[0].policy).Statement[0].Resource == var.validation_hook_arn
    )
    error_message = "Run the supplied validation Lambda after test cutover with a scoped invocation role."
  }
}

run "two_az_override" {
  command = plan
  variables {
    availability_zone_count = 2
    task_count              = 4
    bake_time_in_minutes    = 10
  }
  assert {
    condition     = length(aws_nat_gateway.main) == 2 && aws_ecs_service.caddy.desired_count == 4 && tonumber(aws_ecs_service.caddy.deployment_configuration[0].bake_time_in_minutes) == 10
    error_message = "Respect supported AZ, task count, and bake-time overrides."
  }
}

run "reject_single_az" {
  command = plan
  variables {
    availability_zone_count = 1
  }
  expect_failures = [var.availability_zone_count]
}

run "reject_insufficient_tasks" {
  command = plan
  variables {
    task_count = 1
  }
  expect_failures = [var.task_count]
}

run "reject_public_test_listener" {
  command = plan
  variables {
    test_client_cidrs = ["0.0.0.0/0"]
  }
  expect_failures = [var.test_client_cidrs]
}

run "reject_noncanonical_public_test_listener" {
  command = plan
  variables {
    test_client_cidrs = ["203.0.113.10/0"]
  }
  expect_failures = [var.test_client_cidrs]
}

run "reject_insufficient_region_azs" {
  command = plan
  override_data {
    target = data.aws_availability_zones.available
    values = { names = ["ap-northeast-1a", "ap-northeast-1c"] }
  }
  expect_failures = [var.availability_zone_count]
}

run "reject_unpinned_image" {
  command = plan
  variables {
    caddy_image = "caddy:latest"
  }
  expect_failures = [var.caddy_image]
}

run "reject_incomplete_tls" {
  command = plan
  variables {
    domain_name = "app.example.com"
  }
  expect_failures = [var.domain_name]
}

run "reject_wrong_certificate_region" {
  command = plan
  variables {
    certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/123abc"
    domain_name     = "app.example.com"
  }
  expect_failures = [var.certificate_arn]
}

run "reject_short_bake" {
  command = plan
  variables {
    bake_time_in_minutes = 0
  }
  expect_failures = [var.bake_time_in_minutes]
}
