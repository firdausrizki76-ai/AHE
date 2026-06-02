"use client";

import { FileText, Download, Users, Banknote, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function LaporanPage() {
  const handleExport = (type: string) => {
    toast.success(`Menyiapkan data eksport ${type}...`);
  };

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Pusat Laporan & Export</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Unduh rekap data murid, absensi, dan keuangan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-6 flex flex-col items-center text-center gap-4 hover:border-primary hover:shadow-md transition-all group">
          <div className="p-4 bg-primary-container text-on-primary-container rounded-full group-hover:scale-110 transition-transform">
            <Users className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-headline-sm text-on-surface mb-2">Data Murid Aktif</h3>
            <p className="text-body-sm text-on-surface-variant mb-6">Rekap seluruh murid yang aktif mengikuti les beserta detail kelasnya.</p>
          </div>
          <button 
            onClick={() => handleExport('Murid')}
            className="w-full mt-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" /> Export Excel
          </button>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-6 flex flex-col items-center text-center gap-4 hover:border-tertiary hover:shadow-md transition-all group">
          <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-full group-hover:scale-110 transition-transform">
            <CalendarDays className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-headline-sm text-on-surface mb-2">Rekap Absensi Bulanan</h3>
            <p className="text-body-sm text-on-surface-variant mb-6">Laporan kehadiran seluruh murid dan guru per bulan.</p>
          </div>
          <button 
            onClick={() => handleExport('Absensi')}
            className="w-full mt-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-tertiary text-on-tertiary rounded-xl font-headline-sm hover:bg-tertiary-container transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" /> Export PDF
          </button>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-6 flex flex-col items-center text-center gap-4 hover:border-secondary hover:shadow-md transition-all group">
          <div className="p-4 bg-secondary-container text-on-secondary-container rounded-full group-hover:scale-110 transition-transform">
            <Banknote className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-headline-sm text-on-surface mb-2">Laporan Keuangan</h3>
            <p className="text-body-sm text-on-surface-variant mb-6">Rekapitulasi pembayaran SPP, tabungan, dan pemasukan lainnya.</p>
          </div>
          <button 
            onClick={() => handleExport('Keuangan')}
            className="w-full mt-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-on-secondary rounded-xl font-headline-sm hover:bg-secondary-container transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" /> Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}
