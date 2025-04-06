import type {
  LambdaFunctionURLEvent,
  Context,
  LambdaFunctionURLResult,
} from "aws-lambda";

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context
): Promise<LambdaFunctionURLResult> => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello, Lambda!" }),
  };
};
