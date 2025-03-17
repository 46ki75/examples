import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewayRequestSimpleAuthorizerHandlerV2,
  Context,
  APIGatewaySimpleAuthorizerResult,
} from "aws-lambda";

export const handler: APIGatewayRequestSimpleAuthorizerHandlerV2 = async (
  _event: APIGatewayRequestAuthorizerEventV2,
  _context: Context
): Promise<APIGatewaySimpleAuthorizerResult> => {
  return { isAuthorized: true };
};
