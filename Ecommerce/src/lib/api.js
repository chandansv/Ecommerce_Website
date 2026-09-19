// Thin fetch wrappers around the Express API. Same-origin, so cookies (the
// anonymous session id) travel automatically — no CORS/credentials config needed.

async function json(res) {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export function fetchCatalog() {
  return fetch('/api/catalog').then(json)
}

export function fetchOrders() {
  return fetch('/api/orders').then(json)
}

export function createOrder(payload) {
  return fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(json)
}

export async function clearOrders() {
  const res = await fetch('/api/orders', { method: 'DELETE' })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
}

export function fetchCart() {
  return fetch('/api/cart').then(json)
}

export function putCartLine(line) {
  return fetch('/api/cart', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(line),
  }).then(json)
}

export async function clearCartServer() {
  const res = await fetch('/api/cart', { method: 'DELETE' })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
}

export function mergeCart(items) {
  return fetch('/api/cart/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  }).then(json)
}

export function fetchWishlist() {
  return fetch('/api/wishlist').then(json)
}

export async function putWishlistItem(productId) {
  const res = await fetch(`/api/wishlist/${productId}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
}

export async function removeWishlistItem(productId) {
  const res = await fetch(`/api/wishlist/${productId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
}

export async function clearWishlistServer() {
  const res = await fetch('/api/wishlist', { method: 'DELETE' })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
}

export function mergeWishlist(ids) {
  return fetch('/api/wishlist/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  }).then(json)
}
