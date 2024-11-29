import { LambdaFunctionURLEvent, Context } from 'aws-lambda'

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context
) => {
  return { event, context }
}
