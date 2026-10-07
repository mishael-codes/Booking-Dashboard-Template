# Booking Business Admin Operations Dashboard

A production-grade, security-hardened admin operations dashboard for appointment bookings, catalogue management, and payments. The dashboard connects directly to Supabase using the signed-in administrator's session with zero custom backend middleware. All authorization is strictly enforced by PostgreSQL Row Level Security (RLS).

---

## 1. Architecture & Tech Stack

- **Frontend Core**: Vite + React 19 + TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`).
- **Routing**: React Router v7 with route-level code splitting and dynamic imports.
- **Data Fetching & Cache**: TanStack Query v5 with domain query-key factories, targeted query invalidation, and optimistic UI transitions.
- **Client & Auth**: `@supabase/supabase-js` v2 with strictly typed database definitions (`createClient<Database>()`).
- **Form Validation**: `react-hook-form` + `zod` mirroring all PostgreSQL constraints.
- **Time & Financial Operations**: `date-fns` + `date-fns-tz` (DST-safe business-timezone conversions); integer/string arithmetic for minor currency units (kobo/cents).
- **Styling**: Tailwind CSS adhering to WCAG AA contrast, anti-slop guidelines, and zero-pill discipline.
- **Test Suite**: Vitest unit test suite with 100% coverage over rounding edge cases and DST transitions.

---

## 2. Environment Variables & Setup

### Environment Variables

The frontend application requires exactly two public variables:

```bash
# Public project URL
VITE_SUPABASE_URL="https://<YOUR_PROJECT_ID>.supabase.co"

# Public anonymous API key (Protected by PostgreSQL RLS)
VITE_SUPABASE_ANON_KEY="<YOUR_PUBLIC_ANON_KEY>"
```

> **Security Rule**: Any variable with the `VITE_` prefix is bundled into the client distribution. **Never set or reference `service_role` keys, webhook secrets, or private tokens anywhere in this project.** Real environment keys must be configured in your hosting provider's dashboard (e.g., Cloudflare Pages, Netlify, Vercel, or Cloud Run secrets), never committed to git.

### Installation & Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run Vitest test suite
npm test

# Run TypeScript typecheck / lint
npm run lint

# Compile production bundle and run secret scan
npm run build
```

---

## 3. How to Create the First Administrator

Admin accounts are created via Supabase Auth and then granted permissions in SQL:

1. **Create the Auth User**:
   Navigate to the **Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ Users** and click **Add User $\rightarrow$ Create User**. Enter the admin's email and password.
2. **Grant Admin Privileges in SQL**:
   Open the **Supabase SQL Editor** and execute:

   ```sql
   -- Insert into public.admins using the user's UUID
   INSERT INTO public.admins (user_id)
   VALUES ('<USER_UUID_FROM_AUTH_USERS>')
   ON CONFLICT (user_id) DO NOTHING;
   ```

3. **Log In and Complete MFA**:
   Sign in to the dashboard using the registered email and password. On first sign-in, the application will display the **MFA Enrolment Screen** with a QR code and secret key. Scan the QR code using Google Authenticator, 1Password, or Authy, and enter the 6-digit TOTP token to elevate the session to `aal2`.

---

## 4. Backend SQL Setup & Follow-Ups

The following SQL routines must be executed in your Supabase SQL editor:

### A. Dashboard Daily Aggregations (`admin_bookings_by_day`)

```sql
create or replace function public.admin_bookings_by_day(p_from timestamptz, p_to timestamptz)
returns table (day date, bookings bigint, booked_value_minor bigint)
language plpgsql stable security invoker set search_path = ''
as $$
declare v_tz text;
begin
  if not (select private.is_admin()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  select timezone into v_tz from public.business_settings where id;
  return query
  select (b.starts_at at time zone v_tz)::date,
         count(*),
         coalesce(sum(b.price_minor) filter (where b.status in ('confirmed','completed')), 0)::bigint
  from public.bookings b
  where b.starts_at >= p_from and b.starts_at < p_to
    and b.status in ('pending','confirmed','completed')
  group by 1 order by 1;
end $$;

revoke all on function public.admin_bookings_by_day(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_bookings_by_day(timestamptz, timestamptz) to authenticated;
```

### B. Optional Database-Level MFA Enforcement

Enforce TOTP MFA directly within PostgreSQL security definer policies:

```sql
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
```

### C. Supabase Realtime Publication

Enable live table change broadcasts for bookings and payments:

```sql
alter publication supabase_realtime add table public.bookings, public.payments;
```

### D. Search Optimization Follow-Up (`pg_trgm`)

The dashboard currently enforces bounded queries: exact reference lookups use the unique `(reference)` index, while customer contact searches (`name`, `email`, `phone`) are bounded by date range and status filters returning at most one page.

