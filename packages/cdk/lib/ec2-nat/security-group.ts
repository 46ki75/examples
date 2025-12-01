import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface SecurityGroupStackProps extends cdk.NestedStackProps {
  DEPLOY_ENV: string;
  vpcId: string;
}

export class SecurityGroupStack extends cdk.NestedStack {
  public readonly ec2SecurityGroup: ec2.CfnSecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENV } = props;

    const ec2SecurityGroupName = `${DEPLOY_ENV}-EC2-SecurityGroup-Main`;
    this.ec2SecurityGroup = new ec2.CfnSecurityGroup(
      this,
      ec2SecurityGroupName,
      {
        groupName: ec2SecurityGroupName,
        groupDescription: "Security Group for EC2 Instance",
        vpcId: props.vpcId,
        tags: [{ key: "Name", value: ec2SecurityGroupName }],
        securityGroupIngress: [],
        securityGroupEgress: [
          {
            description: "Allow all outbound traffic",
            ipProtocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrIp: "0.0.0.0/0",
          },
        ],
      }
    );
  }
}
