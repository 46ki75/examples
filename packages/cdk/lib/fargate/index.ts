import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcStack } from "./vpc";
import { Aspects } from "aws-cdk-lib";
import { AutoTagAspect } from "../aspect";
import { FargateStack } from "./fargate";

export class FargatePublicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const DEPLOY_ENV = "shared";

    const vpcStack = new VpcStack(this, "VpcStack", { DEPLOY_ENV });
    const fargateStack = new FargateStack(this, "FargateStack", {
      DEPLOY_ENV,
      vpcId: vpcStack.vpc.attrVpcId,
      subnetId: vpcStack.fargateSubnet.attrSubnetId,
    });

    Aspects.of(this).add(new AutoTagAspect("DeployEnv", DEPLOY_ENV));
    Aspects.of(this).add(new AutoTagAspect("ProvisionedBy", "aws-cdk"));
  }
}
