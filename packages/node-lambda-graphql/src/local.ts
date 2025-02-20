import { makeExecutableSchema } from "@graphql-tools/schema";
import { readFileSync } from "fs";

const typeDefs = readFileSync("./schema.graphql", "utf8");

const resolvers = {
  Query: {
    hello: () => "Hello from AWS Lambda!",
  },
};

export const localSchema = makeExecutableSchema({ typeDefs, resolvers });
