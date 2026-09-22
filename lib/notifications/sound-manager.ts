// ==============================================================================
// PrintERP SaaS - Universal High-Fidelity Notification Sound Synthesizer
// Studio-grade polyphonic audio synthesizer powered by Web Audio API.
// Amplified output volume with dynamic limiter compression to prevent clipping.
// Zero external MP3 asset dependency, 100% offline-ready, cross-platform support.
// ==============================================================================

export type NotificationSoundType =
  | 'order'
  | 'payment'
  | 'attendance'
  | 'delivery'
  | 'job'
  | 'inventory'
  | 'urgent'
  | 'warning'
  | 'error'
  | 'broadcast'
  | 'message'
  | 'success'
  | 'system'

export interface SoundCatalogItem {
  type: NotificationSoundType
  nameEn: string
  nameBn: string
  descEn: string
  descBn: string
  frequencies: string
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'hybrid'
  category: 'commercial' | 'operations' | 'alerts' | 'system'
}

export const SOUND_CATALOG: SoundCatalogItem[] = [
  {
    type: 'order',
    nameEn: 'Sales Order Chime',
    nameBn: 'সেলস অর্ডার চাইম',
    descEn: 'Ascending brass-toned chord for new sales orders, POS receipts, and client confirmations',
    descBn: 'নতুন বিক্রয় আদেশ এবং পিওএস রসিদের জন্য চার-টোন আনন্দময় চাইম',
    frequencies: 'C5 (523Hz) → E5 (659Hz) → G5 (784Hz) → C6 (1046Hz)',
    waveform: 'hybrid',
    category: 'commercial',
  },
  {
    type: 'payment',
    nameEn: 'Payment / Cash Register',
    nameBn: 'পেমেন্ট / ক্যাশ রেজিস্টার',
    descEn: 'Crystal dual-octave coin strike with shimmering harmonic overtone ring',
    descBn: 'বিকাশ, নগদ বা ব্যাংক পেমেন্ট জমার জন্য উজ্জ্বল কয়েন চাইম',
    frequencies: 'D5 (587Hz) → F#5 (740Hz) → A5 (880Hz) → D6 (1175Hz) + Shimmer',
    waveform: 'sine',
    category: 'commercial',
  },
  {
    type: 'delivery',
    nameEn: 'Dispatch & Delivery',
    nameBn: 'ডেলিভারি ও চালান',
    descEn: 'Swift high-energy transit double-tone for challans, gate passes, and rider dispatches',
    descBn: 'চালান অনুমোদন এবং ডেলিভারি ট্রানজিটের জন্য দ্রুতগতির ডাবল-টোন',
    frequencies: 'E5 (659Hz) → B5 (988Hz) → G#5 (831Hz)',
    waveform: 'sine',
    category: 'operations',
  },
  {
    type: 'attendance',
    nameEn: 'Biometric & QR Check-In',
    nameBn: 'বায়োমেট্রিক ও কিউআর হাজিরা',
    descEn: 'Snappy affirmative dual-ping for biometric fingerprint, face ID, and QR check-ins',
    descBn: 'বায়োমেট্রিক ও কিউআর হাজিরার জন্য স্পষ্ট হাই-টেক নিশ্চিতকরণ পিং',
    frequencies: 'G5 (784Hz) → C6 (1046Hz)',
    waveform: 'sine',
    category: 'operations',
  },
  {
    type: 'job',
    nameEn: 'Production & Shop Floor',
    nameBn: 'প্রোডাকশন ও শপ ফ্লোর',
    descEn: 'Resonant 4-stage marimba chime for job status updates and QC approvals',
    descBn: 'জব সমাপ্তি এবং প্রিন্ট কিউসি পাসের জন্য ৪-ধাপের মেলোডিক চাইম',
    frequencies: 'A4 (440Hz) → C#5 (554Hz) → E5 (659Hz) → A5 (880Hz)',
    waveform: 'hybrid',
    category: 'operations',
  },
  {
    type: 'inventory',
    nameEn: 'Inventory & Roll Stock',
    nameBn: 'ইনভেন্টরি ও রোল স্টক',
    descEn: 'Warm acoustic mallet tone for stock replenishment and roll inventory changes',
    descBn: 'রোল স্টক গ্রহণ এবং ইনভেন্টরি আপডেটের জন্য উষ্ণ রেজোনেন্ট টোন',
    frequencies: 'F4 (349Hz) → C5 (523Hz) → F5 (698Hz)',
    waveform: 'triangle',
    category: 'operations',
  },
  {
    type: 'urgent',
    nameEn: 'Urgent & Critical Alarm',
    nameBn: 'জরুরি ও সংকটকালীন সতর্কতা',
    descEn: 'Pulsating high-urgency two-tone alert for machine jams, SLA breaches, and critical events',
    descBn: 'মেশিন ব্রেকডাউন এবং এসএলএ ভঙ্গের জন্য দ্রুতগতির পালসেটিং অ্যালার্ম',
    frequencies: 'F5 (698Hz) ⇄ Ab5 (831Hz) × 3 pulses',
    waveform: 'hybrid',
    category: 'alerts',
  },
  {
    type: 'warning',
    nameEn: 'Caution & Quota Notice',
    nameBn: 'সতর্কতা ও কোটা নোটিশ',
    descEn: 'Distinct amber two-tone alert for low stock warnings, due dates, and plan thresholds',
    descBn: 'স্টক সংকট এবং পেমেন্ট বকেয়া সতর্কতার জন্য অ্যাম্বার ডাবল-টোন',
    frequencies: 'A4 (440Hz) → Eb5 (622Hz)',
    waveform: 'triangle',
    category: 'alerts',
  },
  {
    type: 'error',
    nameEn: 'Error & Failure Thud',
    nameBn: 'ত্রুটি ও ব্যর্থতা সংকেত',
    descEn: 'Deep sub-bass cautionary thud for failed actions, rejections, and offline exceptions',
    descBn: 'ব্যর্থ লেনদেন এবং সিস্টেম ত্রুটির জন্য স্পষ্ট ও ভারী সংকেত',
    frequencies: 'E3 (165Hz) → Bb2 (117Hz) → G2 (98Hz)',
    waveform: 'sawtooth',
    category: 'alerts',
  },
  {
    type: 'broadcast',
    nameEn: 'System Broadcast & Fanfare',
    nameBn: 'প্ল্যাটফর্ম ব্রডকাস্ট ফ্যানফেয়ার',
    descEn: 'Grand fanfare trumpet chord for platform advisories, maintenance, and announcements',
    descBn: 'প্ল্যাটফর্ম ঘোষণা এবং অ্যাডমিন বিজ্ঞপ্তির জন্য রাজকীয় ফ্যানফেয়ার',
    frequencies: 'F4 (349Hz) → C5 (523Hz) → F5 (698Hz) → A5 (880Hz) → C6 (1046Hz)',
    waveform: 'hybrid',
    category: 'system',
  },
  {
    type: 'message',
    nameEn: 'Live Chat & Messaging',
    nameBn: 'লাইভ চ্যাট ও বার্তা',
    descEn: 'Smooth bubbly glass double-tap for live customer support, team chat, and inquiries',
    descBn: 'গ্রাহক সাপোর্ট এবং ইন-অ্যাপ মেসেজের জন্য মসৃণ ডাবল বাবল পিং',
    frequencies: 'Bb5 (932Hz) → D6 (1175Hz)',
    waveform: 'sine',
    category: 'commercial',
  },
  {
    type: 'success',
    nameEn: 'Success & Approval',
    nameBn: 'সফলতা ও অনুমোদন',
    descEn: 'Pure crystal chord for successful saves, approvals, and transaction settlements',
    descBn: 'সফল সেভ এবং অনুমোদনের জন্য উজ্জ্বল ক্রিস্টাল কর্ড',
    frequencies: 'D5 (587Hz) → G5 (784Hz) → B5 (988Hz) → D6 (1175Hz)',
    waveform: 'sine',
    category: 'system',
  },
  {
    type: 'system',
    nameEn: 'System Info & Sync Ping',
    nameBn: 'সিস্টেম তথ্য ও সিঙ্ক পিং',
    descEn: 'Gentle modern glass ping for background synchronization, health check, and status updates',
    descBn: 'ব্যাকগ্রাউন্ড ক্লাউড সিঙ্ক এবং সাধারণ সিস্টেম আপডেটের জন্য নরম গ্লাস পিং',
    frequencies: 'C5 (523Hz) → G5 (784Hz)',
    waveform: 'sine',
    category: 'system',
  },
]

