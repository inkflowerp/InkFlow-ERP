'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Zap,
  ZapOff,
  SwitchCamera,
  Upload,
  Keyboard,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CameraQrScannerProps {
  onScanSuccess: (scannedText: string) => void
  onClose?: () => void
  className?: string
}

export function CameraQrScanner({
  onScanSuccess,
  onClose,
  className = '',
}: CameraQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onScanSuccessRef = useRef(onScanSuccess)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<'requesting' | 'active' | 'denied' | 'unsupported'>('requesting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [retryTrigger, setRetryTrigger] = useState(0)

  const isScanningRef = useRef(true)

  // Keep latest callback ref without restarting effects
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess
  }, [onScanSuccess])

  const handleSuccessfulDetection = useCallback((scannedValue: string) => {
    if (!isScanningRef.current) return
    isScanningRef.current = false

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 80])
      }
    } catch {}

    onScanSuccessRef.current(scannedValue)
  }, [])

  // 1. Manage Camera MediaStream Lifecycle
  // Separate from detection logic to prevent cyclic re-render / track restart loops
  useEffect(() => {
    if (manualMode) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      return
    }

    let isMounted = true
    let activeStream: MediaStream | null = null

    async function initCamera() {
      setCameraStatus('requesting')
      setErrorMessage(null)
      setTorchOn(false)
      setHasTorch(false)

      // Stop any existing stream before requesting new constraints
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (isMounted) {
          setCameraStatus('unsupported')
          setErrorMessage('Camera access is not supported in this browser.')
        }
        return
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        activeStream = stream
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (playErr: any) {
            // Ignore AbortError caused by normal stream switching
            if (playErr.name !== 'AbortError') {
              console.warn('[CameraQrScanner] Video play warning:', playErr)
            }
          }
        }

        if (isMounted) {
          setCameraStatus('active')
          isScanningRef.current = true

          // Check for hardware torch capability
          const track = stream.getVideoTracks()[0]
          if (track) {
            const capabilities: any = track.getCapabilities?.() || {}
            setHasTorch(Boolean(capabilities.torch))
          }
        }
      } catch (err: any) {
        if (!isMounted) return
        console.warn('[CameraQrScanner] Camera start error:', err)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraStatus('denied')
          setErrorMessage('Camera permission was denied. Please allow camera access in browser settings to scan attendance QR.')
        } else {
          setCameraStatus('unsupported')
          setErrorMessage(err.message || 'Unable to access video camera.')
        }
      }
    }

    initCamera()

    return () => {
      isMounted = false
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [facingMode, manualMode, retryTrigger])

  // 2. Barcode Detection Loop
  // Runs throttled at ~6.6 FPS (150ms) to ensure smooth 60fps video rendering without CPU throttling or blinking
  useEffect(() => {
    if (manualMode || cameraStatus !== 'active') return

    let isRunning = true
    let isProcessing = false
    let detector: any = null

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      } catch (e) {
        detector = null
      }
    }

    const intervalId = setInterval(async () => {
      if (!isRunning || !isScanningRef.current || isProcessing) return
      const video = videoRef.current
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
        return
      }

      isProcessing = true
      try {
        if (detector) {
          const barcodes = await detector.detect(video)
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0]?.rawValue
            if (code && isScanningRef.current) {
              isRunning = false
              handleSuccessfulDetection(code)
              return
            }
          }
        }
      } catch (scanErr) {
        // Ignore single frame detection errors
      } finally {
        isProcessing = false
      }
    }, 150)

    return () => {
      isRunning = false
      clearInterval(intervalId)
    }
  }, [cameraStatus, manualMode, handleSuccessfulDetection])

  // Torch Toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (track && hasTorch) {
      try {
        const nextTorch = !torchOn
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        })
        setTorchOn(nextTorch)
      } catch (e) {
        console.warn('Torch toggle failed:', e)
      }
    }
  }

  // Flip Camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const handleRetryCamera = () => {
    setRetryTrigger((prev) => prev + 1)
  }

  // Fallback: Handle Image Upload Scan
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = async () => {
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
            const barcodes = await detector.detect(img)
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleSuccessfulDetection(barcodes[0].rawValue)
              return
            }
          } catch {}
        }

        // If automatic detection fails, prompt manual entry
        setManualMode(true)
        setErrorMessage('Could not automatically parse QR code from photo. Please enter terminal code.')
      }
    } catch (err: any) {
      setErrorMessage('Failed to process image: ' + err.message)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleSuccessfulDetection(manualCode.trim())
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 ${className}`}>
      {/* Viewport Area */}
      {!manualMode && (
        <div className="relative aspect-square sm:aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Loading Spinner State */}
          {cameraStatus === 'requesting' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-slate-300 z-10">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <span className="text-xs font-medium tracking-wide">Starting camera feed...</span>
            </div>
          )}

          {/* Scanning Reticle & Corner Brackets */}
          {cameraStatus === 'active' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-indigo-500/40 rounded-2xl bg-indigo-500/5 backdrop-contrast-125">
                {/* Animated Laser Bar */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]" />

                {/* Glowing Corner Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Top Control Overlay */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-20">
            <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${cameraStatus === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{cameraStatus === 'active' ? 'Align QR in frame' : 'Connecting camera'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                    torchOn
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                      : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
                  }`}
                  title={torchOn ? 'Turn off flash' : 'Turn on flash'}
                >
                  {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 transition-all cursor-pointer"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Camera Permission Denied / Error State */}
          {(cameraStatus === 'denied' || cameraStatus === 'unsupported') && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 z-30">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  {cameraStatus === 'denied' ? 'Camera Permission Required' : 'Camera Unavailable'}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">{errorMessage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <Button
                  type="button"
                  onClick={handleRetryCamera}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-10 rounded-xl font-bold flex-1 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Camera</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualMode(true)}
                  className="border-slate-700 bg-slate-800 text-slate-300 text-xs h-10 rounded-xl cursor-pointer"
                >
                  Manual Code
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Input Mode */}
      {manualMode && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-indigo-400" />
            <h4 className="text-sm font-bold text-white">Enter Terminal Code Manually</h4>
          </div>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. INKFLOW:ATT:v1:... or Terminal Code"
                className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-11"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualMode(false)}
                className="border-slate-700 bg-slate-900 text-slate-300 text-xs h-10 rounded-xl flex-1 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Back to Camera</span>
              </Button>
              <Button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-10 rounded-xl font-bold flex-1 cursor-pointer"
              >
                Submit Code
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Option Bar */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <label className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">
          <Upload className="h-3.5 w-3.5" />
          <span>Upload QR Image</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>

        {!manualMode ? (
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer font-medium"
          >
            Manual Code
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-medium flex items-center gap-1"
          >
            <Camera className="h-3 w-3" />
            <span>Use Camera</span>
          </button>
        )}
      </div>
    </div>
  )
}
