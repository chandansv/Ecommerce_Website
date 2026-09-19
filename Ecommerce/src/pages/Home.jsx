import { Link } from 'react-router-dom'
import { useStore, FREE_SHIPPING_THRESHOLD } from '../store/StoreContext'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'
import { formatPrice } from '../lib/format'

const PROMISES = [
  { icon: 'truck', title: 'Free shipping', copy: `On every order over ${formatPrice(FREE_SHIPPING_THRESHOLD)}.` },
  { icon: 'refresh', title: '60-day returns', copy: 'Unused, in the box, no questions asked.' },
  { icon: 'shield', title: '2-year warranty', copy: 'Covers anything we got wrong in the factory.' },
]

export default function Home() {
  const { products, categories } = useStore()
  const featured = products.filter((p) => p.badge).slice(0, 4)
  // Skip anything already shown above so the two rows don't repeat themselves.
  const deals = products.filter((p) => p.compareAt && !featured.includes(p)).slice(0, 4)

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="chip chip--soft">New season · Autumn drop</span>
          <h1>
            Things worth<br />
            keeping around.
          </h1>
          <p>
            A small catalog of audio, desk and outdoor gear chosen because it lasts. Twenty
            products, no filler, and a promo code that actually works.
          </p>
          <div className="hero__cta">
            <Link to="/catalog" className="btn btn--primary btn--lg">
              Shop the catalog <Icon name="arrowRight" size={18} />
            </Link>
            <Link to="/catalog?sale=1" className="btn btn--ghost btn--lg">
              See what’s on sale
            </Link>
          </div>
          <p className="hero__note">
            Try code <code>NIMBUS10</code> at checkout for 10% off.
          </p>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="blob blob--1" />
          <div className="blob blob--2" />
          <div className="blob blob--3" />
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Shop by category</h2>
        </div>
        <div className="cats">
          {categories.map((c) => (
            <Link key={c.id} to={`/catalog?cat=${c.id}`} className="cat">
              <span className="cat__label">{c.label}</span>
              <span className="cat__count">
                {products.filter((p) => p.category === c.id).length} items
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Picked for you</h2>
          <Link to="/catalog" className="link">
            All products <Icon name="arrowRight" size={15} />
          </Link>
        </div>
        <div className="grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="promises">
          {PROMISES.map((p) => (
            <div key={p.title} className="promise">
              <Icon name={p.icon} size={22} />
              <div>
                <strong>{p.title}</strong>
                <p>{p.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>On sale now</h2>
          <Link to="/catalog?sale=1" className="link">
            All deals <Icon name="arrowRight" size={15} />
          </Link>
        </div>
        <div className="grid">
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  )
}
