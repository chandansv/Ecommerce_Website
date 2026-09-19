import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { productImage } from '../lib/image'
import { formatPrice } from '../lib/format'
import QtyStepper from '../components/QtyStepper'
import OrderSummary from '../components/OrderSummary'
import Icon from '../components/Icon'

export default function Cart() {
  const { lines, setQty, removeLine, clearCart } = useStore()

  if (lines.length === 0) {
    return (
      <div className="empty">
        <Icon name="bag" size={30} />
        <h2>Your bag is empty</h2>
        <p className="muted">Once you add something it stays here, even if you close the tab.</p>
        <Link to="/catalog" className="btn btn--primary">
          Start shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="cart">
      <div className="cart__head">
        <h1>Your bag</h1>
        <button type="button" className="link link--quiet" onClick={clearCart}>
          Empty bag
        </button>
      </div>

      <div className="cart__body">
        <ul className="lines">
          {lines.map((line) => (
            <li key={line.key} className="line">
              <Link to={`/product/${line.id}`} className="line__media">
                <img src={productImage(line.product)} alt="" />
              </Link>

              <div className="line__info">
                <Link to={`/product/${line.id}`} className="line__name">
                  {line.product.name}
                </Link>
                {line.color && <span className="muted">Colour: {line.color}</span>}
                <span className="muted">{formatPrice(line.product.price)} each</span>
                <button type="button" className="link link--quiet line__remove" onClick={() => removeLine(line.key)}>
                  <Icon name="trash" size={14} /> Remove
                </button>
              </div>

              <div className="line__qty">
                <QtyStepper
                  value={line.qty}
                  onChange={(v) => setQty(line.key, v)}
                  max={line.product.stock}
                  min={0}
                  label={`Quantity for ${line.product.name}`}
                />
                {line.qty >= line.product.stock && (
                  <span className="muted line__cap">Max available</span>
                )}
              </div>

              <div className="line__total">{formatPrice(line.lineTotal)}</div>
            </li>
          ))}
        </ul>

        <OrderSummary>
          <Link to="/checkout" className="btn btn--primary btn--lg btn--block">
            Checkout <Icon name="arrowRight" size={17} />
          </Link>
          <Link to="/catalog" className="btn btn--ghost btn--block">
            Keep shopping
          </Link>
        </OrderSummary>
      </div>
    </div>
  )
}
