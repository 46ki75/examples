import {
  SageMakerFeatureStoreRuntimeClient,
  PutRecordCommand,
  FeatureValue
} from '@aws-sdk/client-sagemaker-featurestore-runtime'
import { parse } from 'csv-parse'
import { nanoid } from 'nanoid'

interface Iris {
  'sepal.length': string
  'sepal.width': string
  'petal.length': string
  'petal.width': string
  variety: 'Versicolor' | 'Setosa' | 'Virginica'
}

const LABEL_MAP = {
  Versicolor: 0,
  Setosa: 1,
  Virginica: 2
}

const rawData = await fetch(
  'https://gist.githubusercontent.com/netj/8836201/raw/6f9306ad21398ea43cba4f7d537619d0e07d5ae3/iris.csv',
  { headers: { 'Content-Type': 'text/csv' } }
)

const data = await rawData.text()

const csvData: Iris[] = await new Promise((resolve, reject) => {
  parse(data, { columns: true }, (err, output) => {
    if (err) {
      reject(err)
    } else {
      resolve(output)
    }
  })
})

const client = new SageMakerFeatureStoreRuntimeClient()

const featureGroupName = 'iris-feature-group'

const recordData: FeatureValue[][] = csvData.map((row) => [
  {
    FeatureName: 'id',
    ValueAsString: nanoid()
  },
  {
    FeatureName: 'time',
    ValueAsString: new Date().toISOString()
  },
  {
    FeatureName: 'petal_length',
    ValueAsString: row['petal.length']
  },
  {
    FeatureName: 'petal_width',
    ValueAsString: row['petal.width']
  },
  {
    FeatureName: 'sepal_length',
    ValueAsString: row['sepal.length']
  },
  {
    FeatureName: 'sepal_width',
    ValueAsString: row['sepal.width']
  },
  {
    FeatureName: 'label',
    ValueAsString: LABEL_MAP[row.variety].toString()
  }
])

for (const record of recordData) {
  const command = new PutRecordCommand({
    FeatureGroupName: featureGroupName,
    Record: record
  })

  const response = await client.send(command)

  console.log(response)
}
