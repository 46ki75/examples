import * as cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { ECRStack } from '../lib/ecr'
import { LambdaStack } from '../lib/lambda'

test('ECR Repository Created', () => {
  const app = new cdk.App()

  const stack = new ECRStack(app, 'ECR')
  const template = Template.fromStack(stack)

  template.hasResourceProperties('AWS::ECR::Repository', {
    RepositoryName: 'ts-lambda',
    EmptyOnDelete: true
  })
})

test('Lambda Function Created', () => {
  const app = new cdk.App()
  const ecr = new ECRStack(app, 'ECR')
  const stack = new LambdaStack(app, 'Lambda', { repository: ecr.repository })
  const template = Template.fromStack(stack)

  template.hasResourceProperties('AWS::Lambda::Function', {
    FunctionName: 'node-container-function',
    PackageType: 'Image'
  })
})
