package s3

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/cloudfront"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type S3BucketPolicyComponent struct {
	pulumi.ResourceState
}

type S3BucketPolicyComponentArgs struct {
	S3Bucket               *s3.BucketV2
	CloudFrontDistribution *cloudfront.Distribution
}

func NewS3BucketPolicyComponent(
	ctx *pulumi.Context,
	name string,
	args *S3BucketPolicyComponentArgs,
	opts ...pulumi.ResourceOption,
) (*S3BucketPolicyComponent, error) {
	if args == nil {
		return nil, fmt.Errorf("args cannot be nil")
	}
	if args.S3Bucket == nil {
		return nil, fmt.Errorf("S3Bucket cannot be nil")
	}
	if args.CloudFrontDistribution == nil {
		return nil, fmt.Errorf("CloudFrontDistribution cannot be nil")
	}

	component := &S3BucketPolicyComponent{}

	err := ctx.RegisterComponentResource("46ki75:component:S3BucketPolicy", name, component, opts...)
	if err != nil {
		return nil, err
	}

	pulumi.All(
		args.S3Bucket.Arn, args.CloudFrontDistribution.Arn,
	).ApplyT(func(arns []interface{}) error {
		bucketArn := arns[0].(string) + "/*"
		cloudFrontArn := arns[1].(string)

		policy, err := iam.GetPolicyDocument(
			ctx, &iam.GetPolicyDocumentArgs{
				Statements: []iam.GetPolicyDocumentStatement{
					{
						Sid: pulumi.StringRef("AllowCloudFrontServicePrincipal"),
						Principals: []iam.GetPolicyDocumentStatementPrincipal{
							{
								Type: "Service",
								Identifiers: []string{
									"cloudfront.amazonaws.com",
								},
							},
						},
						Actions: []string{
							"s3:GetObject",
						},
						Resources: []string{
							bucketArn,
						},
						Conditions: []iam.GetPolicyDocumentStatementCondition{
							{
								Test:     "StringEquals",
								Variable: "AWS:SourceArn",
								Values: []string{
									cloudFrontArn,
								},
							},
						},
					},
				},
			},
			nil,
		)
		if err != nil {
			return err
		}

		_, err = s3.NewBucketPolicy(
			ctx,
			"shared-46ki75-examples-s3-bucket_policy-web",
			&s3.BucketPolicyArgs{
				Bucket: args.S3Bucket.Bucket,
				Policy: pulumi.String(policy.Json),
			},
		)
		return err
	})

	return component, nil
}
