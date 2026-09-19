import express from 'express'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node'

try {
  process.loadEnvFile()
} catch {
  // No .env file — assume DATABASE_URL is set some other way (e.g. host env vars).
}

const { pool } = await import('./db/pool.js')
const { auth } = await import('./db/auth.js')

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')
const port = process.env.PORT || 3000

const app = express()

// Better Auth owns /api/auth/* end to end (its own body parsing, its own
// session cookie) — mount it before express.json() and before anything else.
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.use(async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    req.user = session?.user ?? null
    next()
  } catch (err) {
    next(err)
  }
})

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'sign in required' })
  next()
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    compareAt: row.compare_at === null ? null : Number(row.compare_at),
    rating: Number(row.rating),
    reviews: row.reviews,
    stock: row.stock,
    badge: row.badge,
    hue: row.hue,
    blurb: row.blurb,
    description: row.description,
    features: row.features,
    colors: row.colors,
  }
}

function mapOrder(row) {
  return {
    id: row.id,
    placedAt: row.placed_at,
    details: row.details,
    items: row.items,
    totals: row.totals,
  }
}

app.get('/api/catalog', async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      pool.query('SELECT * FROM products ORDER BY id'),
      pool.query('SELECT * FROM categories ORDER BY id'),
    ])
    res.json({
      products: products.rows.map(mapProduct),
      categories: categories.rows,
    })
  } catch (err) {
    next(err)
  }
})

app.get('/api/orders', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY placed_at DESC',
      [req.user.id],
    )
    res.json(result.rows.map(mapOrder))
  } catch (err) {
    next(err)
  }
})

app.get('/api/orders/:id', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' })
    res.json(mapOrder(result.rows[0]))
  } catch (err) {
    next(err)
  }
})

app.post('/api/orders', requireUser, async (req, res, next) => {
  try {
    const { details, items, totals } = req.body ?? {}
    if (!details || !items || !totals) {
      return res.status(400).json({ error: 'details, items and totals are required' })
    }
    const id = crypto.randomUUID()
    const result = await pool.query(
      `INSERT INTO orders (id, user_id, details, items, totals)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.user.id, JSON.stringify(details), JSON.stringify(items), JSON.stringify(totals)],
    )
    res.status(201).json(mapOrder(result.rows[0]))
  } catch (err) {
    next(err)
  }
})

app.delete('/api/orders', requireUser, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM orders WHERE user_id = $1', [req.user.id])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

function mapCartRow(row) {
  return { id: row.product_id, color: row.color, qty: row.qty }
}

app.get('/api/cart', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT product_id, color, qty FROM cart_items WHERE user_id = $1',
      [req.user.id],
    )
    res.json(result.rows.map(mapCartRow))
  } catch (err) {
    next(err)
  }
})

app.put('/api/cart', requireUser, async (req, res, next) => {
  try {
    const { id, color = null, qty } = req.body ?? {}
    if (!id || typeof qty !== 'number') {
      return res.status(400).json({ error: 'id and qty are required' })
    }
    if (qty <= 0) {
      await pool.query(
        `DELETE FROM cart_items
         WHERE user_id = $1 AND product_id = $2 AND COALESCE(color, '') = COALESCE($3, '')`,
        [req.user.id, id, color],
      )
    } else {
      const product = await pool.query('SELECT stock FROM products WHERE id = $1', [id])
      const cappedQty = Math.min(qty, product.rows[0]?.stock ?? 0)
      if (cappedQty <= 0) return res.status(400).json({ error: 'out of stock' })
      await pool.query(
        `INSERT INTO cart_items (user_id, product_id, color, qty)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, product_id, COALESCE(color, '')) DO UPDATE SET qty = EXCLUDED.qty`,
        [req.user.id, id, color, cappedQty],
      )
    }
    const result = await pool.query(
      'SELECT product_id, color, qty FROM cart_items WHERE user_id = $1',
      [req.user.id],
    )
    res.json(result.rows.map(mapCartRow))
  } catch (err) {
    next(err)
  }
})

app.delete('/api/cart', requireUser, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.post('/api/cart/merge', requireUser, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    for (const item of items) {
      if (!item?.id || !(item.qty > 0)) continue
      const color = item.color ?? null
      const product = await pool.query('SELECT stock FROM products WHERE id = $1', [item.id])
      const stock = product.rows[0]?.stock ?? 0
      if (stock <= 0) continue
      const existing = await pool.query(
        `SELECT qty FROM cart_items
         WHERE user_id = $1 AND product_id = $2 AND COALESCE(color, '') = COALESCE($3, '')`,
        [req.user.id, item.id, color],
      )
      const mergedQty = Math.min(stock, (existing.rows[0]?.qty ?? 0) + item.qty)
      await pool.query(
        `INSERT INTO cart_items (user_id, product_id, color, qty)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, product_id, COALESCE(color, '')) DO UPDATE SET qty = EXCLUDED.qty`,
        [req.user.id, item.id, color, mergedQty],
      )
    }
    const result = await pool.query(
      'SELECT product_id, color, qty FROM cart_items WHERE user_id = $1',
      [req.user.id],
    )
    res.json(result.rows.map(mapCartRow))
  } catch (err) {
    next(err)
  }
})

app.get('/api/wishlist', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT product_id FROM wishlist_items WHERE user_id = $1', [req.user.id])
    res.json(result.rows.map((r) => r.product_id))
  } catch (err) {
    next(err)
  }
})

app.put('/api/wishlist/:productId', requireUser, async (req, res, next) => {
  try {
    await pool.query(
      'INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.productId],
    )
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.delete('/api/wishlist/:productId', requireUser, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [
      req.user.id,
      req.params.productId,
    ])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.delete('/api/wishlist', requireUser, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM wishlist_items WHERE user_id = $1', [req.user.id])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.post('/api/wishlist/merge', requireUser, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
    for (const id of ids) {
      await pool.query(
        'INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, id],
      )
    }
    const result = await pool.query('SELECT product_id FROM wishlist_items WHERE user_id = $1', [req.user.id])
    res.json(result.rows.map((r) => r.product_id))
  } catch (err) {
    next(err)
  }
})

app.use(express.static(distDir))

// SPA fallback: let react-router handle any route that isn't a static asset or API call.
// Plain middleware (not a '*' route) so this works across Express major versions.
app.use((req, res) => {
  res.sendFile(join(distDir, 'index.html'))
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'internal server error' })
})

app.listen(port, () => {
  console.log(`Nimbus running at http://localhost:${port}`)
})
