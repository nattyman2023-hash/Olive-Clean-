import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import multer from "multer";
import { Database, TABLES } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadDotEnv(path.join(root, ".env"));
const dist = path.join(root, "dist");
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(root, "uploads"));
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "olive-local-development-secret-change-me";
const scrypt = promisify(crypto.scrypt);
const db = new Database();

const PUBLIC_INSERTS = new Set(["booking_requests", "applicants", "leads", "feedback", "job_attachments"]);
const JSON_COLUMNS = new Set([
  "user_metadata", "preferences", "checklist_state", "certifications", "onboarding_checklist",
  "available_days", "items", "deductions", "additions", "benefits", "metadata", "chat_transcript", "checklist_items",
]);

const RELATIONS = {
  jobs: { clients: { table: "clients", local: "client_id", foreign: "id" } },
  perks_members: { clients: { table: "clients", local: "client_id", foreign: "id" } },
  invoices: { clients: { table: "clients", local: "client_id", foreign: "id" } },
  estimates: { clients: { table: "clients", local: "client_id", foreign: "id" } },
  payslips: { employees: { table: "employees", local: "employee_id", foreign: "id" } },
  expenses: { employees: { table: "employees", local: "employee_id", foreign: "id" } },
  time_off_requests: { employees: { table: "employees", local: "employee_id", foreign: "id" } },
  supply_usage_logs: {
    supply_items: { table: "supply_items", local: "supply_item_id", foreign: "id" },
    employees: { table: "employees", local: "employee_id", foreign: "id" },
    jobs: { table: "jobs", local: "job_id", foreign: "id" },
  },
  supply_requests: { supply_items: { table: "supply_items", local: "supply_item_id", foreign: "id" } },
  applicants: { job_postings: { table: "job_postings", local: "job_posting_id", foreign: "id" } },
  loyalty_milestones: { perks_members: { table: "perks_members", local: "member_id", foreign: "id" } },
  member_perks: { perk_catalog: { table: "perk_catalog", local: "perk_catalog_id", foreign: "id" } },
  time_logs: {
    employees: { table: "employees", local: "employee_id", foreign: "id" },
    jobs: { table: "jobs", local: "job_id", foreign: "id" },
  },
  shift_trade_requests: { employees: { table: "employees", local: "requester_id", foreign: "id" } },
};

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function jsonResponse(res, data = null, error = null, status = error ? 400 : 200) {
  return res.status(status).json({ data, error });
}

function errorPayload(error) {
  return { message: error?.message || "Request failed", code: error?.code || "APP_ERROR" };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const [, salt, expected] = stored.split("$");
  const actual = Buffer.from(await scrypt(String(password), salt, 64)).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function publicUser(row, roles = []) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    user_metadata: typeof row.user_metadata === "object" ? row.user_metadata : (row.user_metadata ? JSON.parse(row.user_metadata) : {}),
    app_metadata: { roles },
    aud: "authenticated",
    role: "authenticated",
  };
}

async function authFromRequest(req) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const claims = jwt.verify(token, jwtSecret);
    const users = await db.rows("app_users");
    const row = users.find((user) => user.id === claims.sub);
    if (!row) return null;
    const roles = (await db.rows("user_roles"))
      .filter((role) => role.user_id === row.id)
      .map((role) => role.role);
    return { row, user: publicUser(row, roles), roles };
  } catch {
    return null;
  }
}

function sessionFor(auth) {
  if (!auth) return null;
  const access_token = jwt.sign({ sub: auth.row.id, email: auth.row.email }, jwtSecret, { expiresIn: "7d" });
  return { access_token, refresh_token: access_token, token_type: "bearer", expires_in: 604800, user: auth.user };
}

function splitTopLevel(value) {
  const result = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === "(") depth += 1;
    if (value[i] === ")") depth -= 1;
    if (value[i] === "," && depth === 0) {
      result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (value.slice(start).trim()) result.push(value.slice(start).trim());
  return result;
}

function parseSelection(selection = "*") {
  const result = { wildcard: false, fields: [], relations: [] };
  for (const token of splitTopLevel(String(selection).replace(/\s+/g, " ").trim())) {
    if (token === "*") {
      result.wildcard = true;
      continue;
    }
    const open = token.indexOf("(");
    if (open > 0 && token.endsWith(")")) {
      const rawName = token.slice(0, open).trim();
      result.relations.push({
        name: rawName.split("!")[0].trim(),
        inner: rawName.includes("!inner"),
        selection: parseSelection(token.slice(open + 1, -1)),
      });
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) result.fields.push(token);
  }
  return result;
}

