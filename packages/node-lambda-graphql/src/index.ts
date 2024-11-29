import type {
  LambdaFunctionURLEvent,
  Context,
  LambdaFunctionURLResult
} from 'aws-lambda'

import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'

import { readFileSync } from 'fs'

const html = readFileSync('./graphiql.html', 'utf8')

const typeDefs = readFileSync('./schema.graphql', 'utf8')

const resolvers = {
  Query: {
    hello: () => 'Hello from AWS Lambda!'
  }
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context
): Promise<LambdaFunctionURLResult | ReturnType<typeof graphql>> => {
  if (event.requestContext.http.method === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html
    }
  } else {
    try {
      if (event.body == null) {
        return {
          body: JSON.stringify({ error: 'No body provided' })
        }
      }

      const { query, variables } = JSON.parse(event.body)

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables
      })

      return result
    } catch (e) {
      return {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: JSON.stringify(e) })
      }
    }
  }
}
