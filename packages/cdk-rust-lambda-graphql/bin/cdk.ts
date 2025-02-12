#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { LambdaStack } from '../lib/lambda'
import { APIGWStack } from '../lib/apigw'

const app = new cdk.App()

new LambdaStack(app, 'Lambda', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
})

new APIGWStack(app, 'APIGW', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
})
