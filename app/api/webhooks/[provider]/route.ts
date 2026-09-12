// ==============================================================================
// PrintERP SaaS - Unified Webhook Ingestion Engine
// Handles bKash, SSLCOMMERZ, UddoktaPay, Stripe, Meta WhatsApp, Telegram, & SMS DLR
// Strictly separates Platform SaaS billing and Tenant billing contexts.
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GatewayService } from '@/services/gateway.service'
import { SubscriptionService } from '@/services/subscription.service'
import { PlatformSubscriptionService } from '@/services/platform-subscription.service'

/**
 * Dispatches payment verification to either Platform SaaS Billing or Tenant Billing
 */
async function dispatchPaymentVerification(params: {
  internalTrxId: string
  providerTrxId?: string
  gatewayReference?: string
  provider: string
  payload?: any
}): Promise<{ isVerified: boolean; isPlatform: boolean }> {
  const { internalTrxId, providerTrxId, gatewayReference, provider, payload } = params
  const isPlatform =
    internalTrxId?.startsWith('PLT-TX-') ||
    payload?.metadata?.billing_context === 'PLATFORM' ||
    payload?.billing_context === 'PLATFORM'

  if (isPlatform) {
    const res = await PlatformSubscriptionService.verifyPlatformPaymentAndActivateSubscription(
      internalTrxId,
      {
        provider_trx_id: providerTrxId || gatewayReference,
        ...payload,
      }
    )
    return { isVerified: res.isVerified, isPlatform: true }
  } else {
    const res = await SubscriptionService.verifyPaymentAndActivateSubscription({
      internalTrxId,
      providerTrxId,
      gatewayReference,
      provider,
    })
    return { isVerified: res.success, isPlatform: false }
  }
}

