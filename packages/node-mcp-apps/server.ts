/**
 * Minimal MCP Apps server.
 *
 * It exposes one in-memory to-do list through four tools and serves a single
 * React UI as a `ui://` resource. `view-todos` carries the `_meta.ui` link, so
 * when the host calls it the bundled HTML is rendered in a sandboxed iframe and
 * the tool result is pushed into the app. The app then drives the list by
 * calling `add-todo` / `toggle-todo` / `remove-todo` back through the host.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

// In-memory state. Resets every time the server restarts — that's the point of
// "in-memory"; swap this for a real store in a non-toy app.
const todos: Todo[] = [
  { id: "1", text: "Read the MCP Apps overview", done: true },
  { id: "2", text: "Build a minimal MCP App", done: false },
];
let nextId = 3;

/** Shared tool result: a JSON snapshot of the list, returned both as text and
 *  as structured content so the UI can parse it without guessing. */
function todosResult(): CallToolResult {
  const payload = { todos };
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

const server = new McpServer({ name: "MCP Apps To-Do", version: "0.0.0" });

// The `ui://` scheme marks this as an MCP App resource; the path is arbitrary.
const resourceUri = "ui://todos/mcp-app.html";

// The UI-bearing tool. `_meta.ui.resourceUri` is what makes it an MCP App.
registerAppTool(
  server,
  "view-todos",
  {
    title: "View To-Dos",
    description: "Open the interactive to-do list.",
    inputSchema: {},
    _meta: { ui: { resourceUri } },
  },
  async () => todosResult(),
);

// The mutating tools don't render UI, so they use the plain `registerTool`.
// The app calls them via the bridge and adopts their (updated) list result.
server.registerTool(
  "add-todo",
  {
    title: "Add To-Do",
    description: "Add a new item to the to-do list.",
    inputSchema: { text: z.string().min(1).describe("The to-do item text") },
  },
  async ({ text }) => {
    todos.push({ id: String(nextId++), text, done: false });
    return todosResult();
  },
);

server.registerTool(
  "toggle-todo",
  {
    title: "Toggle To-Do",
    description: "Toggle the done state of a to-do item by id.",
    inputSchema: { id: z.string().describe("The id of the item to toggle") },
  },
  async ({ id }) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.done = !todo.done;
    return todosResult();
  },
);

server.registerTool(
  "remove-todo",
  {
    title: "Remove To-Do",
    description: "Remove a to-do item by id.",
    inputSchema: { id: z.string().describe("The id of the item to remove") },
  },
  async ({ id }) => {
    const i = todos.findIndex((t) => t.id === id);
    if (i !== -1) todos.splice(i, 1);
    return todosResult();
  },
);

// Serve the bundled single-file HTML when the host fetches the UI resource.
registerAppResource(
  server,
  resourceUri,
  resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile(
      path.join(import.meta.dirname, "dist", "mcp-app.html"),
      "utf-8",
    );
    return {
      contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
    };
  },
);

// Two transports, same server. `--stdio` connects over stdin/stdout (for local
// hosts like Claude Desktop); otherwise expose Streamable HTTP on port 3001.
//
// In stdio mode stdout IS the JSON-RPC channel, so all logging must go to
// stderr — a stray `console.log` there would corrupt the protocol stream.
if (process.argv.includes("--stdio")) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Apps To-Do server running on stdio");
} else {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(3001, () => {
    console.log("MCP Apps To-Do server listening on http://localhost:3001/mcp");
  });
}
