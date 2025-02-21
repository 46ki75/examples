import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from "@graphql-tools/schema";
import { readFileSync } from "fs";

const typeDefs = readFileSync("./schema.graphql", "utf8");

const resolvers: IExecutableSchemaDefinition<any>["resolvers"] = {
  Query: {
    hello: () => "Hello from AWS Lambda!",
    acceptEncoding: (_fieldName: any, _args: any, context: any) => {
      const acceptEncoding = context.headers?.["accept-encoding"];
      if (typeof acceptEncoding !== "string") return null;
      return acceptEncoding.split(",").map((encoding) => encoding.trim());
    },
  },
};

export const localSchema = makeExecutableSchema({ typeDefs, resolvers });
