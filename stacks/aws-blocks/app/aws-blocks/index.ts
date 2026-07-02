/**
 * Backend — aws-blocks/index.ts
 *
 * Real-time todo app with per-user isolation, optimistic locking, secondary
 * indexes, a queued activity feed (AsyncJob), and persisted user settings
 * (KVStore).
 *
 * This file defines your API, auth, data model, and real-time channels.
 * The frontend imports these exports directly via `import { ... } from 'aws-blocks'`.
 *
 * ─── IMPORTANT ───────────────────────────────────────────────────────────────
 * Do NOT use local files, in-memory arrays, or local databases for persistence.
 * Use Building Blocks for cloud persistence and other common cloud abstractions.
 * They work locally with automatic mocks and deploy to AWS with zero configuration.
 *
 * For the full list of blocks and how to use them, see:
 *   node_modules/@aws-blocks/blocks/README.md
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { ApiNamespace, Scope, AuthBasic, DistributedTable, Realtime, AsyncJob, KVStore } from '@aws-blocks/blocks';
import { z } from 'zod';

type ActivityAction = 'created' | 'toggled' | 'reprioritized' | 'deleted';

interface ActivityEntry {
  id: string;
  userId: string;
  action: ActivityAction;
  todoId: string;
  title: string;
  at: number;
}

interface UserSettings {
  /** Sort applied to the todo list on load. `null` = creation order (the default). */
  defaultSort: 'priority' | 'title' | null;
  theme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: UserSettings = { defaultSort: null, theme: 'light' };

const scope = new Scope('my-app');

// ─── Auth ────────────────────────────────────────────────────────────────────
const auth = new AuthBasic(scope, 'auth', {
  passwordPolicy: { minLength: 8 },
  crossDomain: process.env.BLOCKS_SANDBOX === 'true',
});
export const authApi = auth.createApi();

// ─── Data ────────────────────────────────────────────────────────────────────
// Zod schema = runtime validation + TypeScript types + DynamoDB table shape.
const todoSchema = z.object({
  userId: z.string(),       // partition key — per-user isolation
  todoId: z.string(),       // sort key — unique within a user
  title: z.string(),
  completed: z.boolean(),
  priority: z.number(),     // 1=high, 2=medium, 3=low
  version: z.number(),      // optimistic locking — incremented on each update
  createdAt: z.number(),
});

const todos = new DistributedTable(scope, 'todos', {
  schema: todoSchema,
  key: { partitionKey: 'userId', sortKey: 'todoId' },
  indexes: {
    // Secondary indexes: query todos sorted by priority or title.
    // The partition key is always userId (per-user isolation), the sort key varies.
    byPriority: { partitionKey: 'userId', sortKey: 'priority' },
    byTitle: { partitionKey: 'userId', sortKey: 'title' },
  },
});

// ─── Settings ────────────────────────────────────────────────────────────────
// Simple per-user config, keyed by userId — the classic KVStore use case
// (caches, session stores, feature flags, config values). No schema needed:
// KVStore validates only when one is passed, so `T` here comes purely from
// the generic parameter.
const settings = new KVStore<UserSettings>(scope, 'settings', {});

// ─── Realtime ────────────────────────────────────────────────────────────────
const rt = new Realtime(scope, 'live', {
  namespaces: {
    todos: Realtime.namespace(z.object({
      action: z.enum(['created', 'updated', 'deleted']),
      todoId: z.string(),
    })),
    activity: Realtime.namespace(z.object({
      id: z.string(),
      userId: z.string(),
      action: z.enum(['created', 'toggled', 'reprioritized', 'deleted']),
      todoId: z.string(),
      title: z.string(),
      at: z.number(),
    })),
  },
});

// ─── Queuing ─────────────────────────────────────────────────────────────────
// Every todo mutation submits a job here instead of writing the activity
// entry inline — offloads it from the request path. AsyncJob's handler runs
// asynchronously (via setTimeout locally, SQS + Lambda on AWS), so the entry
// shows up in the activity feed a moment after the mutation completes.
const activity = new KVStore<ActivityEntry>(scope, 'activity', {});

