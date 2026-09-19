# Nimbus — ecommerce storefront (React + Vite + Express + Neon Postgres)

A storefront with a real database. The catalog and order history live in Neon Serverless
Postgres; cart, saved items and the applied promo code stay in this browser's `localStorage` —
there are still no accounts, so those three are inherently per-browser.

## Database setup (one-time)

1. Create a free project at https://console.neon.tech.
2. Copy its connection string from the dashboard (`postgres://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`).
3. Copy `.env.example` to `.env` and paste it in as `DATABASE_URL`.
4. `npm install`
5. `npm run db:migrate` — creates the schema and seeds 20 products/categories from
   `src/data/products.js`. Re-running it is safe: it never touches the `orders` table.

## Running it

Local development (hot reload, two processes):

```bash
npm run dev:api   # Express + Postgres on http://localhost:3000
npm run dev       # Vite on http://localhost:5173, proxies /api to the port above
```

Production — one process, one artifact:

```bash
npm run build    # writes dist/
npm start        # serves dist/ + the API on http://localhost:3000 (set PORT to change it)
# or in one step:
npm run serve
```

`server.js` serves the built `dist/` folder, falls back to `index.html` for client-side routes,
and answers `/api/*` — the same Node process that was previously static-only now also owns the
database, so there is still nothing separate to run or deploy in production.

## What you can test right now

| Flow | Where | Notes |
| --- | --- | --- |
| Browse, search, filter, sort | `/catalog` | Filters live in the URL, so `/catalog?cat=audio&sale=1` is shareable |
| Product detail | `/product/p-001` | Colour variants, quantity, stock limits, related products |
| Add to bag | anywhere | Same product + same colour merges into one line; quantity is capped at stock |
| Saved items | `/saved` | Heart icon on any card; "Add all to bag" |
| Promo codes | cart or checkout | `NIMBUS10` → 10% off · `FREESHIP` → free shipping. Anything else is rejected |
| Checkout | `/checkout` | Real client-side validation; card number and expiry are auto-formatted |
| Order history | `/orders` | Every order lives in Postgres, scoped to an anonymous session cookie, detail page at `/order/:id` |
| Reset | footer → "Reset demo data" | Clears cart, saved items and promo locally, and deletes this session's orders from the DB |

Pricing rules: free shipping over **$150** (otherwise $8 flat), tax at **8%**, applied after any
discount. Payment is a 900 ms `setTimeout` — no real payment gateway.

## Verifying it

Two dependency-free test suites drive real Chrome. Start the app first (`npm run serve`, or
`dev:api` + `dev` together), then:

```bash
npm run smoke    # 12 routes render without a runtime error
npm run e2e      # 27 checks: add to bag → promo → validation → order → history → reset
npm run shots    # writes screenshots to .shots/ (seeds a cart first)
```

`e2e` talks to Chrome over the DevTools Protocol using Node's built-in `WebSocket`, so there is no
Playwright or Puppeteer install.

## Layout

```
server.js                 Express: /api routes, session cookie, static dist/ + SPA fallback
db/schema.sql              categories / products / orders tables
db/pool.js                 pg Pool built from DATABASE_URL
scripts/db-migrate.mjs     runs schema.sql, reseeds categories/products (never touches orders)
src/
  data/products.js        seed data only — read by db-migrate.mjs, not by the running app
  lib/api.js               fetch wrappers for /api/catalog and /api/orders
  store/StoreContext.jsx  cart / wishlist / promo / toasts reducer; fetches catalog + orders on load
  lib/storage.js           defensive localStorage wrapper (bad JSON falls back to defaults) — cart/wishlist/promo only
  lib/image.js             product art generated as inline SVG data URIs (works offline)
  lib/format.js            currency, dates, order numbers
  components/             Navbar, ProductCard, OrderSummary, QtyStepper, Rating, Toasts, Icon, Footer
  pages/                  Home, Catalog, ProductDetail, Cart, Checkout, OrderConfirmation, Orders, Saved, NotFound
```

State lives in one reducer in `StoreContext.jsx`. On mount it fetches `/api/catalog` and
`/api/orders`; `cart`, `wishlist` and `promo` are still mirrored into `localStorage` under the
`nimbus:` prefix via `lib/storage.js`. An anonymous session cookie (`nimbus_sid`, set by
`server.js`, no login) scopes each browser's orders — there's no user account, so this is the
lightest thing that keeps "my order history" working per visitor.

## Adding the backend later

Still-open seams:

1. **Cart / wishlist / promo** — still client-side only (`localStorage`), per the earlier scope
   decision. Lines store `{ id, color, qty }` and are joined against the fetched catalog at render
   time, so a server cart could replace the array without touching any page.
2. **Auth** — every page reads state through `useStore()`, so a user object (and swapping the
   anonymous session cookie for a real login) can be added to that context without prop-drilling.
3. **Promos** — `PROMOS` in `StoreContext.jsx` is a lookup table; `applyPromo` already returns a
   boolean, so it can become an async validation call against the DB.

## Known limits

- Stock is never decremented — placing an order does not reduce `product.stock`.
- Prices and totals are still computed and trusted client-side; a real checkout must recompute
  and verify them server-side before charging anything.
- The express shipping option is presented but the summary charges the standard rate (flagged in
  the UI).
- Cart, saved items and promo are still per-browser (`localStorage`); only the catalog and order
  history are shared across devices for the same session cookie.
