import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from "@graphql-tools/schema";
import { readFileSync } from "fs";

const typeDefs = readFileSync("./schema.graphql", "utf8");

const resolvers: IExecutableSchemaDefinition<any>["resolvers"] = {
  Query: {
    hello: () => "Hello from AWS Lambda!",
    acceeptEncoding: (_fieldName: any, _args: any, context: any) =>
      JSON.stringify(context.headers),
  },
};

export const localSchema = makeExecutableSchema({ typeDefs, resolvers });
