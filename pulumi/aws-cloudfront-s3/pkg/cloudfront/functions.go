package cloudfront

import (
	"os"
	"path/filepath"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/cloudfront"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type CloudfrontFunctionComponent struct {
	pulumi.ResourceState
	CloudfrontFunction *cloudfront.Function
}

type CloudfrontFunctionComponentArgs struct {
}

func NewCloudfrontFunctionComponent(
	ctx *pulumi.Context,
	name string,
	args *CloudfrontFunctionComponentArgs,
	opts ...pulumi.ResourceOption,
) (*CloudfrontFunctionComponent, error) {
	component := &CloudfrontFunctionComponent{}

	err := ctx.RegisterComponentResource("46ki75:component:CloudfrontFunction", name, component, opts...)
	if err != nil {
		return nil, err
	}

	cw, err := os.Getwd()
	if err != nil {
		return nil, err
	}

	path := filepath.Join(cw, "../assets/renameUri.js")

	code, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	component.CloudfrontFunction, err = cloudfront.NewFunction(
		ctx,
		"shared-46ki75-examples-cloudfront-function-rename",
		&cloudfront.FunctionArgs{
			Code:    pulumi.String(code),
			Name:    pulumi.String("shared-46ki75-examples-cloudfront-function-rename"),
			Runtime: pulumi.String("cloudfront-js-2.0"),
		},
	)

	if err != nil {
		return nil, err
	}

	return component, nil
}
