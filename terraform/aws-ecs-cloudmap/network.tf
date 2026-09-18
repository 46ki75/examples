locals {
  availability_zones = slice(sort(data.aws_availability_zones.available.names), 0, var.availability_zone_count)
  private_subnets    = { for index, zone in local.availability_zones : zone => index }
  container_port     = 8080
  task_count         = coalesce(var.task_count, var.availability_zone_count)
}

resource "aws_vpc" "main" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = var.prefix }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = var.prefix }
}

resource "aws_nat_gateway" "regional" {
  vpc_id            = aws_vpc.main.id
  availability_mode = "regional"
  connectivity_type = "public"

  tags = { Name = var.prefix }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_subnet" "private" {
  for_each = local.private_subnets

  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, each.value + 1)

  tags = { Name = "${var.prefix}-private-${each.key}" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.prefix}-private" }
}

resource "aws_route" "nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.regional.id
}

resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}

resource "aws_security_group" "vpc_link" {
  name_prefix = "${var.prefix}-vpc-link-"
  description = "API Gateway connections to Caddy"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "tasks" {
  name_prefix = "${var.prefix}-tasks-"
  description = "Private Caddy tasks"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_egress_rule" "vpc_link_to_tasks" {
  security_group_id            = aws_security_group.vpc_link.id
  referenced_security_group_id = aws_security_group.tasks.id
  ip_protocol                  = "tcp"
  from_port                    = local.container_port
  to_port                      = local.container_port
}

resource "aws_vpc_security_group_ingress_rule" "tasks_from_vpc_link" {
  security_group_id            = aws_security_group.tasks.id
  referenced_security_group_id = aws_security_group.vpc_link.id
  ip_protocol                  = "tcp"
  from_port                    = local.container_port
  to_port                      = local.container_port
}

resource "aws_vpc_security_group_egress_rule" "tasks_https" {
  security_group_id = aws_security_group.tasks.id
  description       = "Image pulls and CloudWatch Logs through NAT"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}
