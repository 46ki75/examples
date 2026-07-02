/**
 * Frontend — src/index.tsx
 *
 * Real-time todo app, rendered with React + ReactDOM.
 * Imports the typed backend API via `aws-blocks` (auto-generated proxy).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, authApi } from 'aws-blocks';
import type { AuthUser } from '@aws-blocks/blocks';
import { AccountMenuBar, onAuthChange } from '@aws-blocks/blocks/ui';

type Todo = { todoId: string; title: string; completed: boolean; priority: number };
type SortBy = 'priority' | 'title' | undefined;
type ActivityAction = 'created' | 'toggled' | 'reprioritized' | 'deleted';
type Activity = { id: string; action: ActivityAction; todoId: string; title: string; at: number };

const ACTIVITY_LABEL: Record<ActivityAction, string> = {
  created: 'created',
  toggled: 'toggled',
  reprioritized: 'reprioritized',
  deleted: 'deleted',
};

// ─── Auth ────────────────────────────────────────────────────────────────────
// AWS Blocks ships AccountMenuBar as a framework-agnostic widget that returns
// a plain HTMLElement — there's no React binding, so mount it via a ref.
function AccountMenuBarWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = AccountMenuBar(authApi);
    containerRef.current?.appendChild(el);
    return () => el.remove();
  }, []);

  return <div ref={containerRef} />;
}

function PrioritySelect({ value, onChange }: { value: number; onChange: (priority: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(parseInt(e.target.value))}>
      <option value={1}>🔴 High</option>
      <option value={2}>🟡 Medium</option>
      <option value={3}>🟢 Low</option>
    </select>
  );
}

// ─── App (shown when authenticated) ─────────────────────────────────────────
function TodoApp({ user }: { user: AuthUser }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sortBy, setSortByState] = useState<SortBy>(undefined);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState(2);

  const load = useCallback(async (sort: SortBy) => {
    setTodos(await api.listTodos(sort));
  }, []);

  // Load the user's persisted default sort (KVStore-backed settings) once,
  // so the preference follows them across sessions/devices instead of
  // resetting to "Default" on every reload.
  useEffect(() => {
    api.getSettings().then((s) => {
      if (s.defaultSort) setSortByState(s.defaultSort);
    });
  }, [user.userId]);

  // Persist the chosen sort as the user's new default, in addition to
  // updating local state.
  function setSortBy(sort: SortBy) {
    setSortByState(sort);
    api.updateSettings({ defaultSort: sort ?? null }).catch(() => {});
  }

  useEffect(() => {
    load(sortBy);
  }, [load, sortBy, user.userId]);

  // Keep a ref to the latest sort so the realtime handler below (subscribed
  // once per session) always reloads with the currently selected sort,
  // without tearing down and reopening the WebSocket on every sort click.
  const sortByRef = useRef(sortBy);
  useEffect(() => {
    sortByRef.current = sortBy;
  }, [sortBy]);

  // Realtime: reload when changes come in from other tabs/users.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const channel = await api.subscribeTodos();
        const sub = channel.subscribe(() => load(sortByRef.current));
        await sub.established;
        if (cancelled) {
          sub.unsubscribe();
        } else {
          unsubscribe = () => sub.unsubscribe();
        }
      } catch {
        /* realtime not available in local dev */
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [load, user.userId]);

  async function addTodo() {
    const title = newTitle.trim();
    if (!title) return;
    await api.createTodo(title, newPriority);
    setNewTitle('');
    await load(sortBy);
  }

  async function toggle(todoId: string) {
    try {
      await api.toggleTodo(todoId);
    } catch {
      /* conflict — just reload */
    }
    await load(sortBy);
  }

  async function setPriority(todoId: string, priority: number) {
    try {
      await api.updatePriority(todoId, priority);
    } catch {
      /* conflict */
    }
    await load(sortBy);
  }

  async function remove(todoId: string) {
    await api.deleteTodo(todoId);
    await load(sortBy);
  }

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <div>
      <h2>Todos</h2>
      <div style={{ marginBottom: 12, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="What needs to be done?"
          style={{ flex: 1, minWidth: 200 }}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTodo();
          }}
        />
        <PrioritySelect value={newPriority} onChange={setNewPriority} />
        <button onClick={addTodo}>Add</button>
      </div>
      <div style={{ marginBottom: 12, fontSize: '0.85em', color: '#666' }}>
        Sort:
        <button onClick={() => setSortBy(undefined)} style={{ fontWeight: !sortBy ? 'bold' : 'normal' }}>
          Default
        </button>
        <button onClick={() => setSortBy('priority')} style={{ fontWeight: sortBy === 'priority' ? 'bold' : 'normal' }}>
          Priority
        </button>
        <button onClick={() => setSortBy('title')} style={{ fontWeight: sortBy === 'title' ? 'bold' : 'normal' }}>
          Title
        </button>
      </div>
      <ul>
        {todos.map((t) => (
          <li
            key={t.todoId}
            style={{
              margin: '10px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              ...(t.completed ? { textDecoration: 'line-through', opacity: 0.5 } : {}),
            }}
          >
            <input type="checkbox" checked={t.completed} onChange={() => toggle(t.todoId)} />
            <span style={{ flex: 1 }}>{t.title}</span>
            <PrioritySelect value={t.priority} onChange={(priority) => setPriority(t.todoId, priority)} />
            <button onClick={() => remove(t.todoId)}>×</button>
          </li>
        ))}
      </ul>
      <p style={{ color: '#888', fontSize: '0.85em' }}>{remaining} remaining</p>
    </div>
  );
}

