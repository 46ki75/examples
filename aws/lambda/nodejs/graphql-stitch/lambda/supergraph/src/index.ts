import { ApolloServer } from '@apollo/server'

export const server = new ApolloServer({
  typeDefs: /* GraphQL */ `
    type Query {
      greetings: String
    }
  `,
  resolvers: {
    Query: {
      greetings: () => 'This is the `greetings` field of the root `Query` type'
    }
  }
})
