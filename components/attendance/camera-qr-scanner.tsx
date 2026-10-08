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
import jsQR from 'jsqr'

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
            if (playErr.name !== 'AbortError') {
              console.warn('[CameraQrScanner] Video play warning:', playErr)
            }
          }
        }

        if (isMounted) {
          setCameraStatus('active')
          isScanningRef.current = true

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

  // 2. Barcode & QR Detection Loop (Native BarcodeDetector with jsQR Canvas fallback)
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
        // Try native browser BarcodeDetector first if available
        if (detector) {
          try {
            const barcodes = await detector.detect(video)
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0]?.rawValue
              if (code && isScanningRef.current) {
                isRunning = false
                handleSuccessfulDetection(code)
                return
              }
            }
          } catch {
            // Ignore native detector frame error, proceed to jsQR fallback
          }
        }

        // Robust jsQR canvas decoding fallback (works 100% on all desktop and mobile browsers)
        const canvas = canvasRef.current || document.createElement('canvas')
        const width = video.videoWidth
        const height = video.videoHeight
        if (width > 0 && height > 0) {
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height)
            const imageData = ctx.getImageData(0, 0, width, height)
            const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            })
            if (decoded && decoded.data && isScanningRef.current) {
              isRunning = false
              handleSuccessfulDetection(decoded.data)
              return
            }
          }
        }
      } catch (scanErr) {
        // Ignore single frame detection errors
      } finally {
        isProcessing = false
      }
    }, 120)

    return () => {
      isRunning = false
      clearInterval(intervalId)
    }
  }, [cameraStatus, manualMode, handleSuccessfulDetection])

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

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const handleRetryCamera = () => {
    setRetryTrigger((prev) => prev + 1)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = async () => {
        // 1. Try native BarcodeDetector
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

        // 2. Fallback to jsQR canvas decode
        try {
          const canvas = document.createElement('canvas')
          const width = img.naturalWidth || img.width
          const height = img.naturalHeight || img.height
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            const imageData = ctx.getImageData(0, 0, width, height)
            const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            })
            if (decoded && decoded.data) {
              handleSuccessfulDetection(decoded.data)
              return
            }
          }
        } catch (canvasErr) {
          console.warn('[CameraQrScanner] Image canvas decode error:', canvasErr)
        }

        setManualMode(true)
        setErrorMessage('Could not find QR code in this photo. Please enter terminal code manually.')
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
    <div className={`relative overflow-hidden rounded-xl bg-surface-inset border border-border ${className}`}>
      {/* Viewport Area */}
      {!manualMode && (
        <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-64 sm:max-h-72 w-full bg-card flex items-center justify-center overflow-hidden">
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
            <div className="absolute inset-0 bg-surface-inset backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-muted-foreground z-10">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-xs font-medium tracking-wide">Starting camera feed...</span>
            </div>
          )}

          {/* Scanning Reticle & Corner Brackets */}
          {cameraStatus === 'active' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 border-2 border-primary/40 rounded-xl bg-primary/5 backdrop-contrast-125 overflow-hidden shadow-xs">
                {/* Animated Laser Bar with Trailing Sweep */}
                <div
                  className="animate-qr-scan absolute left-0 right-0 h-1 bg-primary z-10"
                  style={{ animation: 'qr-scan-laser 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 h-4 w-12 rounded-full bg-primary/30 blur-xs" />
                </div>

                {/* Vertical Sweep Light Wave */}
                <div
                  className="animate-qr-scan absolute left-0 right-0 h-16 -mt-8 bg-primary/10 pointer-events-none"
                  style={{ animation: 'qr-scan-laser 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                />

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />

                {/* Center Target Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                  <div className="h-8 w-8 border border-dashed border-primary/60 rounded-full animate-pulse-subtle" />
                </div>
              </div>
            </div>
          )}

          {/* Top Control Overlay */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto z-20">
            <div className="px-3 py-1 rounded-full bg-card/80 backdrop-blur-md border border-border text-xs font-medium text-foreground flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${cameraStatus === 'active' ? 'bg-success animate-pulse' : 'bg-warning'}`} />
              <span>{cameraStatus === 'active' ? 'Align QR in frame' : 'Connecting camera'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                    torchOn
                      ? 'bg-warning text-warning-foreground border-warning-border shadow-xs'
                      : 'bg-card/80 text-foreground border-border hover:bg-muted'
                  }`}
                  title={torchOn ? 'Turn off flash' : 'Turn on flash'}
                >
                  {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 rounded-full bg-card/80 text-foreground backdrop-blur-md border border-border hover:bg-muted transition-all cursor-pointer"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Camera Permission Denied / Error State */}
          {(cameraStatus === 'denied' || cameraStatus === 'unsupported') && (
            <div className="absolute inset-0 bg-surface-inset backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 z-30">
              <div className="p-3 rounded-xl bg-warning-surface text-warning border border-warning-border">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">
                  {cameraStatus === 'denied' ? 'Camera Permission Required' : 'Camera Unavailable'}
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs">{errorMessage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <Button
                  type="button"
                  onClick={handleRetryCamera}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-10 rounded-xl font-bold flex-1 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Camera</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualMode(true)}
                  className="border-border bg-card text-muted-foreground text-xs h-10 rounded-xl cursor-pointer"
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
            <Keyboard className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-bold text-foreground">Enter Terminal Code Manually</h4>
          </div>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. PRINTFLOW:ATT:v1:... or Terminal Code"
                className="bg-card border-border text-foreground tabular-nums text-xs h-11"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualMode(false)}
                className="border-border bg-surface-inset text-muted-foreground text-xs h-10 rounded-xl flex-1 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Back to Camera</span>
              </Button>
              <Button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-10 rounded-xl font-bold flex-1 cursor-pointer"
              >
                Submit Code
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Option Bar */}
      <div className="p-3 bg-surface-inset border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5 text-primary hover:underline cursor-pointer font-medium">
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
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
          >
            Manual Code
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="text-primary hover:underline transition-colors cursor-pointer font-medium flex items-center gap-1"
          >
            <Camera className="h-3 w-3" />
            <span>Use Camera</span>
          </button>
        )}
      </div>
    </div>
  )
}
