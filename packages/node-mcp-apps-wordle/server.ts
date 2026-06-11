/**
 * MCP Apps Wordle.
 *
 * A single in-memory Wordle game, shared by two kinds of players:
 *  - Humans type guesses in the rendered React board (UI -> `guess-word`).
 *  - Agents call `guess-word` directly in the conversation.
 * Both mutate the same game state, so they can collaborate (or compete) on one
 * board. The UI polls `play-wordle` so it reflects guesses the agent makes.
 *
 * `play-wordle` carries the `_meta.ui` link that makes this an MCP App. The
 * answer is never sent to clients while the game is in progress, so neither the
 * human nor the agent can cheat by reading the tool result.
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
import { type HttpBindings, serve } from "@hono/node-server";
import { RESPONSE_ALREADY_SENT } from "@hono/node-server/utils/response";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createConsola } from "consola";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Route ALL log output to stderr. In `--stdio` mode stdout is the JSON-RPC
// channel, so any stray stdout write corrupts the protocol; stderr is always
// safe (Claude Desktop captures it into its MCP logs). Set CONSOLA_LEVEL=4 to
// see debug lines (e.g. the UI's 2s polling of play-wordle).
const logger = createConsola({
  stdout: process.stderr,
  stderr: process.stderr,
}).withTag("wordle");

// A small word list, used both as the pool of answers and the set of accepted
// guesses. Kept short on purpose — swap for a full dictionary in a real app.
const WORD_LIST = [
  "apple",
  "beach",
  "brain",
  "bread",
  "brick",
  "chair",
  "chess",
  "cloud",
  "crane",
  "dance",
  "eagle",
  "earth",
  "flame",
  "ghost",
  "grape",
  "green",
  "heart",
  "house",
  "juice",
  "knife",
  "lemon",
  "light",
  "money",
  "mouse",
  "music",
  "night",
  "ocean",
  "paint",
  "piano",
  "plant",
  "pride",
  "quiet",
  "river",
  "robot",
  "shine",
  "smile",
  "snake",
  "spice",
  "stone",
  "storm",
  "sugar",
  "table",
  "tiger",
  "toast",
  "torch",
  "train",
  "truck",
  "vivid",
  "water",
  "whale",
  "wheat",
  "world",
  "yacht",
  "zebra",
];
const WORDS = new Set(WORD_LIST);

type LetterState = "correct" | "present" | "absent";
interface Guess {
  word: string;
  states: LetterState[];
}
interface Game {
  answer: string;
  guesses: Guess[];
  status: "playing" | "won" | "lost";
  maxGuesses: number;
}

function randomWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

let game: Game = newGame();
function newGame(): Game {
  return {
    answer: randomWord(),
    guesses: [],
    status: "playing",
    maxGuesses: 6,
  };
}

/** Standard Wordle scoring, including correct handling of duplicate letters:
 *  greens are assigned first and consume a letter from the answer's pool, so a
 *  second copy only goes yellow if an unmatched copy remains. */
function score(answer: string, guess: string): LetterState[] {
  const states: LetterState[] = Array(5).fill("absent");
  const pool: Record<string, number> = {};
  for (const ch of answer) pool[ch] = (pool[ch] ?? 0) + 1;
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      states[i] = "correct";
      pool[guess[i]]--;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (states[i] === "correct") continue;
    if (pool[guess[i]] > 0) {
      states[i] = "present";
      pool[guess[i]]--;
    }
  }
  return states;
}

const EMOJI: Record<LetterState, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬜",
};

/** Build the tool result. The text block is an emoji summary so an agent (which
 *  cannot see the iframe) can reason about feedback; structuredContent carries
 *  the machine-readable state the UI renders. `answer` is included only once the
 *  game is over. */
function result(message?: string): CallToolResult {
  const lines = game.guesses.map(
    (g, i) =>
      `${i + 1}. ${g.word.toUpperCase()} ${g.states.map((s) => EMOJI[s]).join("")}`,
  );
  let text = lines.join("\n") || "(no guesses yet)";
  text += `\nStatus: ${game.status} — ${game.guesses.length}/${game.maxGuesses} guesses used.`;
  if (game.status === "won") text += "\nSolved! 🎉";
  if (game.status === "lost")
    text += `\nOut of guesses. The word was ${game.answer.toUpperCase()}.`;
  if (message) text = `${message}\n${text}`;

  return {
    content: [{ type: "text", text }],
    structuredContent: {
      guesses: game.guesses,
      status: game.status,
      maxGuesses: game.maxGuesses,
      answer: game.status === "playing" ? undefined : game.answer,
      message,
    },
  };
}

