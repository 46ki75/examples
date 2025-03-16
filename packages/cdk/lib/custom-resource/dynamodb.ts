import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class DynamodbStack extends cdk.NestedStack {
  readonly TableName: string;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(
      this,
      "shared-46ki75-examples-dynamodb-table-custom",
      {
        tableName: "shared-46ki75-examples-dynamodb-table-custom",
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PROVISIONED,
        readCapacity: 1,
        writeCapacity: 1,
        deletionProtection: false,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    this.TableName = table.tableName;
  }
}
