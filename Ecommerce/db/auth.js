import { betterAuth } from 'better-auth'
import { pool } from './pool.js'

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  // Local dev serves the frontend from Vite on :5173, which proxies /api/* to
  // this server on :3000 — the browser's Origin header is still :5173, so it
  // must be trusted explicitly. Production serves both from the same origin.
  trustedOrigins: ['http://localhost:5173'],
})
