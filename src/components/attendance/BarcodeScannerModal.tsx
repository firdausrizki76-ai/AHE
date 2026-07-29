"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, Volume2, VolumeX, RefreshCw } from "lucide-react";

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
  const scannerRef = useRef<any>(null);

  // Play audio beep using Web Audio API
  const playBeep = () => {
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
  };

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err: any) => {
          console.warn("Failed to clear scanner:", err);
        });
        scannerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    // Dynamically import html5-qrcode to prevent SSR issues
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (!isMounted) return;

      const scanner = new Html5QrcodeScanner(
        "html5-qrcode-reader",
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true,
        },
        /* verbose= */ false
      );

      scannerRef.current = scanner;

      scanner.render(
        (decodedText: string) => {
          if (!isMounted) return;
          if (decodedText && decodedText !== lastScanned) {
            setLastScanned(decodedText);
            playBeep();
            onScanSuccess(decodedText);

            // Clear lastScanned after 2.5 seconds to allow re-scanning the same card if needed later
            setTimeout(() => {
              if (isMounted) setLastScanned(null);
            }, 2500);
          }
        },
        (error: any) => {
          // Ignore general frame errors
        }
      );
    });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess, lastScanned]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        
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
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="relative p-6">
          <div className="overflow-hidden rounded-2xl border-2 border-dashed border-amber-500/40 bg-slate-50 dark:bg-slate-800/50">
            <div id="html5-qrcode-reader" className="w-full" />
          </div>

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
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tutup Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
