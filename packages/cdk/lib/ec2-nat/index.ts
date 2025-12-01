import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcStack } from "./vpc";
import { Aspects } from "aws-cdk-lib";
import { AutoTagAspect } from "../aspect";
import { EC2Stack } from "./ec2";

export class EC2NATStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const DEPLOY_ENV = "shared";

    const vpcStack = new VpcStack(this, "VpcStack", { DEPLOY_ENV });
    const ec2Stack = new EC2Stack(this, "EC2Stack", {
      DEPLOY_ENV,
      vpcId: vpcStack.vpc.attrVpcId,
      subnetId: vpcStack.ec2Subnet.attrSubnetId,
    });

    Aspects.of(this).add(new AutoTagAspect("DeployEnv", DEPLOY_ENV));
    Aspects.of(this).add(new AutoTagAspect("ProvisionedBy", "aws-cdk"));
  }
}
