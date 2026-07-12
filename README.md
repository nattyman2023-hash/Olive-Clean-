# Olive Clean

This repository contains the Lovable-exported React site plus a portable API and SQL database layer. The browser app no longer needs Supabase at runtime: it talks to `/api`, and the API can run against local SQLite for development or Hostinger MariaDB/MySQL in production.

## Run locally

1. Copy `.env.example` to `.env` and keep the default SQLite settings.
2. Install dependencies with `npm install`.
3. Build the site with `npm run build`.
4. Start the local API and built site with `npm start`.
5. Open `http://localhost:4000`.

For frontend hot reload, run `npm run dev` in one terminal and `npm run dev:api` in another; Vite proxies `/api` and `/uploads` to port 4000.

The local database is created at `data/olive.sqlite` and is intentionally ignored by Git. A demo administrator is seeded locally:

- Email: `admin@olive.local`
- Password: `ChangeMe123!`

Change or remove those credentials before using a shared environment.

## Hostinger deployment

Use a Hostinger Business/Cloud Node.js Web App (or a VPS), connect the GitHub repository, set the build command to `npm run build`, and start the app with `npm start`. Configure the environment variables from `.env.example` with `DB_DRIVER=mysql` and the MariaDB credentials from hPanel. Import `server/schema.sql` into the Hostinger database before the first production start.

The SQL schema intentionally uses MariaDB-compatible types and stores the former Supabase JSON columns as text. Existing Supabase data still needs a one-time export/conversion; the current migration SQL is retained in `supabase/migrations` as the source of truth for field names and relationships. Supabase auth passwords and private storage files should be migrated separately, or users should be issued password-reset links.

## Important production follow-up

Transactional email is recorded in `email_send_log` locally. To send real messages on Hostinger, add SMTP delivery credentials and wire the email worker before launch. Realtime Supabase subscriptions are represented by normal API refreshes in this portable version; the core CRUD flows do not depend on Supabase realtime.
