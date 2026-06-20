/**
 * @file React UI for the to-do MCP App.
 *
 * `useApp` (from `@modelcontextprotocol/ext-apps/react`) creates the `App`,
 * registers handlers via `onAppCreated`, and calls `connect()`. The host pushes
 * the initial `view-todos` result through `ontoolresult`; every mutation goes
 * back out through `app.callServerTool`, whose result is the fresh list.
 */
import type { App } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

/** Pull the todo list out of a tool result (structured content, else JSON text). */
function extractTodos(result: CallToolResult): Todo[] {
  const structured = result.structuredContent as { todos?: Todo[] } | undefined;
  if (structured?.todos) return structured.todos;
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (text) {
    try {
      return (JSON.parse(text) as { todos?: Todo[] }).todos ?? [];
    } catch {
      /* fall through */
    }
  }
  return [];
}

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const { app, error } = useApp({
    appInfo: { name: "To-Do App", version: "0.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      // The host pushes the initial `view-todos` result here on render.
      app.ontoolresult = async (result) => setTodos(extractTodos(result));
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

  return <TodoList app={app} todos={todos} onChange={setTodos} />;
}

function TodoList({
  app,
  todos,
  onChange,
}: {
  app: App;
  todos: Todo[];
  onChange: (todos: Todo[]) => void;
}) {
  const [text, setText] = useState("");

  // Every mutating tool returns the updated list, so we just adopt its result.
  const call = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      try {
        const result = await app.callServerTool({ name, arguments: args });
        onChange(extractTodos(result));
      } catch (e) {
        console.error(e);
      }
    },
    [app, onChange],
  );

  const add = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await call("add-todo", { text: t });
  }, [text, call]);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>To-Do</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: "6px 8px" }}
          value={text}
          placeholder="Add an item…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button onClick={add}>Add</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => call("toggle-todo", { id: todo.id })}
            />
            <span style={{ flex: 1, textDecoration: todo.done ? "line-through" : "none" }}>
              {todo.text}
            </span>
            <button onClick={() => call("remove-todo", { id: todo.id })}>✕</button>
          </li>
        ))}
        {todos.length === 0 && <li style={{ color: "#888" }}>Nothing yet.</li>}
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TodoApp />
  </StrictMode>,
);
