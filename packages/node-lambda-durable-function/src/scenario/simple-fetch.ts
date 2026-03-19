import {
  withDurableExecution,
  DurableContext,
} from "@aws/durable-execution-sdk-js";
import type { User } from "../user.js";

export const simpleFetchHandler = async (
  event: unknown,
  context: DurableContext,
) => {
  const user1 = await context.step("fetch-user-1", async () => {
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/users/1",
    );

    const user = await response.json();

    return user as User;
  });

  const user2 = await context.step("fetch-user-2", async () => {
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/users/2",
    );

    const user = await response.json();

    return user as User;
  });

  return {
    users: [user1, user2],
  };
};
