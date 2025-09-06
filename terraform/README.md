# Terraform

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
