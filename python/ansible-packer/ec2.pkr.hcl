variable "ami_id" {
  type =  string
  default = "ami-07faa35bbd2230d90"
}

packer {
  required_plugins {
    amazon = {
      version = ">= 1.4.0"
      source  = "github.com/hashicorp/amazon"
    }
    ansible = {
      version = ">= 1.1.4"
      source = "github.com/hashicorp/ansible"
    }
  }
}

source "amazon-ebs" "example" {
  ami_name      = "packer-ansible-example"
  instance_type = "t3.small"
  region        = "ap-northeast-1"

  vpc_id        = "vpc-0710ec673a3009d27"
  subnet_id     = "subnet-09dfc0f1ca57d317e" 
  security_group_id = "sg-017dc9d2489e366d7"
  source_ami = var.ami_id

  ssh_username = "ec2-user"
}

build {
  sources = ["source.amazon-ebs.example"]

  provisioner "ansible" {
    playbook_file = "./playbooks/site.yaml"
  }
}