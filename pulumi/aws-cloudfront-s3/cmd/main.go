package main

import (
	"aws-cloudfront-s3/pkg/cloudfront"
	"aws-cloudfront-s3/pkg/s3"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		oacComponent, err := cloudfront.NewOriginAccessControlComponent(
			ctx,
			"OriginAccessControlComponent",
			&cloudfront.OriginAccessControlComponentArgs{})
		if err != nil {
			return err
		}

		s3Component, err := s3.NewS3Component(ctx, "S3Component", &s3.S3ComponentArgs{})
		if err != nil {
			return err
		}

		cloudfrontComponent, err := cloudfront.NewCloudfrontComponent(
			ctx,
			"CloudfrontComponent",
			&cloudfront.CloudfrontComponentArgs{
				S3Bucket:                      s3Component.S3Bucket,
				CloudfrontOriginAccessControl: oacComponent.CloudfrontOriginAccessControl,
			},
		)
		if err != nil {
			return err
		}

		_, err = s3.NewS3BucketPolicyComponent(
			ctx,
			"S3BucketPolicyComponent",
			&s3.S3BucketPolicyComponentArgs{
				S3Bucket:               s3Component.S3Bucket,
				CloudFrontDistribution: cloudfrontComponent.CloudfrontDistribution,
			},
		)
		if err != nil {
			return err
		}

		s3.NewS3ObjectComponent(
			ctx,
			"S3ObjectComponent",
			&s3.S3ObjectComponentArgs{
				S3Bucket: s3Component.S3Bucket,
			},
		)

		return nil
	})
}
