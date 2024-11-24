import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand
} from '@aws-sdk/client-sagemaker-runtime'

const ENDPOINT_NAME = 'xgboost-iris-endpoint-1732347847602'

const client = new SageMakerRuntimeClient()

const command = new InvokeEndpointCommand({
  EndpointName: ENDPOINT_NAME,
  ContentType: 'text/csv',
  Body: new TextEncoder().encode(
    [5.1, 3.5, 1.4].map((x) => x.toString()).join(',')
  )
})

const response = await client.send(command)

console.log(new TextDecoder().decode(response.Body as Uint8Array))
