import { DurableContext } from "@aws/durable-execution-sdk-js";
import type { User } from "../user.js";

export const parallelFetchHandler = async (
  _event: unknown,
  context: DurableContext,
) => {
  const users = await context.step("fetch-users", async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    const users = await response.json();

    return users as User[];
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

  return {
    users: userDetails,
  };
};
