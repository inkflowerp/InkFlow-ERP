'use client'

import React, { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

export interface DangerZoneAction {
  id: string
  title: string
  description: string
  buttonText: string
  confirmChallenge?: string // If set, user must type this exact string to confirm
  confirmTitle?: string
  confirmDescription?: string
  onAction: () => void | Promise<void>
  isLoading?: boolean
  disabled?: boolean
}

export interface DangerZoneProps {
  title?: string
  description?: string
  actions: DangerZoneAction[]
  className?: string
}

export function DangerZone({
  title,
  description,
  actions,
  className,
}: DangerZoneProps) {
  const { tBilingual } = useI18n()
  const displayTitle = title || tBilingual('Danger Zone', 'ঝুঁকিপূর্ণ কাজ')
  const displayDesc = description || tBilingual('These actions cannot be undone. Be careful.', 'এই কাজগুলো বাতিল করা যাবে না। সাবধানে করুন।')

  const [activeAction, setActiveAction] = useState<DangerZoneAction | null>(null)
  const [challengeInput, setChallengeInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenDialog = (action: DangerZoneAction) => {
    setActiveAction(action)
    setChallengeInput('')
  }

  const handleCloseDialog = () => {
    setActiveAction(null)
    setChallengeInput('')
    setIsSubmitting(false)
  }

  const handleConfirm = async () => {
    if (!activeAction) return
    if (activeAction.confirmChallenge && challengeInput !== activeAction.confirmChallenge) {
      return
    }

    try {
      setIsSubmitting(true)
      await activeAction.onAction()
      handleCloseDialog()
    } catch {
      // Error handled by parent action
    } finally {
      setIsSubmitting(false)
    }
  }

  const canConfirm =
    !activeAction?.confirmChallenge || challengeInput === activeAction.confirmChallenge

  return (
    <>
      <Card
        className={cn(
          'rounded-xl border border-destructive/30 bg-destructive/5 text-card-foreground p-5 space-y-4 shadow-xs',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-destructive tracking-tight">
              {displayTitle}
            </h3>
            {displayDesc && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {displayDesc}
              </p>
            )}
          </div>
        </div>

        <div className="divide-y divide-destructive/20 border-t border-destructive/20 pt-1">
          {actions.map((act) => (
            <div
              key={act.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5 max-w-xl">
                <div className="text-xs font-semibold text-foreground">
                  {act.title}
                </div>
                <div className="text-xs text-muted-foreground leading-normal">
                  {act.description}
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                disabled={act.disabled || act.isLoading}
                onClick={() => handleOpenDialog(act)}
                className="h-8 text-xs shrink-0 cursor-pointer self-start sm:self-center font-medium"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {act.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!activeAction} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {activeAction?.confirmTitle || activeAction?.title || tBilingual('Are you sure?', 'আপনি কি নিশ্চিত?')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              {activeAction?.confirmDescription ||
                activeAction?.description ||
                tBilingual('This cannot be undone. Continue?', 'এটি বাতিল করা যাবে না। চালিয়ে যাবেন?')}
            </DialogDescription>
          </DialogHeader>

          {activeAction?.confirmChallenge && (
            <div className="space-y-2 py-2">
              <label className="text-xs font-medium text-foreground block">
                {tBilingual('Type', 'লিখুন')}{' '}
                <span className="font-mono font-bold text-destructive">{activeAction.confirmChallenge}</span>{' '}
                {tBilingual('to confirm:', 'নিশ্চিত করতে:')}
              </label>
              <Input
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                placeholder={activeAction.confirmChallenge}
                className="h-9 text-xs font-mono"
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseDialog}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={!canConfirm || isSubmitting || activeAction?.isLoading}
              className="text-xs h-8 cursor-pointer font-medium"
            >
              {isSubmitting ? tBilingual('Wait...', 'অপেক্ষা করুন...') : activeAction?.buttonText || tBilingual('Confirm', 'নিশ্চিত করুন')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
