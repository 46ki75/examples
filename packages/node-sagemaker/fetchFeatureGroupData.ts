import {
  SageMakerFeatureStoreRuntimeClient,
  GetRecordCommand
} from '@aws-sdk/client-sagemaker-featurestore-runtime'

const id = '66037475-d3a5-4e75-82ba-4efb83be5718'

const client = new SageMakerFeatureStoreRuntimeClient()

const command = new GetRecordCommand({
  FeatureGroupName: 'iris-feature-group',
  RecordIdentifierValueAsString: id
})

const response = await client.send(command)
console.log('Record retrieved successfully:', response.Record)
