package s3

import (
	"os"
	"path/filepath"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type S3ObjectComponent struct {
	pulumi.ResourceState
	S3Object *s3.BucketObjectv2
}

type S3ObjectComponentArgs struct {
	S3Bucket *s3.BucketV2
}

func NewS3ObjectComponent(
	ctx *pulumi.Context,
	name string,
	args *S3ObjectComponentArgs,
	opts ...pulumi.ResourceOption,
) (*S3ObjectComponent, error) {
	component := &S3ObjectComponent{}

	err := ctx.RegisterComponentResource("46ki75:component:S3Object", name, component, opts...)
	if err != nil {
		return nil, err
	}

	wd, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	path := filepath.Join(wd, "../assets/index.html")

	component.S3Object, err = s3.NewBucketObjectv2(
		ctx,
		"shared-46ki75-examples-s3-object-index",
		&s3.BucketObjectv2Args{
			Bucket:             args.S3Bucket,
			Source:             pulumi.NewFileAsset(path),
			Key:                pulumi.String("index.html"),
			ContentDisposition: pulumi.String("inline"),
			ContentType:        pulumi.String("text/html"),
		},
	)
	if err != nil {
		return nil, err
	}

	return component, nil
}
