import * as cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'

import { LambdaStack } from '../lib/lambda'
import { APIGWStack } from '../lib/apigw'

test('Lambda Stack Created', () => {
  const app = new cdk.App()
  const stack = new LambdaStack(app, 'Lambda')
  const template = Template.fromStack(stack)

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'rust-graphql-function-url',
    Runtime: 'provided.al2023'
  })

  template.hasResourceProperties('AWS::Lambda::Version', {})

  template.hasResourceProperties('AWS::Lambda::Alias', {
    Name: 'latest',
    FunctionVersion: '$LATEST'
  })

  template.hasResourceProperties('AWS::Lambda::Url', {
    AuthType: 'NONE'
  })
})

test('APIGW Stack Created', () => {
  const app = new cdk.App()
  const stack = new APIGWStack(app, 'APIGW')
  const template = Template.fromStack(stack)

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'rust-graphql-apigw',
    Runtime: 'provided.al2023'
  })

  template.hasResourceProperties('AWS::Lambda::Version', {})

  template.hasResourceProperties('AWS::Lambda::Alias', {
    Name: 'latest',
    FunctionVersion: '$LATEST'
  })

  template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
    Name: 'rust-graphql-apigw',
    ProtocolType: 'HTTP'
  })

  template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
    AuthorizationType: 'NONE',
    RouteKey: 'ANY /{all+}'
  })
})
