import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecr from 'aws-cdk-lib/aws-ecr'

export class ECRStack extends cdk.Stack {
  public readonly repository: ecr.Repository
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.repository = new ecr.Repository(this, 'ECRRepository', {
      repositoryName: 'ts-lambda',
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
  }
}
