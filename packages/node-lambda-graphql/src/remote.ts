import { AsyncExecutor } from "@graphql-tools/utils";
import { schemaFromExecutor } from "@graphql-tools/wrap";
import { print } from "graphql";

const HTTP_GRAPHQL_ENDPOINT = "https://countries.trevorblades.com/";

const createHttpExecutor =
  (endpoint: string): AsyncExecutor =>
  async ({ document, variables, operationName, extensions }) => {
    const query = print(document);
    const fetchResult = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables, operationName, extensions }),
    });
    return fetchResult.json();
  };

const httpExecutor = createHttpExecutor(HTTP_GRAPHQL_ENDPOINT);

export const remotesSubschema = {
  schema: await schemaFromExecutor(httpExecutor),
  executor: httpExecutor,
};
