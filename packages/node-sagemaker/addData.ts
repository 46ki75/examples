import {
  SageMakerFeatureStoreRuntimeClient,
  PutRecordCommand,
  FeatureValue
} from '@aws-sdk/client-sagemaker-featurestore-runtime'
import { nanoid } from 'nanoid'

const client = new SageMakerFeatureStoreRuntimeClient()

const featureGroupName = 'iris-feature-group'

const id = nanoid()

const recordData: FeatureValue[] = [
  {
    FeatureName: 'id',
    ValueAsString: id
  },
  {
    FeatureName: 'time',
    ValueAsString: new Date().toISOString()
  },
  {
    FeatureName: 'petal_length',
    ValueAsString: '1.4'
  },
  {
    FeatureName: 'petal_width',
    ValueAsString: '0.2'
  },
  {
    FeatureName: 'sepal_length',
    ValueAsString: '5.1'
  },
  {
    FeatureName: 'sepal_width',
    ValueAsString: '3.5'
  },
  {
    FeatureName: 'variety',
    ValueAsString: 'setosa'
  }
]

const command = new PutRecordCommand({
  FeatureGroupName: featureGroupName,
  Record: recordData
})

const response = await client.send(command)

console.log(`ID: ${id}`)
console.log(response)
