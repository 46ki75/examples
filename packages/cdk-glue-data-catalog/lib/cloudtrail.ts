import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as glue from 'aws-cdk-lib/aws-glue'

export class CloudTrailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const bucketName = `aws-cloudtrail-logs-${this.account}`

    const database = new glue.CfnDatabase(this, 'Database', {
      databaseInput: { name: 'poc' },
      catalogId: this.account
    })

    const schema: glue.CfnTable.ColumnProperty[] = [
      {
        name: 'eventversion',
        type: 'string'
      },
      {
        name: 'useridentity',
        type: 'struct<type:string,principalid:string,arn:string,accountid:string,invokedby:string,accesskeyid:string,userName:string,onBehalfOf:struct<userId:string,identityStoreArn:string>,sessioncontext:struct<attributes:struct<mfaauthenticated:string,creationdate:string>,sessionissuer:struct<type:string,principalId:string,arn:string,accountId:string,userName:string>,ec2RoleDelivery:string,webIdFederationData:struct<federatedProvider:string,attributes:map<string,string>>>>'
      },
      {
        name: 'eventtime',
        type: 'string'
      },
      {
        name: 'eventsource',
        type: 'string'
      },
      {
        name: 'eventname',
        type: 'string'
      },
      {
        name: 'awsregion',
        type: 'string'
      },
      {
        name: 'sourceipaddress',
        type: 'string'
      },
      {
        name: 'useragent',
        type: 'string'
      },
      {
        name: 'errorcode',
        type: 'string'
      },
      {
        name: 'errormessage',
        type: 'string'
      },
      {
        name: 'requestparameters',
        type: 'string'
      },
      {
        name: 'responseelements',
        type: 'string'
      },
      {
        name: 'additionaleventdata',
        type: 'string'
      },
      {
        name: 'requestid',
        type: 'string'
      },
      {
        name: 'eventid',
        type: 'string'
      },
      {
        name: 'resources',
        type: 'array<struct<arn:string,accountid:string,type:string>>'
      },
      {
        name: 'eventtype',
        type: 'string'
      },
      {
        name: 'apiversion',
        type: 'string'
      },
      {
        name: 'readonly',
        type: 'string'
      },
      {
        name: 'recipientaccountid',
        type: 'string'
      },
      {
        name: 'serviceeventdetails',
        type: 'string'
      },
      {
        name: 'sharedeventid',
        type: 'string'
      },
      {
        name: 'vpcendpointid',
        type: 'string'
      },
      {
        name: 'eventcategory',
        type: 'string'
      },
      {
        name: 'tlsdetails',
        type: 'struct<tlsVersion:string,cipherSuite:string,clientProvidedHostHeader:string>'
      }
    ]

    new glue.CfnTable(this, 'CloudTrailTable', {
      catalogId: this.account,
      databaseName: database.ref,
      tableInput: {
        name: `cloudtrail`,
        storageDescriptor: {
          columns: schema,
          location: `s3://${bucketName}/AWSLogs/${this.account}/CloudTrail/`,
          inputFormat: 'com.amazon.emr.cloudtrail.CloudTrailInputFormat',
          outputFormat:
            'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hive.hcatalog.data.JsonSerDe'
          }
        },
        tableType: 'EXTERNAL_TABLE'
      }
    })
  }
}
