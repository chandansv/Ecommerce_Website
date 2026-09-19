import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'

export default function Footer() {
  const { resetDemoData, categories } = useStore()
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            Nimbus
          </Link>
          <p className="muted footer__blurb">
            A demo storefront. The catalog and your order history are stored in Postgres; cart and
            saved items stay in this browser — no account needed.
          </p>
        </div>

        <div className="footer__col">
          <h3>Shop</h3>
          {categories.map((c) => (
            <Link key={c.id} to={`/catalog?cat=${c.id}`}>
              {c.label}
            </Link>
          ))}
        </div>

        <div className="footer__col">
          <h3>Account</h3>
          <Link to="/saved">Saved items</Link>
          <Link to="/orders">Order history</Link>
          <Link to="/cart">Your bag</Link>
          <button type="button" className="link link--quiet" onClick={resetDemoData}>
            Reset demo data
          </button>
        </div>
      </div>
      <div className="footer__base muted">
        <span>© {new Date().getFullYear()} Nimbus Goods — demo build.</span>
        <span>React + Vite · mock data</span>
      </div>
    </footer>
  )
}
