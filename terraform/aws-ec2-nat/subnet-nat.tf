resource "aws_subnet" "nat" {
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = "10.0.0.0/24"
  availability_zone = "ap-northeast-1a"

  tags = {
    "Name" = "${local.prefix}-vpc-subnet-nat"
  }
}

resource "aws_eip" "nat" {
  tags = {
    "Name" = "${local.prefix}-vpc-eip-nat"
  }
}

resource "aws_nat_gateway" "nat" {
  subnet_id     = aws_subnet.nat.id
  allocation_id = aws_eip.nat.id

  tags = {
    "Name" = "${local.prefix}-vpc-nat_gateway-main"
  }
}

resource "aws_route_table" "nat" {
  vpc_id = aws_vpc.vpc.id
}

resource "aws_route" "nat_to_igw" {
  route_table_id         = aws_route_table.nat.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "nat" {
  subnet_id      = aws_subnet.nat.id
  route_table_id = aws_route_table.nat.id
}