function scalar(value) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === undefined) return value;
  return String(value);
}

function equals(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  if (typeof a === "number" || typeof b === "number" || typeof a === "boolean" || typeof b === "boolean") return Number(a) === Number(b);
  const ad = Date.parse(String(a));
  const bd = Date.parse(String(b));
  if (!Number.isNaN(ad) && !Number.isNaN(bd) && (String(a).includes("-") || String(b).includes("-"))) return ad === bd;
  return String(a) === String(b);
}

function compare(a, b) {
  const ad = Date.parse(String(a));
  const bd = Date.parse(String(b));
  if (!Number.isNaN(ad) && !Number.isNaN(bd)) return ad - bd;
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function matchesValue(actual, operator, value) {
  if (operator === "is") return value === null ? actual === null || actual === undefined : value === true ? Boolean(actual) : !actual;
  if (operator === "eq") return value === true || value === false ? Boolean(actual) === value : equals(actual, value);
  if (operator === "neq") return !matchesValue(actual, "eq", value);
  if (operator === "in") return Array.isArray(value) && value.some((candidate) => equals(actual, candidate));
  if (operator === "ilike" || operator === "like") {
    const pattern = String(value).replace(/%/g, "").toLowerCase();
    return String(actual ?? "").toLowerCase().includes(pattern);
  }
  if (operator === "gt") return compare(actual, value) > 0;
  if (operator === "gte") return compare(actual, value) >= 0;
  if (operator === "lt") return compare(actual, value) < 0;
  if (operator === "lte") return compare(actual, value) <= 0;
  return false;
}

function matchesCondition(row, condition) {
  const [field, operator, ...rest] = String(condition).split(".");
  const value = rest.join(".");
  const actual = row[field];
  return matchesValue(actual, operator, value === "null" ? null : value === "true" ? true : value === "false" ? false : value);
}

function matchesFilter(row, filter) {
  return matchesValue(row[filter.column], filter.operator, filter.value);
}

function matchesOr(row, expression) {
  if (!expression) return true;
  const normalized = expression.replace(/^or\(/, "").replace(/\)$/, "");
  return splitTopLevel(normalized).some((part) => {
    if (part.startsWith("and(") && part.endsWith(")")) {
      return splitTopLevel(part.slice(4, -1)).every((condition) => matchesCondition(row, condition));
    }
    return matchesCondition(row, part);
  });
}

function matchesFilters(row, filters = [], or) {
  if (!filters.every((filter) => matchesFilter(row, filter))) return false;
  if (or && !matchesOr(row, or)) return false;
  return true;
}

function defaultRow(table, payload) {
  const row = { ...payload };
  if (TABLES.has(table) && !row.id && table !== "email_send_state") row.id = crypto.randomUUID();
  if ("created_at" in row === false && !["app_users"].includes(table)) row.created_at = nowSql();
  if (table === "app_users" && !row.created_at) row.created_at = nowSql();
  if (table === "app_users" && !row.updated_at) row.updated_at = nowSql();
  for (const key of Object.keys(row)) {
    if (JSON_COLUMNS.has(key) && row[key] !== null && typeof row[key] !== "string") row[key] = JSON.stringify(row[key]);
  }
  return row;
}

async function securityContext(auth) {
  if (!auth || auth.roles.includes("admin") || auth.roles.includes("staff")) return {};
  const clients = (await db.rows("clients")).filter((row) => row.client_user_id === auth.row.id);
  const clientIds = new Set(clients.map((row) => row.id));
  const jobs = (await db.rows("jobs")).filter((row) => clientIds.has(row.client_id));
  const jobIds = new Set(jobs.map((row) => row.id));
  const members = (await db.rows("perks_members")).filter((row) => clientIds.has(row.client_id));
  return { clientIds, jobIds, memberIds: new Set(members.map((row) => row.id)) };
}

function applySecurity(table, rows, auth, context) {
  if (auth?.roles.includes("admin") || auth?.roles.includes("staff")) return rows;
  if (auth?.roles.includes("client")) {
    const { clientIds = new Set(), jobIds = new Set(), memberIds = new Set() } = context;
    const map = {
      clients: (row) => clientIds.has(row.id),
      jobs: (row) => jobIds.has(row.id),
      feedback: (row) => clientIds.has(row.client_id),
      invoices: (row) => clientIds.has(row.client_id),
      estimates: (row) => clientIds.has(row.client_id),
      perks_members: (row) => memberIds.has(row.id),
      loyalty_milestones: (row) => memberIds.has(row.member_id),
      member_perks: (row) => memberIds.has(row.perks_member_id),
      job_attachments: (row) => jobIds.has(row.job_id),
      loyalty_programs: (row) => Boolean(row.is_active),
      service_templates: (row) => Boolean(row.show_on_portal) && Boolean(row.is_active),
      employees: (row) => row.status === "active",
    };
    return map[table] ? rows.filter(map[table]) : [];
  }
  return rows;
}

function publicRows(table, rows, filters = []) {
  const has = (column) => filters.some((filter) => filter.column === column);
  if (table === "job_postings") return rows.filter((row) => row.status === "open");
  if (table === "service_templates") return rows.filter((row) => Boolean(row.show_on_portal) && Boolean(row.is_active));
  if (table === "employees") return rows.filter((row) => row.status === "active");
  if (table === "feedback") return rows;
  if (table === "clients" && has("email")) return rows;
  if (table === "jobs" && has("id")) return rows;
  return [];
}

function canSelect(table, auth, filters) {
  if (auth?.roles.includes("admin") || auth?.roles.includes("staff") || auth?.roles.includes("client")) return true;
  return ["job_postings", "service_templates", "employees", "feedback"].includes(table)
    || (table === "clients" && filters.some((filter) => filter.column === "email"))
    || (table === "jobs" && filters.some((filter) => filter.column === "id"));
}

function canWrite(table, auth, operation, payload = {}) {
  if (!auth) return operation === "insert" && PUBLIC_INSERTS.has(table);
  if (auth.roles.includes("admin") || auth.roles.includes("staff")) return true;
  if (operation === "insert" && table === "user_roles") return payload.user_id === auth.row.id && payload.role === "client";
  if (operation === "update" && table === "clients" && payload.client_user_id === auth.row.id) return true;
  return auth.roles.includes("client") && ["clients", "jobs", "feedback", "loyalty_milestones"].includes(table);
}

async function selectData(table, body, auth) {
  const context = await securityContext(auth);
  let rows = await db.rows(table);
  const isPublic = !auth;
  if (isPublic) rows = publicRows(table, rows, body.filters || []);
  rows = applySecurity(table, rows, auth, context).filter((row) => matchesFilters(row, body.filters || [], body.or));
  if (body.order?.length) {
    for (const order of [...body.order].reverse()) {
      rows.sort((a, b) => order.ascending === false ? compare(b[order.column], a[order.column]) : compare(a[order.column], b[order.column]));
    }
  }
  if (Number.isInteger(body.offset)) rows = rows.slice(body.offset);
  if (Number.isInteger(body.limit)) rows = rows.slice(0, body.limit);
  const selection = parseSelection(body.select || "*");
  const cache = new Map([[table, await db.rows(table)]]);
  const primeRelations = async (currentTable) => {
    for (const mapping of Object.values(RELATIONS[currentTable] || {})) {
      if (!cache.has(mapping.table)) {
        cache.set(mapping.table, await db.rows(mapping.table));
        await primeRelations(mapping.table);
      }
    }
  };
  await primeRelations(table);
  const shape = (currentTable, row, requested) => {
    const result = requested.wildcard ? { ...row } : Object.fromEntries(requested.fields.filter((field) => field in row).map((field) => [field, row[field]]));
    for (const relation of requested.relations) {
      const mapping = RELATIONS[currentTable]?.[relation.name];
      if (!mapping) {
        result[relation.name] = null;
        continue;
      }
      const relatedRows = cache.get(mapping.table);
      const related = relatedRows.find((candidate) => equals(candidate[mapping.foreign], row[mapping.local]));
      result[relation.name] = related ? shape(mapping.table, related, relation.selection) : null;
    }
    return result;
  };
  const shaped = rows.map((row) => shape(table, row, selection));
  return shaped.filter((row, index) => selection.relations.every((relation) => !relation.inner || row[relation.name] !== null));
}

async function findAuthByEmail(email) {
  const users = await db.rows("app_users");
  const row = users.find((user) => String(user.email).toLowerCase() === String(email).toLowerCase());
  if (!row) return null;
  const roles = (await db.rows("user_roles")).filter((role) => role.user_id === row.id).map((role) => role.role);
  return { row, user: publicUser(row, roles), roles };
}

async function addUser({ email, password, displayName, metadata = {} }) {
  const existing = await findAuthByEmail(email);
  if (existing) throw Object.assign(new Error("A user with this email already exists."), { code: "USER_EXISTS" });
  const row = defaultRow("app_users", { id: crypto.randomUUID(), email: email.toLowerCase(), password_hash: await hashPassword(password), display_name: displayName || email, user_metadata: metadata, is_confirmed: 1 });
  await db.insert("app_users", row);
  await db.insert("profiles", defaultRow("profiles", { id: crypto.randomUUID(), user_id: row.id, display_name: row.display_name }));
  return findAuthByEmail(row.email);
}

async function seedDefaults() {
  const serviceTemplates = await db.rows("service_templates");
  if (!serviceTemplates.length) {
    const defaults = [
      ["Essential Clean", "Quick refresh — kitchens, baths, floors, and surfaces.", 90, 120, ["Clean kitchen surfaces", "Clean bathrooms", "Vacuum/mop floors", "Wipe surfaces"]],
      ["General Clean", "Full home clean including dusting, mopping, and appliances.", 120, 180, ["Dust all surfaces", "Mop all floors", "Clean appliances", "Clean bathrooms", "Vacuum carpets"]],
      ["Signature Deep Clean", "Baseboards, fixtures, cabinet fronts, interior windows, and more.", 180, 280, ["Dust baseboards", "Clean fixtures", "Wipe cabinet fronts", "Clean interior windows", "Deep clean bathrooms", "Deep clean kitchen"]],
      ["Makeover Deep Clean", "Move-in/move-out level — inside ovens, fridges, closets, walls.", 240, 380, ["Clean inside oven", "Clean inside fridge", "Clean closets", "Wash walls", "Deep clean all rooms", "Clean interior windows"]],
    ];
    for (const [name, description, duration, price, checklist] of defaults) {
      await db.insert("service_templates", defaultRow("service_templates", { id: crypto.randomUUID(), name, description, show_on_portal: 1, checklist_items: checklist, default_duration_minutes: duration, default_price: price, is_active: 1 }));
    }
  }
  if (!(await db.rows("loyalty_programs")).length) {
    const programs = [
      ["Loyalty Club", 40, "Our signature perks club with extreme discounts and milestone rewards.", { free_cleaning_interval: 10, referral_reward: true, six_month_dusting: true }],
      ["Friends & Family", 25, "Special program for friends and family of our team.", { free_cleaning_interval: 15, referral_reward: true, six_month_dusting: false }],
      ["Veterans", 30, "Honoring those who served with special cleaning discounts.", { free_cleaning_interval: 12, referral_reward: true, six_month_dusting: true }],
      ["Retired", 20, "Special rates for retired clients who deserve extra care.", { free_cleaning_interval: 15, referral_reward: false, six_month_dusting: true }],
    ];
    for (const [name, discount, description, benefits] of programs) await db.insert("loyalty_programs", defaultRow("loyalty_programs", { id: crypto.randomUUID(), name, discount_percent: discount, description, benefits, is_active: 1 }));
  }
  if (process.env.DB_DRIVER === "mysql" || process.env.SEED_DEMO_USER === "false") return;
  if (!(await db.rows("app_users")).length) {
    const email = process.env.DEMO_ADMIN_EMAIL || "admin@olive.local";
    const password = process.env.DEMO_ADMIN_PASSWORD || "ChangeMe123!";
    const auth = await addUser({ email, password, displayName: "Olive Admin" });
    await db.insert("user_roles", defaultRow("user_roles", { id: crypto.randomUUID(), user_id: auth.row.id, role: "admin" }));
  }
}

const app = express();
const upload = multer({ dest: path.join(uploadRoot, ".tmp") });
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadRoot));

