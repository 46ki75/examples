import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class CloudTrailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CloudTrailQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
