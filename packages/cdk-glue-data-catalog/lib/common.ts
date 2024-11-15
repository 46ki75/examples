import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as glue from 'aws-cdk-lib/aws-glue'
import * as athena from 'aws-cdk-lib/aws-athena'
import * as s3 from 'aws-cdk-lib/aws-s3'

export class CommonStack extends cdk.Stack {
  private readonly bucket: s3.Bucket
  readonly workgroup: athena.CfnWorkGroup
  readonly database: glue.CfnDatabase

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${this.account}-athena-results`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    this.workgroup = new athena.CfnWorkGroup(this, 'WorkGroup', {
      name: 'poc',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${this.bucket.bucketName}`
        }
      }
    })

    this.database = new glue.CfnDatabase(this, 'Database', {
      databaseInput: { name: 'poc' },
      catalogId: this.account
    })
  }
}
