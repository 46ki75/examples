#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { CloudTrailStack } from '../lib/cdk-glue-data-catalog-stack'

const app = new cdk.App()

new CloudTrailStack(app, 'CloudTrail', {})
