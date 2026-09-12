'use client'

import { useEffect, useRef } from 'react'

/**
 * Universal hook to handle clicks and touches outside of a target element.
 * Works across all browsers and devices without interfering with backdrop filters or stacking contexts.
 */
export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  enabled: boolean = true
) {
  const ref = useRef<T | null>(null)
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        savedCallback.current()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        savedCallback.current()
      }
    }

    // Use 'click' instead of 'mousedown' so interactive elements (links, buttons, tabs)
    // receive their native click dispatch before the container unmounts
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('touchend', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchend', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled])

  return ref
}
