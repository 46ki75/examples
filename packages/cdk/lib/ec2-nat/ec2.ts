import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AMI = "ami-03852a41f1e05c8e4";

interface EC2StackProps extends cdk.NestedStackProps {
  DEPLOY_ENV: string;
  vpcId: string;
  subnetId: string;
  ec2InstanceProfileName?: string;
  securityGroupId?: string;
}

export class EC2Stack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: EC2StackProps) {
    super(scope, id, props);

    const { DEPLOY_ENV, subnetId, securityGroupId } = props;

    const userData = readFileSync(
      resolve(__dirname, "cloud-init.yaml"),
      "utf-8"
    );
    const base64UserData = Buffer.from(userData).toString("base64");

    const ec2InstanceName = `${DEPLOY_ENV}-EC2-Instance-Main`;
    new ec2.CfnInstance(this, ec2InstanceName, {
      imageId: AMI,
      instanceType: "t3.nano",
      subnetId: subnetId,
      securityGroupIds: securityGroupId ? [securityGroupId] : undefined,
      userData: base64UserData,
      iamInstanceProfile: props.ec2InstanceProfileName,
      tags: [{ key: "Name", value: ec2InstanceName }],
    });
  }
}
