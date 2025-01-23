package main

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type VpcComponent struct {
	pulumi.ResourceState
	VpcId    pulumi.IDOutput `pulumi:"VpcId"`
	SubnetId pulumi.IDOutput `pulumi:"SubnetId"`
}

type VpcComponentArgs struct {
}

func NewVpcComponent(ctx *pulumi.Context, name string, args *VpcComponentArgs, opts ...pulumi.ResourceOption) (*VpcComponent, error) {
	component := &VpcComponent{}

	err := ctx.RegisterComponentResource("46ki75:component:VPC", name, component, opts...)
	if err != nil {
		return nil, err
	}

	var vpc *ec2.Vpc

	vpc, err = ec2.NewVpc(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-vpc-main", ctx.Stack()), &ec2.VpcArgs{
		CidrBlock:          pulumi.String("10.0.0.0/16"),
		EnableDnsSupport:   pulumi.Bool(true),
		EnableDnsHostnames: pulumi.Bool(true),
		Tags: pulumi.StringMap{
			"Environment": pulumi.String(fmt.Sprintf("%s-46ki75-examples-ec2-vpc-main", ctx.Stack())),
		},
	})
	if err != nil {
		return nil, err
	}
	component.VpcId = vpc.ID()

	subnet, err := ec2.NewSubnet(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-subnet-main", ctx.Stack()), &ec2.SubnetArgs{
		VpcId:            vpc.ID(),
		CidrBlock:        pulumi.String("10.0.1.0/24"),
		AvailabilityZone: pulumi.String("ap-northeast-1a"),
		Tags: pulumi.StringMap{
			"Environment": pulumi.String(fmt.Sprintf("%s-46ki75-examples-ec2-subnet-main", ctx.Stack())),
		},
	})
	if err != nil {
		return nil, err
	}
	component.SubnetId = subnet.ID()

	igw, err := ec2.NewInternetGateway(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-internet_gateway-main", ctx.Stack()), &ec2.InternetGatewayArgs{
		VpcId: vpc.ID(),
		Tags: pulumi.StringMap{
			"Name": pulumi.String(fmt.Sprintf("%s-46ki75-examples-ec2-internet_gateway-main", ctx.Stack())),
		},
	})
	if err != nil {
		return nil, err
	}

	rt, err := ec2.NewRouteTable(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-route_table-main", ctx.Stack()), &ec2.RouteTableArgs{
		VpcId: vpc.ID(),
		Routes: ec2.RouteTableRouteArray{
			ec2.RouteTableRouteArgs{
				CidrBlock: pulumi.String("0.0.0.0/0"),
				GatewayId: igw.ID(),
			},
		},
	})
	if err != nil {
		return nil, err
	}

	_, err = ec2.NewRouteTableAssociation(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-route_table_association-main", ctx.Stack()), &ec2.RouteTableAssociationArgs{
		SubnetId:     subnet.ID(),
		RouteTableId: rt.ID(),
	})
	if err != nil {
		return nil, err
	}

	return component, nil
}
