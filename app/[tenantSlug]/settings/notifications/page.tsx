'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  Bell,
  Save,
  CheckCircle2,
  MessageSquare,
  Mail,
  AlertTriangle,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  Clock,
  Eye,
  Send,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Languages,
  Check,
  RefreshCw,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/shared/toast-feedback'
import {
  getUserNotificationPreferencesAction,
  saveUserNotificationPreferencesAction,
  getNotificationTemplatesAction,
  notifyAction,
} from '@/actions/notification.actions'
import type { NotificationPreferenceRecord, NotificationEventType } from '@/types/communication.types'

interface EventMeta {
  type: NotificationEventType
  nameEn: string
  nameBn: string
  descEn: string
  descBn: string
  category: 'billing' | 'production' | 'hr' | 'system'
}

const EVENT_METADATA: EventMeta[] = [
  {
    type: 'invoice_created',
    nameEn: 'Invoice Created',
    nameBn: 'নতুন ইনভয়েস তৈরি',
    descEn: 'Dispatched when a new invoice is created for a customer order',
    descBn: 'গ্রাহকের অর্ডারের জন্য নতুন ইনভয়েস তৈরি হলে পাঠানো হয়',
    category: 'billing',
  },
  {
    type: 'invoice_overdue',
    nameEn: 'Invoice Overdue Reminder',
    nameBn: 'বকেয়া বিলের তাগাদা',
    descEn: 'Scheduled reminders before, on, and after invoice due date',
    descBn: 'ইনভয়েসের নির্দিষ্ট তারিখের আগে, দিনে ও পরে স্বয়ংক্রিয় তাগাদা',
    category: 'billing',
  },
  {
    type: 'payment_received',
    nameEn: 'Payment Received',
    nameBn: 'পেমেন্ট জমা রশিদ',
    descEn: 'Payment acknowledgement when full or partial payment is recorded',
    descBn: 'গ্রাহকের পেমেন্ট প্রাপ্তির সাথে সাথে নিশ্চিতকরণ বার্তা',
    category: 'billing',
  },
  {
    type: 'quotation_approved',
    nameEn: 'Quotation Approved',
    nameBn: 'কোটেশন অনুমোদন',
    descEn: 'Alert when client or manager approves a sales quotation',
    descBn: 'গ্রাহক বা ম্যানেজার বিক্রয় কোটেশন অনুমোদন করলে বার্তা',
    category: 'billing',
  },
  {
    type: 'design_feedback',
    nameEn: 'Design Feedback / Proofing',
    nameBn: 'ডিজাইন ফিডব্যাক ও প্রুফ',
    descEn: 'Client feedback, revision requests, or artwork approval',
    descBn: 'গ্রাহকের ডিজাইন সংক্রান্ত মন্তব্য, সংশোধন বা অনুমোদন',
    category: 'production',
  },
  {
    type: 'production_problem',
    nameEn: 'Production Machine Issue',
    nameBn: 'মেশিন বা উৎপাদন সমস্যা',
    descEn: 'Machine breakdown, material jam, or urgent production problem',
    descBn: 'মেশিন নষ্ট, কাঁচামালের ঘাটতি বা জরুরি উৎপাদন সমস্যা',
    category: 'production',
  },
  {
    type: 'production_delay',
    nameEn: 'Production Deadline Warning',
    nameBn: 'উৎপাদন সময়সীমা সতর্কতা',
    descEn: 'Warning when a job is within 24 hours of scheduled completion',
    descBn: 'নির্ধারিত সমাপ্তির ২৪ ঘণ্টার মধ্যে কাজ সম্পন্ন না হলে সতর্কবার্তা',
    category: 'production',
  },
  {
    type: 'low_stock',
    nameEn: 'Low Inventory Stock',
    nameBn: 'কাঁচামাল সংকট সতর্কতা',
    descEn: 'Triggered when raw materials fall below the reorder threshold',
    descBn: 'স্টক পুনঃক্রয় সীমার নিচে নেমে গেলে সতর্কতা',
    category: 'production',
  },
  {
    type: 'attendance_exception',
    nameEn: 'Attendance Exception',
    nameBn: 'হাজিরা ব্যতিক্রম',
    descEn: 'Late check-in, geofence mismatch, or correction request',
    descBn: 'দেরিতে উপস্থিতি, জিওফেন্স বাইরে বা হাজিরা সংশোধনের আবেদন',
    category: 'hr',
  },
  {
    type: 'subscription_state',
    nameEn: 'Subscription & Plan Status',
    nameBn: 'সাবস্ক্রিপশন ও প্ল্যান স্ট্যাটাস',
    descEn: 'Billing cycle updates, plan upgrades, and renewals',
    descBn: 'সাবস্ক্রিপশন বিলিং, প্ল্যান পরিবর্তন ও নবায়ন সংক্রান্ত বিজ্ঞপ্তি',
    category: 'system',
  },
  {
    type: 'support_reply',
    nameEn: 'Support Ticket Reply',
    nameBn: 'সাপোর্ট টিকিট উত্তর',
    descEn: 'Direct message from platform technical support agent',
    descBn: 'সাপোর্ট টিকিট বা হেল্পডেস্ক থেকে নতুন উত্তর প্রাপ্তি',
    category: 'system',
  },
]

