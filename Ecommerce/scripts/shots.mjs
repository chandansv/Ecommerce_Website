// Seeds a cart via localStorage, then screenshots the pages that need state.
//   node scripts/shots.mjs [baseUrl]
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = 'C:/Claude_App_1/.shots'
const PORT = 9334

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
      const page = (await res.json()).find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page
    } catch {
      /* still booting */
    }
    await sleep(150)
  }
  throw new Error('Could not reach the DevTools endpoint')
}

const chromePath = await findChrome()
const profile = await mkdtemp(join(tmpdir(), 'nimbus-shots-'))
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

try {
  const target = await pageTarget()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', () => rej(new Error('ws failed')), { once: true })
  })

  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(m.error.message)) : resolve(m.result)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = (expression) =>
    send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })

  await send('Page.enable')
  await send('Runtime.enable')

  async function shot(name, path, height) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1400,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await send('Page.navigate', { url: `${BASE}${path}` })
    await sleep(2200)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
    console.log(`wrote ${name}.png  (${path})`)
  }

  // Seed a cart plus a promo, straight into the storage keys the app reads.
  await send('Page.navigate', { url: BASE })
  await sleep(1800)
  await evaluate(`
    localStorage.setItem('nimbus:cart', JSON.stringify([
      { key: 'p-001::Fog', id: 'p-001', color: 'Fog', qty: 2 },
      { key: 'p-007::Black', id: 'p-007', color: 'Black', qty: 1 },
      { key: 'p-019', id: 'p-019', color: 'Heather', qty: 3 }
    ]));
    localStorage.setItem('nimbus:promo', JSON.stringify(
      { code: 'NIMBUS10', kind: 'percent', value: 0.1, label: '10% off your order' }
    ));
    localStorage.setItem('nimbus:wishlist', JSON.stringify(['p-012','p-018']));
    true;
  `)

  await shot('catalog', '/catalog', 1500)
  await shot('cart', '/cart', 1000)
  await shot('checkout', '/checkout', 1500)
  await shot('saved', '/saved', 850)

  ws.close()
} finally {
  chrome.kill()
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}
