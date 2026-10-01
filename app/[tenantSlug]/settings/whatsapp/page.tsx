'use client'

// ==============================================================================
// PrintERP SaaS - Tenant WhatsApp Gateway Settings
// Location: Tenant Dashboard -> Settings -> WhatsApp Gateway
// Multi-tenant QR pairing, connection lifecycle, test messaging & safety rules
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Power,
  ShieldCheck,
  Clock,
  Sliders,
  Info,
  Check,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import {
  initiateWhatsAppConnectionAction,
  getWhatsAppConnectionStatusAction,
  disconnectWhatsAppAction,
  sendWhatsAppTestMessageAction,
  updateWhatsAppSettingsAction,
  type WhatsAppConnectionDetails,
} from '@/actions/whatsapp-connection.actions'

export default function TenantWhatsAppSettingsPage() {
  const { company } = useTenant()
  const { t, locale } = useI18n()

  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<WhatsAppConnectionDetails | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [qrPollCount, setQrPollCount] = useState(0)

  // Test Message State
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from PrintERP.')
  const [sendingTest, setSendingTest] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Settings State
  const [dailyLimit, setDailyLimit] = useState(500)
  const [sendDelay, setSendDelay] = useState(3)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null)

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    if (!company?.id) return
    try {
      const res = await getWhatsAppConnectionStatusAction(company.id)
      if (res.success && res.data) {
        setConnection(res.data)
        setDailyLimit(res.data.dailySendLimit || 500)
        setSendDelay(res.data.sendDelaySeconds || 3)

        // If in QR state and modal open, sync QR
        if (res.data.status === 'qr_ready' && res.data.qrCode) {
          setQrCodeData(res.data.qrCode)
        } else if (res.data.status === 'connected') {
          setIsQrModalOpen(false)
          setQrCodeData(null)
        }
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp connection status:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [company?.id])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // QR Polling Effect
  useEffect(() => {
    if (!isQrModalOpen || connection?.status === 'connected') return

    const timer = setInterval(async () => {
      setQrPollCount((prev) => prev + 1)
      await fetchStatus()
    }, 4000)

    return () => clearInterval(timer)
  }, [isQrModalOpen, connection?.status, fetchStatus])

  // Initiate QR Connection
  const handleInitiateConnection = async () => {
    if (!company?.id) return
    setConnecting(true)
    setIsQrModalOpen(true)
    try {
      const res = await initiateWhatsAppConnectionAction(company.id)
      if (res.success && res.data) {
        if (res.data.status === 'connected') {
          setIsQrModalOpen(false)
        } else if (res.data.qrCode) {
          setQrCodeData(res.data.qrCode)
        }
        await fetchStatus()
      } else {
        alert(res.error || 'Failed to initiate WhatsApp connection.')
        setIsQrModalOpen(false)
      }
    } catch (err: any) {
      alert(err.message || 'Error initiating connection.')
      setIsQrModalOpen(false)
    } finally {
      setConnecting(false)
    }
  }

  // Disconnect
  const handleDisconnect = async () => {
    if (!company?.id) return
    if (!confirm('Are you sure you want to disconnect WhatsApp? Outbound notifications will pause or fall back to SMS.')) {
      return
    }
    setDisconnecting(true)
    try {
      const res = await disconnectWhatsAppAction(company.id)
      if (res.success) {
        await fetchStatus()
      } else {
        alert(res.error || 'Failed to disconnect.')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  // Send Test Message
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company?.id || !testPhone || !testMessage) return
    setSendingTest(true)
    setTestFeedback(null)

    try {
      const res = await sendWhatsAppTestMessageAction({
        phone: testPhone,
        message: testMessage,
        requestedCompanyId: company.id,
      })

      if (res.success) {
        setTestFeedback({
          success: true,
          message: `Success! Message delivered in ${res.data?.latencyMs || 0}ms. ID: ${res.data?.messageId || 'OK'}`,
        })
      } else {
        setTestFeedback({
          success: false,
          message: res.error || 'Test message dispatch failed.',
        })
      }
    } catch (err: any) {
      setTestFeedback({
        success: false,
        message: err.message || 'An error occurred during test dispatch.',
      })
    } finally {
      setSendingTest(false)
    }
  }

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company?.id) return
    setSavingSettings(true)
    setSettingsFeedback(null)

    try {
      const res = await updateWhatsAppSettingsAction({
        dailySendLimit: Number(dailyLimit),
        sendDelaySeconds: Number(sendDelay),
        requestedCompanyId: company.id,
      })

      if (res.success) {
        setSettingsFeedback('Settings updated successfully.')
        setTimeout(() => setSettingsFeedback(null), 3500)
      } else {
        alert(res.error || 'Failed to update settings.')
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const isConnected = connection?.status === 'connected'

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        titleEn="WhatsApp Gateway Integration"
        titleBn="হোয়াটসঅ্যাপ গেটওয়ে ইন্টিগ্রেশন"
        descriptionEn="Connect your business WhatsApp number via dedicated OpenWA gateway. Enables automated order updates, invoice PDFs, and customer chat."
        descriptionBn="ডেডিকেটেড OpenWA গেটওয়ের মাধ্যমে আপনার ব্যবসায়িক হোয়াটসঅ্যাপ নম্বর সংযুক্ত করুন।"
        icon={MessageSquare}
        iconColor="text-emerald-600"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              fetchStatus()
            }}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {locale === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh Status'}
          </Button>
        }
      />

      {/* Top Banner Alert if Disconnected */}
      {!isConnected && !loading && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {locale === 'bn' ? 'হোয়াটসঅ্যাপ সংযোগ নেই' : 'WhatsApp Gateway is Not Connected'}
            </p>
            <p className="opacity-90 mt-0.5">
              {locale === 'bn'
                ? 'স্বয়ংক্রিয় ইনভয়েস, ডেলিভারি আপডেট এবং বার্তা পাঠাতে নিচের "Connect WhatsApp" বোতামে ক্লিক করে QR কোড স্ক্যান করুন।'
                : 'To enable automated order updates, invoice PDFs, and real-time chat, please scan the QR code to pair your device.'}
            </p>
          </div>
          <Button size="sm" onClick={handleInitiateConnection} disabled={connecting} className="shrink-0 gap-1.5">
            <QrCode className="w-4 h-4" />
            {locale === 'bn' ? 'সংযোগ করুন' : 'Connect Now'}
          </Button>
        </div>
      )}

      {/* 1. Connection Status Card */}
      <Card className="overflow-hidden border border-border/80 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isConnected ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {locale === 'bn' ? 'সংযোগ স্থিতি' : 'Connection Status'}
                  <Badge
                    variant={
                      isConnected
                        ? 'default'
                        : connection?.status === 'qr_ready'
                        ? 'secondary'
                        : 'outline'
                    }
                    className={`capitalize font-medium ${
                      isConnected
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : connection?.status === 'qr_ready'
                        ? 'bg-amber-600 text-white'
                        : ''
                    }`}
                  >
                    {connection?.status || 'disconnected'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {connection?.sessionId ? `Session ID: ${connection.sessionId}` : 'No active session'}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="gap-2"
                >
                  <Power className="w-4 h-4" />
                  {disconnecting ? 'Disconnecting...' : locale === 'bn' ? 'সংযোগ বিচ্ছিন্ন করুন' : 'Disconnect'}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleInitiateConnection}
                  disabled={connecting}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <QrCode className="w-4 h-4" />
                  {connecting ? 'Initializing...' : locale === 'bn' ? 'QR কোড স্ক্যান করুন' : 'Pair Device (QR)'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-muted/40 border space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {locale === 'bn' ? 'সংযুক্ত ফোন নম্বর' : 'Linked Phone Number'}
              </span>
              <p className="text-base font-semibold text-foreground flex items-center gap-1.5">
                {connection?.phoneNumber ? (
                  <>
                    <span className="text-lg">🇧🇩</span>
                    <span>{connection.phoneNumber}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm font-normal">Not paired</span>
                )}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {locale === 'bn' ? 'হোয়াটসঅ্যাপ প্রোফাইল নাম' : 'Profile Name'}
              </span>
              <p className="text-base font-semibold text-foreground">
                {connection?.displayName || <span className="text-muted-foreground text-sm font-normal">N/A</span>}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {locale === 'bn' ? 'সংযোগের সময়' : 'Connected At'}
              </span>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {connection?.connectedAt
                  ? new Date(connection.connectedAt).toLocaleString()
                  : <span className="text-muted-foreground font-normal">Not connected</span>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Test Dispatch & Anti-Ban Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Real Test Message Dispatch */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {locale === 'bn' ? 'টেস্ট হোয়াটসঅ্যাপ বার্তা পাঠান' : 'Send Test WhatsApp Message'}
            </CardTitle>
            <CardDescription className="text-xs">
              {locale === 'bn'
                ? 'আপনার ফোন নম্বর প্রবেশ করিয়ে সরাসরি টেস্ট মেসেজ পাঠিয়ে সংযোগ পরীক্ষা করুন।'
                : 'Dispatch a live test message to verify gateway connectivity and latency.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="testPhone" className="text-xs font-medium">
                  {locale === 'bn' ? 'প্রাপকের মোবাইল নম্বর' : 'Recipient Phone Number'}
                </Label>
                <Input
                  id="testPhone"
                  type="text"
                  placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  required
                  disabled={!isConnected || sendingTest}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="testMessage" className="text-xs font-medium">
                  {locale === 'bn' ? 'বার্তার বিবরণ' : 'Message Content'}
                </Label>
                <textarea
                  id="testMessage"
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={!isConnected || sendingTest}
                />
              </div>

              {testFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    testFeedback.success
                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-500/20'
                  }`}
                >
                  {testFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testFeedback.message}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={!isConnected || sendingTest}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className={`w-4 h-4 ${sendingTest ? 'animate-pulse' : ''}`} />
                {sendingTest
                  ? 'Dispatching...'
                  : locale === 'bn'
                  ? 'টেস্ট মেসেজ পাঠান'
                  : 'Send Test WhatsApp'}
              </Button>

              {!isConnected && (
                <p className="text-xs text-muted-foreground text-center">
                  * Connect your WhatsApp device above to enable test messaging.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* 3. Safe Messaging & Rate Limits */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              {locale === 'bn' ? 'বার্তা প্রেরণের নিয়ম ও সীমা' : 'Sending Limits & Anti-Ban Rules'}
            </CardTitle>
            <CardDescription className="text-xs">
              {locale === 'bn'
                ? 'অ্যাকাউন্ট সুরক্ষার জন্য দৈনিক কোটা এবং প্রেরণের ব্যবধান নির্ধারণ করুন।'
                : 'Configure safe throttling and delay rules to prevent WhatsApp spam bans.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dailyLimit" className="text-xs font-medium">
                    {locale === 'bn' ? 'দৈনিক সর্বোচ্চ বার্তা' : 'Daily Max Messages'}
                  </Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    min={10}
                    max={5000}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">Default: 500/day</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sendDelay" className="text-xs font-medium">
                    {locale === 'bn' ? 'বার্তার মধ্যবর্তী বিরতি (সেকেন্ড)' : 'Delay Between Messages (s)'}
                  </Label>
                  <Input
                    id="sendDelay"
                    type="number"
                    min={1}
                    max={60}
                    value={sendDelay}
                    onChange={(e) => setSendDelay(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">Recommended: 3 - 5s</p>
                </div>
              </div>

              {/* Anti-Ban Best Practices Notice */}
              <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                  {locale === 'bn' ? 'হোয়াটসঅ্যাপ অ্যাকাউন্ট সুরক্ষা নির্দেশিকা' : 'Anti-Ban Safety Best Practices'}
                </div>
                <ul className="list-disc list-inside space-y-1 opacity-90 text-[11px]">
                  <li>Warm up new numbers gradually (start with 50-100 messages/day).</li>
                  <li>Only send to customers who have an active order or transaction.</li>
                  <li>Do not blast unrequested marketing messages to cold contact lists.</li>
                  <li>If WhatsApp disconnects, SMS fallback automatically triggers.</li>
                </ul>
              </div>

              {settingsFeedback && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {settingsFeedback}
                </div>
              )}

              <Button type="submit" disabled={savingSettings} variant="outline" className="w-full">
                {savingSettings ? 'Saving...' : locale === 'bn' ? 'সেটিংস সংরক্ষণ করুন' : 'Save Sending Rules'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Modal Dialog */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card text-card-foreground border shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-5 relative">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">
                {locale === 'bn' ? 'হোয়াটসঅ্যাপ স্ক্যান করুন' : 'Scan WhatsApp QR Code'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {locale === 'bn'
                  ? 'আপনার ফোনের হোয়াটসঅ্যাপ ওপেন করে Linked Devices থেকে স্ক্যান করুন।'
                  : 'Open WhatsApp on your phone and scan this code to link your device.'}
              </p>
            </div>

            {/* QR Visual */}
            <div className="flex flex-col items-center justify-center p-6 bg-card rounded-xl border shadow-inner min-h-[260px]">
              {qrCodeData ? (
                <img
                  src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                  alt="WhatsApp Pairing QR Code"
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-xs">Generating secure QR code...</p>
                </div>
              )}
            </div>

            {/* Step-by-Step Guide */}
            <div className="bg-muted/40 rounded-lg p-3.5 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">
                {locale === 'bn' ? 'কীভাবে যুক্ত করবেন:' : 'How to connect:'}
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open WhatsApp on your phone</li>
                <li>Tap <b>Menu (⋮)</b> or <b>Settings (⚙️)</b></li>
                <li>Select <b>Linked Devices</b> and tap <b>Link a Device</b></li>
                <li>Point your camera at the QR code above</li>
              </ol>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Listening for device pairing...
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInitiateConnection}
                className="h-7 text-xs"
              >
                Reload QR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