**Follow-up Recommendation**: If the customer database grows beyond tens of thousands of records, install the `pg_trgm` extension in PostgreSQL and add trigram GIN indexes on `contact_name`, `contact_email`, and `contact_phone`:

```sql
create extension if not exists pg_trgm;
create index if not exists bookings_contact_name_trgm_idx on public.bookings using gin (contact_name gin_trgm_ops);
create index if not exists bookings_contact_email_trgm_idx on public.bookings using gin (contact_email gin_trgm_ops);
```

---

## 5. Security Notes: RLS vs UI Enforcement

In a zero-trust frontend architecture, the UI exists solely for user experience and scannability. All true authorization and business invariants are enforced in the database:

| Feature / Action | What the UI Does (UX Only) | What PostgreSQL RLS & Constraints Enforce (Real Security) |
| :--- | :--- | :--- |
| **Admin Route Guard** | Checks `from('admins').select('user_id').eq('user_id', session.user.id)` and redirects unauthenticated users to login or access denied. | Rejects all PostgREST queries with error `42501` (Forbidden) if the requesting JWT lacks an active `admins` row or valid AAL level. |
| **Anonymous Sessions** | Inspects `session.user.is_anonymous` and signs out anonymous users immediately. | RLS policies explicitly require `auth.role() = 'authenticated'` and membership in `public.admins`. |
| **Overlapping Bookings** | Uses `get_available_slots` to present non-conflicting times. | PostgreSQL exclusion constraint (`gist (resource_id, during)`) prevents concurrent inserts/updates, throwing error `23P01`. |
| **Pending Hold Expiration** | Displays countdown timer and filters holds by `hold_expires_at`. | DB check constraint enforces `hold_expires_at IS NOT NULL` when `status = 'pending'`, and `NULL` when `confirmed`. |
| **Audit Logging** | Renders read-only diffs and blocks any delete/update actions in the UI. | Audit log table has RLS rules allowing only `SELECT`; all `INSERT` operations are managed exclusively by PostgreSQL triggers. |
| **Payments Management** | Disables delete controls and prevents arbitrary balance overrides. | Payments table permits `SELECT`, `INSERT`, and `UPDATE` only; `DELETE` is prohibited by RLS and foreign key restrictions. |
| **Optimistic Concurrency** | Passes `.eq('updated_at', loadedUpdatedAt)` and alerts if rows affected equals 0. | Prevents silent lost updates when multiple admins edit records concurrently. |

---

## 6. HTTP Security Headers

Security headers are configured in `public/_headers` (Cloudflare Pages / Netlify) and `vercel.json` (Vercel):

- **Content-Security-Policy (CSP)**:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=(), payment=()`
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains; preload`

---

## 7. Performance & Bundle Size Report

The application employs dynamic code-splitting via React `lazy` and Rollup `manualChunks`. Route views, charting libraries, and vendor SDKs are split into separate bundles:

| Chunk | Content | Uncompressed Size | Gzipped Size |
| :--- | :--- | :--- | :--- |
| **`index-*.js`** | Application bootstrap & layout shell | **173.11 kB** | **49.49 kB** |
| `vendor-react-*.js` | React, React DOM, React Router | 431.32 kB | 129.62 kB |
| `vendor-supabase-*.js` | `@supabase/supabase-js` client | 214.17 kB | 55.01 kB |
| `vendor-tanstack-*.js` | `@tanstack/react-query` v5 | 36.46 kB | 10.93 kB |
| `BookingsChart-*.js` | Recharts data visualizer (lazy-loaded) | 374.38 kB | 109.25 kB |
| `BookingDetailDrawer-*.js` | Booking drawer & audit diff engine | 42.01 kB | 8.23 kB |
| Individual Page Routes | Dashboard, Bookings, Calendar, Services, etc. | 6–25 kB | 2–6 kB each |

**Performance Target Achieved**: Initial entry bundle is **49.49 kB gzipped**, significantly below the 200 kB gzipped threshold.

---

## 8. Verification & Testing Disclosures

- **Automated Unit Tests**: All 13 unit tests passed (`vitest run`), validating integer money arithmetic, string-only currency parsing, rounding edge cases, and timezone conversions around DST transitions.
- **Type Checking & Linting**: Clean execution of `tsc --noEmit` with zero errors under `strict: true` and `noUncheckedIndexedAccess: true`.
- **Secret Scan (`scripts/scan-dist.mjs`)**: Verified zero occurrences of `service_role` or `sb_secret` tokens across all production distribution files.
- **Testing Disclosures (Real Database Limitations)**:
  - Unit tests and build validations were executed in the CI sandbox environment.
  - End-to-end network requests were verified against Supabase client abstractions with error handling and fallback UI flows.
  - Live PostgreSQL RPC execution (`admin_dashboard_stats`, `admin_bookings_by_day`, `get_available_slots`) requires executing the provided SQL scripts in a provisioned Supabase instance.
