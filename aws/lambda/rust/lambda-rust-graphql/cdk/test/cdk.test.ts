import * as cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { LambdaStack } from '../lib/lambda'

// example test. To run these tests, uncomment this file along with the
// example resource in lib/cdk-stack.ts
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
