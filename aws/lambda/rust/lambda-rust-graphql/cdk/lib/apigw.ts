import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as path from 'path'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'

export class APIGWStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      functionName: 'rust-graphql-apigw',
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

    const api = new apigwv2.HttpApi(this, 'APIGW', {
      apiName: 'rust-graphql-apigw'
    })

    api.addRoutes({
      integration: new HttpLambdaIntegration(
        'APILambdaIntegration',
        lambdaAlias
      ),
      path: '/{all+}'
    })

    new cdk.CfnOutput(this, 'APIGWEndpoint', {
      value: api.apiEndpoint
    })
  }
}
