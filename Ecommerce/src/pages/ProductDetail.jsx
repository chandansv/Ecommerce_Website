import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { productImage } from '../lib/image'
import { formatPrice } from '../lib/format'
import Rating from '../components/Rating'
import QtyStepper from '../components/QtyStepper'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, findProduct, categoryLabel, addToCart, toggleWishlist, isWishlisted } = useStore()
  const product = findProduct(id)

  const [color, setColor] = useState(product?.colors?.[0] ?? null)
  const [qty, setQty] = useState(1)

  if (!product) {
    return (
      <div className="empty">
        <Icon name="box" size={28} />
        <h2>We couldn’t find that product</h2>
        <Link to="/catalog" className="btn btn--primary">
          Back to catalog
        </Link>
      </div>
    )
  }

  const saved = isWishlisted(product.id)
  const outOfStock = product.stock <= 0
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  return (
    <div className="pdp">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalog?cat=${product.category}`}>{categoryLabel(product.category)}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="pdp__main">
        <div className="pdp__media">
          <img src={productImage(product)} alt={product.name} />
          {product.badge && <span className="chip chip--badge">{product.badge}</span>}
        </div>

        <div className="pdp__info">
          <span className="card__cat">{categoryLabel(product.category)}</span>
          <h1>{product.name}</h1>
          <Rating value={product.rating} reviews={product.reviews} />

          <div className="price price--lg">
            <span className="price__now">{formatPrice(product.price)}</span>
            {product.compareAt && <span className="price__was">{formatPrice(product.compareAt)}</span>}
            {product.compareAt && (
              <span className="chip chip--sale chip--static">
                Save {formatPrice(product.compareAt - product.price)}
              </span>
            )}
          </div>

          <p className="pdp__desc">{product.description}</p>

          {product.colors?.length > 1 && (
            <div className="pdp__field">
              <span className="pdp__label">Colour</span>
              <div className="swatches">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch ${color === c ? 'is-active' : ''}`}
                    onClick={() => setColor(c)}
                    aria-pressed={color === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pdp__field">
            <span className="pdp__label">Quantity</span>
            <div className="pdp__qty">
              <QtyStepper value={qty} onChange={setQty} max={Math.max(1, product.stock)} />
              <span className={`stock ${product.stock <= 10 ? 'stock--low' : ''}`}>
                {outOfStock
                  ? 'Out of stock'
                  : product.stock <= 10
                    ? `Only ${product.stock} left`
                    : 'In stock'}
              </span>
            </div>
          </div>

          <div className="pdp__actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              disabled={outOfStock}
              onClick={() => addToCart(product, { color, qty })}
            >
              <Icon name="bag" size={18} /> Add to bag · {formatPrice(product.price * qty)}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              disabled={outOfStock}
              onClick={() => {
                addToCart(product, { color, qty })
                navigate('/cart')
              }}
            >
              Buy now
            </button>
            <button
              type="button"
              className={`btn btn--icon btn--lg ${saved ? 'is-active' : ''}`}
              onClick={() => toggleWishlist(product)}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved' : 'Save for later'}
            >
              <Icon name="heart" size={18} filled={saved} />
            </button>
          </div>

          <ul className="pdp__features">
            {product.features.map((f) => (
              <li key={f}>
                <Icon name="check" size={15} /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2>More in {categoryLabel(product.category)}</h2>
          </div>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
