import {
  Handler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda'

export const handler: Handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  return {
    headers: { 'content-type': 'application/json' },
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello, Lambda!', event, context })
  }
}
