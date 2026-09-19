import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { productImage } from '../lib/image'
import { formatPrice } from '../lib/format'
import Rating from './Rating'
import Icon from './Icon'

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isWishlisted, categoryLabel } = useStore()
  const saved = isWishlisted(product.id)
  const outOfStock = product.stock <= 0

  return (
    <article className="card">
      <Link to={`/product/${product.id}`} className="card__media" aria-label={product.name}>
        <img src={productImage(product)} alt="" loading="lazy" />
        {product.badge && <span className="chip chip--badge">{product.badge}</span>}
        {product.compareAt && (
          <span className="chip chip--sale">
            −{Math.round((1 - product.price / product.compareAt) * 100)}%
          </span>
        )}
      </Link>

      <button
        type="button"
        className={`card__save ${saved ? 'is-active' : ''}`}
        onClick={() => toggleWishlist(product)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
      >
        <Icon name="heart" size={18} filled={saved} />
      </button>

      <div className="card__body">
        <span className="card__cat">{categoryLabel(product.category)}</span>
        <h3 className="card__title">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="card__blurb">{product.blurb}</p>
        <Rating value={product.rating} reviews={product.reviews} />

        <div className="card__foot">
          <div className="price">
            <span className="price__now">{formatPrice(product.price)}</span>
            {product.compareAt && (
              <span className="price__was">{formatPrice(product.compareAt)}</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => addToCart(product)}
            disabled={outOfStock}
          >
            {outOfStock ? 'Sold out' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  )
}
