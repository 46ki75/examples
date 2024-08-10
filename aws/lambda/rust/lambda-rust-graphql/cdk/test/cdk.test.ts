import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { LambdaStack } from "../lib/lambda";

// example test. To run these tests, uncomment this file along with the
// example resource in lib/cdk-stack.ts
describe("Lambda Stack Created", () => {
  test("SQS Queue Created", () => {});
  const app = new cdk.App();
  const stack = new LambdaStack(app, "Lambda");
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: "rust-graphql-function-url",
  });
});
