import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as ecr from 'aws-cdk-lib/aws-ecr'

interface LambdaStackProps extends cdk.StackProps {
  repository: ecr.Repository
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props)

    new lambda.DockerImageFunction(this, 'Function', {
      functionName: 'node-container-function',
      code: lambda.DockerImageCode.fromEcr(props.repository, {
        tagOrDigest: 'latest'
      })
    })
  }
}
