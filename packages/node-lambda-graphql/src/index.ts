import { LambdaFunctionURLEvent, Context } from 'aws-lambda'

import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'

const typeDefs = `
  type Query {
    hello: String
  }
`

const resolvers = {
  Query: {
    hello: () => 'Hello from AWS Lambda!'
  }
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context
) => {
  if (event.body == null) {
    return {
      error: 'No body provided'
    }
  }

  let decodedBody = Buffer.from(event.body, 'base64').toString('utf-8')

  const { query, variables } = JSON.parse(decodedBody)

  const result = await graphql({
    schema,
    source: query,
    variableValues: variables
  })

  return { result }
}
