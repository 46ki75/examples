import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DynamodbStack } from "./dynamodb";
import { CustomStackProviderStack } from "./custom-resource-provider";

export class CustomResourceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamodbStack = new DynamodbStack(this, "Dynamodb");

    new CustomStackProviderStack(this, "CustomResourceProvider", {
      TableName: dynamodbStack.TableName,
    });
  }
}
