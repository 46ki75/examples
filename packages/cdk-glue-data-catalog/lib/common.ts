import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as glue from 'aws-cdk-lib/aws-glue'

export class CommonStack extends cdk.Stack {
  database: glue.CfnDatabase

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.database = new glue.CfnDatabase(this, 'Database', {
      databaseInput: { name: 'poc' },
      catalogId: this.account
    })
  }
}
