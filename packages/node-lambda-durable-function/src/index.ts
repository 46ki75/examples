import {
  withDurableExecution,
  DurableContext,
} from "@aws/durable-execution-sdk-js";
import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});

export const handler = withDurableExecution(
  async (event: any, context: DurableContext) => {
    const user = await context.step("fetch-html", async () => {
      try {
        const response = await fetch(
          "https://jsonplaceholder.typicode.com/users/1",
        );
        const user = await response.json();
        return user;
      } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
      }
    });

    await context.wait("wait-1", { seconds: 3 });

    await context.parallel([
      async (context) => context.wait("wait-2-1", { seconds: 1 }),
      async (context) => context.wait("wait-2-2", { seconds: 2 }),
      async (context) => context.wait("wait-2-3", { seconds: 3 }),
    ]);

    const [promise, callbackId] = await context.createCallback(
      "approval-create-callback",
      {
        timeout: { hours: 1 },
      },
    );

    await ssmClient.send(
      new PutParameterCommand({
        Name: `/node-lambda-durable-function/callback-id`,
        Value: callbackId,
        Type: "String",
        Overwrite: true,
      }),
    );

    const createCallbackResult = await promise;

    const waitForCallbackResult = await context.waitForCallback(
      "approval-wait-for-callback",
      async (callbackId) => {
        await ssmClient.send(
          new PutParameterCommand({
            Name: `/node-lambda-durable-function/callback-id`,
            Value: callbackId,
            Type: "String",
            Overwrite: true,
          }),
        );
      },
      {
        timeout: { hours: 1 },
      },
    );

    return {
      message: "Hello, Durable Function!",
      user,
      createCallbackResult,
      waitForCallbackResult,
    };
  },
);
