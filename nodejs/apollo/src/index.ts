import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { readFileSync } from 'fs'

const typeDefs = readFileSync('./schema.graphql', 'utf-8')

const resolvers = {
  Query: {
    greet: () => ({
      message: () => 'Hello, GraphQL!',
      language: async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        return 'typescript'
      }
    })
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 }
})

console.log(`🚀  Server ready at: ${url}`)