app.get("/api/health", (_req, res) => res.json({ ok: true, driver: db.driver }));

app.post("/api/auth/session", async (req, res) => {
  const auth = await authFromRequest(req);
  return jsonResponse(res, { session: sessionFor(auth), user: auth?.user || null });
});

app.post("/api/auth/sign-in", async (req, res) => {
  try {
    const auth = await findAuthByEmail(req.body.email || "");
    if (!auth || !(await verifyPassword(req.body.password || "", auth.row.password_hash))) return jsonResponse(res, null, { message: "Invalid login credentials", code: "INVALID_CREDENTIALS" }, 401);
    return jsonResponse(res, { session: sessionFor(auth), user: auth.user });
  } catch (error) { return jsonResponse(res, null, errorPayload(error), 400); }
});

app.post("/api/auth/sign-up", async (req, res) => {
  try {
    const auth = await addUser({ email: req.body.email, password: req.body.password, displayName: req.body.options?.data?.display_name, metadata: req.body.options?.data || {} });
    return jsonResponse(res, { session: sessionFor(auth), user: auth.user });
  } catch (error) { return jsonResponse(res, null, errorPayload(error), error.code === "USER_EXISTS" ? 409 : 400); }
});

app.post("/api/auth/update-user", async (req, res) => {
  try {
    const auth = await authFromRequest(req);
    if (!auth) return jsonResponse(res, null, { message: "Not authenticated", code: "UNAUTHORIZED" }, 401);
    const updates = {};
    if (req.body.password) updates.password_hash = await hashPassword(req.body.password);
    if (req.body.data) updates.user_metadata = req.body.data;
    updates.updated_at = nowSql();
    await db.update("app_users", updates, (row) => row.id === auth.row.id);
    const refreshed = await findAuthByEmail(auth.row.email);
    return jsonResponse(res, { user: refreshed.user, session: sessionFor(refreshed) });
  } catch (error) { return jsonResponse(res, null, errorPayload(error), 400); }
});

