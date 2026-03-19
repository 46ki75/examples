import {
  withDurableExecution,
  DurableContext,
} from "@aws/durable-execution-sdk-js";
import {
  DeleteParameterCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});

export const handler = withDurableExecution(
  async (event: any, context: DurableContext) => {
    const startTime = await context.step("start-time", async () => {
      return new Date().toISOString();
    });

    const _ = await context.waitForCondition(
      "wait-for-condition",
      async (state, ctx) => {
        return { ...state, time: new Date().toISOString() };
      },
      {
        initialState: { time: new Date().toISOString() },
        waitStrategy: (state) => {
          const shouldContinue =
            new Date(state.time).getTime() - new Date(startTime).getTime() <
            3000;

          if (shouldContinue) {
            return { shouldContinue: true, delay: { seconds: 1 } };
          } else {
            return { shouldContinue: false };
          }
        },
      },
    );

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

    const cleanup = await context.step("cleanup", async () => {
      const result = await ssmClient.send(
        new DeleteParameterCommand({
          Name: `/node-lambda-durable-function/callback-id`,
        }),
      );

      return result;
    });

    return {
      message: "Hello, Durable Function!",
      user,
      createCallbackResult,
      waitForCallbackResult,
    };
  },
);
