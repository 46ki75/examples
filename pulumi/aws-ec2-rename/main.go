package main

import (
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		_, err := NewVpcComponent(ctx, "MyComponent", &VpcComponentArgs{})
		if err != nil {
			return err
		}

		return nil
	})
}
