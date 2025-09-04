data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_security_group" "fargate" {
  name   = "46ki75-aws-ec2-sg"
  vpc_id = aws_vpc.vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "fargate" {
  name              = "/ecs/46ki75-aws-fargate-task"
  retention_in_days = 7
  skip_destroy      = false
}

resource "aws_ecs_cluster" "fargate" {
  name = "46ki75-aws-fargate-cluster"
}

resource "aws_ecs_task_definition" "fargate" {
  family                   = "46ki75-aws-fargate-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = aws_iam_role.task_execution_role.arn
  task_role_arn      = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name      = "web-container"
    image     = "caddy:latest"
    essential = true

    linuxParameters = {
      initProcessEnabled = true
    }

    portMappings = [{
      containerPort = 80
      hostPort      = 80
    }]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/46ki75-aws-fargate-task"
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "web-container"
      }
    }
  }])
}

resource "aws_ecs_service" "fargate_service" {
  name            = "46ki75-aws-fargate-service"
  cluster         = aws_ecs_cluster.fargate.id
  task_definition = aws_ecs_task_definition.fargate.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.ec2.id]
    security_groups  = [aws_security_group.fargate.id]
    assign_public_ip = true
  }

  desired_count = 1

  enable_execute_command = true
}

