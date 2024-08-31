import {
  Handler,
  APIGatewayAuthorizerEvent,
  APIGatewaySimpleAuthorizerResult,
  APIGatewaySimpleAuthorizerWithContextResult,
  Context
} from 'aws-lambda'

interface ResponseContext {
  user: string
  userId: string
}

export const handler: Handler = async (
  event: APIGatewayAuthorizerEvent,
  context: Context
): Promise<
  | APIGatewaySimpleAuthorizerWithContextResult<ResponseContext>
  | APIGatewaySimpleAuthorizerResult
> => {
  if (
    event.type === 'REQUEST' &&
    event.headers != null &&
    event.headers['x-authorization'] === 'true'
  ) {
    return { isAuthorized: true, context: { user: 'Blank', userId: '1234' } }
  } else {
    return { isAuthorized: false }
  }
}
