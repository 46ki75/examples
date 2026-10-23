resource "aws_cloudwatch_log_group" "caddy" {
  name              = "/ecs/${var.prefix}"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "insights" {
  name              = "/aws/ecs/containerinsights/${var.prefix}/performance"
  retention_in_days = 1
}

resource "aws_ecs_cluster" "main" {
  name = var.prefix

  # Manage retention/deletion; late ECS telemetry can still recreate the group.
  depends_on = [aws_cloudwatch_log_group.insights]

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "caddy" {
  lifecycle {
    create_before_destroy = true
  }

  family                   = var.prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([{
    name      = "caddy"
    image     = var.caddy_image
    essential = true
    portMappings = [{
      containerPort = local.container_port
      protocol      = "tcp"
    }]

    # Configuration and release changes produce immutable task-definition revisions.
    entryPoint = ["/bin/sh", "-ec"]
    command = [<<-SH
      printf '%s' "$CADDYFILE" > /etc/caddy/Caddyfile
      exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
    SH
    ]
    environment = [
      { name = "CADDYFILE", value = file("${path.module}/Caddyfile") },
      { name = "RELEASE", value = var.release },
    ]
    healthCheck = {
      command     = ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:${local.container_port}/health || exit 1"]
      interval    = 10
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.caddy.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "caddy"
        mode                  = "non-blocking"
        max-buffer-size       = "1m"
      }
    }
  }])
}

resource "aws_ecs_service" "caddy" {
  name                               = "caddy"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.caddy.arn
  desired_count                      = local.task_count
  availability_zone_rebalancing      = "ENABLED"
  launch_type                        = "FARGATE"
  platform_version                   = "1.4.0"
  health_check_grace_period_seconds  = 60
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  wait_for_steady_state              = true
  enable_ecs_managed_tags            = true
  propagate_tags                     = "SERVICE"

  deployment_controller {
    type = "ECS"
  }

  deployment_configuration {
    strategy             = "BLUE_GREEN"
    bake_time_in_minutes = var.bake_time_in_minutes

    dynamic "lifecycle_hook" {
      for_each = var.validation_hook_arn == null ? [] : [var.validation_hook_arn]
      content {
        hook_target_arn  = lifecycle_hook.value
        role_arn         = aws_iam_role.validation[0].arn
        lifecycle_stages = ["POST_TEST_TRAFFIC_SHIFT"]
        hook_details = jsonencode({
          test_url         = local.test_url
          expected_release = var.release
        })
      }
    }
  }

  # Native ECS BLUE_GREEN supports this despite older rolling-only API wording.
  # See deploy-blue-green-service and the provider's BlueGreenDeployment_circuitBreakerRollback test.
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  alarms {
    enable      = true
    rollback    = true
    alarm_names = [aws_cloudwatch_metric_alarm.target_errors.alarm_name]
  }

  network_configuration {
    subnets          = [for subnet in aws_subnet.private : subnet.id]
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.caddy["blue"].arn
    container_name   = "caddy"
    container_port   = local.container_port

    advanced_configuration {
      alternate_target_group_arn = aws_lb_target_group.caddy["green"].arn
      production_listener_rule   = aws_lb_listener_rule.production.arn
      test_listener_rule         = aws_lb_listener_rule.test.arn
      role_arn                   = aws_iam_role.load_balancer.arn
    }
  }

  timeouts {
    create = "60m"
    update = "60m"
    delete = "30m"
  }

  # Keep networking and IAM alive through service deletion as well as creation.
  depends_on = [
    aws_iam_role_policy.logs,
    aws_iam_role_policy_attachment.load_balancer,
    aws_iam_role_policy.validation,
    aws_route.nat,
    aws_route_table_association.private,
    aws_vpc_security_group_ingress_rule.tasks_from_alb,
    aws_vpc_security_group_egress_rule.alb_to_tasks,
    aws_vpc_security_group_egress_rule.tasks_https,
  ]
}
