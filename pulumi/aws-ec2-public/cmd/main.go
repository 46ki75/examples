package main

import (
	"aws-ec2-public/pkg/ec2"
	"aws-ec2-public/pkg/iam"
	"aws-ec2-public/pkg/vpc"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		vpcComponent, err := vpc.NewVpcComponent(ctx, "VpcComponent", &vpc.VpcComponentArgs{})
		if err != nil {
			return err
		}

		iamComponent, err := iam.NewIamComponent(ctx, "IamComponent", &iam.IamComponentArgs{})
		if err != nil {
			return err
		}

		_, err = ec2.NewEc2Component(ctx, "Ec2Component", &ec2.Ec2ComponentArgs{
			SubnetId:           vpcComponent.Subnet.ID(),
			VpcId:              vpcComponent.Vpc.ID(),
			IamInstanceProfile: iamComponent.IamInstanceProfile,
		})
		if err != nil {
			return err
		}

		return nil
	})
}
