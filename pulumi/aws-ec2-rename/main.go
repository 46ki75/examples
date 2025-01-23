package main

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		var vpc *ec2.Vpc
		var err error
		vpc, err = ec2.NewVpc(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-vpc-main", ctx.Stack()), &ec2.VpcArgs{
			CidrBlock:          pulumi.String("10.0.0.0/16"),
			EnableDnsSupport:   pulumi.Bool(true),
			EnableDnsHostnames: pulumi.Bool(true),
			Tags: pulumi.StringMap{
				"Environment": pulumi.String(fmt.Sprintf("%s-46ki75-examples-ec2-vpc-main", ctx.Stack())),
			},
		})
		if err != nil {
			return err
		}

		_, err = ec2.NewSubnet(ctx, fmt.Sprintf("%s-46ki75-examples-ec2-subnet-main", ctx.Stack()), &ec2.SubnetArgs{
			VpcId:            vpc.ID(),
			CidrBlock:        pulumi.String("10.0.1.0/24"),
			AvailabilityZone: pulumi.String("ap-northeast-1a"),
			Tags: pulumi.StringMap{
				"Environment": pulumi.String(fmt.Sprintf("%s-46ki75-examples-ec2-subnet-main", ctx.Stack())),
			},
		})
		if err != nil {
			return err
		}

		return nil
	})
}
