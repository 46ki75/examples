package s3

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type S3Component struct {
	pulumi.ResourceState
	S3Bucket *s3.BucketV2
}

type S3ComponentArgs struct {
}

func NewS3Component(
	ctx *pulumi.Context,
	name string,
	args *S3ComponentArgs,
	opts ...pulumi.ResourceOption,
) (*S3Component, error) {
	component := &S3Component{}

	err := ctx.RegisterComponentResource("46ki75:component:S3", name, component, opts...)
	if err != nil {
		return nil, err
	}

	component.S3Bucket, err = s3.NewBucketV2(ctx, "shared-46ki75-examples-s3-bucket-web", nil)
	if err != nil {
		return nil, err
	}

	return component, nil
}
