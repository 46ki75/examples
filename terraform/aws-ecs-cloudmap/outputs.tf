output "api_url" {
  description = "Public HTTPS endpoint for the Caddy demo."
  value       = trimsuffix(aws_apigatewayv2_stage.default.invoke_url, "/")
}

output "region" {
  description = "Region containing the deployed stack."
  value       = var.region
}

output "ecs_cluster_name" {
  description = "ECS cluster for service diagnostics."
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service for task inspection."
  value       = aws_ecs_service.caddy.name
}

output "cloudmap_namespace" {
  description = "Namespace passed to Cloud Map DiscoverInstances."
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "cloudmap_service_name" {
  description = "Service name passed to Cloud Map DiscoverInstances."
  value       = local.cloudmap_service.Name
}

output "cloudmap_service_id" {
  description = "Cloud Map service ID for instance and health inspection."
  value       = local.cloudmap_service.Id
}

output "task_count" {
  description = "Expected steady-state number of healthy tasks."
  value       = local.task_count
}

output "availability_zones" {
  description = "AZs expected to contain healthy Caddy tasks."
  value       = local.availability_zones
}

output "private_subnet_ids" {
  description = "Private subnet IDs keyed by AZ, also used for egress probes."
  value       = { for zone, subnet in aws_subnet.private : zone => subnet.id }
}

output "nat_gateway_id" {
  description = "Regional NAT gateway for coverage and egress diagnostics."
  value       = aws_nat_gateway.regional.id
}

output "vpc_link_id" {
  description = "API Gateway VPC Link for subnet coverage checks."
  value       = aws_apigatewayv2_vpc_link.main.id
}

output "log_groups" {
  description = "CloudWatch log groups for backend and API access logs."
  value = {
    caddy = aws_cloudwatch_log_group.caddy.name
    api   = aws_cloudwatch_log_group.api.name
  }
}
