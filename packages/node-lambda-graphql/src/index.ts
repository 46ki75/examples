import type {
  LambdaFunctionURLEvent,
  Context,
  LambdaFunctionURLResult
} from 'aws-lambda'

import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Simple GraphiQL Example</title>
  <link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" />
</head>
<body style="margin: 0;">
  <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
  <div id="graphiql" style="height: 100vh;"></div>
  <script>
    const fetcher = GraphiQL.createFetcher({ url: '/' });
    ReactDOM.render(
      React.createElement(GraphiQL, { fetcher: fetcher }),
      document.getElementById('graphiql'),
    );
  </script>
</body>
</html>
`

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
