import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam'

import {
  SageMakerClient,
  CreateTrainingJobCommand
} from '@aws-sdk/client-sagemaker'

const ROLE_NAME = 'sagemaker-s3-role'
const BUCKET_NAME = '46ki75-sagemaker'

// # --------------------------------------------------------------------------------
//
// Check IAM Role (S3 Access)
//
// # --------------------------------------------------------------------------------

let roleArn: string

try {
  const iamClient = new IAMClient()
  const getRoleCommand = new GetRoleCommand({ RoleName: ROLE_NAME })
  const getRoleResponse = await iamClient.send(getRoleCommand)
  if (getRoleResponse.Role?.Arn == null) throw new Error('Role not found')
  roleArn = getRoleResponse.Role.Arn
} catch (e) {
  console.error(e)
  throw new Error('Role not found')
}

const sagemakerClient = new SageMakerClient()

// # --------------------------------------------------------------------------------
//
// Create Training Job
//
// # --------------------------------------------------------------------------------

const createTrainingJobCommand = new CreateTrainingJobCommand({
  TrainingJobName: 'sagemaker-xgboost-ts-example-' + new Date().getTime(),
  AlgorithmSpecification: {
    // @see https://docs.aws.amazon.com/ja_jp/sagemaker/latest/dg-ecr-paths/ecr-ap-northeast-1.html
    TrainingImage:
      '354813040037.dkr.ecr.ap-northeast-1.amazonaws.com/sagemaker-xgboost:1.7-1',
    TrainingInputMode: 'File'
  },
  RoleArn: roleArn,
  InputDataConfig: [
    {
      ChannelName: 'train',
      DataSource: {
        S3DataSource: {
          S3Uri: `s3://${BUCKET_NAME}/data/iris.csv`,
          S3DataType: 'S3Prefix',
          S3DataDistributionType: 'FullyReplicated'
        }
      },
      ContentType: 'text/csv'
    }
  ],
  OutputDataConfig: {
    S3OutputPath: `s3://${BUCKET_NAME}/output/`
  },
  ResourceConfig: {
    InstanceType: 'ml.m5.large',
    InstanceCount: 1,
    VolumeSizeInGB: 10
  },
  StoppingCondition: {
    MaxRuntimeInSeconds: 3600
  },
  HyperParameters: {
    max_depth: '5',
    eta: '0.2',
    objective: 'reg:squarederror',
    num_round: '50'
  }
})

const createTrainingJobResponse = await sagemakerClient.send(
  createTrainingJobCommand
)

console.log('Training job created:', createTrainingJobResponse.TrainingJobArn)

// # --------------------------------------------------------------------------------
//
// Create Model
//
// # --------------------------------------------------------------------------------

// const params = {
//   ModelName: 'MyModel',
//   PrimaryContainer: {
//     Image:
//       '354813040037.dkr.ecr.ap-northeast-1.amazonaws.com/sagemaker-xgboost:1.7-1',
//     ModelDataUrl: modelS3Uri
//   },
//   ExecutionRoleArn: roleArn
// }

// const command = new CreateModelCommand(params)
// const response = await sagemakerClient.send(command)
// console.log('Model created:', response.ModelArn)
