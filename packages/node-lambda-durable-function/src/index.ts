import { withDurableExecution } from "@aws/durable-execution-sdk-js";

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

  const response = {
    statusCode: 200,
    body: JSON.stringify(message),
  };
  return response;
});
