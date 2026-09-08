'use client'

import React, { useState, useEffect } from 'react'
import {
  Sliders,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
  Check,
  X,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlatformService } from '@/services/platform.service'
import { PlatformRBACTemplate, PermissionActionKey } from '@/types/platform.types'
import { updateRBACTemplatePermissionAction } from '@/actions/platform.actions'

const ACTIONS: { key: PermissionActionKey; label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
  { key: 'full_control', label: 'Full Control' },
]

const RESOURCE_LABELS: Record<string, { label: string; desc: string }> = {
  customer: { label: 'Customer Directory', desc: 'Customer accounts, contact details, balance ledger' },
  quotation: { label: 'Estimates & Quotations', desc: 'Price proposals, margin calculator, formal PDF quotes' },
  order: { label: 'Job Orders & Booking', desc: 'Order ticketing, specs, design attachments, prepress queue' },
  invoice: { label: 'Invoices & Billing', desc: 'Sales invoices, Mushak 6.3 challans, POS thermal receipts' },
  payment: { label: 'Payments & Collections', desc: 'bKash, cash receipts, bank deposits, write-offs' },
  production: { label: 'Production Floor', desc: 'Kanban scheduling, machinery dispatch, operator runs' },
  inventory: { label: 'Material Inventory', desc: 'Media rolls, vinyl, acrylic sheets, inks, stock ledger' },
  purchase: { label: 'Stock Purchases', desc: 'Supplier POs, material GRN intake, vendor bills' },
  supplier: { label: 'Supplier Accounts', desc: 'Vendor directory, raw material sourcing, balances' },
  delivery: { label: 'Delivery & Challans', desc: 'Official gatepass, vehicle dispatch, site installations' },
  hr: { label: 'HR & Personnel', desc: 'Staff directory, attendance biometric logs, leaves' },
  payroll: { label: 'Salary & Payroll', desc: 'Monthly payslips, overtime rates, deductions' },
  reports: { label: 'Reports & Analytics', desc: 'P&L, sales reports, material wastage audit, tax summary' },
  settings: { label: 'Company Settings', desc: 'Sequences, VAT rates, branches, fiscal year' },
}

