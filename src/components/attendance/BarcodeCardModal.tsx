"use client";

import React, { useState } from "react";
import { X, Printer, Search, QrCode, Filter, CreditCard } from "lucide-react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

export interface BarcodeItem {
  id: string;
  name: string;
  subtitle?: string; // NIS or NIP / Kelas
  code: string;      // e.g. "STU-12345" or "TCH-67890" or NIS
  photo_url?: string;
  badge?: string;    // e.g. "Siswa AHE" or "Guru Utama"
}

interface BarcodeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  type: "siswa" | "guru";
  items: BarcodeItem[];
}

export default function BarcodeCardModal({
  isOpen,
  onClose,
  title = "Cetak Kartu Absensi Barcode",
  type,
  items,
}: BarcodeCardModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<string>("all");

  if (!isOpen) return null;

  // Get unique badges for filtering
  const badges = Array.from(new Set(items.map((item) => item.badge || ""))).filter(Boolean);

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchBadge = selectedBadge === "all" || item.badge === selectedBadge;
    return matchSearch && matchBadge;
  });

  const handlePrint = () => {
    window.print();
  };

  const printStyles = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      #printable-barcode-area,
      #printable-barcode-area * {
        visibility: visible !important;
      }
      #printable-barcode-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }
      .no-print {
        display: none !important;
      }
      .print-grid {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 16px !important;
        padding: 8px !important;
        width: 100% !important;
      }
      .print-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        border: 2px solid #cbd5e1 !important;
        border-radius: 12px !important;
        background: white !important;
        box-shadow: none !important;
        padding: 12px !important;
      }
      @page {
        size: A4;
        margin: 10mm;
      }
    }
  `;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        
        {/* Header - Hidden when printing */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {filteredItems.length} dari {items.length} kartu siap cetak
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-amber-700 active:scale-95"
            >
              <Printer className="h-4 w-4" />
              Cetak Semua Kartu
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Filter & Search - Hidden when printing */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIS/NIP, atau kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {badges.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedBadge}
                onChange={(e) => setSelectedBadge(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Semua Program/Kelompok</option>
                {badges.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Card Content Area (Scrollable in Modal, All shown when printing) */}
        <div id="printable-barcode-area" className="flex-1 overflow-y-auto p-6">
          {/* Printable Header shown ONLY when printing */}
          <div className="hidden print:block mb-6 text-center border-b-2 border-slate-300 pb-4">
            <h1 className="text-xl font-bold uppercase tracking-wide text-black">
              KARTU ABSENSI • {type === "siswa" ? "MURID / SISWA" : "GURU"} AHE
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} • Total {filteredItems.length} Kartu
            </p>
          </div>

          {filteredItems.length === 0 ? (
            <div className="no-print flex flex-col items-center justify-center py-16 text-center">
              <CreditCard className="mb-3 h-12 w-12 text-slate-300" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Data kartu tidak ditemukan
              </h3>
              <p className="text-sm text-slate-500">
                Coba sesuaikan kata kunci pencarian Anda
              </p>
            </div>
          ) : (
            <div className="print-grid grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="print-card group relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-800/80"
                >
                  {/* Decorative Banner Header */}
                  <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-500 to-amber-600" />

                  {/* Institution Badge */}
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 print:bg-slate-100 print:text-slate-800">
                      KARTU ABSENSI • {type === "siswa" ? "SISWA" : "GURU"}
                    </span>
                  </div>

                  {/* Avatar / Photo */}
                  <div className="my-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500/30 bg-slate-100 dark:bg-slate-700 print:h-12 print:w-12">
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-700 dark:text-slate-300 print:text-slate-800">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name & Subtitle */}
                  <h4 className="line-clamp-1 w-full font-bold text-slate-900 dark:text-white print:text-sm print:text-black">
                    {item.name}
                  </h4>
                  {item.subtitle && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400 print:text-[11px] print:text-slate-600">
                      {item.subtitle}
                    </p>
                  )}

                  {/* QR Code */}
                  <div className="my-3 flex items-center justify-center rounded-xl border border-slate-100 bg-white p-2.5 shadow-inner dark:border-slate-700 print:my-2 print:border-slate-200 print:p-2">
                    <QRCodeSVG
                      value={item.code}
                      size={92}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Barcode (Code128) */}
                  <div className="flex w-full items-center justify-center overflow-hidden bg-white print:py-1">
                    <Barcode
                      value={item.code}
                      width={1.2}
                      height={36}
                      fontSize={10}
                      margin={2}
                      displayValue={true}
                    />
                  </div>

                  {/* Footer note */}
                  <p className="mt-2 text-[9px] text-slate-400 dark:text-slate-500 print:text-[9px] print:text-slate-500">
                    Scan saat hadir masuk & pulang
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
