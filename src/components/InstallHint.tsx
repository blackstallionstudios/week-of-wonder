import { useState } from 'react'
import { isIOS, isStandalone } from '../lib/install'
import { Icon } from './Icon'

const KEY = 'wow-install-hint-dismissed'

function dismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

/**
 * Safari may clear a site's storage after 7 days without a visit unless the
 * app is on the Home Screen. Since everything here lives on the device, nudge
 * iPhone users to install it.
 */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => dismissed() || !isIOS() || isStandalone())
  if (hidden) return null
  return (
    <aside className="installhint" aria-label="Install tip">
      <Icon name="phone" size={22} />
      <p>
        <b>Keep your tickets safe.</b> Tap <Icon name="share" size={14} className="inline-icon" /> Share → <b>Add to Home Screen</b>. Safari can
        clear data from sites you haven’t opened in a week.
      </p>
      <button
        type="button"
        className="iconbtn"
        aria-label="Dismiss install tip"
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1')
          } catch {
            /* private mode */
          }
          setHidden(true)
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </aside>
  )
}
