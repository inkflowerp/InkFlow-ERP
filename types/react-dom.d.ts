// ==============================================================================
// Explicit React DOM Module Declarations for Next.js & Strict TypeScript CI
// ==============================================================================

import type * as React from 'react'

declare module 'react-dom' {
  export function createPortal(
    children: React.ReactNode,
    container: Element | DocumentFragment,
    key?: null | string
  ): React.ReactPortal

  export function flushSync<R>(fn: () => R): R
}
