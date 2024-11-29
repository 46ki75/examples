// # --------------------------------------------------------------------------------
//
// cluster
//
// # --------------------------------------------------------------------------------

resource "aws_eks_cluster" "eks_cluster" {
  name     = "46ki75-poc-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.eks1.id,
      aws_subnet.eks2.id,
      aws_subnet.eks3.id
    ]
  }
}

resource "aws_iam_role" "eks_cluster_role" {
  name = "46ki75-poc-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_role_attachment" {
  role       = aws_iam_role.eks_cluster_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

// # --------------------------------------------------------------------------------
//
// node (fargate)
//
// # --------------------------------------------------------------------------------

resource "aws_eks_fargate_profile" "example" {
  cluster_name         = aws_eks_cluster.eks_cluster.name
  fargate_profile_name = "example"

  pod_execution_role_arn = aws_iam_role.eks_fargate_pod_execution_role.arn

  subnet_ids = [
    aws_subnet.eks1.id,
    aws_subnet.eks2.id,
    aws_subnet.eks3.id
  ]

  selector {
    namespace = "default"
  }
}

resource "aws_iam_role" "eks_fargate_pod_execution_role" {
  name = "eks-fargate-pod-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "eks-fargate-pods.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_fargate_pod_execution_role_policy" {
  role       = aws_iam_role.eks_fargate_pod_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy"
}
