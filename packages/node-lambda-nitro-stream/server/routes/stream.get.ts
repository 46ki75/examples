const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

async function* random(): AsyncGenerator<number> {
  let counter = 0;
  while (counter < 20) {
    await sleep(100);
    yield Math.random();
    counter++;
  }
}

export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "text/html");
  setResponseHeader(event, "Cache-Control", "no-cache");
  setResponseHeader(event, "Transfer-Encoding", "chunked");

  let interval: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue("<ul>");

      for await (const value of random()) {
        controller.enqueue("<li>" + value + "</li>");
      }

      controller.enqueue("</ul>");

      controller.close();
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return sendStream(event, stream);
});
