import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { formatPrice, formatDate, orderNumber } from '../lib/format'
import { productImage } from '../lib/image'
import Icon from '../components/Icon'

export default function Orders() {
  const { orders, ordersLoaded, resetDemoData } = useStore()

  if (!ordersLoaded) return null

  if (orders.length === 0) {
    return (
      <div className="empty">
        <Icon name="box" size={30} />
        <h2>No orders yet</h2>
        <p className="muted">Place one and it will show up here.</p>
        <Link to="/catalog" className="btn btn--primary">
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <div className="orders">
      <div className="cart__head">
        <div>
          <h1>Order history</h1>
          <p className="muted">{orders.length} order{orders.length === 1 ? '' : 's'} on this device.</p>
        </div>
        <button type="button" className="link link--quiet" onClick={resetDemoData}>
          Clear demo data
        </button>
      </div>

      <ul className="orders__list">
        {orders.map((order) => (
          <li key={order.id} className="panel order">
            <div className="order__head">
              <div>
                <strong>{orderNumber(order.id)}</strong>
                <span className="muted"> · {formatDate(order.placedAt)}</span>
              </div>
              <div className="order__meta">
                <span className="chip chip--soft chip--static">
                  {order.details.shipping === 'express' ? 'Express' : 'Standard'}
                </span>
                <strong>{formatPrice(order.totals.total)}</strong>
              </div>
            </div>

            <div className="order__thumbs">
              {order.items.map((item) => (
                <Link
                  key={`${item.id}-${item.color ?? ''}`}
                  to={`/product/${item.id}`}
                  className="order__thumb"
                  title={`${item.name} × ${item.qty}`}
                >
                  <img src={productImage(item)} alt={item.name} />
                  {item.qty > 1 && <span className="order__qty">{item.qty}</span>}
                </Link>
              ))}
            </div>

            <div className="order__foot">
              <span className="muted">
                Shipped to {order.details.city}, {order.details.country}
              </span>
              <Link to={`/order/${order.id}`} className="link">
                View details <Icon name="arrowRight" size={15} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
