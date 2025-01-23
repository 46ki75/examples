package pkg

import (
	"fmt"
	"os"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type Ec2Component struct {
	pulumi.ResourceState
}

type Ec2ComponentArgs struct {
	VpcId              pulumi.IDOutput
	SubnetId           pulumi.IDOutput
	IamInstanceProfile pulumi.Input
}

func NewEc2Component(ctx *pulumi.Context, name string, args *Ec2ComponentArgs, opts ...pulumi.ResourceOption) (*Ec2Component, error) {
	component := &Ec2Component{}

	err := ctx.RegisterComponentResource("46ki75:component:EC2", name, component, opts...)
	if err != nil {
		return nil, err
	}

	sg, err := ec2.NewSecurityGroup(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-security_group-main", ctx.Stack()), &ec2.SecurityGroupArgs{
		VpcId: args.VpcId,
		Egress: ec2.SecurityGroupEgressArray{
			&ec2.SecurityGroupEgressArgs{
				FromPort: pulumi.Int(0),
				ToPort:   pulumi.Int(0),
				Protocol: pulumi.String("-1"),
				CidrBlocks: pulumi.StringArray{
					pulumi.String("0.0.0.0/0"),
				},
				Ipv6CidrBlocks: pulumi.StringArray{
					pulumi.String("::/0"),
				},
			},
		},
	})
	if err != nil {
		return nil, err
	}

	userData, err := os.ReadFile("cloud-init.yaml")
	if err != nil {
		return nil, err
	}

	_, err = ec2.NewInstance(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-instance-main", ctx.Stack()), &ec2.InstanceArgs{
		Ami:                      pulumi.String("ami-094dc5cf74289dfbc"),
		SubnetId:                 args.SubnetId,
		SecurityGroups:           pulumi.StringArray{sg.ID()},
		AvailabilityZone:         pulumi.String("ap-northeast-1a"),
		InstanceType:             pulumi.String("t3.micro"),
		AssociatePublicIpAddress: pulumi.Bool(true),
		IamInstanceProfile:       args.IamInstanceProfile,
		UserData:                 pulumi.String(string(userData)),
		Tags: pulumi.StringMap{
			"Name": pulumi.String(fmt.Sprintf("%s-46ki75-examples-ec2-instance-main", ctx.Stack())),
		},
	})
	if err != nil {
		return nil, err
	}

	return component, nil
}
