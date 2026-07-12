import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import mysql from "mysql2/promise";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, "schema.sql");

export const TABLES = new Set([
  "app_users", "user_roles", "profiles", "booking_requests", "clients", "jobs",
  "perks_members", "feedback", "perks_offers", "employees", "employee_performance",
  "applicants", "lifecycle_events", "supply_items", "supply_usage_logs", "job_postings",
  "invoices", "estimates", "payslips", "expenses", "employee_availability",
  "time_off_requests", "job_attachments", "loyalty_programs", "loyalty_milestones",
  "team_messages", "supply_requests", "shift_trade_requests", "notifications",
  "service_templates", "leads", "time_logs", "perk_catalog", "member_perks",
  "email_send_log", "email_send_state", "suppressed_emails", "email_unsubscribe_tokens",
]);

const JSON_COLUMNS = new Set([
  "user_metadata", "preferences", "checklist_state", "certifications", "onboarding_checklist",
  "available_days", "items", "deductions", "additions", "benefits", "metadata", "chat_transcript", "checklist_items",
]);

const JSON_COLUMN_BY_TABLE = {
  app_users: ["user_metadata"],
  clients: ["preferences"],
  jobs: ["checklist_state"],
  service_templates: ["checklist_items"],
  employees: ["certifications", "onboarding_checklist"],
  applicants: ["available_days"],
  invoices: ["items"],
  estimates: ["items"],
  payslips: ["deductions", "additions"],
  loyalty_programs: ["benefits"],
  notifications: ["metadata"],
  leads: ["chat_transcript"],
};

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function parseJson(value) {
  if (typeof value !== "string" || !value) return value;
  try { return JSON.parse(value); } catch { return value; }
}

function hydrateRow(table, row) {
  if (!row) return row;
  const jsonColumns = JSON_COLUMN_BY_TABLE[table] || [];
  const result = { ...row };
  for (const column of jsonColumns) {
    if (result[column] !== null && result[column] !== undefined) result[column] = parseJson(result[column]);
  }
  return result;
}

function prepareValue(column, value) {
  if (value === undefined) return null;
  if (JSON_COLUMNS.has(column) && value !== null && typeof value !== "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

export class Database {
  constructor() {
    this.driver = (process.env.DB_DRIVER || "sqlite").toLowerCase();
    this.sqlite = null;
    this.pool = null;
    this.columns = new Map();
    this.file = path.resolve(process.env.DB_FILE || path.join(here, "..", "data", "olive.sqlite"));
  }

  async init() {
    const schema = fs.readFileSync(schemaPath, "utf8");
    if (this.driver === "mysql" || this.driver === "mariadb") {
      this.driver = "mysql";
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        charset: "utf8mb4",
      });
      for (const statement of splitStatements(schema)) await this.pool.query(statement);
    } else {
      this.driver = "sqlite";
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      this.sqlite = new DatabaseSync(this.file);
      for (const statement of splitStatements(schema)) this.sqlite.exec(statement);
    }
    await this.loadColumns();
  }

  async close() {
    if (this.pool) await this.pool.end();
    if (this.sqlite) this.sqlite.close();
  }

  async loadColumns() {
    for (const table of TABLES) {
      if (this.driver === "mysql") {
        const [rows] = await this.pool.query(`SHOW COLUMNS FROM \`${table}\``);
        this.columns.set(table, new Set(rows.map((row) => row.Field)));
      } else {
        const rows = this.sqlite.prepare(`PRAGMA table_info(\`${table}\`)`).all();
        this.columns.set(table, new Set(rows.map((row) => row.name)));
      }
    }
  }

  assertTable(table) {
    if (!TABLES.has(table)) throw new Error(`Unknown table: ${table}`);
  }

  async all(sql, params = []) {
    if (this.driver === "mysql") {
      const [rows] = await this.pool.query(sql, params);
      return rows;
    }
    return this.sqlite.prepare(sql).all(...params);
  }

  async run(sql, params = []) {
    let result;
    if (this.driver === "mysql") {
      const [response] = await this.pool.query(sql, params);
      result = response;
    } else {
      result = this.sqlite.prepare(sql).run(...params);
      this.sqlite.exec("PRAGMA wal_checkpoint(PASSIVE)");
    }
    return result;
  }

  async rows(table) {
    this.assertTable(table);
    const rows = await this.all(`SELECT * FROM \`${table}\``);
    return rows.map((row) => hydrateRow(table, row));
  }

  async insert(table, payload) {
    this.assertTable(table);
    const columns = this.columns.get(table) || new Set();
    const entries = Object.entries(payload).filter(([key, value]) => columns.has(key) && value !== undefined);
    if (!entries.length) throw new Error(`No valid values supplied for ${table}`);
    const names = entries.map(([key]) => `\`${key}\``).join(", ");
    const placeholders = entries.map(() => "?").join(", ");
    const values = entries.map(([key, value]) => prepareValue(key, value));
    await this.run(`INSERT INTO \`${table}\` (${names}) VALUES (${placeholders})`, values);
    const id = payload.id;
    if (id) return hydrateRow(table, (await this.rows(table)).find((row) => row.id === id));
    return null;
  }

  async update(table, values, predicate) {
    this.assertTable(table);
    const columns = this.columns.get(table) || new Set();
    const entries = Object.entries(values).filter(([key, value]) => columns.has(key) && value !== undefined);
    if (!entries.length) return 0;
    const rows = (await this.rows(table)).filter(predicate);
    if (!rows.length) return 0;
    const assignments = entries.map(([key]) => `\`${key}\` = ?`).join(", ");
    const params = entries.map(([key, value]) => prepareValue(key, value));
    for (const row of rows) {
      await this.run(`UPDATE \`${table}\` SET ${assignments} WHERE id = ?`, [...params, row.id]);
    }
    return rows.length;
  }

  async remove(table, predicate) {
    this.assertTable(table);
    const rows = (await this.rows(table)).filter(predicate);
    for (const row of rows) await this.run(`DELETE FROM \`${table}\` WHERE id = ?`, [row.id]);
    return rows.length;
  }
}
