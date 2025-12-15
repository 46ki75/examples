import {
  Aws,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_s3,
  aws_iam,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class ConfigStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const DEPLOY_ENV = "shared";

    const configBucket = new aws_s3.Bucket(this, "ConfigBucket", {
      bucketName: `${DEPLOY_ENV}-46ki75-examples-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: "DeleteOldConfigData",
          expiration: Duration.days(90),
          enabled: true,
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
