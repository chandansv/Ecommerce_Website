import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'

export default function Saved() {
  const { wishlist, addToCart, findProduct } = useStore()
  const items = wishlist.map(findProduct).filter(Boolean)

  if (items.length === 0) {
    return (
      <div className="empty">
        <Icon name="heart" size={30} />
        <h2>Nothing saved yet</h2>
        <p className="muted">Tap the heart on any product to keep it here for later.</p>
        <Link to="/catalog" className="btn btn--primary">
          Find something
        </Link>
      </div>
    )
  }

  return (
    <div className="catalog">
      <div className="cart__head">
        <div>
          <h1>Saved items</h1>
          <p className="muted">{items.length} saved in this browser.</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => items.filter((p) => p.stock > 0).forEach((p) => addToCart(p))}
        >
          <Icon name="bag" size={15} /> Add all to bag
        </button>
      </div>
      <div className="grid">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
