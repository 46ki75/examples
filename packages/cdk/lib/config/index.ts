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

    const configRole = new aws_iam.Role(this, "ConfigRole", {
      roleName: "AWSConfigRole",
      assumedBy: new aws_iam.ServicePrincipal("config.amazonaws.com"),
      managedPolicies: [
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/ConfigRole"
        ),
      ],
    });

    configBucket.grantWrite(configRole);
    configBucket.addToResourcePolicy(
      new aws_iam.PolicyStatement({
        sid: "AWSConfigBucketPermissionsCheck",
        effect: aws_iam.Effect.ALLOW,
        principals: [new aws_iam.ServicePrincipal("config.amazonaws.com")],
        actions: ["s3:GetBucketAcl"],
        resources: [configBucket.bucketArn],
      })
    );
  }
}
