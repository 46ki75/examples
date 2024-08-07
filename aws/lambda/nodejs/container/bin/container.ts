#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { LambdaStack } from '../lib/lambda'
import { ECRStack } from '../lib/ecr'

const app = new cdk.App()

const ecr = new ECRStack(app, 'ECR')
new LambdaStack(app, 'Lambda', {
  repository: ecr.repository
})
