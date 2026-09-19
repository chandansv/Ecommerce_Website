import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useCallback,
} from 'react'
import { load, save, remove, clearAll } from '../lib/storage'
import {
  fetchCatalog,
  fetchOrders,
  createOrder,
  clearOrders,
  fetchCart,
  putCartLine,
  clearCartServer,
  mergeCart,
  fetchWishlist,
  putWishlistItem,
  removeWishlistItem,
  clearWishlistServer,
  mergeWishlist,
} from '../lib/api'
import { useSession } from '../lib/authClient'

const StoreContext = createContext(null)

export const FREE_SHIPPING_THRESHOLD = 150
export const SHIPPING_FLAT = 8
export const TAX_RATE = 0.08

const PROMOS = {
  NIMBUS10: { code: 'NIMBUS10', kind: 'percent', value: 0.1, label: '10% off your order' },
  FREESHIP: { code: 'FREESHIP', kind: 'shipping', value: 0, label: 'Free standard shipping' },
}

function lineKey(id, color) {
  return color ? `${id}::${color}` : id
}

const initialState = {
  products: [],
  categories: [],
  productsLoaded: false,
  catalogError: null,
  cart: load('cart', []),
  wishlist: load('wishlist', []),
  orders: [],
  ordersLoaded: false,
  promo: load('promo', null),
  toasts: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'catalog/loaded':
      return { ...state, products: action.products, categories: action.categories, productsLoaded: true, catalogError: null }
    case 'catalog/error':
      return { ...state, catalogError: action.error }
    case 'orders/loaded':
      return { ...state, orders: action.orders, ordersLoaded: true }
    case 'cart/add': {
      const { product, color = null, qty = 1 } = action
      const key = lineKey(product.id, color)
      const existing = state.cart.find((l) => l.key === key)
      const cart = existing
        ? state.cart.map((l) =>
            l.key === key ? { ...l, qty: Math.min(l.qty + qty, product.stock) } : l,
          )
        : [...state.cart, { key, id: product.id, color, qty: Math.min(qty, product.stock) }]
      return { ...state, cart }
    }
    case 'cart/setQty': {
      const cart = state.cart
        .map((l) => (l.key === action.key ? { ...l, qty: action.qty } : l))
        .filter((l) => l.qty > 0)
      return { ...state, cart }
    }
    case 'cart/remove':
      return { ...state, cart: state.cart.filter((l) => l.key !== action.key) }
    case 'cart/clear':
      return { ...state, cart: [], promo: null }
    case 'cart/replace':
      return { ...state, cart: action.cart }
    case 'wishlist/toggle': {
      const has = state.wishlist.includes(action.id)
      return {
        ...state,
        wishlist: has
          ? state.wishlist.filter((id) => id !== action.id)
          : [...state.wishlist, action.id],
      }
    }
    case 'wishlist/replace':
      return { ...state, wishlist: action.wishlist }
    case 'promo/apply':
      return { ...state, promo: action.promo }
    case 'promo/clear':
      return { ...state, promo: null }
    case 'order/place':
      return { ...state, orders: [action.order, ...state.orders], cart: [], promo: null }
    case 'toast/push':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'toast/dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'data/reset':
      return {
        ...state,
        cart: [],
        wishlist: [],
        orders: [],
        promo: null,
      }
    default:
      return state
  }
}

