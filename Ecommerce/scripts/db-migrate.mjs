// Creates the schema and (re)seeds categories/products from src/data/products.js.
// Safe to re-run: orders/cart/wishlist/auth tables are never touched (none of them
// FK to products/categories), catalog tables are truncated and refilled.
//   node scripts/db-migrate.mjs
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

try {
  process.loadEnvFile()
} catch {
  // No .env file — assume DATABASE_URL is set some other way.
}

const { pool } = await import('../db/pool.js')
const { PRODUCTS, CATEGORIES } = await import('../src/data/products.js')

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const schema = await readFile(join(__dirname, '../db/schema.sql'), 'utf8')
  await pool.query(schema)

  await pool.query('TRUNCATE TABLE categories, products RESTART IDENTITY CASCADE')

  for (const c of CATEGORIES) {
    await pool.query('INSERT INTO categories (id, label) VALUES ($1, $2)', [c.id, c.label])
  }

  for (const p of PRODUCTS) {
    await pool.query(
      `INSERT INTO products
         (id, name, category, price, compare_at, rating, reviews, stock, badge, hue, blurb, description, features, colors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        p.id,
        p.name,
        p.category,
        p.price,
        p.compareAt,
        p.rating,
        p.reviews,
        p.stock,
        p.badge,
        p.hue,
        p.blurb,
        p.description,
        JSON.stringify(p.features),
        JSON.stringify(p.colors),
      ],
    )
  }

  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
