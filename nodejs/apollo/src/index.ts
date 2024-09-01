import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

const typeDefs = `#graphql

type Greet{
    message: String!
    language: String!
}

type Query {
    greet: Greet
}
`

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
