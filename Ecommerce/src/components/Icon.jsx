const PATHS = {
  bag: 'M6 8h12l1 12H5L6 8zm3 0V6a3 3 0 0 1 6 0v2',
  heart: 'M12 20s-7-4.6-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7C19 15.4 12 20 12 20z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5.5-1.5L21 21',
  star: 'M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4z',
  check: 'M5 13l4 4L19 7',
  trash: 'M5 7h14M9 7V5h6v2m-8 0 1 13h8l1-13',
  minus: 'M6 12h12',
  plus: 'M12 6v12M6 12h12',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  box: 'M4 8l8-4 8 4v9l-8 4-8-4V8zm0 0 8 4m0 0 8-4m-8 4v9',
  x: 'M6 6l12 12M18 6L6 18',
  sliders: 'M4 8h10m4 0h2M4 16h4m4 0h8M14 6v4M8 14v4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0',
  truck: 'M3 7h11v9H3zM14 11h4l3 3v2h-7M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z',
  refresh: 'M4 12a8 8 0 0 1 13.6-5.7L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.6 5.7L4 16m0 4v-4h4',
}

export default function Icon({ name, size = 20, filled = false, className = '', ...rest }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
