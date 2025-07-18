export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "text/html");
  setResponseHeader(event, "Cache-Control", "no-cache");
  setResponseHeader(event, "Transfer-Encoding", "chunked");

  let interval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue("<ul>");

      interval = setInterval(() => {
        controller.enqueue("<li>" + Math.random() + "</li>");
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 1000);
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return sendStream(event, stream);
});
