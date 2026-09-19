// End-to-end flow test driven over the Chrome DevTools Protocol.
// No dependencies: uses Node's built-in global WebSocket.
//   node scripts/e2e.mjs [baseUrl]
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const PORT = 9333

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    try {
      await readFile(p)
      return p
    } catch {
      /* keep looking */
    }
  }
  throw new Error('No Chrome or Edge binary found')
}

async function pageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page
    } catch {
      /* browser still booting */
    }
    await sleep(150)
  }
  throw new Error('Could not reach the DevTools endpoint')
}

class Session {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    })
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description ?? 'evaluate threw')
    }
    return res.result.value
  }

  async goto(path) {
    await this.send('Page.navigate', { url: `${BASE}${path}` })
    await this.waitFor(
      '!!document.querySelector(".nav") && document.body.innerText.length > 80 && !document.body.innerText.includes("Loading Nimbus")',
    )
  }

  async waitFor(expression, timeout = 8000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      try {
        if (await this.eval(expression)) return true
      } catch {
        /* page mid-navigation */
      }
      await sleep(120)
    }
    throw new Error(`Timed out waiting for: ${expression}`)
  }
}

// Helpers injected into the page: click by visible text, and set React-controlled inputs.
const HELPERS = `
window.__t = {
  clickText(sel, text) {
    const el = [...document.querySelectorAll(sel)]
      .find(e => e.innerText.toLowerCase().includes(text.toLowerCase()));
    if (!el) throw new Error('no element matching ' + sel + ' / ' + text);
    el.click();
    return el.innerText.trim();
  },
  set(sel, value) {
    const el = document.querySelector(sel);
    if (!el) throw new Error('no input ' + sel);
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  },
  setByLabel(labelText, value) {
    const label = [...document.querySelectorAll('.field')]
      .find(l => l.querySelector('span')?.innerText.trim().toLowerCase() === labelText.toLowerCase());
    if (!label) throw new Error('no field labelled ' + labelText);
    const el = label.querySelector('input, select');
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  },
  store(key) {
    const raw = localStorage.getItem('nimbus:' + key);
    return raw === null ? null : JSON.parse(raw);
  },
  text(sel) {
    return document.querySelector(sel)?.innerText.replace(/\\s+/g, ' ').trim() ?? null;
  },
};
true;
`

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const chromePath = await findChrome()
const profile = await mkdtemp(join(tmpdir(), 'nimbus-e2e-'))
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--disable-extensions',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

