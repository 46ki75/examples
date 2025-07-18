const sleep = async (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

async function* streaming(): AsyncGenerator<string> {
  yield "<ul>";
  let counter = 0;
  while (counter < 20) {
    await sleep(100);
    yield `<li>${Math.random()}</li>`;
    counter++;
  }
  yield "</ul>";
}

export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "text/html");
  setResponseHeader(event, "Cache-Control", "no-cache");
  setResponseHeader(event, "Transfer-Encoding", "chunked");

  const stream = new ReadableStream({
    async start(controller) {
      for await (const value of streaming()) {
        controller.enqueue(value);
      }

      controller.close();
    },
  });

  return sendStream(event, stream);
});
