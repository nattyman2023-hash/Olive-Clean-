import type { Session, User } from "@supabase/supabase-js";

type ApiError = { message: string; code?: string };
type ApiResult<T> = { data: T; error: ApiError | null };
type Filter = { column: string; operator: string; value: unknown };

const API_BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "olive_access_token";

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
    const payload = await response.json().catch(() => ({ data: null, error: { message: response.statusText } }));
    if (!response.ok && !payload.error) payload.error = { message: response.statusText, code: String(response.status) };
    return payload as ApiResult<T>;
  } catch (error) {
    return { data: null as T, error: { message: error instanceof Error ? error.message : "Network request failed" } };
  }
}

function jsonBody(body: unknown) {
  return JSON.stringify(body);
}

class QueryBuilder<T = unknown> implements PromiseLike<ApiResult<T>> {
  private operation = "select";
  private selectText = "*";
  private values: unknown = null;
  private filters: Filter[] = [];
  private orExpression: string | undefined;
  private orderBy: { column: string; ascending: boolean }[] = [];
  private limitValue: number | undefined;
  private offsetValue: number | undefined;
  private singleValue = false;
  private maybeSingleValue = false;

  constructor(private readonly table: string) {}

  select(selection = "*", _options?: unknown) {
    this.selectText = selection;
    return this;
  }

  insert(values: unknown) {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  update(values: unknown) {
    this.operation = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  upsert(values: unknown) {
    this.operation = "insert";
    this.values = values;
    return this;
  }

  eq(column: string, value: unknown) { this.filters.push({ column, operator: "eq", value }); return this; }
  neq(column: string, value: unknown) { this.filters.push({ column, operator: "neq", value }); return this; }
  gt(column: string, value: unknown) { this.filters.push({ column, operator: "gt", value }); return this; }
  gte(column: string, value: unknown) { this.filters.push({ column, operator: "gte", value }); return this; }
  lt(column: string, value: unknown) { this.filters.push({ column, operator: "lt", value }); return this; }
  lte(column: string, value: unknown) { this.filters.push({ column, operator: "lte", value }); return this; }
  like(column: string, value: unknown) { this.filters.push({ column, operator: "like", value }); return this; }
  ilike(column: string, value: unknown) { this.filters.push({ column, operator: "ilike", value }); return this; }
  is(column: string, value: unknown) { this.filters.push({ column, operator: "is", value }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ column, operator: "in", value }); return this; }
  or(expression: string) { this.orExpression = expression; return this; }
  order(column: string, options: { ascending?: boolean } = {}) { this.orderBy.push({ column, ascending: options.ascending !== false }); return this; }
  limit(value: number) { this.limitValue = value; return this; }
  range(from: number, to: number) { this.offsetValue = from; this.limitValue = Math.max(0, to - from + 1); return this; }
  single() { this.singleValue = true; return this; }
  maybeSingle() { this.maybeSingleValue = true; return this; }

  async execute(): Promise<ApiResult<T>> {
    const payload = {
      operation: this.operation,
      select: this.selectText,
      values: this.values,
      filters: this.filters,
      or: this.orExpression,
      order: this.orderBy,
      limit: this.limitValue,
      offset: this.offsetValue,
      single: this.singleValue,
      maybeSingle: this.maybeSingleValue,
    };
    return request<T>(`/api/db/${encodeURIComponent(this.table)}`, { method: "POST", body: jsonBody(payload) });
  }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class AuthApi {
  private listeners = new Set<(event: string, session: Session | null) => void>();

  constructor(private readonly client: OliveClient) {}

  private save(session: Session | null) {
    if (session?.access_token) localStorage.setItem(TOKEN_KEY, session.access_token);
    else localStorage.removeItem(TOKEN_KEY);
    for (const listener of this.listeners) listener(session ? "SIGNED_IN" : "SIGNED_OUT", session);
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    this.listeners.add(callback);
    const tokenAtSubscribe = localStorage.getItem(TOKEN_KEY);
    void this.getSession().then(({ data }) => {
      // Do not let a slow initial-session request overwrite a login that
      // completed after the request started.
      if (localStorage.getItem(TOKEN_KEY) !== tokenAtSubscribe) return;
      callback("INITIAL_SESSION", data.session);
    });
    return { data: { subscription: { unsubscribe: () => this.listeners.delete(callback) } } };
  }

  async getSession(): Promise<ApiResult<{ session: Session | null }>> {
    const result = await request<{ session: Session | null }>("/api/auth/session", { method: "POST", body: "{}" });
    if (result.error) return { data: { session: null }, error: result.error };
    return result;
  }

  async getUser(): Promise<ApiResult<{ user: User | null }>> {
    const result = await request<{ user: User | null }>("/api/auth/session", { method: "POST", body: "{}" });
    return { data: { user: result.data?.user || null }, error: result.error };
  }

  async signInWithPassword(credentials: { email: string; password: string }): Promise<ApiResult<{ user: User; session: Session }>> {
    const result = await request<{ user: User; session: Session }>("/api/auth/sign-in", { method: "POST", body: jsonBody(credentials) });
    if (!result.error) this.save(result.data.session);
    return result;
  }

  async signUp(options: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }): Promise<ApiResult<{ user: User; session: Session | null }>> {
    const result = await request<{ user: User; session: Session | null }>("/api/auth/sign-up", { method: "POST", body: jsonBody(options) });
    if (!result.error && result.data.session) this.save(result.data.session);
    return result;
  }

  async signOut() {
    const result = await request<null>("/api/auth/sign-out", { method: "POST", body: "{}" });
    this.save(null);
    return result;
  }

  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    return request<{ accepted: boolean }>("/api/auth/reset-password", { method: "POST", body: jsonBody({ email, ...options }) });
  }

  async updateUser(attributes: { password?: string; data?: Record<string, unknown> }) {
    const result = await request<{ user: User; session: Session }>("/api/auth/update-user", { method: "POST", body: jsonBody(attributes) });
    if (!result.error && result.data.session) this.save(result.data.session);
    return { data: result.data ? { user: result.data.user } : null, error: result.error };
  }
}

class StorageBucket {
  constructor(private readonly bucket: string) {}

  async upload(path: string, file: File) {
    const form = new FormData();
    form.append("bucket", this.bucket);
    form.append("path", path);
    form.append("file", file);
    return request<{ path: string }>("/api/storage/upload", { method: "POST", body: form });
  }

  getPublicUrl(path: string) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return { data: { publicUrl: `${window.location.origin}/uploads/${encodeURIComponent(this.bucket)}/${encodedPath}` } };
  }
}

class StorageApi {
  from(bucket: string) { return new StorageBucket(bucket); }
}

class FunctionsApi {
  invoke<T = unknown>(name: string, options: { body?: unknown } = {}) {
    return request<T>(`/api/functions/${encodeURIComponent(name)}`, { method: "POST", body: jsonBody(options.body || {}) });
  }
}

class OliveClient {
  readonly auth = new AuthApi(this);
  readonly storage = new StorageApi();
  readonly functions = new FunctionsApi();

  from<T = unknown>(table: string) { return new QueryBuilder<T>(table); }

  rpc<T = unknown>(name: string, args?: Record<string, unknown>) {
    return request<T>(`/api/rpc/${encodeURIComponent(name)}`, { method: "POST", body: jsonBody(args || {}) });
  }

  channel(_name: string) {
    const channel = {
      on: (_event: string, _filter: unknown, _callback: (payload: unknown) => void) => channel,
      subscribe: () => channel,
    };
    return channel;
  }

  removeChannel(_channel: unknown) { return this; }
}

export const supabase = new OliveClient();
