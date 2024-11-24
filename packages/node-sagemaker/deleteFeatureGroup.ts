import {
  DeleteFeatureGroupCommand,
  SageMakerClient
} from '@aws-sdk/client-sagemaker'

const client = new SageMakerClient()

const command = new DeleteFeatureGroupCommand({
  FeatureGroupName: 'iris-feature-group'
})

const response = await client.send(command)

console.log(response)
