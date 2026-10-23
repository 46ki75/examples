# Terraform

## ECS examples

- [API Gateway → Cloud Map → ECS](aws-ecs-cloudmap/README.md): direct service
  discovery with rolling deployments.
- [ALB → ECS](aws-ecs-alb/README.md): native ECS blue/green deployments, test
  traffic routing, and rollback. Uses independent local state by default.

Read each example's contribution guide before making changes.

## Global Configuration

First, create a cache directory to store terraform providers (plugins):

```bash
mkdir -p $HOME/.terraform.d/plugin-cache
```

Next, create a terraform runtime config file:

```tf
# ~/.terraformrc
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
```

## Manually Managed Resources

### Amazon S3

- `shared-46ki75-examples-s3-bucket-tfstate`: S3 bucket for storing Terraform `.tfstate` files.
