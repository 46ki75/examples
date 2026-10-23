locals {
  availability_zones = slice(sort(data.aws_availability_zones.available.names), 0, var.availability_zone_count)
  subnets            = { for index, zone in local.availability_zones : zone => index }
  container_port     = 8080
  test_port          = 8081
  task_count         = coalesce(var.task_count, var.availability_zone_count)
  tls_enabled        = var.certificate_arn != null
  production_port    = local.tls_enabled ? 443 : 80
  protocol           = local.tls_enabled ? "HTTPS" : "HTTP"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.43.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = var.prefix }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = var.prefix }
}

resource "aws_subnet" "public" {
  for_each = local.subnets

  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, each.value + 1)
  tags              = { Name = "${var.prefix}-public-${each.key}" }
}

resource "aws_subnet" "private" {
  for_each = local.subnets

  vpc_id            = aws_vpc.main.id
  availability_zone = each.key
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, each.value + 101)
  tags              = { Name = "${var.prefix}-private-${each.key}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.prefix}-public" }
}

resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_eip" "nat" {
  for_each = local.subnets

  domain = "vpc"
  tags   = { Name = "${var.prefix}-nat-${each.key}" }
}

resource "aws_nat_gateway" "main" {
  for_each = aws_subnet.public

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = each.value.id
  tags          = { Name = "${var.prefix}-${each.key}" }

  depends_on = [aws_route.internet]
}

resource "aws_route_table" "private" {
  for_each = local.subnets

  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.prefix}-private-${each.key}" }
}

resource "aws_route" "nat" {
  for_each = aws_route_table.private

  route_table_id         = each.value.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[each.key].id
}

resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = aws_route_table.private[each.key].id
}

resource "aws_security_group" "alb" {
  name_prefix = "${var.prefix}-alb-"
  description = "Production clients and explicitly allowed deployment testers"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "tasks" {
  name_prefix = "${var.prefix}-tasks-"
  description = "Private Caddy tasks; ingress only from the ALB"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "production" {
  for_each = var.client_cidrs

  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = local.production_port
  to_port           = local.production_port
}

resource "aws_vpc_security_group_ingress_rule" "redirect" {
  for_each = local.tls_enabled ? var.client_cidrs : toset([])

  # Move the production rule off port 80 before adding the redirect's ingress.
  depends_on = [aws_vpc_security_group_ingress_rule.production]

  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "test" {
  for_each = var.test_client_cidrs

  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = local.test_port
  to_port           = local.test_port
}

resource "aws_vpc_security_group_egress_rule" "alb_to_tasks" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = aws_security_group.tasks.id
  ip_protocol                  = "tcp"
  from_port                    = local.container_port
  to_port                      = local.container_port
}

resource "aws_vpc_security_group_ingress_rule" "tasks_from_alb" {
  security_group_id            = aws_security_group.tasks.id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = local.container_port
  to_port                      = local.container_port
}

resource "aws_vpc_security_group_egress_rule" "tasks_https" {
  security_group_id = aws_security_group.tasks.id
  description       = "Image pulls and CloudWatch Logs through same-AZ NAT"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}
