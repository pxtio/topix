import { useEffect } from 'react'

type BoardShortcut = {
  key: string
  handler: () => void
  withMod?: boolean
  withShift?: boolean
  preventDefault?: boolean
}

type UseBoardShortcutsOptions = {
  enabled?: boolean
  shortcuts: BoardShortcut[]
}

const isEditableTarget = () => {
  const el = document.activeElement as HTMLElement | null
  if (!el) return true
  const tag = el.tagName.toLowerCase()
  return !(tag === 'input' || tag === 'textarea' || el.isContentEditable)
}

const isMatch = (event: KeyboardEvent, shortcut: BoardShortcut) => {
  const key = event.key.toLowerCase()
  const mod = event.metaKey || event.ctrlKey
  if (shortcut.withMod && !mod) return false
  if (!shortcut.withMod && (mod || event.altKey)) return false
  if (shortcut.withShift === true && !event.shiftKey) return false
  if (shortcut.withShift === false && event.shiftKey) return false
  return key === shortcut.key.toLowerCase()
}

export function useBoardShortcuts({ enabled = true, shortcuts }: UseBoardShortcutsOptions) {
  useEffect(() => {
    if (!enabled || shortcuts.length === 0) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEditableTarget()) return

      for (const shortcut of shortcuts) {
        if (!isMatch(event, shortcut)) continue
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        shortcut.handler()
        return
      }
    }

    const listenerOptions: AddEventListenerOptions = { capture: true }
    document.addEventListener('keydown', onKeyDown, listenerOptions)
    return () => {
      document.removeEventListener('keydown', onKeyDown, listenerOptions)
    }
  }, [enabled, shortcuts])
}
