import { DurableContext } from "@aws/durable-execution-sdk-js";

export const waitForConditionHandler = async (
  _event: unknown,
  context: DurableContext,
) => {
  const startTime = await context.step("start-time", async () => {
    return new Date().toISOString();
  });

  const { time: endTime } = await context.waitForCondition(
    "wait-for-condition",
    async (state, ctx) => {
      ctx.logger.info(`Checking condition at ${state.time}`);
      return { ...state, time: new Date().toISOString() };
    },
    {
      initialState: { time: new Date().toISOString() },
      waitStrategy: (state) => {
        const shouldContinue =
          new Date(state.time).getTime() - new Date(startTime).getTime() < 3000;

        if (shouldContinue) {
          return { shouldContinue: true, delay: { seconds: 1 } };
        } else {
          return { shouldContinue: false };
        }
      },
    },
  );

  return {
    startTime,
    endTime,
  };
};