app.post("/api/auth/reset-password", (_req, res) => jsonResponse(res, { accepted: true }));
app.post("/api/auth/sign-out", (_req, res) => jsonResponse(res, null));

app.post("/api/db/:table", async (req, res) => {
  const table = req.params.table;
  if (!TABLES.has(table)) return jsonResponse(res, null, { message: "Unknown table", code: "UNKNOWN_TABLE" }, 404);
  const body = req.body || {};
  const operation = body.operation || "select";
  const auth = await authFromRequest(req);
  try {
    if (operation === "select") {
      if (!canSelect(table, auth, body.filters || [])) return jsonResponse(res, null, { message: "Not authorized", code: "UNAUTHORIZED" }, 401);
      const data = await selectData(table, body, auth);
      if (body.single || body.maybeSingle) {
        if (!data.length && body.maybeSingle) return jsonResponse(res, null);
        if (!data.length) return jsonResponse(res, null, { message: "Row not found", code: "PGRST116" }, 404);
        if (data.length > 1 && body.single) return jsonResponse(res, null, { message: "Multiple rows found", code: "PGRST116" }, 406);
        return jsonResponse(res, data[0]);
      }
      return jsonResponse(res, data);
    }
    const payload = Array.isArray(body.values) ? body.values : [body.values || {}];
    if (!canWrite(table, auth, operation, payload[0])) return jsonResponse(res, null, { message: "Not authorized", code: "UNAUTHORIZED" }, 401);
    const context = await securityContext(auth);
    const bootstrapClientLink = operation === "update" && table === "clients" && body.values?.client_user_id === auth?.row.id;
    const predicate = (row) => matchesFilters(row, body.filters || [], body.or)
      && (bootstrapClientLink || applySecurity(table, [row], auth, context).length === 1);
    if (operation === "insert") {
      const inserted = [];
      for (const value of payload) inserted.push(await db.insert(table, defaultRow(table, value)));
      if (!body.select) return jsonResponse(res, null);
      const requested = inserted.filter(Boolean);
      const selection = { ...body, operation: "select" };
      const data = [];
      for (const row of requested) {
        const selected = await selectData(table, { ...selection, filters: [{ column: "id", operator: "eq", value: row.id }] }, auth);
        data.push(...selected);
      }
      if (body.single || body.maybeSingle) return jsonResponse(res, data[0] || null);
      return jsonResponse(res, data);
    }
    if (operation === "update") {
      await db.update(table, body.values || {}, predicate);
    } else if (operation === "delete") {
      await db.remove(table, predicate);
    } else {
      return jsonResponse(res, null, { message: `Unsupported operation ${operation}`, code: "UNSUPPORTED" }, 400);
    }
    if (!body.select) return jsonResponse(res, null);
    const data = await selectData(table, { ...body, operation: "select" }, auth);
    if (body.single || body.maybeSingle) return jsonResponse(res, data[0] || null);
    return jsonResponse(res, data);
  } catch (error) {
    console.error(`DB ${operation} ${table}`, error);
    return jsonResponse(res, null, errorPayload(error), 400);
  }
});

