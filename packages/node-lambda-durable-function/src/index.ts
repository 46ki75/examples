import {
  withDurableExecution,
  DurableContext,
} from "@aws/durable-execution-sdk-js";

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

    await context.wait("wait-1", {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 3,
    });

    return {
      message: "Hello, Durable Function!",
      user,
    };
  },
);
