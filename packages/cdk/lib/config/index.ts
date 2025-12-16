import {
  Aws,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_s3,
  aws_iam,
  aws_sns,
  aws_config,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class ConfigStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const DEPLOY_ENV = "shared";
    const ORG_NAME = "46ki75";
    const PROJECT_NAME = "examples";

    const prefix = `${DEPLOY_ENV}-${ORG_NAME}-${PROJECT_NAME}`;

    // S3 Bucket for AWS Config
    const configBucket = new aws_s3.Bucket(this, "ConfigBucket", {
      bucketName: `${prefix}-config`,
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

    // S3 Bucket Policy using CfnBucketPolicy
    // https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html
    const configBucketPolicy = new aws_s3.CfnBucketPolicy(
      this,
      "ConfigBucketPolicy",
      {
        bucket: configBucket.bucketName,
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "AWSConfigBucketPermissionsCheck",
              Effect: "Allow",
              Principal: {
                Service: "config.amazonaws.com",
              },
              Action: "s3:GetBucketAcl",
              Resource: configBucket.bucketArn,
              Condition: {
                StringEquals: {
                  "AWS:SourceAccount": Aws.ACCOUNT_ID,
                },
              },
            },
            {
              Sid: "AWSConfigBucketExistenceCheck",
              Effect: "Allow",
              Principal: {
                Service: "config.amazonaws.com",
              },
              Action: "s3:ListBucket",
              Resource: configBucket.bucketArn,
              Condition: {
                StringEquals: {
                  "AWS:SourceAccount": Aws.ACCOUNT_ID,
                },
              },
            },
            {
              Sid: "AWSConfigBucketDelivery",
              Effect: "Allow",
              Principal: {
                Service: "config.amazonaws.com",
              },
              Action: "s3:PutObject",
              Resource: `${configBucket.bucketArn}/AWSLogs/${Aws.ACCOUNT_ID}/Config/*`,
              Condition: {
                StringEquals: {
                  "s3:x-amz-acl": "bucket-owner-full-control",
                  "AWS:SourceAccount": Aws.ACCOUNT_ID,
                },
              },
            },
          ],
        },
      }
    );

    // SNS Topic for AWS Config notifications
    const primaryTopicName = `${prefix}-SNS-Topic-primary`;
    const primaryTopic = new aws_sns.CfnTopic(this, "PrimaryTopic", {
      topicName: primaryTopicName,
      // Note: Do NOT enable KmsMasterKeyId - AWS Config doesn't support encrypted SNS topics
    });

    // SNS Topic Policy using CfnTopicPolicy
    const primaryTopicPolicy = new aws_sns.CfnTopicPolicy(
      this,
      "PrimaryTopicPolicy",
      {
        topics: [primaryTopic.ref],
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "AWSConfigSNSPolicy",
              Effect: "Allow",
              Principal: {
                Service: "config.amazonaws.com",
              },
              Action: "SNS:Publish",
              Resource: primaryTopic.ref,
              Condition: {
                StringEquals: {
                  "AWS:SourceAccount": Aws.ACCOUNT_ID,
                },
              },
            },
          ],
        },
      }
    );

    // Service-Linked Role for AWS Config
    const awsConfigServiceLinkedRole = new aws_iam.CfnServiceLinkedRole(
      this,
      "AWSServiceRoleForConfig",
      {
        awsServiceName: "config.amazonaws.com",
      }
    );

    // Delivery Channel
    const primaryDeliveryChannelName = `${prefix}-Config-DeliveryChannel-primary`;
    const primaryDeliveryChannel = new aws_config.CfnDeliveryChannel(
      this,
      primaryDeliveryChannelName,
      {
        name: primaryDeliveryChannelName,
        s3BucketName: configBucket.bucketName,
        snsTopicArn: primaryTopic.attrTopicArn,
        configSnapshotDeliveryProperties: {
          deliveryFrequency: "TwentyFour_Hours",
        },
      }
    );

    // Configuration Recorder
    const primaryConfigRecorderName = `${prefix}-Config-ConfigurationRecorder-primary`;
    const primaryConfigRecorder = new aws_config.CfnConfigurationRecorder(
      this,
      primaryConfigRecorderName,
      {
        name: primaryConfigRecorderName,
        roleArn: `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/aws-service-role/config.amazonaws.com/${awsConfigServiceLinkedRole.attrRoleName}`,
        recordingGroup: {
          allSupported: true,
          includeGlobalResourceTypes: true,
        },
        recordingMode: {
          recordingFrequency: "DAILY",
        },
      }
    );
  }
}