app.post("/api/rpc/:name", async (req, res) => {
  try {
    const auth = await authFromRequest(req);
    if (req.params.name === "has_role") return jsonResponse(res, Boolean(auth?.roles.includes(req.body?._role) && auth.user.id === req.body?._user_id));
    return jsonResponse(res, null);
  } catch (error) { return jsonResponse(res, null, errorPayload(error), 400); }
});

app.post("/api/functions/:name", async (req, res) => {
  try {
    const auth = await authFromRequest(req);
    const body = req.body || {};
    if (["invite-client", "invite-employee", "set-user-password"].includes(req.params.name) && !auth?.roles.includes("admin")) return jsonResponse(res, null, { message: "Not authorized", code: "UNAUTHORIZED" }, 401);
    if (req.params.name === "get-maptiler-key") return jsonResponse(res, { key: process.env.MAPTILER_KEY || process.env.VITE_MAPTILER_KEY || "" });
    if (req.params.name === "chat-process") {
      const last = Array.isArray(body.messages) ? body.messages.at(-1)?.content || "" : "";
      if (body.lead_id) await db.update("leads", { chat_transcript: body.messages || [] }, (row) => row.id === body.lead_id);
      return jsonResponse(res, { reply: `Thanks for reaching out! We can help with that. Visit our booking page for a quote, or call us at (615) 555-0142.`, suggested_replies: last.toLowerCase().includes("service") ? ["Get a free quote", "Book an estimate"] : ["Get a free quote", "What services do you offer?"] });
    }
    if (req.params.name === "set-user-password") {
      if (!body.user_id || !body.password) throw new Error("user_id and password are required");
      await db.update("app_users", { password_hash: await hashPassword(body.password), updated_at: nowSql() }, (row) => row.id === body.user_id);
      return jsonResponse(res, { ok: true });
    }
    if (["invite-client", "invite-employee"].includes(req.params.name)) {
      const user = await findAuthByEmail(body.email);
      const authUser = user || await addUser({ email: body.email, password: crypto.randomBytes(12).toString("base64url"), displayName: body.name });
      const role = req.params.name === "invite-client" ? "client" : "staff";
      const hasRole = (await db.rows("user_roles")).some((row) => row.user_id === authUser.row.id && row.role === role);
      if (!hasRole) await db.insert("user_roles", defaultRow("user_roles", { id: crypto.randomUUID(), user_id: authUser.row.id, role }));
      if (body.client_id) await db.update("clients", { client_user_id: authUser.row.id }, (row) => row.id === body.client_id);
      if (body.employee_id) await db.update("employees", { user_id: authUser.row.id }, (row) => row.id === body.employee_id);
      return jsonResponse(res, { ok: true, user_id: authUser.row.id });
    }
    if (req.params.name === "handle-email-unsubscribe") return jsonResponse(res, { ok: true });
    if (req.params.name === "send-transactional-email") {
      const recipient = body.recipientEmail || body.recipient_email || "unknown";
      await db.insert("email_send_log", defaultRow("email_send_log", { id: crypto.randomUUID(), template_name: body.templateName || "unknown", recipient_email: recipient, status: "pending", metadata: body.templateData || {} }));
      return jsonResponse(res, { ok: true, queued: true });
    }
    return jsonResponse(res, { ok: true });
  } catch (error) { return jsonResponse(res, null, errorPayload(error), 400); }
});

app.post("/api/storage/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return jsonResponse(res, null, { message: "No file supplied", code: "NO_FILE" }, 400);
    const bucket = String(req.body.bucket || "misc").replace(/[^a-zA-Z0-9_-]/g, "");
    const requestedPath = String(req.body.path || req.file.originalname).replace(/^[/\\]+/, "").replace(/\.\./g, "");
    const target = path.join(uploadRoot, bucket, requestedPath);
    if (!target.startsWith(path.join(uploadRoot, bucket))) throw new Error("Invalid upload path");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(req.file.path, target);
    return jsonResponse(res, { path: requestedPath, fullPath: requestedPath });
  } catch (error) { return jsonResponse(res, null, errorPayload(error), 400); }
});

if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

await db.init();
await seedDefaults();
fs.mkdirSync(uploadRoot, { recursive: true });
app.listen(port, () => console.log(`Olive API listening on http://localhost:${port} (${db.driver})`));
