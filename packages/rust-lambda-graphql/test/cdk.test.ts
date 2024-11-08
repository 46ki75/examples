import * as cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { LambdaStack } from '../lib/lambda'
import { APIGWStack } from '../lib/apigw'

describe('Lambda Stack Created', () => {
  const app = new cdk.App()
  const stack = new LambdaStack(app, 'Lambda')
  const template = Template.fromStack(stack)

  test('Lambda Funtion', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'rust-graphql-function-url'
    })
  })

  test('Lambda Alias', () => {
    template.hasResourceProperties('AWS::Lambda::Alias', {
      FunctionVersion: '$LATEST'
    })
  })
})

describe('APIGE Stack Created', () => {
  const app = new cdk.App()
  const stack = new APIGWStack(app, 'APIGW')
  const template = Template.fromStack(stack)

  test('Lambda Funtion', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'rust-graphql-apigw'
    })
  })

  test('Lambda Alias', () => {
    template.hasResourceProperties('AWS::Lambda::Alias', {
      FunctionVersion: '$LATEST'
    })
  })

  test('API Gateway', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'rust-graphql-apigw',
      ProtocolType: 'HTTP'
    })
  })
})
