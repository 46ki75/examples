import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class VpcStack extends cdk.NestedStack {
  public readonly vpc: ec2.CfnVPC;
  public readonly ec2Subnet: ec2.CfnSubnet;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.NestedStackProps & { DEPLOY_ENV: string }
  ) {
    super(scope, id, props);

    const { DEPLOY_ENV } = props;

    const vpcName = `${DEPLOY_ENV}-Ec2-Vpc-main`;
    this.vpc = new ec2.CfnVPC(this, vpcName, {
      cidrBlock: "172.16.10.0/24",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: [{ key: "Name", value: vpcName }],
    });

    const ec2SubnetName = `${DEPLOY_ENV}-EC2-Subnet-EC2Instance`;
    this.ec2Subnet = new ec2.CfnSubnet(this, ec2SubnetName, {
      vpcId: this.vpc.attrVpcId,
      availabilityZone: "ap-northeast-1a",
      cidrBlock: "172.16.10.0/28",
      tags: [{ key: "Name", value: ec2SubnetName }],
    });

    const internetGatewayName = `${DEPLOY_ENV}-vpc-InternetGateway-Main`;
    const internetGateway = new ec2.CfnInternetGateway(
      this,
      internetGatewayName,
      {
        tags: [{ key: "Name", value: internetGatewayName }],
      }
    );

    const internetGatewayAttachmentName = `${DEPLOY_ENV}-EC2-InternetGatewayAttachment-Main`;
    const internetGatewayAttachment = new ec2.CfnVPCGatewayAttachment(
      this,
      internetGatewayAttachmentName,
      {
        vpcId: this.vpc.attrVpcId,
        internetGatewayId: internetGateway.attrInternetGatewayId,
      }
    );

    const routeTableName = `${DEPLOY_ENV}-EC2-RouteTable-EC2`;
    const routeTable = new ec2.CfnRouteTable(this, routeTableName, {
      vpcId: this.vpc.attrVpcId,
      tags: [{ key: "Name", value: routeTableName }],
    });

    const ec2ToInternetGatewayRouteName = `${DEPLOY_ENV}-EC2-Route-EC2ToInternetGateway`;
    const ec2ToInternetGatewayRoute = new ec2.CfnRoute(
      this,
      ec2ToInternetGatewayRouteName,
      {
        routeTableId: routeTable.attrRouteTableId,
        gatewayId: internetGateway.attrInternetGatewayId,
        destinationCidrBlock: "0.0.0.0/0",
      }
    );
    ec2ToInternetGatewayRoute.addDependency(internetGatewayAttachment);

    const ec2SubnetRouteTableAssociationName = `${DEPLOY_ENV}-EC2-SubnetRouteTableAssociation-EC2ToInternetGateway`;
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      ec2SubnetRouteTableAssociationName,
      {
        routeTableId: routeTable.attrRouteTableId,
        subnetId: this.ec2Subnet.attrSubnetId,
      }
    );
  }
}
