import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import {
  HumanMessage,
  AIMessage,
  type BaseMessage,
  type AIMessageChunk,
  SystemMessage,
} from "@langchain/core/messages";
import { type IterableReadableStream } from "@langchain/core/utils/stream";

const chat = new BedrockChat({
  model: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
  region: "ap-northeast-1",
});

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Content-Type", "text/plain");
  setResponseHeader(event, "Cache-Control", "no-cache");
  setResponseHeader(event, "Transfer-Encoding", "chunked");

  const history: BaseMessage[] = [
    new SystemMessage("You are a AI assistant."),
    new HumanMessage("Hi"),
  ];

  const stream: IterableReadableStream<AIMessageChunk> =
    await chat.stream(history);

  const response = new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(chunk.content.toString());
      }
      controller.close();
    },
  });

  return sendStream(event, response);
});
