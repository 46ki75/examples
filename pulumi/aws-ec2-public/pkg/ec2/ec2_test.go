package ec2

import (
	"testing"

	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/stretchr/testify/assert"
)

type mocks int

func (mocks) NewResource(args pulumi.MockResourceArgs) (string, resource.PropertyMap, error) {
	id, err := gonanoid.New()
	if err != nil {
		return "", nil, err
	}

	return args.Name + id, args.Inputs, nil
}

func (mocks) Call(args pulumi.MockCallArgs) (resource.PropertyMap, error) {
	return args.Args, nil
}

func TestVpcComponent(t *testing.T) {
	err := pulumi.RunErr(func(ctx *pulumi.Context) error {
		_, err := NewEc2Component(ctx, "VpcComponent", &Ec2ComponentArgs{
			VpcId:              pulumi.IDOutput(pulumi.String("vpc-12345").ToStringOutput()),
			SubnetId:           pulumi.IDOutput(pulumi.String("subnet-12345").ToStringOutput()),
			IamInstanceProfile: pulumi.String(""),
		})
		assert.NoError(t, err)

		// var wg sync.WaitGroup
		// wg.Add(1)

		// if ec2 != nil {
		// 	pulumi.All(
		// 		ec2.SecurityGroup.ID(),
		// 	).ApplyT(func(all []interface{}) error {

		// 		defer wg.Done()

		// 		for _, id := range all {
		// 			assert.Contains(t, string(id.(pulumi.ID)), "stack-46ki75-examples-")
		// 		}

		// 		return nil
		// 	})

		// }

		// wg.Wait()

		return nil
	}, pulumi.WithMocks("project", "stack", mocks(0)))
	assert.NoError(t, err)
}
