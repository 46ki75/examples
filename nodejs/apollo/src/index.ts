import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { readFileSync } from 'fs'
import { stitchSchemas } from '@graphql-tools/stitch'
import { buildHTTPExecutor } from '@graphql-tools/executor-http'
import { schemaFromExecutor } from '@graphql-tools/wrap'
import { makeExecutableSchema } from '@graphql-tools/schema'

import { queryResolvers } from './resolvers/index.js'

// # --------------------------------------------------------------------------------
//
// Local
//
// # --------------------------------------------------------------------------------

const typeDefs = readFileSync('./schema.graphql', 'utf-8')

const resolvers = {
  Query: { ...queryResolvers }
}

const localSchema = makeExecutableSchema({
  typeDefs,
  resolvers
})

// # --------------------------------------------------------------------------------
//
// PokeAPI
//
// # --------------------------------------------------------------------------------

const pokeApiExecutor = buildHTTPExecutor({
  endpoint: 'https://beta.pokeapi.co/graphql/v1beta'
})

const pokeApiSchema = await schemaFromExecutor(pokeApiExecutor)

// # --------------------------------------------------------------------------------
//
// Stitching
//
// # --------------------------------------------------------------------------------

const stitchedSchema = stitchSchemas({
  subschemas: [
    { schema: pokeApiSchema, executor: pokeApiExecutor },
    { schema: localSchema }
  ]
})

// # --------------------------------------------------------------------------------
//
// serve
//
// # --------------------------------------------------------------------------------

const server = new ApolloServer({
  schema: stitchedSchema
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 }
})

console.log(`🚀  Server ready at: ${url}`)
