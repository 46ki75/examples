import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Provider } from "aws-cdk-lib/custom-resources";

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

import { join } from "node:path";

interface CustomStackProviderStackProps extends cdk.StackProps {
  TableName: string;
}

export class CustomStackProviderStack extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomStackProviderStackProps
  ) {
    super(scope, id, props);

    // IAM
    const lambdaRole = new iam.Role(
      this,
      "shared-46ki75-examples-iam-role-lambda",
      {
        roleName: "shared-46ki75-examples-iam-role-lambda",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: ["*"],
      })
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:*"],
        resources: ["*"],
      })
    );

    // Lambda Function
    const lambdaFunction = new NodejsFunction(this, "CustomResourceLambda", {
      functionName: "shared-46ki75-examples-lambda-function-custom_resource",
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: join(__dirname, "lambda.ts"),
      memorySize: 128,
      role: lambdaRole,
    });

    // Provider (Lambda Function)
    const provider = new Provider(
      this,
      "shared-46ki75-examples-custom_resource-provider-dynamodb_item",
      {
        onEventHandler: lambdaFunction,
        providerFunctionName:
          "shared-46ki75-examples-lambda-function-custom_resource_provider",
      }
    );

    // Custom Resource
    const customResource = new cdk.CustomResource(
      this,
      "shared-46ki75-examples-custom_resource-custom_resource-dynamodb_item",
      {
        serviceToken: provider.serviceToken,
        properties: {
          TableName: props.TableName,
        },
      }
    );

    new cdk.CfnOutput(this, "TableName", {
      value: customResource.getAttString("TableName"),
    });
  }
}
