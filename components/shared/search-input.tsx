'use client'

import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n/context'

interface SearchInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  value = '',
  onChange,
  placeholder,
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value)
  const { t } = useI18n()

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue)
      }
    }, debounceMs)

    return () => clearTimeout(handler)
  }, [internalValue, debounceMs, onChange, value])

  return (
    <div className="relative w-full max-w-sm">
      <Input
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder || t('common.search')}
        icon={<Search className="h-4 w-4 text-slate-400" />}
        className={className}
      />
      {internalValue && (
        <button
          type="button"
          onClick={() => {
            setInternalValue('')
            onChange('')
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