/**
 * GET: Webhook Verification Handshake (Meta WhatsApp Cloud API & Browser Redirect Callbacks)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const searchParams = request.nextUrl.searchParams

  // 1. Meta WhatsApp Webhook Verification
  if (provider === 'whatsapp' || provider === 'meta_whatsapp') {
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    const admin = createAdminClient()
    const { data: gw } = await (admin as any)
      .from('gateway_integrations')
      .select('*')
      .eq('category', 'whatsapp')
      .maybeSingle()

    const creds = gw ? GatewayService.getDecryptedCredentials(gw) : {}
    const expectedToken =
      gw?.public_config?.verify_token ||
      creds?.verify_token ||
      creds?.webhook_verify_token ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
      'printerp_whatsapp_verify_token'

    if (mode === 'subscribe' && token === expectedToken) {
      return new NextResponse(challenge, { status: 200 })
    }

    return NextResponse.json({ error: 'WhatsApp Webhook verification token mismatch' }, { status: 403 })
  }

  // 2. SSLCommerz, bKash, or UddoktaPay browser redirect callbacks
  if (provider === 'sslcommerz' || provider === 'bkash' || provider === 'uddoktapay') {
    const status = searchParams.get('status') || 'unknown'
    const tranId = searchParams.get('tran_id') || searchParams.get('trx') || searchParams.get('paymentID') || searchParams.get('invoice_id')

    let isPlatform = false
    let resolvedTenantSlug: string | null = null

    if (tranId) {
      const admin = createAdminClient()
      try {
        const { data: tx } = await (admin as any)
          .from('gateway_transactions')
          .select('id, tenant_id, metadata, billing_context')
          .or(`internal_trx_id.eq.${tranId},provider_trx_id.eq.${tranId}`)
          .maybeSingle()

        if (tx) {
          if (tx.billing_context === 'PLATFORM' || tranId.startsWith('PLT-TX-')) {
            isPlatform = true
          } else if (tx.tenant_id) {
            const { data: comp } = await (admin as any)
              .from('companies')
              .select('slug')
              .eq('id', tx.tenant_id)
              .maybeSingle()

            if (comp?.slug) {
              resolvedTenantSlug = comp.slug
            }
          }
        }
      } catch {}
    }

    if (tranId && (status === 'success' || status === 'Successful' || status === 'COMPLETED' || status === 'paid')) {
      // Execute server-side verification before redirecting
      const dispatchRes = await dispatchPaymentVerification({
        internalTrxId: tranId,
        providerTrxId: tranId,
        gatewayReference: tranId,
        provider,
      })
      isPlatform = isPlatform || dispatchRes.isPlatform
    }

    let redirectPath = '/login'
    if (isPlatform) {
      redirectPath = `/platform/billing?gateway=${provider}&status=${status}&tran_id=${tranId || ''}`
    } else if (resolvedTenantSlug) {
      redirectPath = `/${resolvedTenantSlug}/settings/subscription?gateway=${provider}&status=${status}&tran_id=${tranId || ''}`
    } else {
      redirectPath = `/login?gateway=${provider}&status=${status}&tran_id=${tranId || ''}`
    }

    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return NextResponse.json({ status: 'ok', provider, timestamp: new Date().toISOString() })
}

/**
 * POST: Incoming Provider Event Dispatcher & Idempotency Ledger
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const admin = createAdminClient()
  const now = new Date().toISOString()

  let payload: any = {}
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      payload = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const obj: Record<string, any> = {}
      formData.forEach((val, key) => {
        obj[key] = val
      })
      payload = obj
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payload body' }, { status: 400 })
  }

  const signature =
    request.headers.get('x-hub-signature-256') ||
    request.headers.get('x-telegram-bot-api-secret-token') ||
    request.headers.get('rt-uddoktapay-api-key') ||
    request.headers.get('x-webhook-signature')

  let isVerified = false
  let isPlatformContext = false
  let eventType = 'notification'
  let providerEventId: string | null = null

  // Idempotency & Replay Protection: Check if event already processed
  const candidateEventId =
    payload?.id ||
    payload?.val_id ||
    payload?.paymentID ||
    payload?.invoice_id ||
    payload?.tran_id ||
    payload?.data?.object?.id ||
    (payload?.update_id ? String(payload.update_id) : null)

  if (candidateEventId) {
    try {
      const { data: existingWebhook } = await (admin as any)
        .from('gateway_webhooks')
        .select('id, is_verified, status')
        .eq('provider', provider)
        .eq('provider_event_id', candidateEventId)
        .eq('status', 'processed')
        .maybeSingle()

      if (existingWebhook) {
        return NextResponse.json({
          received: true,
          provider,
          is_verified: true,
          status: 'already_processed',
          message: 'Idempotency check: Event already processed.',
          timestamp: now,
        })
      }
    } catch {}
  }

  // 1. WhatsApp Delivery Status Ingestion
  if (provider === 'whatsapp' || provider === 'meta_whatsapp') {
    eventType = 'whatsapp_message_status'
    const entry = payload?.entry?.[0]
    const changes = entry?.changes?.[0]?.value
    const statuses = changes?.statuses?.[0]

    if (statuses) {
      providerEventId = statuses.id
      const statusText = statuses.status
      isVerified = true

      if (providerEventId) {
        try {
          const updatePayload: any = {
            status: statusText === 'read' ? 'delivered' : statusText,
          }
          if (statusText === 'delivered') updatePayload.delivered_at = now
          if (statusText === 'failed') {
            updatePayload.failed_at = now
            updatePayload.error_message = statuses.errors?.[0]?.title || 'Delivery failed'
          }

          await (admin as any)
            .from('communication_logs')
            .update(updatePayload)
            .eq('provider_message_id', providerEventId)
        } catch (e) {
          console.warn('[Webhook] Comm log update error:', e)
        }
      }
    }
  }

  // 2. SSLCommerz IPN Handler
  else if (provider === 'sslcommerz') {
    eventType = 'payment_ipn'
    const valId = payload.val_id
    const tranId = payload.tran_id
    providerEventId = valId || tranId

    if (valId || tranId) {
      const res = await dispatchPaymentVerification({
        internalTrxId: tranId,
        providerTrxId: valId,
        gatewayReference: valId,
        provider: 'sslcommerz',
        payload,
      })
      isVerified = res.isVerified
      isPlatformContext = res.isPlatform
    }
  }

  // 3. bKash IPN / Callback Handler
  else if (provider === 'bkash') {
    eventType = 'payment_callback'
    const paymentID = payload.paymentID
    providerEventId = paymentID

    if (paymentID) {
      const res = await dispatchPaymentVerification({
        internalTrxId: paymentID,
        providerTrxId: paymentID,
        gatewayReference: paymentID,
        provider: 'bkash',
        payload,
      })
      isVerified = res.isVerified
      isPlatformContext = res.isPlatform
    }
  }

  // 4. UddoktaPay IPN Handler
  else if (provider === 'uddoktapay') {
    eventType = 'payment_ipn'
    const invoiceId = payload.invoice_id
    const tranId = payload.metadata?.transaction_id || payload.metadata?.internalTrxId
    providerEventId = invoiceId || tranId

    if (invoiceId || tranId) {
      const res = await dispatchPaymentVerification({
        internalTrxId: tranId,
        providerTrxId: invoiceId,
        gatewayReference: invoiceId,
        provider: 'uddoktapay',
        payload,
      })
      isVerified = res.isVerified
      isPlatformContext = res.isPlatform
    }
  }

  // 5. Stripe Webhook Handler
  else if (provider === 'stripe') {
    eventType = payload.type || 'stripe_event'
    const eventObj = payload.data?.object || {}
    providerEventId = payload.id || eventObj.id

    if (
      payload.type === 'checkout.session.completed' ||
      payload.type === 'payment_intent.succeeded' ||
      payload.type === 'charge.succeeded'
    ) {
      const internalTrxId = eventObj.metadata?.internalTrxId || eventObj.client_reference_id
      const sessionOrPaymentId = eventObj.id

      if (internalTrxId || sessionOrPaymentId) {
        const res = await dispatchPaymentVerification({
          internalTrxId,
          providerTrxId: sessionOrPaymentId,
          gatewayReference: sessionOrPaymentId,
          provider: 'stripe',
          payload,
        })
        isVerified = res.isVerified
        isPlatformContext = res.isPlatform
      }
    }
  }

  // 6. Telegram Webhook Handler
  else if (provider === 'telegram' || provider === 'telegram_bot') {
    eventType = 'telegram_update'
    providerEventId = String(payload.update_id || '')
    isVerified = true
  }

  // Record into Platform Webhook Events if platform context
  if (isPlatformContext) {
    try {
      await (admin as any).from('platform_webhook_events').insert({
        provider,
        event_id: providerEventId,
        event_type: eventType,
        transaction_id: payload.tran_id || payload.paymentID || payload.id || null,
        billing_context: 'PLATFORM',
        verification_status: isVerified ? 'VERIFIED' : 'UNVERIFIED',
        processed: isVerified,
        processed_at: now,
        payload,
        created_at: now,
      })
    } catch {}
  }

  // Record into General Webhook Events Ledger
  try {
    await (admin as any).from('gateway_webhooks').insert({
      provider,
      event_type: eventType,
      provider_event_id: providerEventId,
      signature,
      is_verified: isVerified,
      payload,
      status: isVerified ? 'processed' : 'received',
      processed_at: now,
      created_at: now,
    })
  } catch (err: any) {
    console.warn('[Webhook Ledger] Insertion fallback:', err.message)
  }

  return NextResponse.json({
    received: true,
    provider,
    is_verified: isVerified,
    is_platform: isPlatformContext,
    timestamp: now,
  })
}