const server = new McpServer({ name: "MCP Apps Wordle", version: "0.0.0" });

const resourceUri = "ui://wordle/mcp-app.html";

// The UI-bearing tool. Calling it also serves as "read current state", which is
// what the UI polls and what an agent calls to see the board.
registerAppTool(
  server,
  "play-wordle",
  {
    title: "Play Wordle",
    description:
      "Open the interactive Wordle board and read the current game state. " +
      "Feedback per letter: 🟩 right letter & position, 🟨 right letter wrong " +
      "position, ⬜ not in the word. Use guess-word to make a guess.",
    inputSchema: {},
    _meta: { ui: { resourceUri } },
  },
  async () => {
    // The UI polls this every 2s, so keep it at debug to avoid log spam.
    logger.debug(
      `play-wordle: state read (${game.guesses.length}/${game.maxGuesses}, ${game.status})`,
    );
    return result();
  },
);

server.registerTool(
  "guess-word",
  {
    title: "Guess Word",
    description:
      "Submit a 5-letter guess for the current Wordle game. Returns the updated " +
      "board with per-letter feedback.",
    inputSchema: {
      word: z.string().length(5).describe("A 5-letter guess"),
    },
  },
  async ({ word }) => {
    const w = word.toLowerCase().trim();
    if (game.status !== "playing") {
      logger.warn(`guess "${word}" rejected: game already ${game.status}`);
      return result("The game is over. Call new-game to play again.");
    }
    if (!/^[a-z]{5}$/.test(w)) {
      logger.warn(`guess "${word}" rejected: not 5 letters`);
      return result(`"${word}" must be exactly 5 letters (a–z).`);
    }
    if (!WORDS.has(w)) {
      logger.warn(`guess "${word}" rejected: not in word list`);
      return result(`"${word}" is not in the word list.`);
    }
    const states = score(game.answer, w);
    game.guesses.push({ word: w, states });
    const feedback = states.map((s) => EMOJI[s]).join("");
    logger.info(
      `guess ${game.guesses.length}/${game.maxGuesses}: ${w.toUpperCase()} ${feedback}`,
    );
    if (w === game.answer) {
      game.status = "won";
      logger.success(`solved in ${game.guesses.length} guess(es)!`);
    } else if (game.guesses.length >= game.maxGuesses) {
      game.status = "lost";
      logger.warn(`out of guesses — the word was ${game.answer.toUpperCase()}`);
    }
    return result();
  },
);

server.registerTool(
  "new-game",
  {
    title: "New Game",
    description: "Start a fresh Wordle game with a new random word.",
    inputSchema: {},
  },
  async () => {
    game = newGame();
    logger.info("new game started");
    logger.debug(`answer = ${game.answer}`); // visible only at debug level
    return result("New game started — 6 guesses, 5 letters.");
  },
);

// Serve the bundled single-file HTML when the host fetches the UI resource.
registerAppResource(
  server,
  resourceUri,
  resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    logger.info(`serving UI resource ${resourceUri}`);
    const html = await fs.readFile(
      path.join(import.meta.dirname, "dist", "mcp-app.html"),
      "utf-8",
    );
    return {
      contents: [
        { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
      ],
    };
  },
);

// Two transports, same server. `--stdio` for local hosts like Claude Desktop;
// otherwise Streamable HTTP on port 3002. In stdio mode stdout is the JSON-RPC
// channel, so logging must go to stderr.
if (process.argv.includes("--stdio")) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.ready("MCP Apps Wordle server running on stdio");
} else {
  const app = new Hono<{ Bindings: HttpBindings }>();
  app.use("/mcp", cors());

  app.post("/mcp", async (c) => {
    logger.debug("POST /mcp");
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const { incoming, outgoing } = c.env;
    outgoing.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(incoming, outgoing, await c.req.json());
    return RESPONSE_ALREADY_SENT;
  });

  serve({ fetch: app.fetch, port: 3002, hostname: "127.0.0.1" }, (info) => {
    logger.ready(
      `MCP Apps Wordle server listening on http://127.0.0.1:${info.port}/mcp`,
    );
  });
}
