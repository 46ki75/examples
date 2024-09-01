import * as cdk from 'aws-cdk-lib'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'
import { resolve } from 'path'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'

export class GraphqlStitchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // # --------------------------------------------------------------------------------
    //
    // Lambda
    //
    // # --------------------------------------------------------------------------------

    const supergraphLambda = new NodejsFunction(this, 'SupergraphLambda', {
      functionName: 'graphql-stitch-supergraph',
      entry: resolve(__dirname, '../lambda/supergraph/src/lambda.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X
    })

    const a = new lambda.FunctionUrl(this, 'URL', {
      function: supergraphLambda,
      authType: lambda.FunctionUrlAuthType.NONE
    })

    // # --------------------------------------------------------------------------------
    //
    // API Gateway
    //
    // # --------------------------------------------------------------------------------

    const api = new apigwv2.HttpApi(this, 'API', {
      apiName: 'graphql-stitch'
    })

    api.addRoutes({
      integration: new HttpLambdaIntegration(
        'SupergraphLambdaIntegration',
        supergraphLambda
      ),
      path: '/graphql'
    })
  }
}
