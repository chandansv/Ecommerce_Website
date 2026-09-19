import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/StoreContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Toasts from './components/Toasts'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import Orders from './pages/Orders'
import Saved from './pages/Saved'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import NotFound from './pages/NotFound'
import RequireAuth from './components/RequireAuth'

function ScrollToTop() {
  const { pathname } = useLocation()
  // Block body on purpose: an effect must return a cleanup function or nothing.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { productsLoaded, catalogError } = useStore()

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="main">
        {catalogError ? (
          <div className="empty">
            <h2>Couldn’t load the catalog</h2>
            <p className="muted">{catalogError}</p>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : !productsLoaded ? (
          <div className="empty">
            <p className="muted">Loading Nimbus…</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <Checkout />
                </RequireAuth>
              }
            />
            <Route
              path="/order/:id"
              element={
                <RequireAuth>
                  <OrderConfirmation />
                </RequireAuth>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <Orders />
                </RequireAuth>
              }
            />
            <Route path="/saved" element={<Saved />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
      <Footer />
      <Toasts />
    </>
  )
}
