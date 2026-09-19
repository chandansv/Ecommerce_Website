import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { formatPrice, formatDate, orderNumber } from '../lib/format'
import { productImage } from '../lib/image'
import Icon from '../components/Icon'

export default function OrderConfirmation() {
  const { id } = useParams()
  const { orders, ordersLoaded } = useStore()
  const order = orders.find((o) => o.id === id)

  if (!ordersLoaded) return null

  if (!order) {
    return (
      <div className="empty">
        <Icon name="box" size={28} />
        <h2>Order not found</h2>
        <p className="muted">It may have been cleared with the demo data.</p>
        <Link to="/orders" className="btn btn--primary">
          View all orders
        </Link>
      </div>
    )
  }

  const eta = new Date(order.placedAt)
  eta.setDate(eta.getDate() + (order.details.shipping === 'express' ? 2 : 5))

  return (
    <div className="confirm">
      <div className="confirm__hero">
        <span className="confirm__tick">
          <Icon name="check" size={26} />
        </span>
        <h1>Thanks, {order.details.name.split(' ')[0]} — your order is in.</h1>
        <p className="muted">
          Order {orderNumber(order.id)} · placed {formatDate(order.placedAt)} · confirmation sent to{' '}
          {order.details.email}
        </p>
      </div>

      <div className="confirm__grid">
        <section className="panel">
          <h2>What you bought</h2>
          <ul className="lines lines--compact">
            {order.items.map((item) => (
              <li key={`${item.id}-${item.color ?? ''}`} className="line line--compact">
                <Link to={`/product/${item.id}`} className="line__media line__media--sm">
                  <img src={productImage(item)} alt="" />
                </Link>
                <div className="line__info">
                  <Link to={`/product/${item.id}`} className="line__name">
                    {item.name}
                  </Link>
                  <span className="muted">
                    {item.color ? `${item.color} · ` : ''}Qty {item.qty}
                  </span>
                </div>
                <div className="line__total">{formatPrice(item.price * item.qty)}</div>
              </li>
            ))}
          </ul>

          <dl className="summary__rows summary__rows--flush">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.totals.subtotal)}</dd>
            </div>
            {order.totals.discount > 0 && (
              <div className="summary__row--save">
                <dt>Discount</dt>
                <dd>−{formatPrice(order.totals.discount)}</dd>
              </div>
            )}
            <div>
              <dt>Shipping</dt>
              <dd>{order.totals.shipping === 0 ? 'Free' : formatPrice(order.totals.shipping)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{formatPrice(order.totals.tax)}</dd>
            </div>
          </dl>
          <div className="summary__total">
            <span>Paid</span>
            <strong>{formatPrice(order.totals.total)}</strong>
          </div>
        </section>

        <section className="panel">
          <h2>Delivery</h2>
          <p className="confirm__eta">
            <Icon name="truck" size={18} /> Estimated arrival <strong>{formatDate(eta.toISOString())}</strong>
          </p>
          <address className="confirm__address">
            {order.details.name}
            <br />
            {order.details.address}
            <br />
            {order.details.city} {order.details.postal}
            <br />
            {order.details.country}
          </address>
          <p className="muted">
            {order.details.shipping === 'express' ? 'Express' : 'Standard'} shipping · paid with card
            ending {order.details.cardLast4}
          </p>

          <div className="confirm__actions">
            <Link to="/orders" className="btn btn--ghost btn--block">
              View order history
            </Link>
            <Link to="/catalog" className="btn btn--primary btn--block">
              Continue shopping <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
