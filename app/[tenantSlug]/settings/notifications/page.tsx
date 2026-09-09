'use client'

import React, { useState } from 'react'
import {
  Bell,
  Save,
  CheckCircle2,
  MessageSquare,
  PhoneCall,
  Mail,
  AlertTriangle,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

export default function NotificationSettingsPage() {
  const { locale, tBilingual } = useI18n()
  const [isSaved, setIsSaved] = useState(false)

  const [notif, setNotif] = useDataStore(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    whatsapp_enabled: true,
    whatsapp_number: '+880 1819-876543',
    sms_enabled: true,
    sms_gateway: 'Greenweb SMS Gateway',
    sms_sender_id: 'PRINTERP',
    sms_api_key: 'gw_live_8f9024a18e27c49b01',
    email_enabled: true,
    low_stock_alerts: true,
    low_stock_threshold: 50, // 50 sft / rolls
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setNotif(notif)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3500)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Notifications & Message Gateways"
        titleBn="নোটিফিকেশন ও বার্তা গেটওয়ে"
        descriptionEn="Configure automated WhatsApp challan dispatches, Bangladeshi masked SMS alerts, and low inventory warnings."
        descriptionBn="স্বয়ংক্রিয় হোয়াটসঅ্যাপ চালান প্রেরণ, মাস্কড এসএমএস গেটওয়ে এবং স্টক ঘাটতি অ্যালার্ট কনফিগার করুন।"
        icon={Bell}
        iconColor="text-amber-600"
      />

      <SettingsNav />

      {isSaved && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Notification gateways updated and recorded in audit log.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* WhatsApp Cloud API */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base">WhatsApp Order & Proof Alerts</CardTitle>
                  <CardDescription className="text-xs">
                    Send high-res watermarked proofs and delivery PDF receipts to customer WhatsApp.
                  </CardDescription>
                </div>
              </div>

              <input
                type="checkbox"
                checked={notif.whatsapp_enabled}
                onChange={(e) => setNotif({ ...notif, whatsapp_enabled: e.target.checked })}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatsappNo">WhatsApp Business Helpline</Label>
              <Input
                id="whatsappNo"
                value={notif.whatsapp_number}
                onChange={(e) => setNotif({ ...notif, whatsapp_number: e.target.value })}
                disabled={!notif.whatsapp_enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bangladeshi SMS Gateway (Greenweb / SSL Wireless) */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base">Bangladeshi Masked SMS Gateway</CardTitle>
                  <CardDescription className="text-xs">
                    Instant delivery readiness and invoice payment confirmation SMS.
                  </CardDescription>
                </div>
              </div>

              <input
                type="checkbox"
                checked={notif.sms_enabled}
                onChange={(e) => setNotif({ ...notif, sms_enabled: e.target.checked })}
                className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smsGateway">SMS Provider</Label>
                <select
                  id="smsGateway"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  value={notif.sms_gateway}
                  onChange={(e) => setNotif({ ...notif, sms_gateway: e.target.value })}
                  disabled={!notif.sms_enabled}
                >
                  <option value="Greenweb SMS Gateway">Greenweb BD (Fast OTP/Alerts)</option>
                  <option value="SSL Wireless">SSL Wireless SMS Engine</option>
                  <option value="Banglalink/Grameenphone Aggregator">Direct Telco Aggregator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderId">BTCL Approved Masking ID</Label>
                <Input
                  id="senderId"
                  value={notif.sms_sender_id}
                  onChange={(e) => setNotif({ ...notif, sms_sender_id: e.target.value })}
                  disabled={!notif.sms_enabled}
                  className="font-mono text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smsApiKey">API Secret Key</Label>
                <Input
                  id="smsApiKey"
                  type="password"
                  value={notif.sms_api_key}
                  onChange={(e) => setNotif({ ...notif, sms_api_key: e.target.value })}
                  disabled={!notif.sms_enabled}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low-Stock & Inventory Warnings */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base">Low-Stock Media Alerts</CardTitle>
                  <CardDescription className="text-xs">
                    Notify Floor Manager when media rolls or solvent inks reach re-order threshold.
                  </CardDescription>
                </div>
              </div>

              <input
                type="checkbox"
                checked={notif.low_stock_alerts}
                onChange={(e) => setNotif({ ...notif, low_stock_alerts: e.target.checked })}
                className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="lowStockThresh">Re-order Alert Margin (sft / rolls)</Label>
              <Input
                id="lowStockThresh"
                type="number"
                value={notif.low_stock_threshold}
                onChange={(e) => setNotif({ ...notif, low_stock_threshold: Number(e.target.value) })}
                disabled={!notif.low_stock_alerts}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
            <Save className="mr-1.5 h-4 w-4" />
            Save Notification Gateways
          </Button>
        </div>
      </form>
    </div>
  )
}
