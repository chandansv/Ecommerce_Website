import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../lib/authClient'

export default function RequireAuth({ children }) {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) return null
  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/sign-in?redirect=${redirect}`} replace />
  }
  return children
}
