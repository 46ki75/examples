data "aws_region" "current" {}

resource "aws_security_group" "endpoint" {
  name   = "46ki75-aws-ec2-sg-endpoint"
  vpc_id = aws_vpc.vpc.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.instance.id]
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.vpc.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [
    aws_route_table.route_table.id,
  ]
}

resource "aws_vpc_endpoint" "ssm" {
  vpc_id            = aws_vpc.vpc.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.ssm"
  vpc_endpoint_type = "Interface"
  subnet_ids = [
    aws_subnet.subnet.id,
  ]
  private_dns_enabled = true
  security_group_ids = [
    aws_security_group.endpoint.id,
  ]
}

resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id            = aws_vpc.vpc.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.ssmmessages"
  vpc_endpoint_type = "Interface"
  subnet_ids = [
    aws_subnet.subnet.id,
  ]
  private_dns_enabled = true
  security_group_ids = [
    aws_security_group.endpoint.id,
  ]
}

resource "aws_vpc_endpoint" "ec2messages" {
  vpc_id            = aws_vpc.vpc.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.ec2messages"
  vpc_endpoint_type = "Interface"
  subnet_ids = [
    aws_subnet.subnet.id,
  ]
  private_dns_enabled = true
  security_group_ids = [
    aws_security_group.endpoint.id,
  ]
}
