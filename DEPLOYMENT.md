# Production deployment

ZimServicePulse is deployed as a Next.js app on Vercel with Neon Postgres for
durable actions, alert state, users, and saved views. The official CSV remains
versioned in the repository, so every data refresh is reviewable and can be
rolled back with the application release.

## One-time setup

1. Create a Neon Postgres database and copy its pooled connection string.
2. Import this repository into Vercel as a Next.js project.
3. Configure the following Vercel environment variables for Production and
   Preview as appropriate:

   ```text
   DATABASE_URL=postgres://...
   AUTH_SECRET=<a long randomly generated secret>
   DEMO_PIN=<non-default demo PIN>
   NEXTAUTH_URL=https://<your-production-domain>
   ```

4. Run `npm ci`, then `DATABASE_URL=<neon-url> npm run db:push` once against
   the target database. Subsequent schema work should use `npm run db:generate`
   and commit the generated migration before applying it in the release window.
5. Deploy from `main`. Vercel preview deployments are created for pull requests.

## Release checklist

- Replace only `data/01_public_service_requests.csv`; do not fabricate fallback data.
- Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
- Check `GET /api/health` after deployment: it must report `ok: true`, a live
  database, and a non-zero CSV row count.
- Sign in with each demo role, save a view, create an action, and verify it
  persists after a refresh.
- Verify Explore filtering, map selection, offline map mode, and both exports.

## Rollback

Use Vercel's deployment rollback to restore the previous app and CSV version.
Database migrations must be backwards-compatible; apply a follow-up migration
instead of changing or deleting production data directly.
