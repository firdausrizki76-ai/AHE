"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridTabunganPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch student
      const { data: studentData, error: sErr } = await supabase
        .from("students")
        .select("id, full_name, nickname")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sErr) throw sErr;

      let activeStudent = studentData;
      if (!activeStudent) {
        const { data: fallbacks } = await supabase.from("students").select("id, full_name, nickname").limit(1);
        if (fallbacks && fallbacks.length > 0) {
          activeStudent = fallbacks[0];
        }
      }
      setStudent(activeStudent);

      if (activeStudent) {
        // 2. Fetch savings account
        const { data: savingsAcc, error: saErr } = await supabase
          .from("savings_accounts")
          .select("*")
          .eq("student_id", activeStudent.id)
          .maybeSingle();
        if (!saErr && savingsAcc) {
          setBalance(Number(savingsAcc.balance || 0));
        }

        // 3. Fetch savings transactions
        const { data: txs, error: txErr } = await supabase
          .from("savings_transactions")
          .select("*")
          .eq("student_id", activeStudent.id)
          .order("created_at", { ascending: false });
        if (!txErr) {
          setTransactions(txs || []);
        }
      }
    } catch (err: any) {
      toast.error("Gagal memuat data tabungan: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat data tabungan...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <Wallet className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Tabungan Saya</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Pantau total saldo tabungan dan riwayat mutasi transaksi Anda.</p>
      </div>

      {/* Balance Card */}
      <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant max-w-lg flex items-center gap-6">
        <div className="p-4 bg-secondary/10 text-secondary rounded-2xl shrink-0">
          <Wallet className="w-10 h-10" />
        </div>
        <div>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Saldo Tabungan Saat Ini</span>
          <h3 className="text-display-sm font-extrabold text-on-surface mt-1">{formatRupiah(balance)}</h3>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Riwayat Mutasi Tabungan</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container">
                <th className="p-4 font-label-md text-on-surface-variant">Tanggal</th>
                <th className="p-4 font-label-md text-on-surface-variant">Tipe</th>
                <th className="p-4 font-label-md text-on-surface-variant">Deskripsi</th>
                <th className="p-4 font-label-md text-on-surface-variant text-right">Jumlah</th>
                <th className="p-4 font-label-md text-on-surface-variant text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isDeposit = tx.type === "deposit";
                return (
                  <tr key={tx.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface">{new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-4">
                      {isDeposit ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-tertiary-container/50 text-tertiary font-bold text-label-sm">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> Setor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-error-container/50 text-error font-bold text-label-sm">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Tarik / Potong
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-on-surface-variant">{tx.description || "-"}</td>
                    <td className={`p-4 text-right font-bold ${isDeposit ? 'text-tertiary' : 'text-error'}`}>
                      {isDeposit ? "+" : "-"}{formatRupiah(Number(tx.amount || 0))}
                    </td>
                    <td className="p-4 text-right text-on-surface font-semibold">
                      {formatRupiah(Number(tx.balance_after || 0))}
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    Belum ada transaksi tabungan yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
