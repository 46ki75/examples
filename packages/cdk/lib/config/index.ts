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

    const primaryTopicName = `${prefix}-SNS-Topic-primary`;
    const primaryTopic = new aws_sns.Topic(this, "PrimaryTopic", {
      topicName: primaryTopicName,
    });

    const primaryDeliveryChannelName = `${prefix}-Config-DeliveryChannel-primary`;
    const primaryDeliveryChannel = new aws_config.CfnDeliveryChannel(
      this,
      primaryDeliveryChannelName,
      {
        name: primaryDeliveryChannelName,
        s3BucketName: configBucket.bucketName,
        snsTopicArn: primaryTopic.topicArn,
        configSnapshotDeliveryProperties: {
          deliveryFrequency: "TwentyFour_Hours",
        },
      }
    );

    const awsConfigServiceLinkedRole = new aws_iam.CfnServiceLinkedRole(
      this,
      "AWSServiceRoleForConfig",
      {
        awsServiceName: "config.amazonaws.com",
      }
    );

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
