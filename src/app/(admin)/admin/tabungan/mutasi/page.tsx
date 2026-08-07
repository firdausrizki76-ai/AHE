"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Search, Loader2, ArrowLeft, ArrowUpRight, ArrowDownRight, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function MutasiContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [dateFilter, setDateFilter] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("savings_transactions")
        .select(`
          *,
          students (full_name)
        `)
        .order("created_at", { ascending: false });

      if (dateFilter) {
        query = query.gte("created_at", `${dateFilter}T00:00:00.000Z`)
                     .lte("created_at", `${dateFilter}T23:59:59.999Z`);
      }

      const { data: histData, error: histErr } = await query;
      if (histErr) throw histErr;
      
      setHistory(histData || []);
    } catch (err: any) {
      toast.error("Gagal memuat data mutasi: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = history.filter(item => 
    item.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/tabungan" className="p-2 -ml-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-headline-lg font-headline-lg text-on-surface">Mutasi Semua Tabungan</h2>
          </div>
          <p className="text-body-md text-on-surface-variant mt-1 ml-10">Lihat semua riwayat setoran dan penarikan tabungan murid.</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Cari nama murid..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md bg-surface text-on-surface w-full"
              />
            </div>
            <div className="relative w-full sm:w-auto flex items-center gap-2">
              <Filter className="w-5 h-5 text-on-surface-variant" />
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-auto"
              />
              {dateFilter && (
                <button 
                  onClick={() => setDateFilter("")}
                  className="text-error hover:underline text-label-md font-bold px-2"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold text-body-md">Memuat data mutasi...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Jenis</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Keterangan</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Nominal</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Saldo Setelahnya</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const isDeposit = item.type === 'deposit';
                  return (
                    <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-4 text-on-surface">
                        {new Date(item.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 font-bold text-on-surface">
                        {item.students?.full_name}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold ${isDeposit ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-error-container text-error'}`}>
                          {isDeposit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isDeposit ? 'Setor' : 'Tarik'}
                        </span>
                      </td>
                      <td className="p-4 text-on-surface-variant">
                        {item.description || '-'}
                      </td>
                      <td className={`p-4 font-bold text-right ${isDeposit ? 'text-[#25D366]' : 'text-error'}`}>
                        {isDeposit ? '+' : '-'}Rp {parseFloat(item.amount).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 font-bold text-on-surface text-right">
                        Rp {parseFloat(item.balance_after || "0").toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Tidak ada data mutasi yang sesuai pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MutasiTabunganPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MutasiContent />
    </Suspense>
  );
}