let exitCode = 0
try {
  const target = await pageTarget()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', () => reject(new Error('WebSocket failed')), { once: true })
  })

  const s = new Session(ws)
  await s.send('Page.enable')
  await s.send('Runtime.enable')

  // --- 1. product page: add to bag -------------------------------------------
  await s.goto('/product/p-001')
  await s.eval(HELPERS)
  check('product page shows the product', (await s.eval(`__t.text('h1')`)) === 'Nimbus Halo Headphones')

  await s.eval(`__t.clickText('.swatch', 'Clay')`)
  await s.eval(`__t.clickText('.pdp__actions .btn--primary', 'Add to bag')`)
  await s.waitFor(`(__t.store('cart') || []).length === 1`)
  let cart = await s.eval(`__t.store('cart')`)
  check('adds a line to localStorage with the chosen colour', cart[0].id === 'p-001' && cart[0].color === 'Clay', JSON.stringify(cart[0]))
  check('cart badge shows 1', (await s.eval(`__t.text('.badge')`)) === '1')

  // --- 2. quantity stepper on the product page -------------------------------
  await s.eval(`__t.clickText('.stepper__btn[aria-label="Increase quantity"]', '')`)
  await s.eval(`__t.clickText('.stepper__btn[aria-label="Increase quantity"]', '')`)
  check('stepper reaches 3', (await s.eval(`__t.text('.stepper__value')`)) === '3')
  await s.eval(`__t.clickText('.pdp__actions .btn--primary', 'Add to bag')`)
  await s.waitFor(`__t.store('cart')[0].qty === 4`)
  check('adding again merges into the same line', (await s.eval(`__t.store('cart').length`)) === 1, 'qty now 4')

  // --- 3. persistence across a reload ----------------------------------------
  await s.goto('/cart')
  await s.eval(HELPERS)
  check('cart survives navigation', (await s.eval(`document.querySelectorAll('.line').length`)) === 1)
  const subtotal = await s.eval(`__t.text('.summary__rows div:first-child dd')`)
  check('subtotal is 4 × $249 = $996.00', subtotal === '$996.00', subtotal)
  check('free shipping applied over $150', (await s.eval(`__t.text('.summary__rows div:nth-child(2) dd')`)) === 'Free')

  // --- 4. promo codes ---------------------------------------------------------
  await s.eval(`__t.set('.promo-form input', 'BOGUS')`)
  await s.eval(`__t.clickText('.promo-form button', 'Apply')`)
  await s.waitFor(`!!document.querySelector('.toast--error')`)
  check('rejects an unknown promo code', true, 'error toast shown')
  check('no discount row after a bad code', (await s.eval(`!document.querySelector('.summary__row--save')`)) === true)

  await s.eval(`__t.set('.promo-form input', 'nimbus10')`)
  await s.eval(`__t.clickText('.promo-form button', 'Apply')`)
  await s.waitFor(`!!document.querySelector('.summary__row--save')`)
  const discount = await s.eval(`__t.text('.summary__row--save dd')`)
  check('NIMBUS10 discounts 10% (lowercase accepted)', discount === '−$99.60', discount)
  const total = await s.eval(`__t.text('.summary__total strong')`)
  check('total = (996 − 99.60) × 1.08 = $968.11', total === '$968.11', total)

  // --- 5. remove a line, then re-add -----------------------------------------
  await s.eval(`__t.clickText('.line__remove', 'Remove')`)
  await s.waitFor(`document.body.innerText.includes('Your bag is empty')`)
  check('removing the last line empties the bag', (await s.eval(`__t.store('cart').length`)) === 0)

  await s.goto('/catalog')
  await s.eval(HELPERS)
  check('catalog lists all 20 products', (await s.eval(`document.querySelectorAll('.card').length`)) === 20)
  await s.eval(`__t.clickText('.card .btn--primary', 'Add')`)
  await s.waitFor(`(__t.store('cart') || []).length === 1`)
  check('can add straight from a catalog card', true)

  // --- 6. wishlist ------------------------------------------------------------
  await s.eval(`document.querySelector('.card__save').click()`)
  await s.waitFor(`(__t.store('wishlist') || []).length === 1`)
  check('heart saves to the wishlist', true, (await s.eval(`__t.store('wishlist')`)).join(','))

  // --- 7. sign up (checkout/orders require an account) ------------------------
  await s.goto('/sign-up')
  await s.eval(HELPERS)
  const email = `nimbus-test+${Date.now()}@example.com`
  await s.eval(`__t.setByLabel('Full name', 'Ada Lovelace')`)
  await s.eval(`__t.setByLabel('Email', ${JSON.stringify(email)})`)
  await s.eval(`__t.setByLabel('Password', 'super-secret-nimbus-1')`)
  await s.eval(`__t.clickText('.btn--primary', 'Create account')`)
  await s.waitFor(`location.pathname === '/'`, 8000)
  check('sign-up redirects home', true)
  // Guest cart/wishlist get merged server-side on sign-in and localStorage is cleared.
  await s.waitFor(`__t.store('cart') === null`, 8000)
  const [mergedCart, mergedWishlist] = await s.eval(
    `Promise.all([fetch('/api/cart').then(r => r.json()), fetch('/api/wishlist').then(r => r.json())])`,
  )
  check('guest cart merged into the new account', mergedCart.length === 1, JSON.stringify(mergedCart))
  check('guest wishlist merged into the new account', mergedWishlist.length === 1, JSON.stringify(mergedWishlist))

  // --- 8. checkout validation -------------------------------------------------
  await s.goto('/checkout')
  await s.eval(HELPERS)
  await s.waitFor(`!!document.querySelector('.checkout')`) // RequireAuth + cart merge resolve async
  await s.eval(`__t.clickText('.summary .btn--primary', 'Pay')`)
  await s.waitFor(`document.querySelectorAll('.field--error').length > 0`)
  const errCount = await s.eval(`document.querySelectorAll('.field__err').length`)
  check('empty checkout is blocked with field errors', errCount >= 7, `${errCount} errors shown`)
  check('no order was created', (await s.eval(`(__t.store('orders') || []).length`)) === 0)

  await s.eval(`__t.setByLabel('Full name', 'Ada Lovelace')`)
  await s.eval(`__t.setByLabel('Email', 'not-an-email')`)
  await s.eval(`__t.setByLabel('Street address', '12 Analytical Way')`)
  await s.eval(`__t.setByLabel('City', 'Portland')`)
  await s.eval(`__t.setByLabel('Postal code', '97201')`)
  await s.eval(`__t.setByLabel('Card number', '4242424242424242')`)
  await s.eval(`__t.setByLabel('Expiry', '1228')`)
  await s.eval(`__t.setByLabel('CVC', '123')`)
  check('card number is formatted in groups of four', (await s.eval(`document.querySelector('.field input[placeholder^="4242"]').value`)) === '4242 4242 4242 4242')
  check('expiry auto-inserts the slash', (await s.eval(`document.querySelector('.field input[placeholder="MM/YY"]').value`)) === '12/28')

  await s.eval(`__t.clickText('.summary .btn--primary', 'Pay')`)
  await s.waitFor(`document.querySelectorAll('.field__err').length === 1`)
  check('bad email still blocks submission', (await s.eval(`__t.text('.field__err')`)).includes('valid email'))

  // --- 9. successful order ----------------------------------------------------
  await s.eval(`__t.setByLabel('Email', 'ada@example.com')`)
  await s.eval(`__t.clickText('.summary .btn--primary', 'Pay')`)
  await s.waitFor(`location.pathname.startsWith('/order/')`, 12000)
  await s.eval(HELPERS)
  check('lands on the confirmation page', (await s.eval(`__t.text('.confirm__hero h1')`)).includes('Ada'))
  const orders = await s.eval(`fetch('/api/orders').then(r => r.json())`)
  check('order is persisted with items and totals', orders.length === 1 && orders[0].items.length === 1, `card ending ${orders[0].details.cardLast4}`)
  const cartAfterOrder = await s.eval(`fetch('/api/cart').then(r => r.json())`)
  check('bag is emptied after ordering', cartAfterOrder.length === 0)
  check('promo is cleared after ordering', (await s.eval(`__t.store('promo')`)) === null)

  await s.goto('/orders')
  await s.eval(HELPERS)
  await s.waitFor(`!!document.querySelector('.orders')`) // RequireAuth resolves the session async
  check('order history lists the order', (await s.eval(`document.querySelectorAll('.order').length`)) === 1)

  // --- 10. reset demo data -----------------------------------------------------
  await s.eval(`__t.clickText('.cart__head button', 'Clear demo data')`)
  await s.waitFor(`document.body.innerText.includes('No orders yet')`)
  // Signed in, cart/wishlist/orders all live server-side — fetch them back
  // from the API rather than localStorage to confirm the reset actually hit them.
  const afterReset = await s.eval(
    `Promise.all([
       fetch('/api/orders').then(r => r.json()),
       fetch('/api/cart').then(r => r.json()),
       fetch('/api/wishlist').then(r => r.json()),
     ]).then(([orders, cart, wishlist]) => ({ orders, cart, wishlist, promo: __t.store('promo') }))`,
  )
  check(
    'clear demo data empties cart, wishlist, orders and promo',
    (afterReset.cart ?? []).length === 0 &&
      (afterReset.wishlist ?? []).length === 0 &&
      (afterReset.orders ?? []).length === 0 &&
      !afterReset.promo,
    JSON.stringify(afterReset),
  )

  ws.close()
} catch (err) {
  check('run completed without an unexpected error', false, err.message)
} finally {
  chrome.kill()
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
exitCode = failed.length === 0 ? 0 : 1
process.exit(exitCode)
