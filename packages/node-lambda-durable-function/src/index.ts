import { withDurableExecution } from "@aws/durable-execution-sdk-js";
import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});

export const handler = withDurableExecution(async (event, context) => {
  // TODO implement

  await context.step("Step #1", async (stepCtx) => {
    stepCtx.logger.info("Hello from step #1");
  });

  // Pause for 1 second without consuming CPU cycles or incurring usage charges
  await context.wait({ seconds: 1 });

  // Context logger is replay aware and will not log the same message multiple times
  context.logger.info("Waited for 1 second");

  const message = await context.step("Step #2", async () => {
    return "Hello from Durable Lambda!";
  });

  await context.waitForCallback(
    "wait-approval",
    async (callbackId, ctx) => {
      ctx.logger.info(`Received callback with id: ${callbackId}`);
      await ssmClient.send(
        new PutParameterCommand({
          Name: `/lambda-durable-function/callback-id`,
          Value: callbackId,
          Type: "String",
          Overwrite: true,
        }),
      );
    },
    {
      timeout: { minutes: 5 },
    },
  );

  const response = {
    statusCode: 200,
    body: JSON.stringify(message),
  };
  return response;
});
