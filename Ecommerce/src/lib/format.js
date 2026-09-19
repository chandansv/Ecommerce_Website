const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatPrice(cents) {
  return money.format(cents)
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function orderNumber(id) {
  return `NMB-${id.slice(-6).toUpperCase()}`
}