export default function PlatformRBACPage() {
  const [templates, setTemplates] = useState<PlatformRBACTemplate[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>('sales_manager')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadTemplates = async () => {
    setLoading(true)
    const res = await PlatformService.getRBACTemplates()
    if (res.success && res.data) {
      setTemplates(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const currentTemplate = templates.find((t) => t.slug === selectedSlug) || templates[0]

  const handleToggle = async (resource: string, action: PermissionActionKey) => {
    if (!currentTemplate) return

    const currentVal = currentTemplate.permissions[resource]?.[action] || false
    const newVal = !currentVal

    // Optimistic UI update
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.slug !== currentTemplate.slug) return t
        const updatedPerms = { ...t.permissions }
        if (!updatedPerms[resource]) {
          updatedPerms[resource] = {
            view: false,
            create: false,
            edit: false,
            delete: false,
            approve: false,
            full_control: false,
          }
        }
        updatedPerms[resource] = {
          ...updatedPerms[resource],
          [action]: newVal,
        }
        return { ...t, permissions: updatedPerms }
      })
    )

    // Call server action
    await updateRBACTemplatePermissionAction(currentTemplate.slug, resource, action, newVal)
  }

  const handleGrantAllForResource = (resource: string, grant: boolean) => {
    if (!currentTemplate) return

    setTemplates((prev) =>
      prev.map((t) => {
        if (t.slug !== currentTemplate.slug) return t
        const updatedPerms = { ...t.permissions }
        updatedPerms[resource] = {
          view: grant,
          create: grant,
          edit: grant,
          delete: grant,
          approve: grant,
          full_control: grant,
        }
        return { ...t, permissions: updatedPerms }
      })
    )

    ACTIONS.forEach((a) => {
      updateRBACTemplatePermissionAction(currentTemplate.slug, resource, a.key, grant)
    })

    showNotification(
      `${grant ? 'Granted' : 'Revoked'} all actions for ${RESOURCE_LABELS[resource]?.label || resource}.`
    )
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const { PrintERPDataStore, STORAGE_KEYS } = await import('@/lib/db/data-store')
      PrintERPDataStore.set(STORAGE_KEYS.ROLES as any, templates)
      showNotification(`Template "${currentTemplate?.name || 'RBAC'}" configuration saved to root database.`)
    } catch {
      showNotification('Failed to save templates.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Sliders className="h-7 w-7 text-indigo-400" />
            Platform RBAC Templates
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Platform Owner governance over system role presets automatically seeded to newly provisioned tenant organizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save Template Matrix
          </Button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Role Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {templates.map((tmpl) => {
          const isSelected = tmpl.slug === selectedSlug
          return (
            <button
              key={tmpl.slug}
              type="button"
              onClick={() => setSelectedSlug(tmpl.slug)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-600/30 to-violet-600/30 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 ring-1 ring-indigo-500'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs truncate">{tmpl.name}</span>
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-xs shadow-indigo-400" />
                )}
              </div>
              <div className="text-[11px] text-slate-400/80 mt-0.5 truncate">{tmpl.name_bn}</div>
              <div className="text-[10px] text-indigo-400 mt-2 font-mono">
                {Object.values(tmpl.permissions || {}).reduce(
                  (acc, curr) => acc + Object.values(curr || {}).filter(Boolean).length,
                  0
                )}{' '}
                Permissions Active
              </div>
            </button>
          )
        })}
      </div>

      {/* Current Template Details & Matrix */}
      {currentTemplate && (
        <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800 pb-4 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  <span>Template Matrix: {currentTemplate.name}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({currentTemplate.name_bn})
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  {currentTemplate.description}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Slug: {currentTemplate.slug}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-72">Resource Domain</th>
                  {ACTIONS.map((a) => (
                    <th key={a.key} className="py-3.5 px-3 text-center">
                      {a.label}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right">Quick Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {Object.entries(RESOURCE_LABELS).map(([resourceKey, meta]) => {
                  const resourcePerms = currentTemplate.permissions[resourceKey] || {
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                    approve: false,
                    full_control: false,
                  }

                  const allGranted = ACTIONS.every((a) => resourcePerms[a.key])

                  return (
                    <tr key={resourceKey} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">{meta.label}</div>
                        <div className="text-[10px] text-slate-400">{meta.desc}</div>
                      </td>

                      {ACTIONS.map((actionItem) => {
                        const isAllowed = resourcePerms[actionItem.key] || false
                        return (
                          <td key={actionItem.key} className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(resourceKey, actionItem.key)}
                              className={`h-7 w-7 rounded-lg inline-flex items-center justify-center transition-all ${
                                isAllowed
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs shadow-emerald-500/20'
                                  : 'bg-slate-950 text-slate-600 border border-slate-800 hover:border-slate-700 hover:text-slate-400'
                              }`}
                              title={`${isAllowed ? 'Revoke' : 'Grant'} ${actionItem.label} on ${
                                meta.label
                              }`}
                            >
                              {isAllowed ? (
                                <Check className="h-4 w-4 stroke-[2.5]" />
                              ) : (
                                <span className="text-slate-700 text-xs">—</span>
                              )}
                            </button>
                          </td>
                        )
                      })}

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleGrantAllForResource(resourceKey, true)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            Grant
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGrantAllForResource(resourceKey, false)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Architecture Guidance Box */}
      <Card className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-2xl text-indigo-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-sm text-white">How Template Governance Operates</div>
            <p className="text-slate-300 leading-relaxed">
              When a new printing enterprise signs up (e.g. Starter Press or Business Signage), the system seeds these standard role permission templates into their organization&apos;s workspace. Organization executives can subsequently configure granular user-level overrides within their own company without altering the root templates.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