const MUTE_STORAGE_KEY = 'printerp_notifications_muted'
const VOLUME_STORAGE_KEY = 'printerp_notification_volume'

let sharedAudioContext: AudioContext | null = null

/**
 * Gets or initializes the shared Web Audio context with state resumption
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedAudioContext) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass({
          latencyHint: 'interactive',
        })
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {})
    }
    return sharedAudioContext
  } catch {
    return null
  }
}

/**
 * Global audio context unlocker for iOS, Safari, Chrome, and modern browsers
 */
export function unlockAudioContext(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

// User interaction gesture listeners to prime and unlock Web Audio context seamlessly
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    unlockAudioContext()
    window.removeEventListener('click', unlockAudio)
    window.removeEventListener('keydown', unlockAudio)
    window.removeEventListener('touchstart', unlockAudio)
    window.removeEventListener('pointerdown', unlockAudio)
  }
  window.addEventListener('click', unlockAudio, { passive: true })
  window.addEventListener('keydown', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
  window.addEventListener('pointerdown', unlockAudio, { passive: true })
}

/**
 * Checks if sound is currently muted
 */
export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Sets mute state and broadcasts change event
 */
export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
    window.dispatchEvent(new CustomEvent('printerp_sound_mute_changed', { detail: { muted } }))
  } catch {}
}

