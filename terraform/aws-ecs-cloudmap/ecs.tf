resource "aws_cloudwatch_log_group" "caddy" {
  name              = "/ecs/${var.prefix}"
  retention_in_days = 7
}

resource "aws_iam_role" "execution" {
  name = "${var.prefix}-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "logs" {
  name = "caddy-logs"
  role = aws_iam_role.execution.id

  # Public image pulls need no ECR credentials, and Caddy calls no AWS APIs.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.caddy.arn}:*"
    }]
  })
}

resource "aws_ecs_cluster" "main" {
  name = var.prefix
}

resource "aws_ecs_task_definition" "caddy" {
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

    # A config change creates a task revision without a separate image build or EFS mount.
    entryPoint = ["/bin/sh", "-ec"]
    command = [<<-SH
      printf '%s' "$CADDYFILE" > /etc/caddy/Caddyfile
      exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
    SH
    ]
    environment = [{ name = "CADDYFILE", value = file("${path.module}/Caddyfile") }]

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
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  wait_for_steady_state              = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = [for subnet in aws_subnet.private : subnet.id]
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn   = local.cloudmap_service.Arn
    container_name = "caddy"
    container_port = local.container_port
  }

  propagate_tags = "SERVICE"

  # ENIs alone do not imply working egress; finish routes and log permissions before starting tasks.
  depends_on = [
    aws_iam_role_policy.logs,
    aws_route.nat,
    aws_route_table_association.private,
    aws_vpc_security_group_egress_rule.tasks_https,
  ]
}
