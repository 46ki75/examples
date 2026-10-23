locals {
  endpoint_host  = coalesce(var.domain_name, aws_lb.main.dns_name)
  production_url = "${lower(local.protocol)}://${local.endpoint_host}"
  test_url       = "${lower(local.protocol)}://${local.endpoint_host}:${local.test_port}"
}

output "production_url" {
  description = "Public demo endpoint; use HTTPS with your own certificate/DNS for production."
  value       = local.production_url
}

output "test_url" {
  description = "Test listener, reachable only from test_client_cidrs; not a permanent green endpoint."
  value       = local.test_url
}

output "alb_dns_name" {
  description = "ALB DNS target for your domain's ALIAS/CNAME."
  value       = aws_lb.main.dns_name
}

output "region" {
  value = var.region
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.caddy.name
}

output "task_definition_arn" {
  description = "Desired Terraform task revision; smoke compares it with the actual running revision."
  value       = aws_ecs_task_definition.caddy.arn
}

output "release" {
  value = var.release
}

output "task_count" {
  value = local.task_count
}

output "availability_zones" {
  value = local.availability_zones
}

output "private_subnet_ids" {
  value = { for zone, subnet in aws_subnet.private : zone => subnet.id }
}

output "target_group_arns" {
  description = "Reusable target-group slots; blue is not necessarily the current production slot."
  value       = { for slot, group in aws_lb_target_group.caddy : slot => group.arn }
}

output "production_rule_arn" {
  value = aws_lb_listener_rule.production.arn
}

output "test_rule_arn" {
  value = aws_lb_listener_rule.test.arn
}

output "nat_public_ips" {
  description = "Stable per-AZ egress addresses, useful for allowlisting an external test runner."
  value       = { for zone, address in aws_eip.nat : zone => address.public_ip }
}

output "deployment_alarm_name" {
  value = aws_cloudwatch_metric_alarm.target_errors.alarm_name
}

output "log_group" {
  value = aws_cloudwatch_log_group.caddy.name
}
