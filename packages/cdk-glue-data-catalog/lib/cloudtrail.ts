import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class CloudTrailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const bucketName = new cdk.CfnParameter(this, 'BucketName', {
      type: 'String',
      constraintDescription: 'Must be a valid S3 bucket name'
    })
  }
}
