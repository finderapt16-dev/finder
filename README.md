# AptFindr

AptFindr is a Progressive Web Application for discovering and managing apartment listings in La Paz, Iloilo City. It provides separate Tenant, Landlord, Admin, and Super Admin workflows backed by Supabase.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide the project-specific public Supabase values.
3. Start development with `npm run dev`.

Never commit `.env`, service-role keys, passwords, or other secrets.

## Commands

- `npm run dev` — start the Vite development server
- `npm run typecheck` — run TypeScript checks
- `npm run lint` — run strict TypeScript unused-code checks
- `npm run build` — create the production build
- `npm run migrate:supabase -- <folder>` — import supported local JSON data using the database utility script

## Project map

- `src/app/public` — Landing Page and authentication pages
- `src/app/tenant` — Tenant dashboard, apartment browsing, favorites, and notifications
- `src/app/landlord` — Landlord dashboard, properties, rooms, and market overview
- `src/app/admin` — Admin dashboard and apartment/landlord review
- `src/app/super-admin` — Super Admin management and system controls
- `src/app/shared` — shared components, contexts, services, layouts, and utilities
- `src/lib/supabaseClient.ts` — browser Supabase client configuration
- `src/assets` — source images and visual assets
- `src/styles` — global styles and theme rules
- `scripts/database` — database-related utility scripts
- `database` — recommended location for local SQL files; the current master migration remains ignored by Git

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for a concise navigation guide.

## Supabase

The local `supabase-master-migration.sql` is intentionally ignored and must not be committed. Run the current migration manually in the Supabase SQL Editor when required. Configure production Site URL, allowed `/auth/callback` and `/reset-password` redirects, and custom SMTP in Supabase.
