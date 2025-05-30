import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as glue from "aws-cdk-lib/aws-glue";
import * as athena from "aws-cdk-lib/aws-athena";

interface CloudTrailStackProps extends cdk.NestedStackProps {
  database: glue.CfnDatabase;
  workgroup: athena.CfnWorkGroup;
}

export class CloudTrailStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: CloudTrailStackProps) {
    super(scope, id, props);

    const bucketName = `aws-cloudtrail-logs-${this.account}`;

    const schema: glue.CfnTable.ColumnProperty[] = [
      {
        name: "eventversion",
        type: "string",
      },
      {
        name: "useridentity",
        type: "struct<type:string,principalid:string,arn:string,accountid:string,invokedby:string,accesskeyid:string,userName:string,onBehalfOf:struct<userId:string,identityStoreArn:string>,sessioncontext:struct<attributes:struct<mfaauthenticated:string,creationdate:string>,sessionissuer:struct<type:string,principalId:string,arn:string,accountId:string,userName:string>,ec2RoleDelivery:string,webIdFederationData:struct<federatedProvider:string,attributes:map<string,string>>>>",
      },
      {
        name: "eventtime",
        type: "string",
      },
      {
        name: "eventsource",
        type: "string",
      },
      {
        name: "eventname",
        type: "string",
      },
      {
        name: "awsregion",
        type: "string",
      },
      {
        name: "sourceipaddress",
        type: "string",
      },
      {
        name: "useragent",
        type: "string",
      },
      {
        name: "errorcode",
        type: "string",
      },
      {
        name: "errormessage",
        type: "string",
      },
      {
        name: "requestparameters",
        type: "string",
      },
      {
        name: "responseelements",
        type: "string",
      },
      {
        name: "additionaleventdata",
        type: "string",
      },
      {
        name: "requestid",
        type: "string",
      },
      {
        name: "eventid",
        type: "string",
      },
      {
        name: "resources",
        type: "array<struct<arn:string,accountid:string,type:string>>",
      },
      {
        name: "eventtype",
        type: "string",
      },
      {
        name: "apiversion",
        type: "string",
      },
      {
        name: "readonly",
        type: "string",
      },
      {
        name: "recipientaccountid",
        type: "string",
      },
      {
        name: "serviceeventdetails",
        type: "string",
      },
      {
        name: "sharedeventid",
        type: "string",
      },
      {
        name: "vpcendpointid",
        type: "string",
      },
      {
        name: "eventcategory",
        type: "string",
      },
      {
        name: "tlsdetails",
        type: "struct<tlsVersion:string,cipherSuite:string,clientProvidedHostHeader:string>",
      },
    ];

    const table = new glue.CfnTable(this, "CloudTrailTable", {
      catalogId: this.account,
      databaseName: props.database.ref,
      tableInput: {
        name: `cloudtrail`,
        storageDescriptor: {
          columns: schema,
          location: `s3://${bucketName}/AWSLogs/${this.account}/CloudTrail/`,
          inputFormat: "com.amazon.emr.cloudtrail.CloudTrailInputFormat",
          outputFormat:
            "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
          serdeInfo: {
            serializationLibrary: "org.apache.hive.hcatalog.data.JsonSerDe",
          },
        },
        tableType: "EXTERNAL_TABLE",
        partitionKeys: [
          {
            name: "region",
            type: "string",
          },
          {
            name: "partition_date",
            type: "string",
          },
        ],
        // @see https://docs.aws.amazon.com/ja_jp/athena/latest/ug/partition-projection-supported-types.html
        parameters: {
          "projection.enabled": "true",

          "projection.partition_date.format": "yyyy/MM/dd",
          "projection.partition_date.interval": "1",
          "projection.partition_date.interval.unit": "DAYS",
          "projection.partition_date.range": "2024/11/10,NOW",
          "projection.partition_date.type": "date",

          "projection.region.type": "enum",
          "projection.region.values": "ap-northeast-1,us-east-1",

          "storage.location.template": `s3://${bucketName}/AWSLogs/${this.account}/CloudTrail/\${region}/\${partition_date}`,
        },
      },
    });

    new athena.CfnNamedQuery(this, "NamedQuery", {
      name: "cloudtrail-example",
      description: "Example query for CloudTrail",
      database: props.database.ref,
      workGroup: props.workgroup.name,
      queryString: `
      SELECT *
      FROM "${props.database.ref}"."${table.ref}"
      WHERE region = 'ap-northeast-1'
        AND partition_date BETWEEN '2024/11/30' AND '2024/12/01'
      ORDER BY partition_date ASC
      LIMIT 20;
      `.trim(),
    });
  }
}
