#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { CloudTrailStack } from '../lib/cloudtrail'
import { CommonStack } from '../lib/common'

const app = new cdk.App()

const common = new CommonStack(app, 'Common')

new CloudTrailStack(app, 'CloudTrail', {
  database: common.database,
  workgroup: common.workgroup
})
