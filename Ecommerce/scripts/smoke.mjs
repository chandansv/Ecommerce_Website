// Headless smoke test: renders each route in Chrome, asserts React mounted and
// reports the page heading. Run with the dev server already listening.
//   node scripts/smoke.mjs [baseUrl]
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const BASE = process.argv[2] ?? 'http://localhost:5173'

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]

const ROUTES = [
  { path: '/', expect: 'Things worth' },
  { path: '/catalog', expect: 'All products' },
  { path: '/catalog?cat=audio&sale=1', expect: 'All products' },
  { path: '/catalog?q=zzzznomatch', expect: 'Nothing matched' },
  { path: '/product/p-001', expect: 'Nimbus Halo Headphones' },
  { path: '/product/does-not-exist', expect: 'couldn’t find that product' },
  { path: '/cart', expect: 'Your bag is empty' },
  { path: '/checkout', expect: 'Sign in' }, // signed out -> redirects to /sign-in
  { path: '/orders', expect: 'Sign in' }, // signed out -> redirects to /sign-in
  { path: '/saved', expect: 'Nothing saved yet' },
  { path: '/order/nope', expect: 'Sign in' }, // signed out -> redirects to /sign-in
  { path: '/sign-in', expect: 'Sign in' },
  { path: '/sign-up', expect: 'Create an account' },
  { path: '/totally-unknown', expect: 'doesn’t exist' },
]

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

function textOf(html) {
  // Take everything from #root onward, then drop the script/style tags Vite
  // injects into the body so what's left is the rendered app markup.
  const start = html.indexOf('<div id="root">')
  const inner = start === -1 ? '' : html.slice(start)
  const markup = inner
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
  return {
    length: markup.length,
    text: markup
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#x27;|&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim(),
  }
}

const chrome = await findChrome()
const dir = await mkdtemp(join(tmpdir(), 'nimbus-smoke-'))
let failures = 0

for (const route of ROUTES) {
  const url = `${BASE}${route.path}`
  let html = ''
  try {
    const { stdout } = await run(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        `--user-data-dir=${join(dir, 'profile')}`,
        '--virtual-time-budget=6000',
        '--dump-dom',
        url,
      ],
      { maxBuffer: 40 * 1024 * 1024 },
    )
    html = stdout
  } catch (err) {
    console.log(`FAIL  ${route.path} — chrome error: ${err.message.split('\n')[0]}`)
    failures++
    continue
  }

  const { length, text } = textOf(html)
  const mounted = length > 500
  const matched = text.includes(route.expect)
  const status = mounted && matched ? 'ok  ' : 'FAIL'
  if (status === 'FAIL') failures++
  console.log(
    `${status}  ${route.path.padEnd(30)} dom=${String(length).padEnd(6)} ` +
      `${matched ? '' : `expected “${route.expect}” — got: ${text.slice(0, 90)}`}`,
  )
}

await rm(dir, { recursive: true, force: true })
console.log(`\n${ROUTES.length - failures}/${ROUTES.length} routes passed`)
process.exit(failures === 0 ? 0 : 1)
