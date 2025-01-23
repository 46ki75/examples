data "aws_caller_identity" "current" {}

resource "aws_iam_role" "ssm_role" {
  name = "${local.prefix}-iam-role-ssm"

  assume_role_policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Action" : "sts:AssumeRole",
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy_attachment" "ssm_role_policy" {
  name       = "${local.prefix}-iam-policy_attachment-ssm"
  roles      = [aws_iam_role.ssm_role.name]
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile" {
  name = "${local.prefix}-iam-instance_profile-ssm"
  role = aws_iam_role.ssm_role.name
}

resource "aws_security_group" "main" {
  name   = "${local.prefix}-ec2-security_group-main"
  vpc_id = aws_vpc.vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "instance" {
  availability_zone = "ap-northeast-1a"
  instance_type     = "t3.micro"
  ami               = "ami-094dc5cf74289dfbc"
  subnet_id         = aws_subnet.ec2.id
  security_groups   = [aws_security_group.main.id]

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile.name

  user_data = file("./cloud-init.yaml")

  tags = {
    "Name" = "${local.prefix}-ec2-instance-private"
  }
}


