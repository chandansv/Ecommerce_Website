import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useSession, signOut } from '../lib/authClient'
import Icon from './Icon'

export default function Navbar() {
  const { totals, wishlist } = useStore()
  const { data: session } = useSession()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function onSearch(e) {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/catalog?q=${encodeURIComponent(term)}` : '/catalog')
    setOpen(false)
  }

  async function onSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand__mark" aria-hidden="true" />
          Nimbus
        </Link>

        <nav className={`nav__links ${open ? 'is-open' : ''}`}>
          <NavLink to="/catalog" onClick={() => setOpen(false)}>
            Shop
          </NavLink>
          <NavLink to="/saved" onClick={() => setOpen(false)}>
            Saved{wishlist.length > 0 && <span className="pill">{wishlist.length}</span>}
          </NavLink>
          <NavLink to="/orders" onClick={() => setOpen(false)}>
            Orders
          </NavLink>
          {session ? (
            <button type="button" className="nav__signout" onClick={onSignOut}>
              Sign out
            </button>
          ) : (
            <NavLink to="/sign-in" onClick={() => setOpen(false)}>
              Sign in
            </NavLink>
          )}
        </nav>

        <form className="search" onSubmit={onSearch} role="search">
          <Icon name="search" size={17} className="search__icon" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
        </form>

        <div className="nav__actions">
          <Link to="/cart" className="nav__cart" aria-label={`Bag, ${totals.itemCount} items`}>
            <Icon name="bag" size={21} />
            {totals.itemCount > 0 && <span className="badge">{totals.itemCount}</span>}
          </Link>
          <button
            type="button"
            className="nav__burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <Icon name={open ? 'x' : 'sliders'} size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
