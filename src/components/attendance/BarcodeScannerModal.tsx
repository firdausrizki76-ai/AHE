"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, Volume2, VolumeX, RefreshCw, AlertTriangle } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Scan Barcode / QR Code Kehadiran",
}: BarcodeScannerModalProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const html5QrCodeRef = useRef<any>(null);
  const isScanningRef = useRef(false);

  // Play audio beep using Web Audio API
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("AudioContext not supported or blocked by browser:", e);
    }
  }, [soundEnabled]);

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current && isScanningRef.current) {
        isScanningRef.current = false;
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (e) {
      console.warn("Error stopping scanner:", e);
    }
  }, []);

  const startScannerWithCamera = useCallback(
    async (cameraIdToUse?: string) => {
      setErrorMsg(null);
      setIsLoadingCamera(true);

      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        // Ensure DOM element is present
        const readerElement = document.getElementById("html5-qrcode-reader");
        if (!readerElement) {
          throw new Error("Elemen pembaca kamera tidak ditemukan.");
        }

        // Stop existing scanner if running
        await stopScanner();

        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode("html5-qrcode-reader");
        }

        // Try getting available cameras first
        let availableCameras: Array<{ id: string; label: string }> = [];
        try {
          const deviceList = await Html5Qrcode.getCameras();
          if (deviceList && deviceList.length > 0) {
            availableCameras = deviceList.map((cam, idx) => ({
              id: cam.id,
              label: cam.label || `Kamera ${idx + 1}`,
            }));
            setCameras(availableCameras);
          }
        } catch (camErr) {
          console.warn("Could not list cameras:", camErr);
        }

        // Determine camera target
        let targetCamera: any = { facingMode: "environment" };
        if (cameraIdToUse) {
          targetCamera = cameraIdToUse;
        } else if (availableCameras.length > 0) {
          // Prefer back camera if available, otherwise first camera
          const backCam = availableCameras.find(
            (c) =>
              c.label.toLowerCase().includes("back") ||
              c.label.toLowerCase().includes("belakang") ||
              c.label.toLowerCase().includes("environment") ||
              c.label.toLowerCase().includes("rear")
          );
          const defaultId = backCam ? backCam.id : availableCameras[0].id;
          setSelectedCameraId(defaultId);
          targetCamera = defaultId;
        }

        // Start scanning with fixed 220x220 qrbox that safely fits on any mobile screen
        await html5QrCodeRef.current.start(
          targetCamera,
          {
            fps: 12,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText: string) => {
            if (decodedText && decodedText !== lastScanned) {
              setLastScanned(decodedText);
              playBeep();
              onScanSuccess(decodedText);

              setTimeout(() => {
                setLastScanned(null);
              }, 2500);
            }
          },
          (error: any) => {
            // Ignore general empty frame errors
          }
        );

        isScanningRef.current = true;
      } catch (err: any) {
        console.error("Failed to start HTML5 QR Code:", err);
        let readableMsg = "Gagal mengakses kamera. Pastikan browser diizinkan mengakses kamera perangkat Anda.";
        if (err && typeof err === "string") {
          readableMsg = err;
        } else if (err?.message) {
          readableMsg = err.message;
        }

        // Check if insecure HTTP context
        if (typeof window !== "undefined" && !window.isSecureContext) {
          readableMsg =
            "Akses kamera diblokir browser karena website diakses lewat HTTP non-aman (IP/Wi-Fi). Harap gunakan HTTPS, Localhost, atau Scanner Barcode USB.";
        }

        setErrorMsg(readableMsg);
      } finally {
        setIsLoadingCamera(false);
      }
    },
    [lastScanned, onScanSuccess, playBeep, stopScanner]
  );

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      startScannerWithCamera();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCamId = e.target.value;
    setSelectedCameraId(newCamId);
    startScannerWithCamera(newCamId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
      {/* 
        CRITICAL iOS Safari & Flexbox Fix:
        - Do not use flex items-center justify-center on parent as iOS Safari collapses width of items containing <video>.
        - Use standard block container with mx-auto, mt-10, and inline styles { minWidth: "320px", width: "100%", maxWidth: "512px" }.
      */}
      <div 
        className="mx-auto mt-8 sm:mt-16 overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        style={{ minWidth: "320px", width: "100%", maxWidth: "512px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arahkan kartu ke kamera untuk memindai otomatis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Suara"}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-amber-500" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Camera Selector & Controls */}
        {cameras.length > 1 && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Pilih Kamera:
            </label>
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scanner Area */}
        <div className="relative p-5">
          {errorMsg ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-50/50 p-8 text-center dark:bg-amber-500/5 min-h-[300px]">
              <AlertTriangle className="mb-3 h-12 w-12 text-amber-500" />
              <h4 className="mb-1 font-bold text-slate-800 dark:text-white">
                Kamera Tidak Dapat Diakses
              </h4>
              <p className="mb-5 max-w-sm text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {errorMsg}
              </p>
              <button
                onClick={() => startScannerWithCamera(selectedCameraId)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-amber-600"
              >
                <RefreshCw className="h-4 w-4" /> Coba Aktifkan Ulang Kamera
              </button>
            </div>
          ) : (
            <div 
              className="relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-amber-500/40 bg-slate-950 flex items-center justify-center"
              style={{ width: "100%", minHeight: "320px" }}
            >
              {isLoadingCamera && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/85 text-white backdrop-blur-sm">
                  <RefreshCw className="mb-2 h-8 w-8 animate-spin text-amber-500" />
                  <span className="text-xs font-bold">Menyiapkan kamera...</span>
                </div>
              )}
              <div 
                id="html5-qrcode-reader" 
                className="w-full h-full"
                style={{ width: "100%", minHeight: "300px" }}
              />
            </div>
          )}

          {lastScanned && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 px-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Terscan: <span className="font-mono">{lastScanned}</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>Pastikan pencahayaan cukup terang</span>
            <span>QR Code & Barcode Code128</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="rounded-xl bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tutup Scanner
          </button>
        </div>

        {/* 
          CRITICAL: Use standard HTML style tag with dangerouslySetInnerHTML 
          so rules apply globally in Next.js App Router without relying on styled-jsx compiler.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #html5-qrcode-reader {
                width: 100% !important;
                min-height: 300px !important;
                border: none !important;
              }
              #html5-qrcode-reader video {
                width: 100% !important;
                height: auto !important;
                max-height: 400px !important;
                object-fit: cover !important;
                border-radius: 0.75rem !important;
                display: block !important;
              }
              #html5-qrcode-reader canvas {
                display: none !important;
              }
            `,
          }}
        />
      </div>
    </div>
  );
}
