package main

import (
	"aws-cloudfront-s3/pkg/s3"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		_, err := s3.NewS3Component(ctx, "S3Component", &s3.S3ComponentArgs{})
		if err != nil {
			return err
		}

		return nil
	})
}
