import { Link } from 'react-router-dom'
import Icon from '../components/Icon'

export default function NotFound() {
  return (
    <div className="empty">
      <Icon name="search" size={30} />
      <h2>That page doesn’t exist</h2>
      <p className="muted">The link may be old, or we may have moved something.</p>
      <Link to="/" className="btn btn--primary">
        Back to the storefront
      </Link>
    </div>
  )
}
