resource "aws_lb" "main" {
  name                       = var.prefix
  internal                   = false
  load_balancer_type         = "application"
  ip_address_type            = "ipv4"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = [for subnet in aws_subnet.public : subnet.id]
  drop_invalid_header_fields = true
  desync_mitigation_mode     = "strictest"

  depends_on = [aws_route.internet, aws_route_table_association.public]
}

resource "aws_lb_target_group" "caddy" {
  for_each = toset(["blue", "green"])

  name                 = "${var.prefix}-${each.key}"
  port                 = local.container_port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener" "production" {
  load_balancer_arn = aws_lb.main.arn
  port              = local.production_port
  protocol          = local.protocol
  certificate_arn   = var.certificate_arn
  ssl_policy        = local.tls_enabled ? "ELBSecurityPolicy-TLS13-1-2-2021-06" : null

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not found"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener" "redirect" {
  count = local.tls_enabled ? 1 : 0

  # In an HTTP-to-HTTPS migration, free port 80 before creating the redirect.
  depends_on = [aws_lb_listener.production]

  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "test" {
  load_balancer_arn = aws_lb.main.arn
  port              = local.test_port
  protocol          = local.protocol
  certificate_arn   = var.certificate_arn
  ssl_policy        = local.tls_enabled ? "ELBSecurityPolicy-TLS13-1-2-2021-06" : null

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not found"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "production" {
  listener_arn = aws_lb_listener.production.arn
  priority     = 100

  action {
    type = "forward"
    forward {
      target_group {
        arn    = aws_lb_target_group.caddy["blue"].arn
        weight = 100
      }
      target_group {
        arn    = aws_lb_target_group.caddy["green"].arn
        weight = 0
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }

  # ECS owns forwarding targets/weights; match the provider's native B/G tests.
  lifecycle {
    ignore_changes = [action[0].forward[0].target_group]
  }
}

resource "aws_lb_listener_rule" "test" {
  listener_arn = aws_lb_listener.test.arn
  priority     = 100

  action {
    type = "forward"
    forward {
      target_group {
        arn    = aws_lb_target_group.caddy["blue"].arn
        weight = 100
      }
      target_group {
        arn    = aws_lb_target_group.caddy["green"].arn
        weight = 0
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }

  # ECS redirects test traffic to the new revision before production cutover.
  lifecycle {
    ignore_changes = [action[0].forward[0].target_group]
  }
}

resource "aws_cloudwatch_metric_alarm" "target_errors" {
  alarm_name          = "${var.prefix}-target-5xx"
  alarm_description   = "Roll back an ECS deployment after five target 5xx responses in one minute."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { LoadBalancer = aws_lb.main.arn_suffix }
}
