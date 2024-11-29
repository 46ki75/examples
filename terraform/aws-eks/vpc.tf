resource "aws_vpc" "eks" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "eks1" {
  vpc_id            = aws_vpc.eks.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-1a"
}

resource "aws_subnet" "eks2" {
  vpc_id            = aws_vpc.eks.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-northeast-1c"
}

resource "aws_subnet" "eks3" {
  vpc_id            = aws_vpc.eks.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "ap-northeast-1d"
}
