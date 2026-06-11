# node-mcp-apps

A minimal [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)
example: a React UI, served as a `ui://` resource, backed by an **in-memory
to-do list**.

## The pattern

An MCP App is a normal MCP **tool** whose description carries
`_meta.ui.resourceUri`, pointing at a `ui://` **resource** that serves a
self-contained HTML page. The host renders that page in a sandboxed iframe and
talks to it over a `postMessage` JSON-RPC bridge — pushing the tool result in,
and forwarding the app's tool calls back out.

```
view-todos (UI tool, _meta.ui) ──▶ ui://todos/mcp-app.html ──▶ rendered in iframe
        result pushed in ──────────────────────────────────▶ app.ontoolresult
        app.callServerTool ──▶ add-todo / toggle-todo / remove-todo ──▶ updated list
```

## Files

| File              | Role                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `server.ts`       | MCP server (Streamable HTTP, port 3001): the 4 tools + the UI resource |
| `mcp-app.html`    | UI entry point                                                        |
| `src/mcp-app.tsx` | React UI using `useApp()` from `@modelcontextprotocol/ext-apps/react` |
| `vite.config.ts`  | `vite-plugin-singlefile` bundles JS/CSS into one HTML file            |

Tools: `view-todos` (the UI tool), `add-todo`, `toggle-todo`, `remove-todo`.
Each mutating tool returns the full updated list, so the UI just adopts the
result. State is in-memory and resets on restart.

## Run

```bash
pnpm install
pnpm build         # type-check + bundle UI into dist/mcp-app.html
pnpm serve         # Streamable HTTP at http://localhost:3001/mcp
pnpm serve:stdio   # or: same server over stdin/stdout
```

`pnpm start` runs build then serve (HTTP).

### Transports

The same server speaks both transports — pass `--stdio` for stdin/stdout,
otherwise it listens on HTTP. MCP Apps work identically over either: the host
fetches the `ui://` resource and renders the iframe regardless of transport.

For a stdio host like Claude Desktop, build first (`pnpm build`) so
`dist/mcp-app.html` exists, then point the host at the command:

```jsonc
{
  "mcpServers": {
    "todos": {
      "command": "npx",
      "args": ["tsx", "/abs/path/to/packages/node-mcp-apps/server.ts", "--stdio"]
    }
  }
}
```

> In stdio mode stdout is the JSON-RPC channel, so the server logs only to
> stderr — never add a `console.log` to that path.

## Test

You need a host that supports MCP Apps to see the UI render.

**Option A — ext-apps basic-host** (local):

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host && npm install
SERVERS='["http://localhost:3001/mcp"]' npm start   # then open http://localhost:8080
```

**Option B — Claude** (web/desktop, paid plan): expose the local server with a
tunnel and add it as a custom connector.

```bash
npx cloudflared tunnel --url http://localhost:3001
```

Use the generated `https://…trycloudflare.com/mcp` URL in
**Settings → Connectors → Add custom connector**, then ask Claude to "view my
to-dos".
