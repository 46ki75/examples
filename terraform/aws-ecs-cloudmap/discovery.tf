resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.prefix}.internal"
  description = "Private Caddy task discovery"
  vpc         = aws_vpc.main.id
}

resource "aws_cloudcontrolapi_resource" "caddy" {
  type_name = "AWS::ServiceDiscovery::Service"

  desired_state = jsonencode({
    Name        = "caddy"
    NamespaceId = aws_service_discovery_private_dns_namespace.main.id

    DnsConfig = {
      NamespaceId   = aws_service_discovery_private_dns_namespace.main.id
      RoutingPolicy = "MULTIVALUE"

      # API Gateway DiscoverInstances needs both AWS_INSTANCE_IPV4 and AWS_INSTANCE_PORT.
      DnsRecords = [{
        Type = "SRV"
        TTL  = 10
      }]
    }

    # aws_service_discovery_service drops empty blocks and deprecates its only
    # custom-health argument. Cloud Control requires the fixed threshold: an
    # empty object fails in its handler with a null FailureThreshold error.
    HealthCheckCustomConfig = { FailureThreshold = 1 }

    Tags = [for key, value in local.tags : { Key = key, Value = value }]
  })
}

locals {
  cloudmap_service = jsondecode(aws_cloudcontrolapi_resource.caddy.properties)
}
