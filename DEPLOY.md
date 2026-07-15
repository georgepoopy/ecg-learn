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

## Step 1 — Create the Turso database (from the seeded file)  **⛔ needs your account**

Turso can import your existing SQLite file, so all content ships in one shot.

1. Install the CLI and sign in:
   ```bash
   # macOS/Linux:  curl -sSfL https://get.tur.so/install.sh | bash
   # Windows:      use WSL, or see https://docs.turso.tech/cli/installation
   turso auth signup     # opens a browser — create/sign in to your account
   ```
2. Create the database **from the seeded file** (run from the `ecg-learn` folder):
   ```bash
   turso db create ecg-learn --from-file ./prisma/dev.db
   ```
3. Get the two values you'll paste into Vercel in Step 4 — **copy them somewhere
   safe; the token is shown once:**
   ```bash
   turso db show ecg-learn --url        # → TURSO_DATABASE_URL  (libsql://…​.turso.io)
   turso db tokens create ecg-learn     # → TURSO_AUTH_TOKEN     (long string)
   ```

> No CLI? You can instead create an empty DB in the Turso web dashboard, then
> load the schema from `prisma/schema.sql` via **Databases → your DB → SQL** — but
> that gives you an **empty** bank. The `--from-file` CLI path is strongly
> preferred because it ships all the questions.

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
- **New/changed questions:** re-run the ingest locally, then push the refreshed
  data to Turso:
  ```bash
  npm run ingest
  # replace the hosted DB contents from the new file:
  turso db shell ecg-learn < /dev/null   # (sanity check connectivity)
  # easiest: destroy + recreate from the new file
  turso db destroy ecg-learn
  turso db create ecg-learn --from-file ./prisma/dev.db
  ```
- **Schema change (`prisma/schema.prisma`):** generate a migration SQL and apply
  it to Turso:
  ```bash
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/schema.sql
  # for an incremental change, diff from the live DB instead of --from-empty
  turso db shell ecg-learn < prisma/schema.sql
  ```
- Redeploy on Vercel (push to `main` triggers it automatically).

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
