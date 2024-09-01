import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { readFileSync } from 'fs'

import { queryResolvers } from './resolvers/index.js'

const typeDefs = readFileSync('./schema.graphql', 'utf-8')

const resolvers = {
  Query: { ...queryResolvers }
}

const server = new ApolloServer({
  typeDefs,
  resolvers
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 }
})

console.log(`🚀  Server ready at: ${url}`)
