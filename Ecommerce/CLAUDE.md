# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nimbus — an ecommerce storefront demo. React + Vite frontend, Express + Neon (serverless Postgres)
backend, with Better Auth (email + password) for accounts. Catalog, order history, and — once
signed in — cart/wishlist live in Postgres; the applied promo code always lives in `localStorage`
only. Signed-out visitors keep cart/wishlist in `localStorage` too (merged into the account on
sign-in); checkout and order history require being signed in.

## Commands

```bash
npm run dev:api     # Express + Postgres on :3000
npm run dev          # Vite dev server on :5173, proxies /api/* to :3000 (vite.config.js)
npm run build         # writes dist/
npm start             # serves dist/ + the API from one process on :3000 (set PORT to change)
npm run serve         # build then start — the production path in one command

npm run db:migrate    # runs db/schema.sql, reseeds categories/products from src/data/products.js
                       # (idempotent; never touches orders/cart_items/wishlist_items/auth tables)
```

Requires `BETTER_AUTH_SECRET` in `.env` (see `.env.example`; generate with
`openssl rand -base64 32`).

Local dev runs two processes (`dev:api` + `dev`); production is one process (`server.js` serving
both `dist/` and `/api/*`).

### Tests

No unit test framework — two dependency-free suites drive real Chrome via the DevTools Protocol
(Node's built-in `WebSocket`, no Playwright/Puppeteer). **The app must already be running**
(`npm run serve`, or `dev:api` + `dev` together) before invoking these:

```bash
npm run smoke   # scripts/smoke.mjs — 14 routes render without a runtime error
npm run e2e     # scripts/e2e.mjs — 30 checks: add to bag → promo → sign up → validation → order → history → reset
npm run shots   # scripts/shots.mjs — writes screenshots to .shots/ (seeds a cart first)
```

There's no way to run a single check within `e2e.mjs`/`smoke.mjs` — they're linear scripts, not a
test runner with individual cases; edit the `ROUTES`/checks array directly if you need to narrow
scope temporarily. Both scripts look for a local Chrome/Edge binary at hardcoded Windows paths
(see `CHROME_CANDIDATES` in each file).

## Architecture

**Data flow:** `StoreContext.jsx` is the single reducer holding all client state (products,
categories, cart, wishlist, orders, promo, toasts). On mount it fetches `/api/catalog` and
`/api/orders` once. Signed out, `cart`/`wishlist`/`promo` are mirrored into `localStorage` (prefix
`nimbus:`) via `lib/storage.js` on every change. Signed in, `cart`/`wishlist` are backed by
`/api/cart` and `/api/wishlist` instead (localStorage mirroring for those two stops, so a later
sign-out doesn't resurrect stale guest data); `promo` always mirrors to `localStorage` regardless.
Every page reads/writes through the `useStore()` hook — there's no prop-drilling and no other
state layer.

- **Cart lines** are `{ id, color, qty }` tuples (no denormalized product data) and get joined
  against the fetched catalog at render time in `StoreContext`'s `lines` memo. A line whose
  product no longer exists in the catalog is silently dropped rather than crashing.
- **Accounts via Better Auth:** `db/auth.js` configures `betterAuth()` (email + password only, no
  email verification — no SMTP in this demo) against the same Postgres pool as everything else.
  It owns the `user`/`session`/`account`/`verification` tables — never hand-edit those rows.
  `server.js` mounts `/api/auth/*splat` (Better Auth's own handler) before `express.json()`, then a
  middleware sets `req.user` from the session cookie for every other route. `/api/orders*`,
  `/api/cart*` and `/api/wishlist*` all require `req.user` (401 otherwise) and scope by
  `req.user.id`. Checkout and order history are gated client-side too, via `<RequireAuth>` in
  `App.jsx`, which redirects to `/sign-in?redirect=<path>`.
- **Guest → account merge:** on sign-in, `StoreContext` POSTs whatever's in the guest
  `localStorage` cart/wishlist to `/api/cart/merge` and `/api/wishlist/merge` (summed quantities,
  capped by stock), then switches to the server as source of truth for the rest of the session.
- **Orders snapshot, don't reference:** `orders.items` is JSONB copied from the cart + catalog at
  checkout time (name/price/hue/category), not a foreign key to `products`. This is deliberate
  (see comment in `db/schema.sql`) so historical orders stay intact if the catalog changes later.
- **Promo codes** are a hardcoded lookup table (`PROMOS` in `StoreContext.jsx`: `NIMBUS10` for 10%
  off, `FREESHIP` for free shipping), validated client-side only — `applyPromo()` returns a boolean
  synchronously.
- **Pricing** (`FREE_SHIPPING_THRESHOLD=150`, `SHIPPING_FLAT=8`, `TAX_RATE=0.08`) is computed
  client-side in the `totals` memo and trusted as-is when placing an order — the server does not
  recompute or verify prices/totals before persisting them.
- **Server-rendered images:** `lib/image.js` generates product art as inline SVG data URIs (no
  static image assets, works offline).

**Request path:** Vite dev proxies `/api/*` to Express on :3000 (`vite.config.js`); in production
`server.js` does everything — `express.static(dist/)`, the `/api/*` routes, then a catch-all
middleware (not a `*` route, for Express 5 compatibility) that serves `index.html` for
client-side-routed paths.

**Layout:**
```
server.js                 Express: /api/auth/* (Better Auth), req.user middleware, /api routes, SPA fallback
db/auth.js                 betterAuth() config — owns user/session/account/verification tables
db/schema.sql              categories / products / orders / cart_items / wishlist_items + Better Auth tables
db/pool.js                 pg Pool built from DATABASE_URL, shared by both db/auth.js and the /api routes
scripts/db-migrate.mjs     runs schema.sql, reseeds categories/products (never touches orders/cart/wishlist/auth tables)
src/data/products.js       seed data only — read by db-migrate.mjs, not by the running app
src/lib/api.js             fetch wrappers for /api/catalog, /api/orders, /api/cart, /api/wishlist
src/lib/authClient.js      createAuthClient() — signIn/signUp/signOut/useSession
src/store/StoreContext.jsx cart / wishlist / promo / toasts reducer; fetches catalog + orders on load
src/lib/storage.js         defensive localStorage wrapper (bad JSON falls back to defaults) — cart/wishlist/promo only
src/components/RequireAuth.jsx  route guard, redirects to /sign-in?redirect=<path> when signed out
```

## Known limits (don't "fix" these without checking with the user first — they're documented scope decisions)

- Stock is never decremented when an order is placed.
- Prices/totals are computed and trusted client-side; nothing is recomputed server-side.
- The express shipping option is offered in the UI but billed at the standard rate (flagged in UI).
- Cart/saved items are per-browser (`localStorage`) only while signed out; the promo code is
  always per-browser, even when signed in. Once signed in, cart/wishlist and order history follow
  the account across devices.
- No password reset / email verification flow — there's no SMTP configured in this demo.
