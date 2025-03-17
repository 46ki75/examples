import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";

export class ApiGatewayStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    const api = new apigw.HttpApi(
      this,
      "shared-46ki75-examples-apigw-http-api",
      {
        apiName: "shared-46ki75-examples-apigw-http-api",
        description: "Example API Gateway HTTP API",
      }
    );

    new apigw.HttpAuthorizer(
      this,
      "shared-46ki75-examples-apigw-http-authorizer",
      {
        httpApi: api,
        type: apigw.HttpAuthorizerType.JWT,
        identitySource: ["$request.header.Authorization"],
        jwtAudience: ["example-audience"],
        // `jwtIssuer` must be a valid OIDC issuer URL
        jwtIssuer: "https://token.actions.githubusercontent.com",
      }
    );
  }
}
