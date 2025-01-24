package pkg

import (
	"sync"
	"testing"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/stretchr/testify/assert"
)

func TestIamComponent(t *testing.T) {
	err := pulumi.RunErr(func(ctx *pulumi.Context) error {
		vpc, err := NewIamComponent(ctx, "IamComponent", &IamComponentArgs{})
		assert.NoError(t, err)

		var wg sync.WaitGroup
		wg.Add(1)

		if vpc != nil {
			pulumi.All(
				vpc.IamRole.ID(),
				vpc.IamRolePolicyAttachment.ID(),
				vpc.IamInstanceProfile.ID(),
			).ApplyT(func(all []interface{}) error {

				defer wg.Done()

				for _, id := range all {
					assert.Contains(t, string(id.(pulumi.ID)), "stack-46ki75-examples-")
				}

				return nil
			})

		}

		wg.Wait()

		return nil
	}, pulumi.WithMocks("project", "stack", mocks(0)))
	assert.NoError(t, err)
}
