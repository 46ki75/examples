# node-mcp-apps-wordle

An [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) Wordle
game with **one shared in-memory board that both humans and agents play**.

- **Human** — types guesses in the rendered React grid (UI → `guess-word`).
- **Agent** — calls `guess-word` directly in the conversation.

Both mutate the same game on the server, so they can take turns on one board.
The UI polls `play-wordle` every 2s while the game is live, so guesses the agent
makes show up on the grid without the human refreshing.

## Tools

| Tool          | UI? | Purpose                                                      |
| ------------- | :-: | ------------------------------------------------------------ |
| `play-wordle` | ✅  | Open the board / read current state (`_meta.ui.resourceUri`) |
| `guess-word`  |     | Submit a 5-letter guess; returns per-letter feedback         |
| `new-game`    |     | Start a new game with a random word                          |

Feedback per letter: 🟩 right letter & position, 🟨 right letter wrong position,
⬜ not in the word. The text block of each result is an emoji summary so the
agent can reason about feedback; the UI renders the structured state. The answer
is withheld from clients until the game ends, so neither player can cheat.

## Files

| File              | Role                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| `server.ts`       | MCP server (Hono / Streamable HTTP on **3002**, or `--stdio`) + game logic |
| `mcp-app.html`    | UI entry point                                                             |
| `src/mcp-app.tsx` | React board: grid, keyboard input, polling                                 |
| `vite.config.ts`  | `vite-plugin-singlefile` bundles JS/CSS into one HTML file                 |

## Run

```bash
pnpm install
pnpm build         # type-check + bundle UI into dist/mcp-app.html
pnpm serve         # Streamable HTTP at http://localhost:3002/mcp
pnpm serve:stdio   # or: same server over stdin/stdout
```

For Claude Desktop (stdio), build first, then point a config entry at
`tsx server.ts --stdio`. See `../node-mcp-apps/README.md` for the connector and
tunnel details — the only difference here is the port (3002) and command path.

## Logging

The server logs with [consola](https://github.com/unjs/consola), tagged
`[wordle]`. All output is routed to **stderr** — never stdout — because in
`--stdio` mode stdout is the JSON-RPC channel and any stray write there corrupts
the protocol. Tool calls, guesses (with 🟩🟨⬜ feedback), and game outcomes are
logged at `info`/`success`/`warn`; the UI's 2s polling and the chosen answer are
at `debug`. Set `CONSOLA_LEVEL=4` to see debug lines:

```bash
CONSOLA_LEVEL=4 pnpm serve
```

## Play

Ask the host to **"play wordle"** to render the board, then either type guesses
yourself or say **"guess CRANE"** / **"solve it for me"** and watch the agent's
moves appear on the grid.
