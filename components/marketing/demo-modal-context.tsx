'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { DemoModal } from '@/components/marketing/demo-modal'

interface DemoModalContextType {
  isDemoOpen: boolean
  openDemo: () => void
  closeDemo: () => void
}

const DemoModalContext = createContext<DemoModalContextType>({
  isDemoOpen: false,
  openDemo: () => {},
  closeDemo: () => {},
})

export function MarketingDemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoOpen, setIsDemoOpen] = useState(false)

  const openDemo = useCallback(() => setIsDemoOpen(true), [])
  const closeDemo = useCallback(() => setIsDemoOpen(false), [])

  const value = useMemo(
    () => ({
      isDemoOpen,
      openDemo,
      closeDemo,
    }),
    [isDemoOpen, openDemo, closeDemo]
  )

  return (
    <DemoModalContext.Provider value={value}>
      {children}
      <DemoModal isOpen={isDemoOpen} onClose={closeDemo} />
    </DemoModalContext.Provider>
  )
}

export function useDemoModal() {
  const context = useContext(DemoModalContext)
  if (!context) {
    throw new Error('useDemoModal must be used within a MarketingDemoProvider')
  }
  return context
}
