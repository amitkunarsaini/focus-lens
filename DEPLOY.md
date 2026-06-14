# Deploying FocusLens (Vercel + Neon)

This deploys the dashboard/API to Vercel with a hosted PostgreSQL on Neon, and
builds the extension to point at your live URL so others can use it.

> The repo is already prepared: local-only tooling (`embedded-postgres`,
> `playwright`, `pptxgenjs`) lives under `optionalDependencies`, and
> [`vercel.json`](./vercel.json) sets the install command to
> `npm install --omit=optional` so those never run in the cloud build.

---

## 1. Create the database (Neon)

1. Create a project at https://neon.tech.
2. Copy the **pooled** connection string (Neon → Connect → "Pooled connection").
   It contains `-pooler` in the host — serverless functions need the pooler to
   avoid exhausting Postgres connections.
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Push the schema

From your machine (one-time, and after any schema change):

```bash
DATABASE_URL="postgresql://...-pooler...sslmode=require" npx prisma db push
```

Optionally seed the demo login (creates `demo@focuslens.app` / `demo1234`):

```bash
DATABASE_URL="…" npm run db:seed
```

## 3. Deploy to Vercel

1. Push this repo to GitHub and **Import Project** in Vercel.
2. Framework preset: **Next.js** (auto-detected). Leave install/build commands
   as-is — `vercel.json` provides them.
3. Add **Environment Variables** (Production + Preview).

   You don't know your Vercel URL until after the first deploy, so split this in
   two. **Env vars can be added or edited at any time** — but they only take
   effect on the **next** deployment, so you redeploy after editing.

   **Set these before the first deploy** (don't depend on the URL):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon **pooled** URL |
   | `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |
   | `ANTHROPIC_API_KEY` | *(optional)* enables AI-enhanced summaries |
   | `FOCUSLENS_AI_MODEL` | *(optional)* e.g. `claude-opus-4-8` |

   **Set these after the first deploy** (need the final Vercel URL):

   | Key | Value |
   |---|---|
   | `NEXTAUTH_URL` | `https://<your-app>.vercel.app` |
   | `NEXT_PUBLIC_APP_URL` | same as `NEXTAUTH_URL` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | *(optional)* Google sign-in |

4. **Deploy.** Vercel assigns the URL. Now go back and add the URL-dependent
   vars above (use your custom domain instead if you add one), then **redeploy**
   (Deployments → ⋯ → Redeploy, or push a commit). New/edited env vars apply only
   to deployments created *after* the change — the running one keeps its old
   values until you redeploy.

### Google sign-in (optional)
In Google Cloud Console → OAuth credentials, add the authorized redirect URI:
```
https://<your-app>.vercel.app/api/auth/callback/google
```

---

## 4. Build & share the extension

Point the extension at your deployed dashboard and rebuild:

```bash
FOCUSLENS_DASHBOARD_URL=https://<your-app>.vercel.app npm run ext:build
```

This bakes the URL in as the default and scopes `host_permissions` to exactly
that origin (+ localhost). Output: `extension/dist/` and
`extension/focuslens-extension.zip`.

- **Share now:** send the zip; recipients enable Developer mode → *Load
  unpacked* → select the unzipped folder.
- **Publish:** upload the zip to the Chrome Web Store (see
  [`extension/PRIVACY.md`](./extension/PRIVACY.md) for the required privacy
  policy + listing notes).

### Each user connects their own account
The backend is multi-user — every account has a unique ingest token, so data is
isolated per person:
1. Sign up on `https://<your-app>.vercel.app`.
2. Go to **Overview → Connect your browser extension** and copy the **ingest
   token** (the dashboard URL is already filled in by the prod build).
3. Open the extension's **Settings**, paste the token, **Save**. Done.

---

## Notes & gotchas

- **Pooling is required.** Use the Neon pooled URL; a direct connection will hit
  connection limits under serverless.
- **No DB at build time.** Pages are dynamic; `next build` doesn't query the DB.
  `DATABASE_URL` is only needed at runtime (and for `prisma db push`).
- **Demo Mode stores nothing.** Demo data is generated in-memory per request —
  the database only ever holds real (live) data.
- **Function duration.** Event ingest recomputes the affected day inline; it's
  well within Vercel's limits for normal batches.
- **Schema changes** → re-run `prisma db push` against `DATABASE_URL` (or adopt
  `prisma migrate` if you prefer versioned migrations).