const activityJob = new AsyncJob<{ userId: string; action: ActivityAction; todoId: string; title: string }>(
  scope,
  'activity-log',
  {
    handler: async (payload) => {
      const entry: ActivityEntry = {
        id: `${payload.userId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        userId: payload.userId,
        action: payload.action,
        todoId: payload.todoId,
        title: payload.title,
        at: Date.now(),
      };
      await activity.put(entry.id, entry);
      await rt.publish('activity', payload.userId, entry);
    },
  },
);

// ─── API ─────────────────────────────────────────────────────────────────────
export const api = new ApiNamespace(scope, 'api', (context) => ({

  async subscribeTodos() {
    const user = await auth.requireAuth(context);
    return rt.getChannel('todos', user.username);
  },

  async subscribeActivity() {
    const user = await auth.requireAuth(context);
    return rt.getChannel('activity', user.username);
  },

  /** Most recent activity entries for the signed-in user, newest first. */
  async listActivity() {
    const user = await auth.requireAuth(context);
    const entries: ActivityEntry[] = [];
    for await (const { value } of activity.scan()) {
      if (value.userId === user.username) entries.push(value);
    }
    entries.sort((a, b) => b.at - a.at);
    return entries.slice(0, 20);
  },

  /** The signed-in user's settings, or defaults if none have been saved yet. */
  async getSettings() {
    const user = await auth.requireAuth(context);
    return (await settings.get(user.username)) ?? DEFAULT_SETTINGS;
  },

  /** Merge `patch` into the signed-in user's settings and persist the result. */
  async updateSettings(patch: Partial<UserSettings>) {
    const user = await auth.requireAuth(context);
    const current = (await settings.get(user.username)) ?? DEFAULT_SETTINGS;
    const next = { ...current, ...patch };
    await settings.put(user.username, next);
    return next;
  },

  async createTodo(title: string, priority: number = 2) {
    const user = await auth.requireAuth(context);
    const todoId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const todo = {
      userId: user.username,
      todoId,
      title,
      completed: false,
      priority,
      version: 1,
      createdAt: Date.now(),
    };
    await todos.put(todo);
    await rt.publish('todos', user.username, { action: 'created' as const, todoId });
    await activityJob.submit({ userId: user.username, action: 'created', todoId, title });
    return todo;
  },

  /** List todos, optionally sorted by a secondary index. */
  async listTodos(sortBy?: 'priority' | 'title') {
    const user = await auth.requireAuth(context);
    if (sortBy) {
      const index = sortBy === 'priority' ? 'byPriority' : 'byTitle';
      return await Array.fromAsync(
        todos.query({ index, where: { userId: { equals: user.username } } })
      );
    }
    // Default: sorted by todoId (creation order)
    return await Array.fromAsync(
      todos.query({ where: { userId: { equals: user.username } } })
    );
  },

  /**
   * Toggle todo completion with optimistic locking.
   * Uses `ifFieldEquals` to detect concurrent writes. On conflict,
   * throws ConditionalCheckFailedException — caller should re-read and retry.
   */
  async toggleTodo(todoId: string) {
    const user = await auth.requireAuth(context);
    const todo = await todos.get({ userId: user.username, todoId });
    if (!todo) throw new Error('Todo not found');
    await todos.put(
      { ...todo, completed: !todo.completed, version: todo.version + 1 },
      { ifFieldEquals: { version: todo.version } },
    );
    await rt.publish('todos', user.username, { action: 'updated' as const, todoId });
    await activityJob.submit({ userId: user.username, action: 'toggled', todoId, title: todo.title });
    return { success: true };
  },

  /** Update a todo's priority with optimistic locking. */
  async updatePriority(todoId: string, priority: number) {
    const user = await auth.requireAuth(context);
    const todo = await todos.get({ userId: user.username, todoId });
    if (!todo) throw new Error('Todo not found');
    await todos.put(
      { ...todo, priority, version: todo.version + 1 },
      { ifFieldEquals: { version: todo.version } },
    );
    await rt.publish('todos', user.username, { action: 'updated' as const, todoId });
    await activityJob.submit({ userId: user.username, action: 'reprioritized', todoId, title: todo.title });
    return { success: true };
  },

  /** Delete a todo. Broadcasts 'deleted' to all connected clients. */
  async deleteTodo(todoId: string) {
    const user = await auth.requireAuth(context);
    const todo = await todos.get({ userId: user.username, todoId });
    await todos.delete({ userId: user.username, todoId });
    await rt.publish('todos', user.username, { action: 'deleted' as const, todoId });
    await activityJob.submit({ userId: user.username, action: 'deleted', todoId, title: todo?.title ?? todoId });
    return { success: true };
  },
}));
