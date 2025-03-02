import { handler } from "../src/handlers/index.js";

const event = {
  message: "Hello Lambda!",
};

console.log(await handler(event));
