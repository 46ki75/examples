package main

import (
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		vpcComponent, err := NewVpcComponent(ctx, "VpcComponent", &VpcComponentArgs{})
		if err != nil {
			return err
		}

		iamComponent, err := NewIamComponent(ctx, "IamComponent", &IamComponentArgs{})
		if err != nil {
			return err
		}

		_, err = NewEc2Component(ctx, "Ec2Component", &Ec2ComponentArgs{
			SubnetId:           vpcComponent.SubnetId,
			VpcId:              vpcComponent.VpcId,
			IamInstanceProfile: iamComponent.IamInstanceProfile,
		})
		if err != nil {
			return err
		}

		return nil
	})
}
