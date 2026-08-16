
  # Apartment Finder PWA

  This is a code bundle for Apartment Finder PWA. The original project is available at https://www.figma.com/design/fWnV04HCoOpou2gRr2QTPH/Apartment-Finder-PWA.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Tenant discovery

Browse All keeps saved preferences separate from temporary search. Preferences influence weighted recommendations, while searches such as `near ISAT U` geocode a La Paz landmark and show coordinate-bearing listings within 500 meters, ordered nearest-first by Haversine distance before pagination.

## Auth profile repair

Run the current `supabase-master-migration.sql` once in the Supabase SQL Editor after deploying this version. It transactionally synchronizes `auth.users` with `app_users`, backfills incomplete signups, and keeps email verification separate from landlord approval.

In Supabase Authentication URL Configuration, set the deployed app as the Site URL and allow both `/auth/callback` and `/reset-password` for production. For local Vite development, allow `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`.

Production confirmation and recovery mail should use Supabase custom SMTP with a verified sender/domain. Keep the SMTP password or provider API key in Supabase only; browser code must contain only `VITE_SUPABASE_URL` and the public anon key.
