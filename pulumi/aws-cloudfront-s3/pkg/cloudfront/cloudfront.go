package cloudfront

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/cloudfront"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type CloudfrontComponent struct {
	pulumi.ResourceState
	CloudfrontDistribution *cloudfront.Distribution
}

type CloudfrontComponentArgs struct {
	S3Bucket                      *s3.BucketV2
	CloudfrontOriginAccessControl *cloudfront.OriginAccessControl
}

func NewCloudfrontComponent(
	ctx *pulumi.Context,
	name string,
	args *CloudfrontComponentArgs,
	opts ...pulumi.ResourceOption,
) (*CloudfrontComponent, error) {
	component := &CloudfrontComponent{}

	err := ctx.RegisterComponentResource("46ki75:component:Cloudfront", name, component, opts...)
	if err != nil {
		return nil, err
	}

	const s3OriginId = "web"

	component.CloudfrontDistribution, err = cloudfront.NewDistribution(
		ctx,
		"shared-46ki75-examples-cloudfront-distribution-main",
		&cloudfront.DistributionArgs{
			HttpVersion: pulumi.String("http2and3"),
			Origins: cloudfront.DistributionOriginArray{
				&cloudfront.DistributionOriginArgs{
					DomainName:            args.S3Bucket.BucketRegionalDomainName,
					OriginAccessControlId: args.CloudfrontOriginAccessControl.ID(),
					OriginId:              pulumi.String(s3OriginId),
				},
			},
			Enabled:       pulumi.Bool(true),
			IsIpv6Enabled: pulumi.Bool(true),
			DefaultCacheBehavior: &cloudfront.DistributionDefaultCacheBehaviorArgs{
				AllowedMethods: pulumi.StringArray{
					pulumi.String("DELETE"),
					pulumi.String("GET"),
					pulumi.String("HEAD"),
					pulumi.String("OPTIONS"),
					pulumi.String("PATCH"),
					pulumi.String("POST"),
					pulumi.String("PUT"),
				},
				CachedMethods: pulumi.StringArray{
					pulumi.String("GET"),
					pulumi.String("HEAD"),
				},
				TargetOriginId: pulumi.String(s3OriginId),
				ForwardedValues: &cloudfront.DistributionDefaultCacheBehaviorForwardedValuesArgs{
					QueryString: pulumi.Bool(false),
					Cookies: &cloudfront.DistributionDefaultCacheBehaviorForwardedValuesCookiesArgs{
						Forward: pulumi.String("none"),
					},
				},
				ViewerProtocolPolicy: pulumi.String("allow-all"),
				MinTtl:               pulumi.Int(0),
				DefaultTtl:           pulumi.Int(3600),
				MaxTtl:               pulumi.Int(86400),
			},
			Restrictions: &cloudfront.DistributionRestrictionsArgs{
				GeoRestriction: &cloudfront.DistributionRestrictionsGeoRestrictionArgs{
					RestrictionType: pulumi.String("none"),
				},
			},
			ViewerCertificate: &cloudfront.DistributionViewerCertificateArgs{
				CloudfrontDefaultCertificate: pulumi.Bool(true),
			},
			DefaultRootObject: pulumi.String("index.html"),
		})
	if err != nil {
		return nil, err
	}

	return component, nil
}
