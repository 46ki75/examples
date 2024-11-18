data "aws_caller_identity" "current" {}

resource "aws_iam_role" "ssm_role" {
  name = "46ki75-ssm-role"

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
  name       = "46ki75-ssm-role-policy-attachment"
  roles      = [aws_iam_role.ssm_role.name]
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile" {
  name = "46ki75-ssm-instance-profile"
  role = aws_iam_role.ssm_role.name
}

resource "aws_security_group" "instance" {
  name   = "46ki75-aws-ec2-sg"
  vpc_id = aws_vpc.vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "instance" {
  availability_zone           = "ap-northeast-1a"
  instance_type               = "t3.micro"
  ami                         = "ami-094dc5cf74289dfbc"
  subnet_id                   = aws_subnet.subnet.id
  associate_public_ip_address = true
  security_groups             = [aws_security_group.instance.id]

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile.name

  user_data = file("./cloud-init.yaml")

  tags = {
    "Name" = "46ki75-aws-ec2-instance"
  }
}


