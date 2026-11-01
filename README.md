# ELSE Perfumes CRM

Standalone React + Vite workspace for the store administration modules. The shop remains in the repository root; this app runs independently on port `5174` and has its own login screen and browser session keys.

## Run

1. Copy `.env.example` to `.env` and set `VITE_API_URL` and `VITE_IMAGE_BASE_URL` for your backend.
2. Install the dependencies with `npm install` in this directory.
3. Start the CRM with `npm run dev` and open `http://localhost:5174`.

The app uses the existing API contract for OTP login, administrator verification, and the admin modules. Its routes live under `/admin`; the root route sends signed-out visitors to the CRM login screen.

## Modules

Dashboard, products, orders, customers, categories, inventory, analytics, settings, marketing, access, offers, promotions, activity, and notifications.
