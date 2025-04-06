import type {
  LambdaFunctionURLEvent,
  Context,
  LambdaFunctionURLResult,
} from "aws-lambda";
import { parseQueryParams as parseQueryParams } from "./lib.js";

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context
): Promise<LambdaFunctionURLResult> => {
  const { name } = await parseQueryParams(event.queryStringParameters);

  return {
    statusCode: 200,
    headers: { "Contetn-Type": "application/json" },
    body: JSON.stringify({ message: `Hello, ${name}!` }),
  };
};
