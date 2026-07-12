/*
 * One-time data migration helper.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DB_DRIVER=mysql \
 *   DB_HOST=... DB_NAME=... DB_USER=... DB_PASSWORD=... node scripts/migrate-supabase.mjs
 *
 * The service-role key is read from the environment only and is never written
 * to the repository. Supabase users are copied with their IDs and metadata,
 * but passwords are deliberately reset because the admin API does not expose
 * password hashes. Send password-reset links after the import.
 */
import crypto from "node:crypto";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { Database, TABLES } from "../server/db.js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const db = new Database();
const scrypt = promisify(crypto.scrypt);

const publicTables = [...TABLES].filter((table) => !["app_users", "email_send_state"].includes(table));
const importOrder = [
  "profiles", "user_roles", "clients", "employees", "booking_requests", "job_postings", "jobs",
  ...publicTables.filter((table) => !["profiles", "user_roles", "clients", "employees", "booking_requests", "job_postings", "jobs"].includes(table)),
];

async function placeholderPassword() {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = Buffer.from(await scrypt(crypto.randomBytes(32).toString("hex"), salt, 64)).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

await db.init();
const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`auth.users: ${error.message}`);
  users.push(...(data.users || []));
  if (!data.users || data.users.length < 1000) break;
}

for (const user of users) {
  const password_hash = await placeholderPassword();
  await db.insert("app_users", {
    id: user.id,
    email: user.email || `${user.id}@invalid.local`,
    password_hash,
    display_name: user.user_metadata?.display_name || user.user_metadata?.name || user.email || user.id,
    user_metadata: user.user_metadata || {},
    created_at: user.created_at?.slice(0, 19).replace("T", " "),
    updated_at: user.updated_at?.slice(0, 19).replace("T", " "),
    is_confirmed: user.email_confirmed_at ? 1 : 0,
  });
}

for (const table of importOrder) {
  const rows = await fetchAll(table);
  for (const row of rows) await db.insert(table, row);
  console.log(`Imported ${rows.length} rows into ${table}`);
}

await db.close();
console.log(`Imported ${users.length} users. Password reset is required for all imported users.`);
