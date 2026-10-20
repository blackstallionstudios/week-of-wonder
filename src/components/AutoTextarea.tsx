import { useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

/** A textarea that grows with its content. */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fit = () => {
    const el = ref.current
    if (!el || !el.isConnected) return
    el.style.height = 'auto'
    // Inside a dialog that isn't shown yet, scrollHeight is 0: leave it auto.
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`
  }
  useLayoutEffect(fit, [props.value])
  useEffect(() => {
    // Re-measure once the surrounding sheet has opened and fonts have loaded.
    const f = requestAnimationFrame(fit)
    void document.fonts?.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => {
      cancelAnimationFrame(f)
      window.removeEventListener('resize', fit)
    }
  }, [])
  return <textarea ref={ref} rows={1} {...props} />
}
