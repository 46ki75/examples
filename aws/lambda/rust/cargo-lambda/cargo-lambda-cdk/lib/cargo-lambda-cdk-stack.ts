import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export class CargoLambdaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    new lambda.Function(this, 'LambdaFunction', {
      functionName: 'cargo-lambda-cdk',
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '../../target/lambda/cargo-lambda/')
      ),
      handler: 'main',
      runtime: lambda.Runtime.PROVIDED_AL2023
    })
  }
}
