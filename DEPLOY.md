# Deploying ECG Learn to Vercel

A single Next.js app. **Host:** Vercel. **Database:** Turso (libSQL — SQLite-
compatible, so the seeded local file imports directly and the same code runs in
production; only environment variables change).

This guide is click-by-click. Steps that need **your** accounts, secrets, or
payment are marked **⛔ needs your account** — I cannot and did not do these for you.

---

## What you'll need (all free tiers are enough)
- A **GitHub** account — https://github.com  **⛔ needs your account**
- A **Vercel** account — https://vercel.com (sign in with GitHub)  **⛔ needs your account**
- A **Turso** account + CLI — https://turso.tech  **⛔ needs your account**

Nothing below requires a paid plan or a domain purchase.

---

## Current state (already done for you)
- The app **builds cleanly** (`npm run build`) and is Vercel-ready.
- The question bank is **already generated locally**: `prisma/dev.db` (~79 MB,
  966 records / ~2,500 questions from PTB-XL + Chapman-Shaoxing/Ningbo).
- Auth (email + password), the private per-user bank, the education-only
  disclaimer, and the `/about` (About & Terms) page are all in place.

So you can skip straight to **Step 1** unless you changed the content.

<details>
<summary>Only if you need to (re)build the bank from scratch</summary>

```bash
cd ecg-learn
npm install
npm run db:push          # create schema in prisma/dev.db
npm run fetch:chapman    # download the licensed Chapman subset from PhysioNet
npm run ingest           # generate the bank (needs the PTB-XL zip in ../Claude/)
```
</details>

---

## Step 1 — Create the Turso database (web dashboard, no CLI)  **⛔ needs your account**

The Turso command-line tool doesn't run on Windows, so we use the website to
create the database, then a small script (`npm run seed:remote`) loads all the
questions into it from your finished local copy.

1. Go to **https://app.turso.tech** and sign up (you can use GitHub).
2. Create a database: **Databases → Create Database** → name it `ecg-learn` →
   pick the region closest to you → **Create**.
3. On the database's page, get its two connection values:
   - **Database URL** — starts with `libsql://…​.turso.io` → this is `TURSO_DATABASE_URL`.
   - **Create Token** (a.k.a. "Generate token") → copy the long string →
     this is `TURSO_AUTH_TOKEN`. **Copy it now; it's shown once.**
4. Put both into your local `.env` file (create it by copying `.env.example`):
   ```
   TURSO_DATABASE_URL="libsql://ecg-learn-<you>.turso.io"
   TURSO_AUTH_TOKEN="<the long token>"
   ```
5. Load all the content into the hosted database (run from the `ecg-learn` folder):
   ```bash
   npm run seed:remote
   ```
   It prints how many types and questions it copied. Re-running is safe (it
   replaces the content). You'll paste the same two values into Vercel in Step 5.

---

## Step 2 — Generate an auth secret  **⛔ needs your account**

Create a random session secret (used to sign login cookies). Keep it private:
```bash
npx auth secret          # prints a value — copy it, this is AUTH_SECRET
# or:  openssl rand -base64 32
```

---

## Step 3 — Push the repo to GitHub  **⛔ needs your account**

The local repo is committed and ready (secrets and the DB file are git-ignored).
Create a repo and push:

```bash
cd ecg-learn
# create a new EMPTY repo at https://github.com/new  (name it e.g. ecg-learn)
git remote add origin https://github.com/<your-username>/ecg-learn.git
git branch -M main
git push -u origin main
```
(If you have the GitHub CLI: `gh repo create ecg-learn --private --source=. --push`.)

---

## Step 4 — Create the Vercel project  **⛔ needs your account**

1. Go to https://vercel.com/new.
2. **Import Git Repository** → pick your `ecg-learn` repo → **Import**.
3. Vercel auto-detects **Next.js**. Leave Framework Preset = Next.js, Build
   Command = default, Output = default, **Root Directory** = the repo root (the
   folder containing `package.json`).
