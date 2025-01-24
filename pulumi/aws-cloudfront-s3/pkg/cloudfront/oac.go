package cloudfront

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/cloudfront"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type OriginAccessControlComponent struct {
	pulumi.ResourceState
	CloudfrontOriginAccessControl *cloudfront.OriginAccessControl
}

type OriginAccessControlComponentArgs struct {
}

func NewOriginAccessControlComponent(
	ctx *pulumi.Context,
	name string,
	args *OriginAccessControlComponentArgs,
	opts ...pulumi.ResourceOption,
) (*OriginAccessControlComponent, error) {
	component := &OriginAccessControlComponent{}

	err := ctx.RegisterComponentResource("46ki75:component:OriginAccessControl", name, component, opts...)
	if err != nil {
		return nil, err
	}

	component.CloudfrontOriginAccessControl, err = cloudfront.NewOriginAccessControl(
		ctx,
		"shared-46ki75-examples-cloudfront-oac-web",
		&cloudfront.OriginAccessControlArgs{
			Name:                          pulumi.String("shared-46ki75-examples-cloudfront-oac-web"),
			OriginAccessControlOriginType: pulumi.String("s3"),
			SigningBehavior:               pulumi.String("always"),
			SigningProtocol:               pulumi.String("sigv4"),
		},
	)
	if err != nil {
		return nil, err
	}

	return component, nil
}
