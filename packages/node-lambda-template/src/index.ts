import type {
  LambdaFunctionURLEvent,
  Context,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { parseQueryParams } from "./lib.js";

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  const { name } = await parseQueryParams(event.queryStringParameters);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `Hello, ${name}!` }),
  };
};
