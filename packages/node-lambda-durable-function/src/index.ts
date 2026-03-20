import {
  withDurableExecution,
  DurableContext,
} from "@aws/durable-execution-sdk-js";

import { defaultHandler } from "./scenario/default.js";
import { simpleFetchHandler } from "./scenario/simple-fetch.js";
import { parallelFetchHandler } from "./scenario/parallel-fetch.js";
import { waitForConditionHandler } from "./scenario/wait-for-condition.js";

const EVENTS = [
  "default",
  "simple-fetch",
  "parallel-fetch",
  "wait-for-condition",
] as const;

export interface EventPayload {
  scenario?: (typeof EVENTS)[number];
}

export const handler = withDurableExecution(
  async (event: EventPayload, context: DurableContext) => {
    switch (event.scenario) {
      case "simple-fetch":
        return simpleFetchHandler(event, context);

      case "parallel-fetch":
        return parallelFetchHandler(event, context);

      case "wait-for-condition":
        return waitForConditionHandler(event, context);

      case "default":
      case undefined:
        return defaultHandler(event, context);

      default:
        throw new Error(
          `Unknown scenario: ${event.scenario}. Valid scenarios are: ${EVENTS.join(", ")}`,
        );
    }
  },
);
