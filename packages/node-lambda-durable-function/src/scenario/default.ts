import { DurableContext } from "@aws/durable-execution-sdk-js";
import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { User } from "../user.js";

const ssmClient = new SSMClient({});

export const defaultHandler = async (
  _event: unknown,
  context: DurableContext,
) => {
  await context.wait("wait-1", { seconds: 3 });

  const users = await context.step("fetch-users", async () => {
    try {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/users",
      );
      const users = await response.json();
      return users as User[];
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  });

  const userDetails = await context.parallel(
    "parallel-fetch-user-details",
    users.map(({ id }) => ({
      name: `branch-fetch-user-${id}`,
      func: async (context) => {
        const userDetail = await context.step(`fetch-user-${id}`, async () => {
          const response = await fetch(
            `https://jsonplaceholder.typicode.com/users/${id}`,
          );
          const user = await response.json();
          return user as User;
        });

        return userDetail;
      },
    })),
  );

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
    users,
    userDetails,
    createCallbackResult,
    waitForCallbackResult,
  };
};
