import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceEventCommon,
  CloudFormationCustomResourceFailedResponse,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceHandler,
} from "aws-lambda";
import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

interface ResourceProperties extends CloudFormationCustomResourceEventCommon {
  TableName: string;
}

const client = new DynamoDBClient();

const ITEMS: readonly { PK: string; name: string }[] = [
  { PK: "A", name: "Alice" },
  { PK: "B", name: "Bob" },
  { PK: "C", name: "Charlie" },
];

const UUID = "565ca81d-2e9b-4e45-b5cc-886c55bf10e5";

export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceResponse> => {
  const resourceProperties = event.ResourceProperties as ResourceProperties;
  const tableName = resourceProperties.TableName;

  // "Create" | "Update" | "Delete"
  const operation = event.RequestType;

  try {
    if (operation === "Create" || operation === "Update") {
      // Create or update the resource
      const results = await Promise.all(
        ITEMS.map((item) => {
          const putItemCommand = new PutItemCommand({
            TableName: tableName,
            Item: {
              PK: { S: item.PK },
              name: { S: item.name },
            },
          });
          return client.send(putItemCommand);
        })
      );
    } else if (operation === "Delete") {
      // Delete the resource
      const results = await Promise.all(
        ITEMS.map((item) => {
          const deleteItemCommand = new DeleteItemCommand({
            TableName: tableName,
            Key: { PK: { S: item.PK } },
          });
          return client.send(deleteItemCommand);
        })
      );
    }

    // @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-responses.html
    return {
      Data: { TableName: tableName },
      Status: "SUCCESS",
      Reason: "All good",
      PhysicalResourceId: UUID,
      LogicalResourceId: event.LogicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
    };
  } catch (error) {
    console.error("Error", error);
    return {
      Status: "FAILED",
      Reason: `Something went wrong: ${error}`,
      PhysicalResourceId: UUID,
      LogicalResourceId: event.LogicalResourceId,
      StackId: event.StackId,
      RequestId: event.RequestId,
    };
  }
};
