
  # Apartment Finder PWA

  This is a code bundle for Apartment Finder PWA. The original project is available at https://www.figma.com/design/fWnV04HCoOpou2gRr2QTPH/Apartment-Finder-PWA.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Tenant discovery

Browse All keeps saved preferences separate from temporary search. Preferences influence weighted recommendations, while searches such as `near ISAT U` geocode a La Paz landmark and show coordinate-bearing listings within 500 meters, ordered nearest-first by Haversine distance before pagination.

## Auth profile repair

Run `scripts/fix-auth-profile-sync.sql` once in the Supabase SQL Editor after deploying this version. It synchronizes `auth.users` with `app_users` and backfills incomplete email-confirmation signups.
