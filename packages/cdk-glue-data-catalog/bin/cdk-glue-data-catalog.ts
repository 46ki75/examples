#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { CloudTrailStack } from '../lib/cloudtrail'

const app = new cdk.App()

new CloudTrailStack(app, 'CloudTrail', {})
