import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ContainerStack } from "../lib/container-stack";

test("Lambda Function Created", () => {
  const app = new cdk.App();
  const stack = new ContainerStack(app, "MyTestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: "node-container-function",
    PackageType: "Image",
  });
});
