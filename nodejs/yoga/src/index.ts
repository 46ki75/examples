import { createSchema } from 'graphql-yoga'

import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { readFileSync } from 'node:fs'

export const schema = createSchema({
  typeDefs: readFileSync('./schema.graphql', 'utf-8'),
  resolvers: {
    Query: {
      greet: () => ({
        message: () => 'Hello, world!',
        language: () => 'typescript'
      })
    }
  }
})

const yoga = createYoga({ schema })

const server = createServer(yoga)

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
