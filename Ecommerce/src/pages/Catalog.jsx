import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'
import { formatPrice } from '../lib/format'

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
  { id: 'name', label: 'Name A–Z' },
]

const PRICE_CEIL = 600

export default function Catalog() {
  const { products, categories } = useStore()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = params.get('q') ?? ''
  const cats = params.get('cat')?.split(',').filter(Boolean) ?? []
  const saleOnly = params.get('sale') === '1'
  const inStockOnly = params.get('stock') === '1'
  const sort = params.get('sort') ?? 'featured'
  const maxPrice = Number(params.get('max') ?? PRICE_CEIL)

  function patch(next) {
    const merged = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v === null || v === '' || v === undefined) merged.delete(k)
      else merged.set(k, String(v))
    })
    setParams(merged, { replace: true })
  }

  function toggleCat(id) {
    const next = cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id]
    patch({ cat: next.length ? next.join(',') : null })
  }

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    let out = products.filter((p) => {
      if (cats.length && !cats.includes(p.category)) return false
      if (saleOnly && !p.compareAt) return false
      if (inStockOnly && p.stock <= 0) return false
      if (p.price > maxPrice) return false
      if (!term) return true
      return (
        p.name.toLowerCase().includes(term) ||
        p.blurb.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      )
    })

    const by = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      name: (a, b) => a.name.localeCompare(b.name),
      featured: (a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)) || b.rating - a.rating,
    }
    return [...out].sort(by[sort] ?? by.featured)
  }, [products, q, cats, saleOnly, inStockOnly, maxPrice, sort])

  const activeCount = cats.length + (saleOnly ? 1 : 0) + (inStockOnly ? 1 : 0) + (maxPrice < PRICE_CEIL ? 1 : 0)

  return (
    <div className="catalog">
      <div className="catalog__head">
        <div>
          <h1>{q ? `Results for “${q}”` : 'All products'}</h1>
          <p className="muted">
            {results.length} {results.length === 1 ? 'product' : 'products'}
            {activeCount > 0 && ` · ${activeCount} filter${activeCount === 1 ? '' : 's'} active`}
          </p>
        </div>
        <div className="catalog__tools">
          <button
            type="button"
            className="btn btn--ghost btn--sm filters-toggle"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <Icon name="sliders" size={16} /> Filters
            {activeCount > 0 && <span className="pill">{activeCount}</span>}
          </button>
          <label className="select">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => patch({ sort: e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="catalog__body">
        <aside className={`filters ${filtersOpen ? 'is-open' : ''}`}>
          <div className="filters__group">
            <h3>Category</h3>
            {categories.map((c) => (
              <label key={c.id} className="check">
                <input
                  type="checkbox"
                  checked={cats.includes(c.id)}
                  onChange={() => toggleCat(c.id)}
                />
                <span>{c.label}</span>
                <span className="muted">{products.filter((p) => p.category === c.id).length}</span>
              </label>
            ))}
          </div>

          <div className="filters__group">
            <h3>Max price</h3>
            <input
              type="range"
              min="20"
              max={PRICE_CEIL}
              step="10"
              value={maxPrice}
              onChange={(e) => patch({ max: Number(e.target.value) === PRICE_CEIL ? null : e.target.value })}
              aria-label="Maximum price"
            />
            <div className="filters__range">
              <span className="muted">$20</span>
              <strong>{maxPrice >= PRICE_CEIL ? 'Any' : `Up to ${formatPrice(maxPrice)}`}</strong>
            </div>
          </div>

          <div className="filters__group">
            <h3>Availability</h3>
            <label className="check">
              <input type="checkbox" checked={saleOnly} onChange={(e) => patch({ sale: e.target.checked ? 1 : null })} />
              <span>On sale</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => patch({ stock: e.target.checked ? 1 : null })} />
              <span>In stock</span>
            </label>
          </div>

          {activeCount > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => patch({ cat: null, sale: null, stock: null, max: null })}>
              Clear all filters
            </button>
          )}
        </aside>

        <div className="catalog__results">
          {results.length === 0 ? (
            <div className="empty">
              <Icon name="search" size={28} />
              <h2>Nothing matched</h2>
              <p className="muted">Try a broader price range or fewer categories.</p>
              <button type="button" className="btn btn--primary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                Reset search
              </button>
            </div>
          ) : (
            <div className="grid">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
