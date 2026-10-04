'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface UnsavedChangesContextType {
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void
  confirmNavigation: (proceed: () => void) => void
  showDiscardModal: boolean
  cancelNavigation: () => void
  proceedNavigation: () => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
  isDirty: false,
  setIsDirty: () => {},
  confirmNavigation: (proceed) => proceed(),
  showDiscardModal: false,
  cancelNavigation: () => {},
  proceedNavigation: () => {},
})

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

  // Warn on browser tab close or refresh if form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const confirmNavigation = useCallback(
    (proceed: () => void) => {
      if (isDirty) {
        setPendingCallback(() => proceed)
        setShowDiscardModal(true)
      } else {
        proceed()
      }
    },
    [isDirty]
  )

  const cancelNavigation = useCallback(() => {
    setShowDiscardModal(false)
    setPendingCallback(null)
  }, [])

  const proceedNavigation = useCallback(() => {
    setIsDirty(false)
    setShowDiscardModal(false)
    if (pendingCallback) {
      pendingCallback()
      setPendingCallback(null)
    }
  }, [pendingCallback])

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty,
        setIsDirty,
        confirmNavigation,
        showDiscardModal,
        cancelNavigation,
        proceedNavigation,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext)
}
