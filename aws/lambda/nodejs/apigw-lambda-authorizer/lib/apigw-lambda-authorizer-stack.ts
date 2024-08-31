import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'

import * as path from 'path'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType
} from 'aws-cdk-lib/aws-apigatewayv2-authorizers'

export class ApigwLambdaAuthorizerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // # --------------------------------------------------------------------------------
    //
    // Lambda
    //
    // # --------------------------------------------------------------------------------

    const integrationFunction = new NodejsFunction(
      this,
      'IntegrationFunction',
      {
        functionName: 'apigw-lambda-authorizer-handler',
        entry: path.resolve(__dirname, '../lambda/src/index.ts'),
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler'
      }
    )

    const basicAuthorizerFunction = new NodejsFunction(
      this,
      'BasicAuthorizerFunction',
      {
        functionName: 'apigw-lambda-authorizer-basic',
        entry: path.resolve(__dirname, '../lambda/src/authorizer.ts'),
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler'
      }
    )

    // # --------------------------------------------------------------------------------
    //
    // API Gateway
    //
    // # --------------------------------------------------------------------------------

    const api = new apigwv2.HttpApi(this, 'API', {
      apiName: 'apigw-lambda-authorizer'
    })

    api.addRoutes({
      integration: new HttpLambdaIntegration(
        'APILambdaIntegration',
        integrationFunction
      ),
      path: '/{all+}',
      authorizer: new HttpLambdaAuthorizer(
        'Authorizer',
        basicAuthorizerFunction,
        { responseTypes: [HttpLambdaResponseType.SIMPLE] }
      )
    })
  }
}
