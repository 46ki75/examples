data "aws_region" "current" {}
data "aws_caller_identity" "current" {}


resource "aws_rds_cluster" "demo" {
  cluster_identifier = "shared-46ki75-examples-rds-cluster-demo"
  engine             = "aurora-postgresql"
  engine_version     = "16.6"
  availability_zones = ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"]

  database_name = "mydb"

  master_username             = "postgres"
  manage_master_user_password = true

  enable_http_endpoint = true

  db_subnet_group_name = aws_db_subnet_group.demo.name

  serverlessv2_scaling_configuration {
    max_capacity             = 2.5
    min_capacity             = 0.0
    seconds_until_auto_pause = 5 * 60
  }

  skip_final_snapshot = true
}

resource "aws_rds_cluster_instance" "instance_1" {
  identifier         = "shared-46ki75-examples-rds-instance-demo-1"
  cluster_identifier = aws_rds_cluster.demo.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.demo.engine
  engine_version     = aws_rds_cluster.demo.engine_version
}

resource "aws_db_subnet_group" "demo" {
  name       = "${local.prefix}-db-subnet-group-demo"
  subnet_ids = [aws_subnet.subnet_a.id, aws_subnet.subnet_c.id, aws_subnet.subnet_d.id]
}
