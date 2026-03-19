import {
  withDurableExecution,
  DurableContext,
} from "@aws/durable-execution-sdk-js";

export const handler = withDurableExecution(
  async (event: any, context: DurableContext) => {
    await context.wait("wait-1", {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 3,
    });

    return {
      message: "Hello, Durable Function!",
    };
  },
);