4. **Do not deploy yet** — first open **Environment Variables** (next step).

---

## Step 5 — Set environment variables  **⛔ needs your account**

In the Vercel project (either the import screen, or later under **Settings →
Environment Variables**), add these for **Production** (and Preview if you like):

| Name | Value | Required |
|------|-------|----------|
| `TURSO_DATABASE_URL` | the `libsql://…` URL from Step 1 | ✅ |
| `TURSO_AUTH_TOKEN` | the token from Step 1 | ✅ |
| `AUTH_SECRET` | the secret from Step 2 | ✅ |
| `AUTH_URL` | *(leave unset — auto-detected on Vercel)* | optional |

Notes:
- `DATABASE_URL` is **not** needed on Vercel (it's only for the local Prisma CLI).
- The app **refuses to start a DB query in production without `TURSO_DATABASE_URL`**,
  so if you forget it you'll get a clear error rather than silent breakage.

Then click **Deploy** (or **Settings → Deployments → Redeploy** if you already
deployed). `npm install` runs `prisma generate`, then `next build`.

---

## Step 6 — First run
1. Open your `https://<project>.vercel.app` URL. The education-only disclaimer
   shows at the top; you'll be sent to **/signin**.
2. Click **Create an account** and sign up. Each visitor gets their **own private
   bank and progress**.
3. Start at the **Progression map**, learn a type, then Review / Free-practice.

That's it — the app is live.

---

## Updating content or schema later
With `.env` still pointing at your Turso database:
- **New/changed questions:** rebuild locally, then re-run the loader — it clears
  and re-copies the content (accounts/progress are untouched):
  ```bash
  npm run ingest
  npm run seed:remote
  ```
- **Schema change (`prisma/schema.prisma`):** regenerate the schema SQL first,
  then the loader applies it and reloads content:
  ```bash
  npm run db:push        # update your local DB
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/schema.sql
  npm run seed:remote
  ```
- Redeploy on Vercel — pushing to `main` (`git push`) triggers it automatically.

---

## Optional — Add a custom domain later  **⛔ needs your account**
Only if/when you want your own domain (this may cost money to buy — your call):
1. Buy a domain from any registrar (Namecheap, Cloudflare, etc.).  **⛔ needs your account**
2. In Vercel: **Project → Settings → Domains → Add** → type your domain.
3. Vercel shows DNS records to set. In your registrar's DNS settings, add them:
   - Apex (`example.com`): an **A** record to Vercel's IP, or an **ALIAS/ANAME**.
   - `www`: a **CNAME** to `cname.vercel-dns.com`.
4. Wait for DNS to propagate; Vercel issues an HTTPS certificate automatically.
5. (Optional) set the custom domain as the primary and redirect the
   `.vercel.app` URL to it in **Domains**.

No code changes are needed for a custom domain — `AUTH_URL` stays auto-detected.

---

## Troubleshooting
- **"TURSO_DATABASE_URL is not set" at runtime** → the env var is missing/misspelled
  in Vercel; add it and redeploy.
- **Login works but you see an empty/locked map** → that's expected for a brand-new
  account; unlock "Normal sinus rhythm" first.
- **Auth errors after adding a custom domain** → set `AUTH_URL` to the full
  `https://` domain and redeploy.
- **Build fails on Prisma** → ensure the repo includes `prisma/schema.prisma`
  (it does) and that `postinstall` (`prisma generate`) ran.

---

## Notes
- **No local-file SQLite in production** — the runtime connects to Turso over the
  network via the libSQL driver adapter (`src/lib/prisma.ts`).
- **Licensing:** waveforms are PTB-XL and Chapman-Shaoxing/Ningbo, both CC-BY 4.0,
  rendered from raw signal arrays (never scraped images); questions are authored
  originally. See `DATA_SOURCES.md` and the in-app `/about` page.
- **Authored/unverified content** (a few expert patterns) is held out of the live
  bank until clinician sign-off — see `REVIEW.md`.
