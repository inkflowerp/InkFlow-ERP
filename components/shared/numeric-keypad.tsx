'use client'

import React, { useState, useEffect } from 'react'
import { Delete, Check, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useI18n } from '@/i18n/context'

interface NumericKeypadProps {
  initialValue?: number
  min?: number
  max?: number
  step?: number
  allowDecimal?: boolean
  unit?: string
  title?: string
  titleBn?: string
  isOpen: boolean
  onClose: () => void
  onConfirm: (val: number) => void
}

export function NumericKeypadModal({
  initialValue = 0,
  min = 0,
  max = 999999,
  allowDecimal = true,
  unit = '',
  title = 'Enter Quantity',
  titleBn = 'পরিমাণ লিখুন',
  isOpen,
  onClose,
  onConfirm,
}: NumericKeypadProps) {
  const { tBilingual } = useI18n()
  const [valueStr, setValueStr] = useState<string>(initialValue ? String(initialValue) : '0')

  useEffect(() => {
    if (isOpen) {
      setValueStr(initialValue !== undefined && initialValue !== null ? String(initialValue) : '0')
    }
  }, [isOpen, initialValue])

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
      try {
        window.navigator.vibrate(15)
      } catch {}
    }
  }

  const handleDigit = (digit: string) => {
    triggerHaptic()
    setValueStr((prev) => {
      if (prev === '0' && digit !== '.') return digit
      if (digit === '.') {
        if (!allowDecimal) return prev
        if (prev.includes('.')) return prev
        return prev + '.'
      }
      if (prev.length >= 10) return prev
      return prev + digit
    })
  }

  const handleBackspace = () => {
    triggerHaptic()
    setValueStr((prev) => {
      if (prev.length <= 1) return '0'
      return prev.slice(0, -1)
    })
  }

  const handleClear = () => {
    triggerHaptic()
    setValueStr('0')
  }

  const handleAdd = (delta: number) => {
    triggerHaptic()
    const cur = parseFloat(valueStr) || 0
    const next = Math.max(min, Math.min(max, cur + delta))
    setValueStr(String(next))
  }

  const handleConfirm = () => {
    triggerHaptic()
    const numeric = parseFloat(valueStr) || 0
    const clamped = Math.max(min, Math.min(max, numeric))
    onConfirm(clamped)
    onClose()
  }

  const numpadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [allowDecimal ? '.' : 'C', '0', '⌫'],
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs sm:max-w-sm p-4 bg-card border-border select-none">
        <DialogHeader className="pb-2 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold bangla-text text-foreground">
            {tBilingual(title, titleBn)}
          </DialogTitle>
        </DialogHeader>

        {/* Display Screen */}
        <div className="bg-muted/70 rounded-xl p-3 border border-border flex flex-col items-end justify-center min-h-[64px]">
          <div className="text-xs text-muted-foreground font-medium mb-0.5">
            {unit ? `${tBilingual('Unit', 'একক')}: ${unit}` : tBilingual('Amount', 'মান')}
          </div>
          <div className="flex items-baseline gap-1.5 overflow-hidden w-full justify-end">
            <span className="text-3xl font-black tabular-nums tracking-tight text-foreground truncate">
              {valueStr}
            </span>
            {unit && <span className="text-sm font-bold text-muted-foreground shrink-0">{unit}</span>}
          </div>
        </div>

        {/* Quick Increment Presets (Glove Friendly, >= 48px) */}
        <div className="grid grid-cols-4 gap-1.5 py-1">
          {[1, 5, 10, 50].map((inc) => (
            <button
              key={inc}
              type="button"
              onClick={() => handleAdd(inc)}
              className="min-h-[44px] rounded-lg bg-muted text-foreground text-xs font-bold active:bg-primary active:text-primary-foreground transition-colors border border-border"
            >
              +{inc}
            </button>
          ))}
        </div>

        {/* Big Number Pad Grid (Buttons >= 52px for Glove Usability) */}
        <div className="grid grid-cols-3 gap-2">
          {numpadButtons.flat().map((btn, idx) => {
            const isBackspace = btn === '⌫'
            const isClear = btn === 'C'
            return (
              <button
                key={`${btn}-${idx}`}
                type="button"
                onClick={() => {
                  if (isBackspace) handleBackspace()
                  else if (isClear) handleClear()
                  else handleDigit(btn)
                }}
                className={`min-h-[52px] sm:min-h-[56px] text-xl font-bold rounded-xl flex items-center justify-center transition-all active:scale-95 border shadow-xs ${
                  isBackspace
                    ? 'bg-destructive/10 text-destructive border-destructive/20 active:bg-destructive active:text-destructive-foreground'
                    : isClear
                    ? 'bg-muted text-muted-foreground border-border active:bg-foreground active:text-background'
                    : 'bg-card hover:bg-muted text-foreground border-border active:bg-primary active:text-primary-foreground'
                }`}
              >
                {isBackspace ? <Delete className="h-6 w-6" /> : btn}
              </button>
            )
          })}
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-h-[48px] text-sm font-bold bangla-text border-border"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            className="min-h-[48px] text-sm font-bold bangla-text bg-primary text-primary-foreground"
          >
            <Check className="h-5 w-5 mr-1.5" />
            {tBilingual('Confirm', 'নিশ্চিত করুন')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
