// ==============================================================================
// PrintERP SaaS - Universal Notification Sound Manager
// High-fidelity, low-latency polyphonic audio synthesizer using Web Audio API.
// Requires zero external MP3 assets, works 100% offline, and handles browser autoplay policies.
// ==============================================================================

export type NotificationSoundType =
  | 'order'
  | 'payment'
  | 'attendance'
  | 'delivery'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'broadcast'

const MUTE_STORAGE_KEY = 'printerp_notifications_muted'
const VOLUME_STORAGE_KEY = 'printerp_notification_volume'

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedAudioContext) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass()
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

// User interaction gesture listener to unlock Web Audio context on iOS/Chrome/Safari
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    window.removeEventListener('click', unlockAudio)
    window.removeEventListener('keydown', unlockAudio)
    window.removeEventListener('touchstart', unlockAudio)
  }
  window.addEventListener('click', unlockAudio, { passive: true })
  window.addEventListener('keydown', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
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
 * Sets mute state
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
 * Gets notification volume (0.0 to 1.0)
 */
export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 0.8
  try {
    const saved = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (saved !== null) {
      const val = parseFloat(saved)
      return isNaN(val) ? 0.8 : Math.max(0, Math.min(1, val))
    }
  } catch {}
  return 0.8
}

/**
 * Sets notification volume (0.0 to 1.0)
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
 * Plays a synthesized polyphonic harmonic chime based on notification archetype
 */
export function playNotificationSound(type: NotificationSoundType = 'system', options?: { volume?: number; force?: boolean }): void {
  if (typeof window === 'undefined') return
  if (!options?.force && isSoundMuted()) return

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const masterVolume = (options?.volume ?? getSoundVolume()) * 0.15

    switch (type) {
      case 'payment':
      case 'success': {
        // Bright crystal triad (D5 -> F#5 -> A5 -> D6)
        const notes = [587.33, 739.99, 880.0, 1174.66]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.06

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.46)
        })
        break
      }

      case 'order': {
        // Joyful ascending brass chord (C5 -> E5 -> G5 -> C6)
        const chord = [523.25, 659.25, 783.99, 1046.5]
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.07

          osc.type = idx === chord.length - 1 ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume * 1.1, startTime + 0.025)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.51)
        })
        break
      }

      case 'attendance': {
        // High-tech check-in affirmative ping (G5 -> C6)
        const attendanceTones = [783.99, 1046.5]
        attendanceTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.08

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume * 1.2, startTime + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.36)
        })
        break
      }

      case 'delivery': {
        // Swift double chime (E5 -> G5)
        const tones = [659.25, 783.99]
        tones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.09

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.39)
        })
        break
      }

      case 'warning': {
        // Gentle caution amber double-tap (A4 -> Ab4)
        const warnTones = [440.0, 415.3]
        warnTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.12

          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume * 0.9, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.31)
        })
        break
      }

      case 'error': {
        // Low cautionary thud (E3 -> C3)
        const errTones = [164.81, 130.81]
        errTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.1

          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume * 0.7, startTime + 0.03)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.36)
        })
        break
      }

      case 'broadcast': {
        // High-profile broadcast fanfare (F5 -> A5 -> C6)
        const bcastTones = [698.46, 880.0, 1046.5]
        bcastTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.08

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume * 1.1, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.48)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.49)
        })
        break
      }

      default: {
        // Standard pleasant glass chime (C5 -> E5)
        const stdTones = [523.25, 659.25]
        stdTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const startTime = now + idx * 0.08

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, startTime)

          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(masterVolume, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(startTime)
          osc.stop(startTime + 0.41)
        })
        break
      }
    }
  } catch (err) {
    console.warn('[SoundManager] Play error:', err)
  }
}
