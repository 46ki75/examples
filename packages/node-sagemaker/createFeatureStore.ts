import {
  CreateFeatureGroupCommand,
  SageMakerClient
} from '@aws-sdk/client-sagemaker'

const client = new SageMakerClient()

const command = new CreateFeatureGroupCommand({
  FeatureGroupName: 'iris-feature-group',
  OnlineStoreConfig: {
    EnableOnlineStore: true,
    StorageType: 'Standard'
  },
  RecordIdentifierFeatureName: 'id',
  EventTimeFeatureName: 'time',
  FeatureDefinitions: [
    {
      FeatureName: 'id',
      FeatureType: 'String'
    },
    {
      FeatureName: 'time',
      FeatureType: 'String'
    },
    {
      FeatureName: 'petal_length',
      FeatureType: 'Fractional'
    },
    {
      FeatureName: 'petal_width',
      FeatureType: 'Fractional'
    },
    {
      FeatureName: 'sepal_length',
      FeatureType: 'Fractional'
    },
    {
      FeatureName: 'sepal_width',
      FeatureType: 'Fractional'
    }
  ]
})

const response = await client.send(command)

console.log(response)
