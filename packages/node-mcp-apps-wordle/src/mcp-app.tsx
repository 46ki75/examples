/**
 * @file React UI for the Wordle MCP App.
 *
 * The host pushes the initial `play-wordle` result via `ontoolresult`. Human
 * guesses go out through `app.callServerTool("guess-word", …)`; we also poll
 * `play-wordle` while the game is in progress so guesses the *agent* makes in
 * the conversation appear on the board too.
 */
import type { App } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type LetterState = "correct" | "present" | "absent";
interface Guess {
  word: string;
  states: LetterState[];
}
interface GameState {
  guesses: Guess[];
  status: "playing" | "won" | "lost";
  maxGuesses: number;
  answer?: string;
  message?: string;
}

const EMPTY: GameState = { guesses: [], status: "playing", maxGuesses: 6 };

const COLORS: Record<LetterState, string> = {
  correct: "#6aaa64",
  present: "#c9b458",
  absent: "#787c7e",
};

function extractState(result: CallToolResult): GameState {
  const s = result.structuredContent as GameState | undefined;
  return s?.guesses ? s : EMPTY;
}

function App2() {
  const [state, setState] = useState<GameState>(EMPTY);

  const { app, error } = useApp({
    appInfo: { name: "Wordle App", version: "0.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = async (result) => setState(extractState(result));
      app.onerror = console.error;
    },
  });

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <strong>ERROR:</strong> {error.message}
      </div>
    );
  }
  if (!app) return <div style={{ padding: 16 }}>Connecting…</div>;

  return <Board app={app} state={state} onState={setState} />;
}

function Board({
  app,
  state,
  onState,
}: {
  app: App;
  state: GameState;
  onState: (s: GameState) => void;
}) {
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const playing = state.status === "playing";

  // Read-only refresh from the server (used by the poll).
  const fetchState = useCallback(async () => {
    try {
      onState(
        extractState(
          await app.callServerTool({ name: "play-wordle", arguments: {} }),
        ),
      );
    } catch (e) {
      console.error(e);
    }
  }, [app, onState]);

  // Poll while the game is live so the agent's guesses show up on the board.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(fetchState, 2000);
    return () => clearInterval(id);
  }, [playing, fetchState]);

  const submit = useCallback(async () => {
    if (!playing || busy || current.length !== 5) return;
    setBusy(true);
    try {
      const result = await app.callServerTool({
        name: "guess-word",
        arguments: { word: current.toLowerCase() },
      });
      onState(extractState(result));
      setCurrent("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [app, current, playing, busy, onState]);

  const newGame = useCallback(async () => {
    setBusy(true);
    try {
      onState(
        extractState(
          await app.callServerTool({ name: "new-game", arguments: {} }),
        ),
      );
      setCurrent("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [app, onState]);

  // Physical-keyboard support: letters, Backspace, Enter.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playing) return;
      if (e.key === "Enter") submitRef.current();
      else if (e.key === "Backspace") setCurrent((c) => c.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key))
        setCurrent((c) => (c.length < 5 ? c + e.key.toLowerCase() : c));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  // Build the 6 rows: past guesses, the in-progress row, then blanks.
  const rows: { letters: string; states?: LetterState[] }[] = [];
  for (const g of state.guesses)
    rows.push({ letters: g.word.toUpperCase(), states: g.states });
  if (playing && rows.length < state.maxGuesses)
    rows.push({ letters: current.toUpperCase() });
  while (rows.length < state.maxGuesses) rows.push({ letters: "" });

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 16,
        maxWidth: 360,
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginTop: 0, textAlign: "center" }}>Wordle</h2>

      <div style={{ display: "grid", gap: 5, justifyContent: "center" }}>
        {rows.map((row, r) => (
          <div key={r} style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: 5 }).map((_, c) => {
              const letter = row.letters[c] ?? "";
              const st = row.states?.[c];
              return (
                <div
                  key={c}
                  style={{
                    width: 52,
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: st ? "#fff" : "#000",
                    background: st ? COLORS[st] : "#fff",
                    border: st
                      ? "none"
                      : `2px solid ${letter ? "#878a8c" : "#d3d6da"}`,
                    boxSizing: "border-box",
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p style={{ minHeight: 20, textAlign: "center", color: "#b59f3b" }}>
        {state.message ?? ""}
      </p>

      {state.status === "won" && (
        <p style={{ textAlign: "center" }}>🎉 Solved!</p>
      )}
      {state.status === "lost" && (
        <p style={{ textAlign: "center" }}>
          Out of guesses — the word was{" "}
          <strong>{state.answer?.toUpperCase()}</strong>.
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginTop: 8,
        }}
      >
        {playing ? (
          <button onClick={submit} disabled={busy || current.length !== 5}>
            Submit guess
          </button>
        ) : (
          <button onClick={newGame} disabled={busy}>
            New game
          </button>
        )}
      </div>

      <p
        style={{
          fontSize: 12,
          color: "#888",
          textAlign: "center",
          marginTop: 12,
        }}
      >
        Type on your keyboard, or ask the agent to guess. The board polls for
        the agent's moves while playing.
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App2 />
  </StrictMode>,
);
