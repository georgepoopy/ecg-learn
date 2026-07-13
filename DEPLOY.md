# Deploying ECG Learn

A single Next.js app. Recommended host: **Vercel**. Recommended database:
**Turso** (libSQL — SQLite-compatible, so the same code runs locally on a file
and in production on Turso, with no code changes — only environment variables).

---

## 1. Prerequisites
- A [Vercel](https://vercel.com) account.
- A [Turso](https://turso.tech) account + the Turso CLI (`turso`).
- Node 20+ locally to run the ingestion once.

## 2. Build the question bank locally (one-time)
The bank is generated from PTB-XL. This produces `prisma/dev.db` (a SQLite file)
containing all types, lessons, waveforms, and questions.

```bash
npm install
npm run db:push        # create the schema in prisma/dev.db
npm run ingest         # generate ~2k questions (needs the PTB-XL zip present)
```

> The waveform archive is read from the PhysioNet zip referenced in CLAUDE.md.
> Only the seeded `prisma/dev.db` (a few hundred MB) is needed for deployment.

## 3. Create the Turso database from the seeded file
Turso can import an existing SQLite file directly — so your generated content
ships as-is:

```bash
turso auth login
turso db create ecg-learn --from-file ./prisma/dev.db
turso db show ecg-learn --url          # -> TURSO_DATABASE_URL (libsql://...)
turso db tokens create ecg-learn       # -> TURSO_AUTH_TOKEN
```

(If you later change `schema.prisma`, apply the diff to Turso with:
`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
and pipe the SQL into `turso db shell ecg-learn`.)

## 4. Environment variables (set these on Vercel)
| Variable | Value | Notes |
|----------|-------|-------|
| `TURSO_DATABASE_URL` | `libsql://<db>-<org>.turso.io` | from step 3 |
| `TURSO_AUTH_TOKEN` | `<token>` | from step 3 |
| `AUTH_SECRET` | random 32-byte base64 | `npx auth secret` or `openssl rand -base64 32` |
| `DATABASE_URL` | `file:./dev.db` | only used by the Prisma CLI at build for `prisma generate`; runtime uses the adapter + `TURSO_*` |

Locally, copy `.env.example` → `.env`. Leaving `TURSO_*` empty makes the app use
the local `prisma/dev.db` file — the exact same code path as production.

## 5. Deploy
```bash
# from the ecg-learn/ directory
vercel            # link the project, then:
vercel --prod
```
`postinstall` runs `prisma generate`, and `next build` produces the app. The
runtime connects to Turso through the libSQL driver adapter (`src/lib/prisma.ts`).

## 6. First run
- Open the deployed URL → you'll be sent to **/signup**.
- Create an account. Each user gets a **private** bank and progress (data is
  scoped by the authenticated user id everywhere).
- Learn a type, then Review / Free-practice.

---

## Notes & scaling
- **Auth:** Auth.js (NextAuth v5) with an email + password Credentials provider
  (bcrypt-hashed, JWT sessions — no session tables). Add OAuth providers later in
  `src/lib/auth.ts` if desired.
- **Waveforms** are stored in the DB as 250 Hz base64 (downsampled at ingest to
  keep the database lean). At much larger scale, move waveform blobs to object
  storage (e.g. Vercel Blob / S3) and store only a reference on `Record`.
- **Turso free tier** comfortably holds the current bank; the `--from-file`
  import is the simplest way to seed.
- The app is fully **server-rendered on demand** (no waveform is ever a scraped
  image; all tracings are drawn from raw signal arrays), and the education-only
  disclaimer is fixed to every screen.
