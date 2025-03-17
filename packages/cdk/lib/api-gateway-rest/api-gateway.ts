import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";

export class ApiGatewayStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    const api = new apigw.CfnRestApi(
      this,
      "shared-46ki75-examples-apigw-rest-api",
      {
        name: "shared-46ki75-examples-apigw-rest-api",
      }
    );
  }
}
