import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { Construct } from "constructs";

// Aspects
import { AutoTagAspect } from "../aspect";

// Stacks
import { IAMStack } from "./iam";
import { VpcStack } from "./vpc";
import { EC2Stack } from "./ec2";

export class EC2NATStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const DEPLOY_ENV = "shared";

    Aspects.of(this).add(new AutoTagAspect("DeployEnv", DEPLOY_ENV));
    Aspects.of(this).add(new AutoTagAspect("ProvisionedBy", "aws-cdk"));

    const iamStack = new IAMStack(this, "IAMStack", { DEPLOY_ENV });
    const vpcStack = new VpcStack(this, "VpcStack", { DEPLOY_ENV });
    const ec2Stack = new EC2Stack(this, "EC2Stack", {
      DEPLOY_ENV,
      vpcId: vpcStack.vpc.attrVpcId,
      subnetId: vpcStack.ec2Subnet.attrSubnetId,
      ec2InstanceProfileArn: iamStack.ec2InstaceProfile.attrArn,
    });
  }
}
