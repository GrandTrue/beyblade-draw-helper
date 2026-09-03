import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

export function QueueDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
      if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) previousFocus.focus()
      else document.getElementById('main-content')?.focus()
    }
  }, [])
  const containTab = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
  return (
    <dialog ref={dialogRef} className="queue-dialog" aria-labelledby="queue-title"
      onKeyDown={containTab}
      onCancel={event => { event.preventDefault(); onClose() }}>
      {children}
    </dialog>
  )
}
