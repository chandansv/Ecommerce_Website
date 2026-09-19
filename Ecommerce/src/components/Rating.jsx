import Icon from './Icon'

export default function Rating({ value, reviews, compact = false }) {
  const rounded = Math.round(value)
  return (
    <span className="rating" title={`${value} out of 5`}>
      <span className="rating__stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon key={n} name="star" size={13} filled={n <= rounded} className={n <= rounded ? 'star star--on' : 'star'} />
        ))}
      </span>
      <span className="rating__text">
        {value.toFixed(1)}
        {!compact && reviews != null && <span className="muted"> ({reviews.toLocaleString()})</span>}
      </span>
      <span className="sr-only">
        Rated {value} out of 5{reviews != null ? ` from ${reviews} reviews` : ''}
      </span>
    </span>
  )
}
