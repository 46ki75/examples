resource "aws_subnet" "ec2" {
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-1a"

  tags = {
    "Name" = "${local.prefix}-vpc-subnet-ec2"
  }
}

resource "aws_route_table" "ec2" {
  vpc_id = aws_vpc.vpc.id
}

resource "aws_route" "ec2_to_nat" {
  route_table_id         = aws_route_table.ec2.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_nat_gateway.nat.id
}

resource "aws_route_table_association" "ec2" {
  subnet_id      = aws_subnet.ec2.id
  route_table_id = aws_route_table.ec2.id
}
