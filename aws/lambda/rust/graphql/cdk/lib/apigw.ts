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
        path.resolve(__dirname, '../../target/lambda/graphql/')
      ),
      handler: 'main',
      runtime: lambda.Runtime.PROVIDED_AL2023
    })

    const api = new apigwv2.HttpApi(this, 'APIGW', {
      apiName: 'rust-graphql-apigw'
    })

    api.addRoutes({
      integration: new HttpLambdaIntegration(
        'APILambdaIntegration',
        lambdaFunction
      ),
      path: '/{all+}'
    })

    new cdk.CfnOutput(this, 'APIGWEndpoint', {
      value: api.apiEndpoint
    })
  }
}
