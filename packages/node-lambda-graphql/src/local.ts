import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from "@graphql-tools/schema";
import { readFileSync } from "fs";

const typeDefs = readFileSync("./schema.graphql", "utf8");

interface ResolverContext {
  headers?: Record<string, string | undefined>;
}

const resolvers: IExecutableSchemaDefinition<ResolverContext>["resolvers"] = {
  Query: {
    hello: () => "Hello from AWS Lambda!",
    acceptEncoding: (
      _fieldName: unknown,
      _args: unknown,
      context: ResolverContext,
    ) => {
      const acceptEncoding = context.headers?.["accept-encoding"];
      if (typeof acceptEncoding !== "string") return null;
      return acceptEncoding.split(",").map((encoding) => encoding.trim());
    },
  },
};

export const localSchema = makeExecutableSchema({ typeDefs, resolvers });
