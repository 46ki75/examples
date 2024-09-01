import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

// GraphQL Tools
import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { schemaFromExecutor } from '@graphql-tools/wrap'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { stitchSchemas } from '@graphql-tools/stitch'

// # --------------------------------------------------------------------------------
//
// Local
//
// # --------------------------------------------------------------------------------

const localSchema = makeExecutableSchema({
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

// # --------------------------------------------------------------------------------
//
// PokeAPI
//
// # --------------------------------------------------------------------------------

const countriesApiExecutor = buildHTTPExecutor({
  endpoint: 'https://countries.trevorblades.com'
})

const countriesApiSchema = await schemaFromExecutor(countriesApiExecutor)

// # --------------------------------------------------------------------------------
//
// Stitching
//
// # --------------------------------------------------------------------------------

const stitchedSchema = stitchSchemas({
  subschemas: [
    { schema: localSchema },
    { schema: countriesApiSchema, executor: countriesApiExecutor }
  ]
})

// # --------------------------------------------------------------------------------
//
// serve
//
// # --------------------------------------------------------------------------------

const yoga = createYoga({ schema: stitchedSchema })

const server = createServer(yoga)

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
