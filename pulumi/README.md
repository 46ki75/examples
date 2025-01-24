## Manually Managed Resources

### S3 Bucket

- `shared-46ki75-examples-s3-bucket-pulumi`: For State Management

### KMS Key

- `alias/shared/46ki75/examples/kms/key/pulumi-encryption`: Encryption for Pulumi state file

## Login

```sh
pulumi login s3://shared-46ki75-examples-s3-bucket-pulumi
```