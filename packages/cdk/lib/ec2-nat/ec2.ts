import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

const AMI = "ami-03852a41f1e05c8e4";

interface EC2StackProps extends cdk.NestedStackProps {
  DEPLOY_ENV: string;
  vpcId: string;
  subnetId: string;
}

export class EC2Stack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: EC2StackProps) {
    super(scope, id, props);

    const { DEPLOY_ENV, subnetId } = props;

    const ec2InstanceName = `${DEPLOY_ENV}-EC2-Instance-Main`;
    new ec2.CfnInstance(this, ec2InstanceName, {
      imageId: AMI,
      instanceType: "t3.nano",
      subnetId: subnetId,
      tags: [{ key: "Name", value: ec2InstanceName }],
    });
  }
}
