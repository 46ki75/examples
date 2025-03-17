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

    const apiResource = new apigw.CfnResource(
      this,
      "shared-46ki75-examples-apigw-resource-api",
      {
        parentId: api.attrRootResourceId,
        pathPart: "api",
        restApiId: api.ref,
      }
    );

    const v1Resource = new apigw.CfnResource(
      this,
      "shared-46ki75-examples-apigw-resource-v1",
      {
        parentId: apiResource.attrResourceId,
        pathPart: "v1",
        restApiId: api.ref,
      }
    );

    const exampleResource = new apigw.CfnResource(
      this,
      "shared-46ki75-examples-apigw-resource-example",
      {
        parentId: v1Resource.attrResourceId,
        pathPart: "example",
        restApiId: api.ref,
      }
    );

    new apigw.CfnMethod(
      this,
      "shared-46ki75-examples-apigw-method-example-get",
      {
        httpMethod: "GET",
        resourceId: exampleResource.attrResourceId,
        restApiId: api.ref,
        authorizationType: "NONE",
      }
    );

    new apigw.CfnMethod(
      this,
      "shared-46ki75-examples-apigw-method-example-post",
      {
        httpMethod: "POST",
        resourceId: exampleResource.attrResourceId,
        restApiId: api.ref,
        authorizationType: "NONE",
      }
    );
  }
}
