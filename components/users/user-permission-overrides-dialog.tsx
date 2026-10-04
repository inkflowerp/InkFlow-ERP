'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/i18n/context'
import {
  Shield,
  Search,
  Filter,
  Check,
  X,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CompanyUserWithProfile } from '@/types/tenant.types'
import { MODULE_ACTION_SPECS, PermissionModule, PermissionAction } from '@/types/rbac.types'
import { updateUserAccessAndPermissionsAction } from '@/actions/company-users.actions'
import { useToast } from '@/components/shared/toast-feedback'
import { cn } from '@/lib/utils'

interface UserPermissionOverridesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: CompanyUserWithProfile | null
  tenantSlug: string
  companyId: string
  onSuccess?: () => void
}

export function UserPermissionOverridesDialog({
  open,
  onOpenChange,
  user,
  tenantSlug,
  companyId,
  onSuccess,
}: UserPermissionOverridesDialogProps) {
  const { tBilingual, locale } = useI18n()
  const isBn = locale === 'bn'
  const { showToast } = useToast()

  // State: map of permission code -> boolean (true = allow, false = deny)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showModifiedOnly, setShowModifiedOnly] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize overrides from user
  useEffect(() => {
    if (user && open) {
      setOverrides(user.overrides ? { ...user.overrides } : {})
      setSearchQuery('')
      setShowModifiedOnly(false)
      // Expand all modules by default
      const initialExpanded: Record<string, boolean> = {}
      Object.keys(MODULE_ACTION_SPECS).forEach((mod) => {
        initialExpanded[mod] = true
      })
      setExpandedModules(initialExpanded)
    }
  }, [user, open])

  // Count active overrides
  const modifiedCount = useMemo(() => {
    return Object.keys(overrides).length
  }, [overrides])

  // Toggle single permission override state: undefined (default) -> true (allow) -> false (deny) -> undefined
  const setPermissionState = (permCode: string, state: 'default' | 'allow' | 'deny') => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (state === 'default') {
        delete next[permCode]
      } else if (state === 'allow') {
        next[permCode] = true
      } else if (state === 'deny') {
        next[permCode] = false
      }
      return next
    })
  }

  const toggleModuleAccordion = (mod: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [mod]: !prev[mod],
    }))
  }

  const handleResetAll = () => {
    setOverrides({})
    showToast({
      type: 'info',
      title: isBn ? 'সকল ওভাররাইড বাতিল করা হয়েছে' : 'All Overrides Reset',
      message: isBn ? 'সেভ বাটনে ক্লিক করে নিশ্চিত করুন।' : 'Click Save to apply role defaults.',
    })
  }

  const handleSave = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const res = await updateUserAccessAndPermissionsAction({
        companyUserId: user.id,
        companyId,
        tenantSlug,
        overrides,
      })

      if (res.success) {
        showToast({
          type: 'success',
          title: isBn ? 'ওভাররাইড সংরক্ষিত হয়েছে' : 'Overrides Saved',
          message: res.message || (isBn ? 'ব্যবহারকারীর পারমিশন সফলভাবে আপডেট করা হয়েছে।' : 'User permission overrides updated successfully.'),
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        showToast({
          type: 'error',
          title: isBn ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Save Failed',
          message: res.message || (res as any).error || 'Failed to save overrides',
        })
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: isBn ? 'ত্রুটি' : 'Error',
        message: err?.message || 'Failed to save overrides',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter modules and actions
  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const result: Array<{
      module: PermissionModule
      spec: typeof MODULE_ACTION_SPECS[PermissionModule]
      actions: Array<{ action: PermissionAction; permCode: string; currentOverride?: boolean }>
    }> = []

    Object.entries(MODULE_ACTION_SPECS).forEach(([modKey, spec]) => {
      const mod = modKey as PermissionModule
      const actionsList: Array<{ action: PermissionAction; permCode: string; currentOverride?: boolean }> = []

      spec.actions.forEach((act) => {
        const permCode = `${mod}.${act}`
        const currentOverride = overrides[permCode]

        if (showModifiedOnly && currentOverride === undefined) {
          return
        }

        if (query) {
          const matchQuery =
            permCode.toLowerCase().includes(query) ||
            spec.label.toLowerCase().includes(query) ||
            spec.labelBn.toLowerCase().includes(query) ||
            act.toLowerCase().includes(query)

          if (!matchQuery) return
        }

        actionsList.push({
          action: act,
          permCode,
          currentOverride,
        })
      })

      if (actionsList.length > 0) {
        result.push({
          module: mod,
          spec,
          actions: actionsList,
        })
      }
    })

    return result
  }, [searchQuery, showModifiedOnly, overrides])

  const userName = user?.profile?.full_name || user?.linked_employee?.name || user?.profile?.email || 'User'

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span>{tBilingual(`Permission Overrides: ${userName}`, `পারমিশন ওভাররাইড: ${userName}`)}</span>
        </div>
      }
      description={tBilingual(
        'Set explicit Allow (+) or Deny (-) rules that take authoritative priority over the assigned role.',
        'রোল ডিফল্ট পরিবর্তন না করে ব্যবহারকারীর জন্য নির্দিষ্ট অনুমোদন (+) বা নিষেধাজ্ঞা (-) নির্ধারণ করুন।'
      )}
      className="max-w-3xl"
    >
      <div className="space-y-4 pt-2">
        {/* Controls Toolbar: Search, Modified Filter, Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={tBilingual('Search permissions (e.g. orders.create, invoices)...', 'পারমিশন খুঁজুন...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={showModifiedOnly ? 'default' : 'outline'}
              onClick={() => setShowModifiedOnly(!showModifiedOnly)}
              className="h-9 text-xs gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{tBilingual('Modified Only', 'শুধুমাত্র পরিবর্তিত')}</span>
              {modifiedCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                  {modifiedCount}
                </Badge>
              )}
            </Button>

            {modifiedCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleResetAll}
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1"
                title={tBilingual('Reset all to role defaults', 'সকল ওভাররাইড মুছুন')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tBilingual('Reset All', 'রিসেট')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Permissions Accordion List */}
        <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
          {filteredModules.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl">
              <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <div className="text-xs font-semibold text-foreground">
                {tBilingual('No matching permissions found', 'কোনো পারমিশন পাওয়া যায়নি')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tBilingual('Try clearing your search query or filter.', 'ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।')}
              </p>
            </div>
          ) : (
            filteredModules.map(({ module, spec, actions }) => {
              const isExpanded = expandedModules[module] ?? true
              const activeModOverrides = actions.filter((a) => a.currentOverride !== undefined).length

              return (
                <div key={module} className="border border-border rounded-xl overflow-hidden bg-card">
                  {/* Module Header */}
                  <div
                    onClick={() => toggleModuleAccordion(module)}
                    className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {isBn ? spec.labelBn : spec.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isBn ? spec.descriptionBn : spec.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeModOverrides > 0 && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {activeModOverrides} {tBilingual('override', 'ওভাররাইড')}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {actions.length} {tBilingual('rules', 'টি নিয়ম')}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  {isExpanded && (
                    <div className="divide-y divide-border p-2">
                      {actions.map(({ action, permCode, currentOverride }) => {
                        return (
                          <div
                            key={permCode}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 hover:bg-muted/30 rounded-lg transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-foreground">
                                  {permCode}
                                </span>
                                {currentOverride === true && (
                                  <Badge className="bg-success/10 text-success text-success border border-success-border/20 text-xs py-0">
                                    {tBilingual('Explicit Allow', 'অনুমোদিত')}
                                  </Badge>
                                )}
                                {currentOverride === false && (
                                  <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs py-0">
                                    {tBilingual('Explicit Deny', 'নিষিদ্ধ')}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* 3-State Control Buttons */}
                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center bg-muted p-0.5 rounded-lg border border-border">
                              <button
                                type="button"
                                onClick={() => setPermissionState(permCode, 'default')}
                                className={cn(
                                  'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                                  currentOverride === undefined
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {tBilingual('Role Default', 'রোল ডিফল্ট')}
                              </button>

                              <button
                                type="button"
                                onClick={() => setPermissionState(permCode, 'allow')}
                                className={cn(
                                  'px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1',
                                  currentOverride === true
                                    ? 'bg-success text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-success'
                                )}
                              >
                                <Check className="h-3 w-3" />
                                <span>{tBilingual('Allow', 'অনুমোদন')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPermissionState(permCode, 'deny')}
                                className={cn(
                                  'px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1',
                                  currentOverride === false
                                    ? 'bg-destructive text-destructive-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-destructive'
                                )}
                              >
                                <X className="h-3 w-3" />
                                <span>{tBilingual('Deny', 'নিষেধ')}</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {modifiedCount === 0
              ? tBilingual('All permissions will follow role defaults.', 'সকল পারমিশন রোল অনুযায়ী প্রযোজ্য হবে।')
              : tBilingual(
                  `${modifiedCount} customized override rule(s) active.`,
                  `${modifiedCount} টি পারমিশন ওভাররাইড সক্রিয় রয়েছে।`
                )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="text-xs font-bold"
            >
              {isSubmitting
                ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...')
                : tBilingual('Save Overrides', 'ওভাররাইড সংরক্ষণ করুন')}
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
