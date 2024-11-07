import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      functionName: 'rust-graphql-function-url',
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '../../target/lambda/lambda-rust-graphql/')
      ),
      handler: 'main',
      runtime: lambda.Runtime.PROVIDED_AL2023
    })

    const lambdaVersion = new lambda.Version(this, 'LambdaVersion', {
      lambda: lambdaFunction
    })

    const lambdaAlias = new lambda.Alias(this, 'LambdaAlias', {
      aliasName: 'latest',
      version: lambdaVersion.latestVersion
    })

    const lambdaFunctionURL = new lambda.FunctionUrl(this, 'FunctionURL', {
      function: lambdaAlias,
      authType: lambda.FunctionUrlAuthType.NONE
    })

    new cdk.CfnOutput(this, 'FunctionURLOutput', {
      value: lambdaFunctionURL.url
    })
  }
}
