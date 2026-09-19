// Product imagery is generated as an inline SVG data URI so the demo works
// offline and nothing depends on a CDN. Swap productImage() for a real `image`
// field on the product when the backend lands.

const GLYPHS = {
  audio: 'M8 30 V18 a12 12 0 0 1 24 0 v12 M8 26 h5 v10 H8 z M27 26 h5 v10 h-5 z',
  wearables: 'M14 4 h12 l-1 6 a10 10 0 1 1 -10 0 z M15 30 a10 10 0 1 0 10 0 l1 6 H14 z',
  desk: 'M4 14 h32 v4 H4 z M8 18 v18 M32 18 v18 M20 18 v10',
  home: 'M4 18 L20 5 L36 18 M9 18 v17 h22 V18',
  outdoor: 'M20 4 L34 34 H6 z M14 22 l6-8 6 8',
  bags: 'M7 14 h26 l2 22 H5 z M14 14 v-4 a6 6 0 0 1 12 0 v4',
}

function svg(hue, category) {
  const a = `hsl(${hue} 62% 62%)`
  const b = `hsl(${(hue + 38) % 360} 58% 40%)`
  const glyph = GLYPHS[category] ?? GLYPHS.home
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <circle cx="330" cy="60" r="120" fill="#fff" opacity="0.10"/>
  <circle cx="70" cy="250" r="90" fill="#000" opacity="0.07"/>
  <g transform="translate(180 110) scale(2.2)" fill="none" stroke="#fff" stroke-opacity="0.85"
     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${glyph}"/>
  </g>
</svg>`
}

export function productImage(product) {
  // encodeURIComponent keeps the `#` in hex colours and the quotes valid in a data URI.
  return `data:image/svg+xml,${encodeURIComponent(svg(product.hue, product.category))}`
}
