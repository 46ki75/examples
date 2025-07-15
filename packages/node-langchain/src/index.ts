import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import {
  HumanMessage,
  AIMessage,
  type BaseMessage,
  type AIMessageChunk,
} from "@langchain/core/messages";
import { type IterableReadableStream } from "@langchain/core/utils/stream";
import readline from "readline";
import chalk from "chalk";

function questionAsync(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const { promise, resolve } = Promise.withResolvers<string>();

  rl.question(query, (answer) => {
    rl.close();
    resolve(answer);
  });

  return promise;
}

const chat = new BedrockChat({
  model: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
  region: "ap-northeast-1",
});

const history: BaseMessage[] = [];

while (true) {
  const prompt = (await questionAsync(chalk.blue.bold("User:") + "\n")).trim();

  if (prompt === "/exit") break;
  if (prompt === "") continue;

  history.push(new HumanMessage(prompt));

  const stream: IterableReadableStream<AIMessageChunk> = await chat.stream(
    history
  );

  console.log("\n" + chalk.green.bold("AI:"));

  const contents: string[] = [];

  for await (const chunk of stream) {
    const content = chunk.content.toString();
    contents.push(content);
    process.stdout.write(content);
  }

  process.stdout.write("\n\n");

  history.push(new AIMessage(contents.join("")));
}
