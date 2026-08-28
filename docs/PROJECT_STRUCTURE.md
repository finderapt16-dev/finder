# AptFindr Project Structure

## Application entry and routing

- `src/main.tsx` starts the React application.
- `src/app/routes.tsx` defines public and protected routes. File renames must not change these public URLs.
- `src/app/App.tsx` initializes the application shell.

## Public area

- `src/app/public/landing` contains the Landing Page and its listing preview.
- `src/app/public/login`, `signup`, `forgot-password`, `reset-password`, and `auth-callback` contain authentication pages.

## Role areas

- `src/app/tenant/pages/TenantDashboard.tsx` contains the authenticated Tenant dashboard.
- `src/app/tenant/pages/ApartmentBrowse.tsx` contains apartment search, filters, ranking, and map browsing.
- `src/app/landlord/pages` contains the Landlord dashboard, property creation, room management, and `MarketOverview.tsx`.
- `src/app/admin` contains normal Admin dashboards, analytics, and apartment review.
- `src/app/super-admin` contains Super Admin pages and services. Admin and Super Admin permissions remain separate.

## Shared application code

- `src/app/shared/components/common` — reusable AptFindr components and dialogs
- `src/app/shared/components/ui` — base UI primitives
- `src/app/shared/components/features` — shared feature components such as maps
- `src/app/shared/contexts` — authentication and apartment providers
- `src/app/shared/services` — Supabase reads, writes, uploads, and synchronization
- `src/app/shared/data` — apartment types and database mappers
- `src/app/shared/hooks` — reusable hooks
- `src/app/shared/utils` — pure helpers, ranking, visibility, mapping, and formatting
- `src/app/shared/layouts` — shared application layouts

## Supabase and database files

- `src/lib/supabaseClient.ts` creates the browser Supabase client.
- `.env` stores local credentials and is ignored by Git.
- `.env.example` contains placeholder variable names only.
- `supabase-master-migration.sql` is a local ignored migration export and must remain private.
- `scripts/database` contains database utility scripts that do not belong in frontend source folders.

## Assets, styles, and generated files

- `src/assets` contains source-controlled images used by the application.
- `public` contains PWA/static assets copied directly to the build.
- `src/styles` contains Tailwind, theme, and shared sidebar styles.
- `node_modules` and `dist` are generated locally and are ignored by Git.