// ─── Activity feed (queued via AsyncJob) ────────────────────────────────────
function ActivityFeed({ user }: { user: AuthUser }) {
  const [entries, setEntries] = useState<Activity[]>([]);

  const load = useCallback(async () => {
    setEntries(await api.listActivity());
  }, []);

  useEffect(() => {
    load();
  }, [load, user.userId]);

  // Realtime: the backend publishes here from inside the AsyncJob handler,
  // not from the mutation that queued it — so an entry lands a moment after
  // the action, not synchronously with it.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const channel = await api.subscribeActivity();
        const sub = channel.subscribe(() => load());
        await sub.established;
        if (cancelled) {
          sub.unsubscribe();
        } else {
          unsubscribe = () => sub.unsubscribe();
        }
      } catch {
        /* realtime not available in local dev */
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [load, user.userId]);

  return (
    <div>
      <h2>Activity</h2>
      <p style={{ color: '#888', fontSize: '0.85em', marginTop: -8 }}>
        Queued via AsyncJob (SQS + Lambda on AWS) — entries appear shortly after the action that triggered them.
      </p>
      {entries.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.85em' }}>No activity yet.</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={e.id} style={{ fontSize: '0.85em', color: '#555', margin: '4px 0' }}>
              {new Date(e.at).toLocaleTimeString()} — {ACTIVITY_LABEL[e.action]} "{e.title}"
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Settings require auth, so theme only follows the stored preference once
  // signed in — the sign-in screen itself always renders in the light default.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => onAuthChange(authApi, setUser), []);

  useEffect(() => {
    if (!user) return;
    api.getSettings().then((s) => setTheme(s.theme));
  }, [user?.userId]);

  // Set on <body>, not a wrapper div, so the themed background covers the
  // whole viewport (index.html's body has its own margin/padding).
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  async function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    await api.updateSettings({ theme: next });
  }

  return (
    <>
      <AccountMenuBarWidget />
      {user != null && (
        <button onClick={toggleTheme} style={{ float: 'right' }}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      )}
      <h1>Blocks App</h1>
      <p className="intro">
        This starter app demonstrates: <strong>authentication</strong> with cross-tab coordination,{' '}
        <strong>real-time sync</strong> across browser tabs, <strong>todos stored in a distributed table</strong>{' '}
        with secondary index queries, a <strong>queued activity feed</strong> processed off the request path, and{' '}
        <strong>KVStore-backed settings</strong> (default sort, theme) that follow you across sessions.
      </p>
      {user == null ? (
        <p>Sign in to get started.</p>
      ) : (
        <>
          <TodoApp user={user} />
          <ActivityFeed user={user} />
        </>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
