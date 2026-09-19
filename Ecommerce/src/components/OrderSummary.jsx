import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { formatPrice } from '../lib/format'
import Icon from './Icon'

export default function OrderSummary({ children, showPromo = true }) {
  const { totals, promo, applyPromo, clearPromo } = useStore()
  const [code, setCode] = useState('')

  function onApply(e) {
    e.preventDefault()
    if (!code.trim()) return
    if (applyPromo(code)) setCode('')
  }

  return (
    <aside className="summary">
      <h2>Order summary</h2>

      <dl className="summary__rows">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatPrice(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="summary__row--save">
            <dt>Discount ({promo.code})</dt>
            <dd>−{formatPrice(totals.discount)}</dd>
          </div>
        )}
        <div>
          <dt>Shipping</dt>
          <dd>{totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</dd>
        </div>
        <div>
          <dt>Estimated tax</dt>
          <dd>{formatPrice(totals.tax)}</dd>
        </div>
      </dl>

      <div className="summary__total">
        <span>Total</span>
        <strong>{formatPrice(totals.total)}</strong>
      </div>

      {!totals.freeShip && totals.remainingForFreeShip > 0 && (
        <p className="summary__nudge">
          <Icon name="truck" size={16} /> Add {formatPrice(totals.remainingForFreeShip)} more for free
          shipping.
        </p>
      )}

      {showPromo && (
        <div className="summary__promo">
          {promo ? (
            <div className="promo-applied">
              <span>
                <Icon name="check" size={15} /> <strong>{promo.code}</strong> — {promo.label}
              </span>
              <button type="button" className="link link--quiet" onClick={clearPromo}>
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={onApply} className="promo-form">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Promo code"
                aria-label="Promo code"
              />
              <button type="submit" className="btn btn--ghost btn--sm">
                Apply
              </button>
            </form>
          )}
          <p className="muted summary__hint">Try NIMBUS10 or FREESHIP.</p>
        </div>
      )}

      {children}
    </aside>
  )
}
