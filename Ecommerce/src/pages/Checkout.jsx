import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { formatPrice } from '../lib/format'
import OrderSummary from '../components/OrderSummary'
import Icon from '../components/Icon'

const EMPTY = {
  name: '',
  email: '',
  address: '',
  city: '',
  postal: '',
  country: 'United States',
  shipping: 'standard',
  card: '',
  expiry: '',
  cvc: '',
}

function validate(form) {
  const e = {}
  if (!form.name.trim()) e.name = 'Enter the name on the order'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = 'Enter a valid email address'
  if (!form.address.trim()) e.address = 'Enter a street address'
  if (!form.city.trim()) e.city = 'Enter a city'
  if (!/^[A-Za-z0-9 -]{3,10}$/.test(form.postal.trim())) e.postal = 'Enter a valid postal code'
  if (form.card.replace(/\s/g, '').length !== 16) e.card = 'Card number must be 16 digits'
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) e.expiry = 'Use MM/YY'
  if (!/^\d{3,4}$/.test(form.cvc)) e.cvc = 'CVC is 3–4 digits'
  return e
}

function formatCard(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export default function Checkout() {
  const { lines, totals, cartReady, placeOrder } = useStore()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  if (!cartReady) return null
  if (lines.length === 0) return <Navigate to="/cart" replace />

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.querySelector('.field--error input')?.focus()
      return
    }
    setSubmitting(true)
    // Stand-in for the payment call the backend will make later.
    await new Promise((r) => setTimeout(r, 900))
    const order = await placeOrder({
      name: form.name.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      postal: form.postal.trim(),
      country: form.country,
      shipping: form.shipping,
      cardLast4: form.card.replace(/\s/g, '').slice(-4),
    })
    setSubmitting(false)
    if (!order) return
    navigate(`/order/${order.id}`, { replace: true })
  }

  function field(name, label, props = {}) {
    return (
      <label className={`field ${errors[name] ? 'field--error' : ''}`}>
        <span>{label}</span>
        <input
          value={form[name]}
          onChange={(e) => set(name, props.transform ? props.transform(e.target.value) : e.target.value)}
          aria-invalid={Boolean(errors[name])}
          autoComplete={props.autoComplete}
          inputMode={props.inputMode}
          placeholder={props.placeholder}
        />
        {errors[name] && <em className="field__err">{errors[name]}</em>}
      </label>
    )
  }

  return (
    <div className="checkout">
      <div className="checkout__head">
        <h1>Checkout</h1>
        <Link to="/cart" className="link link--quiet">
          Back to bag
        </Link>
      </div>

      <div className="checkout__body">
        <form className="form" onSubmit={onSubmit} noValidate>
          <fieldset className="form__block">
            <legend>Contact</legend>
            {field('name', 'Full name', { autoComplete: 'name', placeholder: 'Ada Lovelace' })}
            {field('email', 'Email', { autoComplete: 'email', placeholder: 'ada@example.com' })}
          </fieldset>

          <fieldset className="form__block">
            <legend>Shipping address</legend>
            {field('address', 'Street address', { autoComplete: 'street-address', placeholder: '12 Analytical Way' })}
            <div className="form__row">
              {field('city', 'City', { autoComplete: 'address-level2', placeholder: 'Portland' })}
              {field('postal', 'Postal code', { autoComplete: 'postal-code', placeholder: '97201' })}
            </div>
            <label className="field">
              <span>Country</span>
              <select value={form.country} onChange={(e) => set('country', e.target.value)}>
                {['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia', 'India'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="form__block">
            <legend>Delivery speed</legend>
            <div className="radios">
              {[
                { id: 'standard', label: 'Standard', copy: '4–6 business days', cost: totals.shipping },
                { id: 'express', label: 'Express', copy: '2 business days', cost: totals.shipping + 12 },
              ].map((opt) => (
                <label key={opt.id} className={`radio ${form.shipping === opt.id ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    checked={form.shipping === opt.id}
                    onChange={() => set('shipping', opt.id)}
                  />
                  <span className="radio__main">
                    <strong>{opt.label}</strong>
                    <span className="muted">{opt.copy}</span>
                  </span>
                  <span className="radio__cost">{opt.cost === 0 ? 'Free' : formatPrice(opt.cost)}</span>
                </label>
              ))}
            </div>
            <p className="muted form__note">
              Express pricing is illustrative in this demo — the summary charges the standard rate.
            </p>
          </fieldset>

          <fieldset className="form__block">
            <legend>Payment</legend>
            <p className="demo-note">
              <Icon name="shield" size={15} /> Demo only — nothing is sent anywhere. Use any 16
              digits, e.g. 4242 4242 4242 4242.
            </p>
            {field('card', 'Card number', {
              transform: formatCard,
              inputMode: 'numeric',
              placeholder: '4242 4242 4242 4242',
            })}
            <div className="form__row">
              {field('expiry', 'Expiry', { transform: formatExpiry, inputMode: 'numeric', placeholder: 'MM/YY' })}
              {field('cvc', 'CVC', {
                transform: (v) => v.replace(/\D/g, '').slice(0, 4),
                inputMode: 'numeric',
                placeholder: '123',
              })}
            </div>
          </fieldset>
        </form>

        <OrderSummary showPromo>
          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? 'Placing order…' : `Pay ${formatPrice(totals.total)}`}
          </button>
          <p className="muted summary__hint">
            {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'} in this order.
          </p>
        </OrderSummary>
      </div>
    </div>
  )
}
