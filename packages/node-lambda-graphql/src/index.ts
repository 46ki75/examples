import type {
  LambdaFunctionURLEvent,
  Context,
  LambdaFunctionURLResult,
} from "aws-lambda";

import { graphql } from "graphql";

import { stitchSchemas } from "@graphql-tools/stitch";
import { localSchema } from "./local.js";
import { remotesSubschema } from "./remote.js";

import { readFileSync } from "fs";

const playground = readFileSync("./graphiql.html", "utf8");

export const gatewaySchema = stitchSchemas({
  subschemas: [localSchema, remotesSubschema],
});

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context
): Promise<LambdaFunctionURLResult | ReturnType<typeof graphql>> => {
  if (event.requestContext.http.method === "GET") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: playground,
    };
  } else {
    try {
      if (event.body == null) {
        return {
          body: JSON.stringify({ error: "No body provided" }),
          statusCode: 400,
        };
      }

      const { query, variables } = JSON.parse(event.body);

      const result = await graphql({
        schema: gatewaySchema,
        source: query,
        variableValues: variables,
      });

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: JSON.stringify(e) }),
      };
    }
  }
};
