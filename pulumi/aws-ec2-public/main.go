package main

import (
	"aws-ec2-public/pkg"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		vpcComponent, err := pkg.NewVpcComponent(ctx, "VpcComponent", &pkg.VpcComponentArgs{})
		if err != nil {
			return err
		}

		iamComponent, err := pkg.NewIamComponent(ctx, "IamComponent", &pkg.IamComponentArgs{})
		if err != nil {
			return err
		}

		_, err = pkg.NewEc2Component(ctx, "Ec2Component", &pkg.Ec2ComponentArgs{
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