export default function NotificationSettingsPage() {
  const params = useParams()
  const routeSlug = (params?.tenantSlug as string) || ''
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const { showToast } = useToast()
  const slug = routeSlug || company?.slug || ''

  const [activeTab, setActiveTab] = useState<'preferences' | 'templates' | 'test'>('preferences')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Preferences State
  const [preferences, setPreferences] = useState<Record<string, Partial<NotificationPreferenceRecord>>>({})
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true)
  const [quietHoursStart, setQuietHoursStart] = useState('22:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00')

  // Templates State
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('invoice_created')
  const [previewLang, setPreviewLang] = useState<'bn' | 'en'>('bn')

  // Test Dispatch State
  const [testChannel, setTestChannel] = useState<'in_app' | 'whatsapp' | 'email'>('in_app')
  const [testRecipient, setTestRecipient] = useState('')
  const [isTestSending, setIsTestSending] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  // Load initial preferences and templates from DB
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [prefRes, tplRes] = await Promise.all([
        getUserNotificationPreferencesAction(company?.id),
        getNotificationTemplatesAction(company?.id),
      ])

      if (prefRes.success && prefRes.data) {
        const prefMap: Record<string, Partial<NotificationPreferenceRecord>> = {}
        for (const item of prefRes.data) {
          prefMap[item.event_type] = item
        }
        setPreferences(prefMap)

        // Sync quiet hours from first available record
        const sample = prefRes.data[0]
        if (sample) {
          setQuietHoursEnabled(Boolean(sample.quiet_hours_enabled))
          if (sample.quiet_hours_start) setQuietHoursStart(sample.quiet_hours_start)
          if (sample.quiet_hours_end) setQuietHoursEnd(sample.quiet_hours_end)
        }
      }

      if (tplRes.success && tplRes.data) {
        setTemplates(tplRes.data)
      }
    } catch (err: any) {
      console.warn('Failed to load notification settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [company?.id])

  // Handle Channel Checkbox Toggle
  const handleToggleChannel = (
    eventType: string,
    channel: 'in_app_enabled' | 'whatsapp_enabled' | 'email_enabled' | 'sms_enabled'
  ) => {
    setPreferences((prev) => {
      const current = prev[eventType] || {
        event_type: eventType as NotificationEventType,
        in_app_enabled: true,
        whatsapp_enabled: true,
        email_enabled: true,
        sms_enabled: false,
      }
      return {
        ...prev,
        [eventType]: {
          ...current,
          [channel]: !current[channel],
        },
      }
    })
  }

  // Save Preferences
  const handleSavePreferences = async () => {
    setIsSaving(true)
    try {
      const payload: Partial<NotificationPreferenceRecord>[] = EVENT_METADATA.map((event) => {
        const current = preferences[event.type] || {}
        return {
          event_type: event.type,
          in_app_enabled: current.in_app_enabled ?? true,
          whatsapp_enabled: current.whatsapp_enabled ?? true,
          email_enabled: current.email_enabled ?? true,
          sms_enabled: current.sms_enabled ?? false,
          quiet_hours_enabled: quietHoursEnabled,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd,
        }
      })

      const res = await saveUserNotificationPreferencesAction(payload, company?.id)
      if (res.success) {
        showToast({
          title: 'Preferences Saved',
          titleBn: 'পছন্দসমূহ সংরক্ষিত হয়েছে',
          type: 'success',
          message: 'Your notification channels and quiet hours have been updated.',
          messageBn: 'আপনার নোটিফিকেশন চ্যানেল এবং নিস্তব্ধ সময়ের সেটিংস আপডেট হয়েছে।',
        })
      } else {
        showToast({
          title: 'Save Failed',
          titleBn: 'সংরক্ষণ ব্যর্থ হয়েছে',
          type: 'error',
          message: res.error || 'Failed to save preferences',
          messageBn: 'সেটিংস সংরক্ষণ করা সম্ভব হয়নি',
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Active Selected Template
  const activeTemplate = useMemo(() => {
    return (
      templates.find((t) => t.template_key === selectedTemplateKey) ||
      templates[0] || {
        template_key: selectedTemplateKey,
        name: 'Notification',
        name_bn: 'বিজ্ঞপ্তি',
        body_en: 'Notification for {{invoice_number}}',
        body_bn: '{{invoice_number}}-এর জন্য বিজ্ঞপ্তি',
        variables: ['invoice_number', 'customer_name'],
      }
    )
  }, [templates, selectedTemplateKey])

  // Interpolated Preview
  const sampleVariables: Record<string, string> = {
    customer_name: 'Vision Enterprise',
    recipient_name: 'Aman Ullah',
    invoice_number: 'INV-2026-0042',
    quotation_number: 'QTN-2026-0019',
    order_number: 'ORD-2026-0088',
    job_number: 'JOB-901',
    task_number: 'TSK-102',
    ticket_number: 'TCK-881',
    amount: '18,500',
    due_amount: '6,200',
    current_stock: '35',
    reorder_level: '50',
    item_name: 'Solvent Backlit Banner 440gsm',
    unit: 'sft',
    reason: 'Routine equipment calibration delay',
    new_eta: 'Tomorrow at 04:00 PM',
    machine_name: 'Roland VS-640 #1',
    problem_type: 'Printhead Cleaning Error',
    description: 'High speed printing paused for maintenance',
    comment: 'Artwork proof requires resolution adjustment',
    status: 'Ready for Review',
    date: '2026-10-04',
    preview: 'Please confirm updated cutting dimensions.',
    plan_name: 'Professional Enterprise',
  }

  const renderedPreview = useMemo(() => {
    const raw = previewLang === 'bn' ? activeTemplate.body_bn : activeTemplate.body_en
    if (!raw) return ''
    let out = raw
    for (const [k, v] of Object.entries(sampleVariables)) {
      out = out.replace(new RegExp(`{{${k}}}`, 'g'), v)
      out = out.replace(new RegExp(`{${k}}`, 'g'), v)
    }
    return out
  }, [activeTemplate, previewLang])

  // Handle Test Notification Send
  const handleTestSend = async () => {
    if (testChannel !== 'in_app' && !testRecipient.trim()) {
      showToast({
        title: 'Recipient Required',
        titleBn: 'প্রাপকের ঠিকানা প্রয়োজন',
        type: 'warning',
        message:
          testChannel === 'whatsapp'
            ? 'Please enter a valid Bangladesh mobile number (01XXXXXXXXX).'
            : 'Please enter a valid email address.',
        messageBn: 'অনুগ্রহ করে সঠিক ফোন নম্বর বা ইমেইল ঠিকানা লিখুন।',
      })
      return
    }

    setIsTestSending(true)
    setTestResult(null)
    try {
      const res = await notifyAction({
        companyId: company?.id || '',
        type: selectedTemplateKey as NotificationEventType,
        payload: {
          ...sampleVariables,
          recipientPhone: testChannel === 'whatsapp' ? testRecipient : undefined,
          recipientEmail: testChannel === 'email' ? testRecipient : undefined,
          recipientName: 'Test Recipient',
          action_url: '/settings/notifications',
        },
        channels: [testChannel],
      })

      if (res.success && res.data) {
        setTestResult(res.data)
        showToast({
          title: 'Test Notification Dispatched',
          titleBn: 'টেস্ট নোটিফিকেশন পাঠানো হয়েছে',
          type: 'success',
          message:
            testChannel === 'in_app'
              ? 'Delivered to In-App Bell instantly (< 1s).'
              : `Enqueued for async queue worker delivery (${res.data.jobsEnqueuedCount} job enqueued).`,
          messageBn:
            testChannel === 'in_app'
              ? 'ইন-অ্যাপ বেল আইকনে তাৎক্ষণিকভাবে পৌঁছেছে (< ১ সেকেন্ড)।'
              : 'ডেলিভারি কিউতে সফলভাবে যোগ করা হয়েছে।',
        })
      } else {
        showToast({
          title: 'Dispatch Failed',
          titleBn: 'নোটিফিকেশন পাঠানো ব্যর্থ হয়েছে',
          type: 'error',
          message: res.error || 'Failed to dispatch test notification',
          messageBn: 'টেস্ট নোটিফিকেশন প্রেরণ সম্ভব হয়নি',
        })
      }
    } finally {
      setIsTestSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titleEn="Notification Preferences & Channels"
        titleBn="নোটিফিকেশন পছন্দ ও চ্যানেল সেটিংস"
        descriptionEn="Granular multi-channel notification toggles, Asia/Dhaka quiet hours enforcement, bilingual message templates, and live test delivery."
        descriptionBn="প্রতিটি ইভেন্টের জন্য ইন-অ্যাপ, হোয়াটসঅ্যাপ ও ইমেইল নিয়ন্ত্রণ, এশিয়া/ঢাকা নিস্তব্ধ সময় ও দ্বিভাষিক মেসেজ টেমপ্লেট।"
        icon={Bell}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'preferences'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          {tBilingual('Preferences & Quiet Hours', 'পছন্দসমূহ ও নিস্তব্ধ সময়')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          {tBilingual('Template Preview', 'টেমপ্লেট প্রিভিউ')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'test'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          {tBilingual('Live Test Send', 'টেস্ট মেসেজ পাঠান')}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: CHANNEL PREFERENCES & ASIA/DHAKA QUIET HOURS
          ========================================================================= */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Quiet Hours Card */}
          <Card className="rounded-xl border border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      {tBilingual('Quiet Hours (Asia/Dhaka)', 'নিস্তব্ধ সময় (এশিয়া/ঢাকা)')}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {tBilingual(
                        'Automatically defer external WhatsApp & Email dispatches during rest hours without disturbing customers or staff.',
                        'গ্রাহক বা কর্মীদের বিরক্তি এড়াতে বিশ্রামের সময় হোয়াটসঅ্যাপ ও ইমেইল পাঠানো স্বয়ংক্রিয়ভাবে স্থগিত রাখা হয়।'
                      )}
                    </CardDescription>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quietHoursEnabled}
                    onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Quiet Hours Start Time', 'শুরুর সময়')}
                  </Label>
                  <Input
                    type="time"
                    value={quietHoursStart}
                    disabled={!quietHoursEnabled}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <span className="text-xs text-muted-foreground block">
                    {tBilingual('Default: 10:00 PM (22:00 BST)', 'ডিফল্ট: রাত ১০:০০')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Quiet Hours End Time (Resume Dispatches)', 'শেষের সময় (পুনরায় শুরু)')}
                  </Label>
                  <Input
                    type="time"
                    value={quietHoursEnd}
                    disabled={!quietHoursEnabled}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <span className="text-xs text-muted-foreground block">
                    {tBilingual('Default: 08:00 AM (08:00 BST)', 'ডিফল্ট: সকাল ০৮:০০')}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  {tBilingual(
                    'In-App bell notifications are always delivered immediately regardless of quiet hours. External dispatches triggered during quiet hours are scheduled to resume automatically at the designated end time.',
                    'ইন-অ্যাপ বেল নোটিফিকেশন সবসময় তাৎক্ষণিকভাবে পাওয়া যাবে। নিস্তব্ধ সময়ে আসা হোয়াটসঅ্যাপ ও ইমেইল সকালের নির্ধারিত সময়ে পৌঁছাবে।'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Granular Event Channel Preferences Table */}
          <Card className="rounded-xl border border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  {tBilingual('Event Channel Distribution Matrix', 'ইভেন্ট চ্যানেল ডিস্ট্রিবিউশন ম্যাট্রিক্স')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {tBilingual(
                    'Configure exactly which channels receive dispatches for each ERP business event.',
                    'প্রতিটি ব্যবসায়িক ইভেন্টের জন্য কোন কোন চ্যানেলে নোটিফিকেশন যাবে তা নির্ধারণ করুন।'
                  )}
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {tBilingual('Save Preferences', 'পছন্দ সংরক্ষণ করুন')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-3 px-4 min-w-[220px]">
                        {tBilingual('Business Event', 'ব্যবসায়িক ইভেন্ট')}
                      </th>
                      <th className="py-3 px-4 text-center w-28">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Bell className="h-3 w-3 text-primary" /> In-App
                        </span>
                      </th>
                      <th className="py-3 px-4 text-center w-28">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <MessageSquare className="h-3 w-3 text-success" /> WhatsApp
                        </span>
                      </th>
                      <th className="py-3 px-4 text-center w-28">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Mail className="h-3 w-3 text-primary" /> Email
                        </span>
                      </th>
                      <th className="py-3 px-4 text-center w-28">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Smartphone className="h-3 w-3 text-muted-foreground" /> SMS
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {EVENT_METADATA.map((event) => {
                      const pref = preferences[event.type] || {
                        in_app_enabled: true,
                        whatsapp_enabled: true,
                        email_enabled: true,
                        sms_enabled: false,
                      }

                      return (
                        <tr key={event.type} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-foreground">
                              {tBilingual(event.nameEn, event.nameBn)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tBilingual(event.descEn, event.descBn)}
                            </p>
                          </td>

                          {/* In-App Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={pref.in_app_enabled !== false}
                              onChange={() => handleToggleChannel(event.type, 'in_app_enabled')}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                              title="Toggle In-App notification"
                            />
                          </td>

                          {/* WhatsApp Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={pref.whatsapp_enabled !== false}
                              onChange={() => handleToggleChannel(event.type, 'whatsapp_enabled')}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                              title="Toggle WhatsApp notification"
                            />
                          </td>

                          {/* Email Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={pref.email_enabled !== false}
                              onChange={() => handleToggleChannel(event.type, 'email_enabled')}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                              title="Toggle Email notification"
                            />
                          </td>

                          {/* SMS Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={pref.sms_enabled === true}
                              onChange={() => handleToggleChannel(event.type, 'sms_enabled')}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                              title="Toggle SMS notification"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {tBilingual(
                    'Unchecking a channel will completely suppress external job enqueues and in-app writes for that event.',
                    'কোনো চ্যানেল আনচেক করলে ওই ইভেন্টের জন্য স্বয়ংক্রিয় মেসেজ পাঠানো বন্ধ থাকবে।'
                  )}
                </span>

                <Button
                  size="sm"
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {tBilingual('Save Preferences', 'পছন্দ সংরক্ষণ করুন')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: BILINGUAL TEMPLATE PREVIEW
          ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selection & Info */}
          <div className="space-y-4">
            <Card className="rounded-xl border border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold text-foreground">
                  {tBilingual('Select Template', 'টেমপ্লেট নির্বাচন করুন')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {tBilingual(
                    'Stored per-language in message_templates. Zero mixed-language messages.',
                    'ডাটাবেসে সংরক্ষিত দ্বিভাষিক টেমপ্লেট। সম্পূর্ণ বাংলা অথবা সম্পূর্ণ ইংরেজি।'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Event Template', 'ইভেন্ট টেমপ্লেট')}
                  </Label>
                  <select
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    {EVENT_METADATA.map((e) => (
                      <option key={e.type} value={e.type}>
                        {tBilingual(e.nameEn, e.nameBn)} ({e.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Preview Language', 'প্রিভিউ ভাষা')}
                  </Label>
                  <div className="flex rounded-lg border border-border p-1 bg-muted/40 gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewLang('bn')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        previewLang === 'bn'
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      বাংলা (Bangla)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewLang('en')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        previewLang === 'en'
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    {tBilingual('Available Template Variables', 'ব্যবহারযোগ্য ভেরিয়েবল')}
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'customer_name',
                      'invoice_number',
                      'amount',
                      'due_amount',
                      'item_name',
                      'unit',
                      'reason',
                      'new_eta',
                    ].map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 rounded-md bg-muted text-xs font-mono text-muted-foreground border border-border"
                      >
                        {`{${v}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl border border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    {tBilingual('Rendered Message Preview', 'প্রস্তুতকৃত বার্তার প্রিভিউ')}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {previewLang === 'bn'
                      ? 'শুদ্ধ বাংলায় অনূদিত গ্রাহক বা অভ্যন্তরীণ নোটিফিকেশন'
                      : 'Professional English notification rendered without translation artifacts'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {selectedTemplateKey}
                </Badge>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {/* Simulated Notification Container */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-foreground">
                      {previewLang === 'bn' ? activeTemplate.name_bn || activeTemplate.name : activeTemplate.name}
                    </span>
                    <span className="text-xs text-muted-foreground">PrintFlow • Just now</span>
                  </div>

                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed font-sans">
                    {renderedPreview || 'No template content registered for this language.'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-success-surface border border-success/30 flex items-center gap-2 text-xs text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    {tBilingual(
                      'Zero mixed-language invariant satisfied: All static and variable components match the recipient locale.',
                      'ভাষা বিশুদ্ধতা যাচাইকৃত: কোনো মিশ্র বা ত্রুটিপূর্ণ টেক্সট ছাড়াই সম্পূর্ণ বার্তা প্রদর্শিত হচ্ছে।'
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LIVE TEST SEND
          ========================================================================= */}
      {activeTab === 'test' && (
        <Card className="rounded-xl border border-border bg-card shadow-xs max-w-2xl">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">
              {tBilingual('Send Test Notification', 'টেস্ট নোটিফিকেশন পাঠান')}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {tBilingual(
                'Verify sub-second in-app delivery or async email/WhatsApp queue processing live.',
                'ইন-অ্যাপ তাৎক্ষণিক নোটিফিকেশন বা হোয়াটসঅ্যাপ/ইমেইল কিউ প্রসেসিং সরাসরি পরীক্ষা করুন।'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {tBilingual('Delivery Channel', 'ডেলিভারি চ্যানেল')}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'in_app', label: 'In-App Bell (< 1s)' },
                  { id: 'whatsapp', label: 'WhatsApp (Async)' },
                  { id: 'email', label: 'Email (Async)' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setTestChannel(ch.id as any)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      testChannel === ch.id
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {tBilingual('Event Type', 'ইভেন্ট ধরন')}
              </Label>
              <select
                value={selectedTemplateKey}
                onChange={(e) => setSelectedTemplateKey(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                {EVENT_METADATA.map((e) => (
                  <option key={e.type} value={e.type}>
                    {tBilingual(e.nameEn, e.nameBn)}
                  </option>
                ))}
              </select>
            </div>

            {testChannel !== 'in_app' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {testChannel === 'whatsapp'
                    ? tBilingual('Recipient WhatsApp Number', 'প্রাপকের হোয়াটসঅ্যাপ নম্বর')
                    : tBilingual('Recipient Email Address', 'প্রাপকের ইমেইল ঠিকানা')}
                </Label>
                <Input
                  type={testChannel === 'whatsapp' ? 'tel' : 'email'}
                  placeholder={testChannel === 'whatsapp' ? '01712345678' : 'manager@example.com'}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <Button
              onClick={handleTestSend}
              disabled={isTestSending}
              className="w-full h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              {isTestSending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {tBilingual('Dispatch Test Notification', 'টেস্ট নোটিফিকেশন পাঠান')}
            </Button>

            {testResult && (
              <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{tBilingual('Dispatch Completed Successfully', 'সফলভাবে সম্পন্ন হয়েছে')}</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                  <p>In-App Delivered: {testResult.inAppDeliveredCount}</p>
                  <p>Jobs Enqueued: {testResult.jobsEnqueuedCount}</p>
                  {testResult.delayedForQuietHours && (
                    <p className="text-warning">Held for Quiet Hours: Will resume at {quietHoursEnd} BST</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}