function toLocalCart(rows) {
  return rows.map((r) => ({ key: lineKey(r.id, r.color), id: r.id, color: r.color, qty: r.qty }))
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const toastSeq = useRef(0)
  const { data: session, isPending: sessionPending } = useSession()
  const isSignedIn = !!session
  const wasSignedIn = useRef(false)
  // False while a signed-in cart/wishlist fetch is in flight, so pages that act
  // on an empty cart (e.g. Checkout redirecting to /cart) don't fire on the
  // stale pre-fetch state right after a reload.
  const [cartReady, setCartReady] = useState(false)

  // Block bodies on purpose: an effect must return a cleanup function or nothing.
  // Skip mirroring cart/wishlist to localStorage while signed in — the server is
  // the source of truth then, and we don't want to resurrect stale guest data.
  useEffect(() => {
    if (isSignedIn) return
    save('cart', state.cart)
  }, [state.cart, isSignedIn])
  useEffect(() => {
    if (isSignedIn) return
    save('wishlist', state.wishlist)
  }, [state.wishlist, isSignedIn])
  useEffect(() => {
    save('promo', state.promo)
  }, [state.promo])

  const toast = useCallback((message, tone = 'info') => {
    const id = `t${++toastSeq.current}`
    dispatch({ type: 'toast/push', toast: { id, message, tone } })
    setTimeout(() => dispatch({ type: 'toast/dismiss', id }), 2600)
  }, [])

  useEffect(() => {
    fetchCatalog()
      .then(({ products, categories }) => dispatch({ type: 'catalog/loaded', products, categories }))
      .catch((err) => dispatch({ type: 'catalog/error', error: err.message }))
    fetchOrders()
      .then((orders) => dispatch({ type: 'orders/loaded', orders }))
      .catch(() => dispatch({ type: 'orders/loaded', orders: [] }))
  }, [])

  // On sign-in: merge whatever guest cart/wishlist exists into the account's
  // server-side copies, then switch to the server as source of truth and clear
  // the local copies so a later sign-out starts clean. Also refetches orders,
  // since the initial mount fetch ran before we knew who (if anyone) was
  // signed in. On sign-out: reload whatever's left in localStorage (now empty)
  // as the guest state, and clear orders (they require an account).
  useEffect(() => {
    if (sessionPending) return
    if (isSignedIn && !wasSignedIn.current) {
      wasSignedIn.current = true
      setCartReady(false)
      const guestCart = state.cart.map((l) => ({ id: l.id, color: l.color, qty: l.qty }))
      const guestWishlist = state.wishlist
      ;(async () => {
        try {
          if (guestCart.length) await mergeCart(guestCart)
          if (guestWishlist.length) await mergeWishlist(guestWishlist)
          const [cartRows, wishlistIds, orders] = await Promise.all([
            fetchCart(),
            fetchWishlist(),
            fetchOrders(),
          ])
          dispatch({ type: 'cart/replace', cart: toLocalCart(cartRows) })
          dispatch({ type: 'wishlist/replace', wishlist: wishlistIds })
          dispatch({ type: 'orders/loaded', orders })
          remove('cart')
          remove('wishlist')
        } catch {
          toast('Could not sync your bag and saved items', 'error')
        } finally {
          setCartReady(true)
        }
      })()
    } else if (!isSignedIn && wasSignedIn.current) {
      wasSignedIn.current = false
      dispatch({ type: 'cart/replace', cart: load('cart', []) })
      dispatch({ type: 'wishlist/replace', wishlist: load('wishlist', []) })
      dispatch({ type: 'orders/loaded', orders: [] })
      setCartReady(true)
    } else if (!isSignedIn) {
      setCartReady(true)
    }
  }, [isSignedIn, sessionPending])

  const findProduct = useCallback(
    (id) => state.products.find((p) => p.id === id),
    [state.products],
  )
  const categoryLabel = useCallback(
    (id) => state.categories.find((c) => c.id === id)?.label ?? id,
    [state.categories],
  )

  // Cart lines joined against the catalog. A line whose product vanished from the
  // catalog is dropped here rather than crashing the cart page.
  const lines = useMemo(
    () =>
      state.cart
        .map((l) => {
          const product = findProduct(l.id)
          return product ? { ...l, product, lineTotal: product.price * l.qty } : null
        })
        .filter(Boolean),
    [state.cart, findProduct],
  )

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const promo = state.promo
    const discount = promo?.kind === 'percent' ? subtotal * promo.value : 0
    const afterDiscount = subtotal - discount
    const freeShip =
      promo?.kind === 'shipping' || afterDiscount >= FREE_SHIPPING_THRESHOLD || lines.length === 0
    const shipping = freeShip ? 0 : SHIPPING_FLAT
    const tax = afterDiscount * TAX_RATE
    return {
      subtotal,
      discount,
      shipping,
      tax,
      total: afterDiscount + shipping + tax,
      itemCount: lines.reduce((n, l) => n + l.qty, 0),
      freeShip,
      remainingForFreeShip: Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscount),
    }
  }, [lines, state.promo])

  const api = useMemo(
    () => ({
      products: state.products,
      categories: state.categories,
      productsLoaded: state.productsLoaded,
      catalogError: state.catalogError,
      findProduct,
      categoryLabel,
      lines,
      totals,
      cartReady,
      wishlist: state.wishlist,
      orders: state.orders,
      ordersLoaded: state.ordersLoaded,
      promo: state.promo,
      toasts: state.toasts,

      addToCart(product, { color = null, qty = 1 } = {}) {
        if (product.stock <= 0) {
          toast(`${product.name} is out of stock`, 'error')
          return
        }
        const key = lineKey(product.id, color)
        const existing = lines.find((l) => l.key === key)
        const newQty = Math.min((existing?.qty ?? 0) + qty, product.stock)
        dispatch({ type: 'cart/add', product, color, qty })
        toast(`${product.name} added to bag`, 'success')
        if (isSignedIn) {
          putCartLine({ id: product.id, color, qty: newQty }).catch(() =>
            toast('Could not sync your bag', 'error'),
          )
        }
      },
      setQty(key, qty) {
        const line = lines.find((l) => l.key === key)
        dispatch({ type: 'cart/setQty', key, qty })
        if (isSignedIn && line) {
          putCartLine({ id: line.id, color: line.color, qty }).catch(() =>
            toast('Could not sync your bag', 'error'),
          )
        }
      },
      removeLine(key) {
        const line = lines.find((l) => l.key === key)
        dispatch({ type: 'cart/remove', key })
        if (line) {
          toast(`${line.product.name} removed`, 'info')
          if (isSignedIn) {
            putCartLine({ id: line.id, color: line.color, qty: 0 }).catch(() =>
              toast('Could not sync your bag', 'error'),
            )
          }
        }
      },
      clearCart() {
        dispatch({ type: 'cart/clear' })
        if (isSignedIn) clearCartServer().catch(() => toast('Could not sync your bag', 'error'))
      },
      toggleWishlist(product) {
        const saved = state.wishlist.includes(product.id)
        dispatch({ type: 'wishlist/toggle', id: product.id })
        toast(saved ? `${product.name} removed from saved` : `${product.name} saved`, 'info')
        if (isSignedIn) {
          const sync = saved ? removeWishlistItem(product.id) : putWishlistItem(product.id)
          sync.catch(() => toast('Could not sync saved items', 'error'))
        }
      },
      isWishlisted(id) {
        return state.wishlist.includes(id)
      },
      applyPromo(raw) {
        const code = raw.trim().toUpperCase()
        const found = PROMOS[code]
        if (!found) {
          toast(`"${code}" is not a valid code`, 'error')
          return false
        }
        dispatch({ type: 'promo/apply', promo: found })
        toast(`${found.label} applied`, 'success')
        return true
      },
      clearPromo() {
        dispatch({ type: 'promo/clear' })
      },
      async placeOrder(details) {
        const payload = {
          details,
          items: lines.map((l) => ({
            id: l.id,
            name: l.product.name,
            color: l.color,
            qty: l.qty,
            price: l.product.price,
            hue: l.product.hue,
            category: l.product.category,
          })),
          totals,
        }
        try {
          const order = await createOrder(payload)
          dispatch({ type: 'order/place', order })
          if (isSignedIn) clearCartServer().catch(() => {})
          return order
        } catch {
          toast('Could not place the order — please try again', 'error')
          return null
        }
      },
      dismissToast(id) {
        dispatch({ type: 'toast/dismiss', id })
      },
      async resetDemoData() {
        try {
          await clearOrders()
          if (isSignedIn) await Promise.all([clearCartServer(), clearWishlistServer()])
        } catch {
          toast('Could not clear order history — cart and saved items were reset', 'error')
        }
        clearAll()
        dispatch({ type: 'data/reset' })
        toast('Demo data cleared', 'info')
      },
      toast,
    }),
    [
      state.products,
      state.categories,
      state.productsLoaded,
      state.catalogError,
      findProduct,
      categoryLabel,
      lines,
      totals,
      cartReady,
      state.wishlist,
      state.orders,
      state.ordersLoaded,
      state.promo,
      state.toasts,
      isSignedIn,
      toast,
    ],
  )

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
