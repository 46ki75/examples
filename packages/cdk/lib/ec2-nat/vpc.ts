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
      mapPublicIpOnLaunch: false,
      tags: [{ key: "Name", value: ec2SubnetName }],
    });

    const natGatewaySubnetName = `${DEPLOY_ENV}-EC2-Subnet-NATGateway`;
    const natGatewaySubnet = new ec2.CfnSubnet(this, natGatewaySubnetName, {
      vpcId: this.vpc.attrVpcId,
      availabilityZone: "ap-northeast-1a",
      cidrBlock: "172.16.10.16/28",
      mapPublicIpOnLaunch: true,
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

    // NAT Gateway Subnet Route Table and Routes

    const natGatewaySubnetRouteTableName = `${DEPLOY_ENV}-EC2-RouteTable-NATGatewaySubnet`;
    const natGatewaySubnetRouteTable = new ec2.CfnRouteTable(
      this,
      natGatewaySubnetRouteTableName,
      {
        vpcId: this.vpc.attrVpcId,
        tags: [{ key: "Name", value: natGatewaySubnetRouteTableName }],
      }
    );

    const natGatewayToInternetGatewayRouteName = `${DEPLOY_ENV}-EC2-Route-NAT2IGW`;
    const natGatewayToInternetGatewayRoute = new ec2.CfnRoute(
      this,
      natGatewayToInternetGatewayRouteName,
      {
        routeTableId: natGatewaySubnetRouteTable.attrRouteTableId,
        gatewayId: internetGateway.attrInternetGatewayId,
        destinationCidrBlock: "0.0.0.0/0",
      }
    );

    const natGatewaySubnetRouteTableAssociationName = `${DEPLOY_ENV}-EC2-SubnetRouteTableAssociation-NAT2IGW`;
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      natGatewaySubnetRouteTableAssociationName,
      {
        routeTableId: natGatewaySubnetRouteTable.attrRouteTableId,
        subnetId: natGatewaySubnet.attrSubnetId,
      }
    );

    // EC2 Subnet Route Table and Routes

    const ec2SubnetRouteTableName = `${DEPLOY_ENV}-EC2-RouteTable-EC2`;
    const ec2SubnetRouteTable = new ec2.CfnRouteTable(
      this,
      ec2SubnetRouteTableName,
      {
        vpcId: this.vpc.attrVpcId,
        tags: [{ key: "Name", value: ec2SubnetRouteTableName }],
      }
    );

    const ec2ToNATGatewayRouteName = `${DEPLOY_ENV}-EC2-Route-EC22NAT`;
    const ec2ToNATGatewayRoute = new ec2.CfnRoute(
      this,
      ec2ToNATGatewayRouteName,
      {
        routeTableId: ec2SubnetRouteTable.attrRouteTableId,
        natGatewayId: natGatewaySubnet.attrSubnetId,
        destinationCidrBlock: "0.0.0.0/0",
      }
    );

    const ec2SubnetRouteTableAssociationName = `${DEPLOY_ENV}-EC2-SubnetRouteTableAssociation-EC22NAT`;
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      ec2SubnetRouteTableAssociationName,
      {
        routeTableId: ec2SubnetRouteTable.attrRouteTableId,
        subnetId: this.ec2Subnet.attrSubnetId,
      }
    );
  }
}
