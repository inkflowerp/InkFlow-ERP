'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePermissions } from '@/hooks/use-permissions'

interface OperatorModeContextType {
  isSimpleMode: boolean
  toggleSimpleMode: () => void
  setSimpleMode: (value: boolean) => void
  isOperatorRole: boolean
}

const OperatorModeContext = createContext<OperatorModeContextType>({
  isSimpleMode: true,
  toggleSimpleMode: () => {},
  setSimpleMode: () => {},
  isOperatorRole: false,
})

const STORAGE_KEY = 'inkflow_operator_simple_mode'

export function OperatorModeProvider({ children }: { children: React.ReactNode }) {
  const { activeRole, isOwner } = usePermissions()

  // Operational roles that are strictly simple-by-default
  const isOperatorRole = Boolean(
    (activeRole as string) === 'operator' ||
    (activeRole as string) === 'designer' ||
    (activeRole as string) === 'store_manager' ||
    (activeRole as string) === 'delivery_coordinator' ||
    activeRole === 'general_staff'
  )

  const [isSimpleMode, setIsSimpleModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      return saved === 'true'
    }
    // Default based on role
    return isOperatorRole || !isOwner
  })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) {
      setIsSimpleModeState(isOperatorRole || !isOwner)
    }
  }, [activeRole, isOperatorRole, isOwner])

  const setSimpleMode = (val: boolean) => {
    setIsSimpleModeState(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(val))
    }
  }

  const toggleSimpleMode = () => {
    setSimpleMode(!isSimpleMode)
  }

  return (
    <OperatorModeContext.Provider
      value={{
        isSimpleMode,
        toggleSimpleMode,
        setSimpleMode,
        isOperatorRole,
      }}
    >
      {children}
    </OperatorModeContext.Provider>
  )
}

export function useOperatorMode() {
  return useContext(OperatorModeContext)
}
