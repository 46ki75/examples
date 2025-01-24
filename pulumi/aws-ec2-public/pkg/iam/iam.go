package iam

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type IamComponent struct {
	pulumi.ResourceState
	IamInstanceProfile      *iam.InstanceProfile
	IamRole                 *iam.Role
	IamRolePolicyAttachment *iam.RolePolicyAttachment
}

type IamComponentArgs struct {
}

func NewIamComponent(ctx *pulumi.Context, name string, args *IamComponentArgs, opts ...pulumi.ResourceOption) (*IamComponent, error) {
	component := &IamComponent{}

	err := ctx.RegisterComponentResource("46ki75:component:IAM", name, component, opts...)
	if err != nil {
		return nil, err
	}

	instanceAssumeRolePolicy, err := iam.GetPolicyDocument(ctx, &iam.GetPolicyDocumentArgs{
		Statements: []iam.GetPolicyDocumentStatement{
			{
				Actions: []string{
					"sts:AssumeRole",
				},
				Principals: []iam.GetPolicyDocumentStatementPrincipal{
					{
						Type: "Service",
						Identifiers: []string{
							"ec2.amazonaws.com",
						},
					},
				},
			},
		},
	}, nil)
	if err != nil {
		return nil, err
	}

	component.IamRole, err = iam.NewRole(ctx, fmt.Sprintf("%s-46ki75-examples-iam-role-instance_profile", ctx.Stack()), &iam.RoleArgs{
		Name:             pulumi.String(fmt.Sprintf("%s-46ki75-examples-iam-role-instance_profile", ctx.Stack())),
		AssumeRolePolicy: pulumi.String(instanceAssumeRolePolicy.Json),
	})
	if err != nil {
		return nil, err
	}

	const MANAGED_POLICY_ARN = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
	component.IamRolePolicyAttachment, err = iam.NewRolePolicyAttachment(ctx, fmt.Sprintf("%s-46ki75-examples-iam-role_policy_attachment-ec2", ctx.Stack()), &iam.RolePolicyAttachmentArgs{
		Role:      component.IamRole.Name,
		PolicyArn: pulumi.String(MANAGED_POLICY_ARN),
	})
	if err != nil {
		return nil, err
	}

	component.IamInstanceProfile, err = iam.NewInstanceProfile(ctx, fmt.Sprintf("%s-46ki75-examples-iam-instance_profile-ec2", ctx.Stack()), &iam.InstanceProfileArgs{
		Role: component.IamRole.Name,
	})
	if err != nil {
		return nil, err
	}

	return component, err
}
