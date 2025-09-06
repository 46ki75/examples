import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class VpcStack extends cdk.NestedStack {
  public readonly vpc: ec2.CfnVPC;
  public readonly fargateSubnet: ec2.CfnSubnet;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.NestedStackProps & { DEPLOY_ENV: string }
  ) {
    super(scope, id, props);

    this.vpc = new ec2.CfnVPC(this, "VPC", {
      cidrBlock: "172.16.0.0/24",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: [
        {
          key: "Name",
          value: `${props.DEPLOY_ENV}-46ki75-examples-vpc-vpc-main`,
        },
      ],
    });

    this.fargateSubnet = new ec2.CfnSubnet(this, "FargateSubnet", {
      vpcId: this.vpc.attrVpcId,
      availabilityZone: "ap-northeast-1a",
      cidrBlock: "172.16.0.0/28",
      tags: [
        {
          key: "Name",
          value: `${props.DEPLOY_ENV}-46ki75-examples-vpc-subnet-fargate`,
        },
      ],
    });

    const internetGateway = new ec2.CfnInternetGateway(
      this,
      "InternetGateway",
      {
        tags: [
          {
            key: "Name",
            value: `${props.DEPLOY_ENV}-46ki75-examples-vpc-igw-main`,
          },
        ],
      }
    );

    const internetGatewayAttachment = new ec2.CfnVPCGatewayAttachment(
      this,
      "IgwAttachment",
      {
        vpcId: this.vpc.attrVpcId,
        internetGatewayId: internetGateway.attrInternetGatewayId,
      }
    );

    const routeTable = new ec2.CfnRouteTable(this, "RouteTable", {
      vpcId: this.vpc.attrVpcId,
      tags: [
        {
          key: "Name",
          value: `${props.DEPLOY_ENV}-46ki75-examples-vpc-routetable-fargate`,
        },
      ],
    });

    const fargateToInternetGatewayRoute = new ec2.CfnRoute(this, "Route", {
      routeTableId: routeTable.attrRouteTableId,
      gatewayId: internetGateway.attrInternetGatewayId,
      destinationCidrBlock: "0.0.0.0/0",
    });
    fargateToInternetGatewayRoute.addDependency(internetGatewayAttachment);

    new ec2.CfnSubnetRouteTableAssociation(this, "RouteTableAssociation", {
      routeTableId: routeTable.attrRouteTableId,
      subnetId: this.fargateSubnet.attrSubnetId,
    });
  }
}
