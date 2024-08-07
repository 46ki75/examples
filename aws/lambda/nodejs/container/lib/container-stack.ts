import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class ContainerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambda.DockerImageFunction(this, "Function", {
      functionName: "node-container-function",
      code: lambda.DockerImageCode.fromImageAsset(
        path.resolve(__dirname, "../lambda")
      ),
    });
  }
}
