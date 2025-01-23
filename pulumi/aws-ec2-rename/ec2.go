package main

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type Ec2Component struct {
	pulumi.ResourceState
}

type Ec2ComponentArgs struct {
	SubnetId pulumi.IDOutput
}

func NewEc2Component(ctx *pulumi.Context, name string, args *Ec2ComponentArgs, opts ...pulumi.ResourceOption) (*Ec2Component, error) {
	component := &Ec2Component{}

	err := ctx.RegisterComponentResource("46ki75:component:EC2", name, component, opts...)
	if err != nil {
		return nil, err
	}

	_, err = ec2.NewInstance(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-instance-main", ctx.Stack()), &ec2.InstanceArgs{
		Ami:                      pulumi.String("ami-094dc5cf74289dfbc"),
		SubnetId:                 args.SubnetId,
		AvailabilityZone:         pulumi.String("ap-northeast-1a"),
		InstanceType:             pulumi.String("t3.micro"),
		AssociatePublicIpAddress: pulumi.Bool(true),
		Tags: pulumi.StringMap{
			"Name": pulumi.String(fmt.Sprintf("%s-46ki75-examples-ec2-instance-main", ctx.Stack())),
		},
	})
	if err != nil {
		return nil, err
	}

	return component, nil
}
