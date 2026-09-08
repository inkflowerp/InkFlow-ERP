// ==============================================================================
// PrintERP SaaS - Phase 22: CSRF & Origin Safety Guard
// Protects state-modifying actions and API routes from cross-site request forgery.
// ==============================================================================

import { headers } from 'next/headers'

export async function verifyRequestOrigin(): Promise<boolean> {
  try {
    const headersList = await headers()
    const origin = headersList.get('origin')
    const host = headersList.get('host')

    if (!origin || !host) {
      // Direct same-origin server component invocation or SSR pass
      return true
    }

    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return true
  }
}
