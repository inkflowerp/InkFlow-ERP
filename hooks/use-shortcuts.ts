'use client'

import { useState, useEffect, useCallback } from 'react'
import { KeyboardShortcutConfig, DEFAULT_SHORTCUTS } from '@/types/search.types'

const STORAGE_KEY = 'printerp_keyboard_shortcuts'

export function useShortcuts(handlers?: {
  onOpenSearch?: () => void
  onOpenNew?: () => void
  onClose?: () => void
}) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcutConfig>(DEFAULT_SHORTCUTS)

  // Load user-configured shortcuts from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setShortcuts({ ...DEFAULT_SHORTCUTS, ...JSON.parse(stored) })
      }
    } catch {
      // Ignore
    }
  }, [])

  const updateShortcuts = (newConfig: Partial<KeyboardShortcutConfig>) => {
    const updated = { ...shortcuts, ...newConfig }
    setShortcuts(updated)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event('printerp_shortcuts_updated'))
      } catch {
        // Ignore
      }
    }
  }

  const resetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
        window.dispatchEvent(new Event('printerp_shortcuts_updated'))
      } catch {
        // Ignore
      }
    }
  }

  // Handle global key events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // 1. Check for standard Cmd+K / Ctrl+K (Works even inside inputs)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handlers?.onOpenSearch?.()
        return
      }

      // 2. Escape: Close open modals
      if (e.key === 'Escape') {
        handlers?.onClose?.()
        return
      }

      // For single-letter shortcuts like '/' or 'N', do not fire if the user is typing into an input field
      if (isInput) {
        return
      }

      // 3. User configured Search shortcut ('/')
      if (e.key === shortcuts.openSearch) {
        e.preventDefault()
        handlers?.onOpenSearch?.()
        return
      }

      // 4. User configured New menu shortcut ('n')
      if (e.key.toLowerCase() === shortcuts.openNewMenu.toLowerCase()) {
        e.preventDefault()
        handlers?.onOpenNew?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, handlers])

  return {
    shortcuts,
    updateShortcuts,
    resetShortcuts,
  }
}
