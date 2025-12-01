import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

interface IAMStackProps extends cdk.NestedStackProps {
  DEPLOY_ENV: string;
}

export class IAMStack extends cdk.NestedStack {
  public readonly ec2Role: iam.Role;

  constructor(scope: Construct, id: string, props: IAMStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENV } = props;

    const ec2RoleName = `${DEPLOY_ENV}-IAM-Role-EC2InstanceProfileRoleMain`;
    this.ec2Role = new iam.Role(this, ec2RoleName, {
      roleName: ec2RoleName,
      description: "IAM Role for EC2 Instance Profile",
      maxSessionDuration: cdk.Duration.hours(1),
      path: "/",
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });
  }
}
