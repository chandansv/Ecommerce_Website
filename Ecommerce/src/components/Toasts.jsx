import { useStore } from '../store/StoreContext'
import Icon from './Icon'

export default function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <Icon name={t.tone === 'error' ? 'x' : 'check'} size={16} />
          <span>{t.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
