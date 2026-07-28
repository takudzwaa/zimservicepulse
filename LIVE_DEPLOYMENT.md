# ZimServicePulse live deployment and operations

This is the production runbook for moving ZimServicePulse from demo mode to a
multi-authority live service. Production runs on Vercel, Neon Postgres, Vercel
Blob, and Resend. The release is not live-ready until every item in the
preflight and cutover checklists is complete.

## Production architecture

- Vercel serves the Next.js application and protected scheduled routes.
- Neon is the durable source of truth for identities, memberships, datasets,
  normalized operational records, complaints, actions, grants, notifications,
  and audit events.
- Vercel Blob stores immutable uploaded source files. Database rows store their
  Blob URL, validation result, version, owner, and activation state.
- Resend delivers invitations, password resets, report verification and
  operational notifications. Every attempted delivery is recorded.
- An authority is the isolation boundary. Operational reads and writes must
  carry an authority ID derived from the authenticated membership, never from a
  client-supplied override.

PGlite and shared demo users are development conveniences only. Production
must set `ALLOW_DEMO_USERS=false` and must have a Postgres `DATABASE_URL`.

## Required configuration

Configure these separately for Vercel Preview and Production:

```text
DATABASE_URL=postgres://...               # Neon pooled connection
AUTH_SECRET=<48+ random bytes>
NEXTAUTH_URL=https://zimservicepulse.vercel.app
BLOB_READ_WRITE_TOKEN=vercel_blob_...
RESEND_API_KEY=re_...
EMAIL_FROM=ZimServicePulse <service@verified-domain.example>
CONTACT_TO_EMAIL=<monitored operations inbox>
CRON_SECRET=<48+ random bytes>
INITIAL_ADMIN_EMAIL=<named accountable administrator>
INITIAL_ADMIN_PASSWORD=<temporary 12+ character secret>
ALLOW_DEMO_USERS=false
NEXT_PUBLIC_ALLOW_DEMO_USERS=false
PUBLIC_REPORTING_ENABLED=false
NEXT_PUBLIC_PUBLIC_REPORTING_ENABLED=false
```

Generate secrets with `openssl rand -base64 48`. Never commit `.env.local`,
database URLs, API keys, passwords, downloaded production data, or Vercel
environment files. Verify the Resend sender domain before enabling any public
or invitation flow.

## One-time environment setup

1. Create separate Neon production and preview branches. Enable point-in-time
   restore and record the retention window.
2. Create a private Vercel Blob store linked to this project.
3. Verify the sending domain in Resend and configure SPF/DKIM.
4. Add the environment variables above to the correct Vercel environments.
5. Install dependencies with `npm ci`.
6. Generate and review migrations with `npm run db:generate`. Apply committed
   migrations to Preview, test them, then apply the exact same migrations to
   Production with `npm run db:push` during the release window.
7. Run `NODE_ENV=production npm run db:bootstrap` once. Immediately remove
   `INITIAL_ADMIN_PASSWORD` from Vercel after the administrator signs in and
   confirms password recovery.
8. Sign in as the administrator, create the first authority, and invite its
   accountable authority administrator.
9. Upload the official CSV as a `service_requests` dataset belonging to a
   separately named National Baseline authority. Do not mix baseline records
   into council datasets.

## Dataset contracts

`service_requests` uses the contract documented in `BRIEF.md`.

`assets` requires:

```text
asset_id,asset_type,name,district,condition
```

It may also include `ward`, `latitude`, `longitude`, `commissioned_at`, and
`last_inspected_at`.

`wards` requires:

```text
ward_id,ward_name,district
```

It may also include `boundary_geojson`, `councillor_name`, `portfolio`,
`term_start`, and `term_end`. `boundary_geojson` must contain valid GeoJSON.

Uploading creates an immutable version. DataQuality Guard must score a version
at least 70 before activation. Activation archives the prior active version of
the same type and replaces the corresponding normalized records. Retain the
prior source version for audit and rollback.

## Preflight

Run from a clean checkout of the release commit:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright test
```

Then verify on a Vercel Preview deployment:

- Demo accounts are absent and the shared demo password fails.
- Invitation, acceptance, login, logout, and password reset emails arrive.
- A second authority cannot enumerate, fetch, mutate, or export the first
  authority's records, even with guessed IDs.
- Service-request, asset, and ward uploads validate, activate, and remain
  active after a new deployment.
- The dashboard reflects the active version; replacing and rolling back a
  version produces the expected figures.
- Public report verification creates exactly one report and an expired or
  reused token cannot create another.
- Public tracking reveals status, category, and service area only; it never
  returns reporter identity, location detail, triage rationale, or internal
  notes.
- Contact enquiries persist and reach the monitored inbox.
- Raw exports are restricted to authorized operational roles and anonymized
  grants exclude citizen identity.
- `/api/health` reports `ok: true`, a live database, and a non-zero baseline.

## Staged cutover

1. Freeze schema changes and take a named Neon restore point.
2. Apply the reviewed forward-compatible migrations.
3. Deploy with public submission disabled at the operational level until email
   and tenant-isolation smoke tests pass.
4. Bootstrap the administrator, create the National Baseline authority, import
   its CSV, and onboard one pilot council.
5. Test invitations, upload/activation, dashboards, complaints, actions,
   assets, wards, exports, and audit events with the pilot council.
6. Confirm Vercel logs contain no secrets, report descriptions, email tokens,
   passwords, or raw uploaded rows.
7. Promote the saved Vercel deployment and assign
   `zimservicepulse.vercel.app`.
8. Repeat the smoke tests against the production alias and monitor errors,
   email delivery, database usage, and Blob access for at least 30 minutes.

Do not delete demo data in place. The production database starts clean and the
official CSV is re-imported as a labeled version.

## Health, monitoring, and routine operations

- Monitor Vercel function failures and latency, Neon connections/storage,
  Resend bounces, and Blob storage growth.
- Review failed notification rows and dataset validation failures daily during
  the pilot.
- Review administrator, membership, dataset activation, export, and governance
  audit events weekly.
- Test a Neon restore and a dataset-version rollback quarterly.
- Rotate `AUTH_SECRET`, `CRON_SECRET`, Resend, Blob, and database credentials
  after any suspected exposure. Rotating `AUTH_SECRET` signs out all users.
- Disable departed users immediately; never reuse their accounts.
- Export or delete a citizen's personal data only through an authenticated,
  audited administrator process. Retain aggregate operational statistics after
  removing identity where legally permitted.

## Rollback and incident response

For an application regression, use Vercel rollback to the previous saved
production deployment. Migrations must remain backward-compatible; fix schema
problems with a forward migration rather than dropping production data.

For incorrect dataset activation, archive the bad version and reactivate the
last known-good version. For corrupted data, stop writes, record the incident
window, and restore Neon to a new branch before changing the production branch.

For suspected cross-authority access or credential leakage:

1. Disable affected accounts and public write paths.
2. Rotate relevant secrets and revoke sessions.
3. Preserve Vercel, Neon, Resend, Blob, and application audit evidence.
4. Determine affected authorities, records, and time range.
5. Notify the accountable service owner and follow applicable Zimbabwean data
   protection and contractual notification duties.
6. Deploy and verify the remediation before restoring access.

Record every incident, decision, recovery action, and verification result in a
durable incident log.