/**
 * Toggles mute state and returns new state
 */
export function toggleSoundMuted(): boolean {
  const newState = !isSoundMuted()
  setSoundMuted(newState)
  return newState
}

/**
 * Gets notification volume (0.0 to 1.0, defaults to 0.85)
 */
export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 0.85
  try {
    const saved = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (saved !== null) {
      const val = parseFloat(saved)
      return isNaN(val) ? 0.85 : Math.max(0, Math.min(1, val))
    }
  } catch {}
  return 0.85
}

/**
 * Sets notification volume (0.0 to 1.0) and broadcasts change event
 */
export function setSoundVolume(volume: number): void {
  if (typeof window === 'undefined') return
  try {
    const val = Math.max(0, Math.min(1, volume))
    localStorage.setItem(VOLUME_STORAGE_KEY, String(val))
    window.dispatchEvent(new CustomEvent('printerp_sound_volume_changed', { detail: { volume: val } }))
  } catch {}
}

/**
 * Plays a synthesized polyphonic harmonic chime based on notification archetype.
 * Amplified gain with dynamic limiter compression to guarantee loud, clear, distortion-free sound.
 */
export function playNotificationSound(
  type: NotificationSoundType = 'system',
  options?: { volume?: number; force?: boolean }
): void {
  if (typeof window === 'undefined') return
  if (!options?.force && isSoundMuted()) return

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Calculate boosted master gain (amplified from 0.15 to 0.85 base multiplier for clear audibility)
    const rawVolume = options?.volume !== undefined ? options.volume : getSoundVolume()
    const userVolume = Math.max(0, Math.min(1, rawVolume))
    const masterVolume = userVolume * 0.85

    if (masterVolume <= 0.001) return

    // 1. Create Dynamics Compressor Node (Limiter) to eliminate clipping/distortion at high volumes
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-14, now) // -14 dB
    compressor.knee.setValueAtTime(10, now)       // 10 dB soft knee
    compressor.ratio.setValueAtTime(8, now)       // 8:1 compression ratio
    compressor.attack.setValueAtTime(0.003, now)  // 3ms attack
    compressor.release.setValueAtTime(0.12, now)  // 120ms release
    compressor.connect(ctx.destination)

    // 2. Master Gain Node connected to compressor
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(masterVolume, now)
    masterGain.connect(compressor)

    switch (type) {
      // ------------------------------------------------------------------------
      // 1. ORDER: Joyful 4-tone ascending brass/bell chord (C5 -> E5 -> G5 -> C6)
      // ------------------------------------------------------------------------
      case 'order': {
        const chord = [523.25, 659.25, 783.99, 1046.5]
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.065

          osc.type = idx === chord.length - 1 ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.0, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.52)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.53)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 2. PAYMENT: Rich cash-register dual-octave coin strike + high shimmer
      // ------------------------------------------------------------------------
      case 'payment': {
        const notes = [587.33, 739.99, 880.0, 1174.66]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.055

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.05, startTime + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.48)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.49)
        })

        // High crystal coin sparkle overtone
        const shimmerOsc = ctx.createOscillator()
        const shimmerGain = ctx.createGain()
        const shimmerTime = now + 0.16
        shimmerOsc.type = 'sine'
        shimmerOsc.frequency.setValueAtTime(1479.98, shimmerTime) // F#6
        shimmerGain.gain.setValueAtTime(0, shimmerTime)
        shimmerGain.gain.linearRampToValueAtTime(0.7, shimmerTime + 0.01)
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, shimmerTime + 0.38)
        shimmerOsc.connect(shimmerGain)
        shimmerGain.connect(masterGain)
        shimmerOsc.start(shimmerTime)
        shimmerOsc.stop(shimmerTime + 0.39)
        break
      }

      // ------------------------------------------------------------------------
      // 3. DELIVERY: Swift energetic triple transit swoop (E5 -> B5 -> G#5)
      // ------------------------------------------------------------------------
      case 'delivery': {
        const tones = [659.25, 987.77, 830.61]
        tones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.075

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.0, startTime + 0.018)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.39)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 4. ATTENDANCE: High-clarity snappy affirmative ping (G5 -> C6)
      // ------------------------------------------------------------------------
      case 'attendance': {
        const attendanceTones = [783.99, 1046.5]
        attendanceTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.075

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.15, startTime + 0.012)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.32)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.33)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 5. JOB / PRODUCTION: Resonant 4-stage marimba chime (A4 -> C#5 -> E5 -> A5)
      // ------------------------------------------------------------------------
      case 'job': {
        const jobTones = [440.0, 554.37, 659.25, 880.0]
        jobTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.07

          osc.type = idx % 2 === 0 ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.0, startTime + 0.018)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.42)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.43)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 6. INVENTORY: Warm acoustic mallet resonance (F4 -> C5 -> F5)
      // ------------------------------------------------------------------------
      case 'inventory': {
        const invTones = [349.23, 523.25, 698.46]
        invTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.08

          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.05, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.46)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 7. URGENT / CRITICAL: Pulsating high-urgency dual-tone siren (F5 & Ab5 × 3)
      // ------------------------------------------------------------------------
      case 'urgent': {
        const pulses = [
          { f1: 698.46, f2: 830.61, delay: 0.0 },
          { f1: 698.46, f2: 830.61, delay: 0.15 },
          { f1: 698.46, f2: 830.61, delay: 0.3 },
        ]
        pulses.forEach(({ f1, f2, delay }) => {
          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + delay

          osc1.type = 'sawtooth'
          osc2.type = 'triangle'
          osc1.frequency.setValueAtTime(f1, startTime)
          osc2.frequency.setValueAtTime(f2, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(0.85, startTime + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.13)

          osc1.connect(gain)
          osc2.connect(gain)
          gain.connect(masterGain)

          osc1.start(startTime)
          osc2.start(startTime)
          osc1.stop(startTime + 0.14)
          osc2.stop(startTime + 0.14)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 8. WARNING: Distinct amber cautionary alert (A4 -> Eb5 tritone)
      // ------------------------------------------------------------------------
      case 'warning': {
        const warnTones = [440.0, 622.25]
        warnTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.11

          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.0, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.32)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.33)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 9. ERROR: Deep sub-bass cautionary thud (E3 -> Bb2 -> G2)
      // ------------------------------------------------------------------------
      case 'error': {
        const errTones = [164.81, 116.54, 98.0]
        errTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.09

          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(0.9, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.36)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 10. BROADCAST: Grand fanfare trumpet chord (F4 -> C5 -> F5 -> A5 -> C6)
      // ------------------------------------------------------------------------
      case 'broadcast': {
        const bcastTones = [349.23, 523.25, 698.46, 880.0, 1046.5]
        bcastTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.065

          osc.type = idx >= 3 ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.05, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.48)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.49)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 11. MESSAGE: Smooth bubbly glass double-tap (Bb5 -> D6)
      // ------------------------------------------------------------------------
      case 'message': {
        const msgTones = [932.33, 1174.66]
        msgTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.08

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.1, startTime + 0.012)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.29)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 12. SUCCESS: Bright pure crystal triad (D5 -> G5 -> B5 -> D6)
      // ------------------------------------------------------------------------
      case 'success': {
        const successNotes = [587.33, 783.99, 987.77, 1174.66]
        successNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.06

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.0, startTime + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.44)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.45)
        })
        break
      }

      // ------------------------------------------------------------------------
      // 13. SYSTEM (DEFAULT): Pure modern glass ping (C5 -> G5)
      // ------------------------------------------------------------------------
      default: {
        const stdTones = [523.25, 783.99]
        stdTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.075

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(1.0, startTime + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38)

          osc.connect(gain)
          gain.connect(masterGain)

          osc.start(startTime)
          osc.stop(startTime + 0.39)
        })
        break
      }
    }
  } catch (err) {
    console.warn('[SoundManager] Play error:', err)
  }
}

/**
 * Interactive preview player that unlocks audio and forces playback regardless of mute status
 */
export function previewSound(type: NotificationSoundType = 'system', volume?: number): void {
  unlockAudioContext()
  playNotificationSound(type, { force: true, volume })
}

