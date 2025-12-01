import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

// Stacks
import { IAMStack } from "./iam";
import { VpcStack } from "./vpc";
import { SecurityGroupStack } from "./security-group";
import { EC2Stack } from "./ec2";

export class EC2NATStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const DEPLOY_ENV = "shared";

    const iamStack = new IAMStack(this, "IAMStack", { DEPLOY_ENV });
    const vpcStack = new VpcStack(this, "VpcStack", { DEPLOY_ENV });
    const securityGroupStack = new SecurityGroupStack(
      this,
      "SecurityGroupStack",
      {
        DEPLOY_ENV,
        vpcId: vpcStack.vpc.attrVpcId,
      }
    );
    const ec2Stack = new EC2Stack(this, "EC2Stack", {
      DEPLOY_ENV,
      vpcId: vpcStack.vpc.attrVpcId,
      subnetId: vpcStack.ec2Subnet.attrSubnetId,
      ec2InstanceProfileName: iamStack.ec2InstaceProfile.instanceProfileName,
      securityGroupId: securityGroupStack.ec2SecurityGroup.attrGroupId,
    });
  }
}
