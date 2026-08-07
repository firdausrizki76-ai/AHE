"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Search, Plus, ArrowUpRight, ArrowDownRight, X, Loader2, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function TabunganPage() {
  const [savings, setSavings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit'|'withdraw'>('deposit');

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    created_at: new Date().toISOString().split('T')[0],
    amount: "",
    description: ""
  });

  const getLesProgramInfo = (studentLesList: any[]) => {
    if (!studentLesList || studentLesList.length === 0) return "Belum terdaftar";
    return studentLesList.map(les => {
      let typeLabel = "";
      if (les.les_type === "les_ahe") typeLabel = `AHE Lvl ${les.current_level}`;
      else if (les.les_type === "les_ase") typeLabel = `ASE Lvl ${les.current_level}`;
      else if (les.les_type === "les_mapel") typeLabel = `Mapel (${les.les_mapel_name || ""})`;
      return typeLabel;
    }).join(", ");
  };

  const fetchSavingsData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch student savings accounts
      const { data: savData, error: savErr } = await supabase
        .from("savings_accounts")
        .select(`
          *,
          students (
            *,
            student_les (*)
          )
        `)
        .order("created_at", { ascending: false });
      if (savErr) throw savErr;
      setSavings(savData || []);

      // 2. Fetch savings transactions history
      const { data: histData, error: histErr } = await supabase
        .from("savings_transactions")
        .select(`
          *,
          students (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(25);
      if (histErr) throw histErr;
      setHistory(histData || []);

      // 3. Fetch active students for dropdown
      const { data: stdData, error: stdErr } = await supabase
        .from("students")
        .select("*, savings_accounts(*)")
        .eq("status", "active")
        .order("full_name");
      if (stdErr) throw stdErr;
      setStudents(stdData || []);
    } catch (err: any) {
      toast.error("Gagal memuat data tabungan: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavingsData();
  }, [fetchSavingsData]);

  const filteredSavings = savings.filter(s => 
    s.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.balance || "0"), 0);

  const openModal = (type: 'deposit'|'withdraw', studentId?: string) => {
    setTransactionType(type);
    const selectedStudent = studentId ? students.find(s => s.id === studentId) : students[0];
    setFormData({
      student_id: selectedStudent?.id || "",
      created_at: new Date().toISOString().split('T')[0],
      amount: "",
      description: type === 'deposit' ? 'Setoran Tabungan' : 'Penarikan Tabungan'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const student = students.find(s => s.id === formData.student_id);
      const savingsAccount = student?.savings_accounts?.[0]; // Supabase nesting or single check
      
      if (!student) {
        throw new Error("Murid tidak ditemukan");
      }

      // If savings account isn't initialized yet, fetch directly
      let savId = savingsAccount?.id;
      let currentBalance = savingsAccount ? Number(savingsAccount.balance || 0) : 0;

      if (!savId) {
        const { data: freshAccount, error: freshErr } = await supabase
          .from("savings_accounts")
          .select("*")
          .eq("student_id", student.id)
          .single();
        
        if (freshErr) {
          throw new Error("Rekening tabungan murid tidak ditemukan");
        }
        savId = freshAccount.id;
        currentBalance = Number(freshAccount.balance || 0);
      }

      const txAmount = parseFloat(formData.amount);
      if (isNaN(txAmount) || txAmount <= 0) {
        throw new Error("Nominal transaksi harus lebih dari 0");
      }

      let newBalance = currentBalance;
      if (transactionType === 'deposit') {
        newBalance = currentBalance + txAmount;
      } else {
        if (currentBalance < txAmount) {
          throw new Error(`Saldo tabungan tidak mencukupi untuk melakukan penarikan (Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')})`);
        }
        newBalance = currentBalance - txAmount;
      }

      // 1. Update savings_accounts balance
      const { error: accErr } = await supabase
        .from("savings_accounts")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", savId);
      if (accErr) throw accErr;

      // 2. Insert transaction
      const { error: txErr } = await supabase
        .from("savings_transactions")
        .insert({
          student_id: student.id,
          savings_id: savId,
          type: transactionType,
          amount: txAmount,
          balance_after: newBalance,
          description: formData.description || (transactionType === 'deposit' ? 'Setoran Tabungan' : 'Penarikan Tabungan'),
          created_at: new Date(formData.created_at).toISOString()
        });
      if (txErr) throw txErr;

      toast.success(`Transaksi ${transactionType === 'deposit' ? 'setor' : 'tarik'} tabungan berhasil dicatat!`);
      setIsModalOpen(false);
      fetchSavingsData();
    } catch (err: any) {
      toast.error("Gagal menyimpan transaksi: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini? Saldo tabungan murid akan dikembalikan seperti semula.")) return;
    
    const tx = history.find(t => t.id === txId);
    if (!tx) return;
    
    setLoading(true);
    try {
      const txAmount = parseFloat(tx.amount);
      const isDeposit = tx.type === 'deposit';
      
      // Get current balance
      const { data: savData, error: savErr } = await supabase
        .from("savings_accounts")
        .select("balance")
        .eq("id", tx.savings_id)
        .single();
        
      if (savErr) throw savErr;
      
      const currentBalance = parseFloat(savData.balance || "0");
      let newBalance = currentBalance;
      
      // Revert the transaction
      if (isDeposit) {
        newBalance = currentBalance - txAmount;
      } else {
        newBalance = currentBalance + txAmount;
      }
      
      // 1. Update savings_accounts balance
      const { error: accErr } = await supabase
        .from("savings_accounts")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", tx.savings_id);
      if (accErr) throw accErr;
      
      // 2. Delete transaction
      const { error: delErr } = await supabase
        .from("savings_transactions")
        .delete()
        .eq("id", txId);
      if (delErr) throw delErr;
      
      toast.success("Transaksi berhasil dihapus dan saldo telah diperbarui.");
      fetchSavingsData();
    } catch (err: any) {
      toast.error("Gagal menghapus transaksi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Tabungan Murid</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola simpanan dan penarikan uang tabungan murid.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/tabungan/mutasi" className="inline-flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-6 py-3 rounded-xl font-headline-sm hover:bg-surface-container transition-colors shadow-sm w-fit">
            <Search className="w-5 h-5 text-primary" /> Semua Mutasi
          </Link>
          <button onClick={() => openModal('withdraw')} className="inline-flex items-center gap-2 bg-surface border border-outline-variant text-on-surface px-6 py-3 rounded-xl font-headline-sm hover:bg-surface-container transition-colors shadow-sm w-fit">
            <ArrowDownRight className="w-5 h-5 text-error" /> Tarik
          </button>
          <button onClick={() => openModal('deposit')} className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm w-fit">
            <Plus className="w-5 h-5" /> Setor
          </button>
        </div>
      </div>

      <div className="bg-primary-container text-on-primary-container rounded-2xl p-6 md:p-8 flex items-center justify-between shadow-sm">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : (
          <div>
            <p className="text-label-md uppercase tracking-wider mb-2 font-bold opacity-80">Total Saldo Seluruh Murid</p>
            <h3 className="text-display-lg font-headline-lg">Rp {totalSavings.toLocaleString('id-ID')}</h3>
          </div>
        )}
        <div className="hidden md:flex p-4 bg-primary/10 rounded-2xl">
          <Wallet className="w-16 h-16 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Data Saldo</h3>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Cari nama murid..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-64"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-bold text-body-md">Memuat data saldo...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-surface-container">
                    <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                    <th className="p-4 font-label-md text-on-surface-variant">Kelas / Program</th>
                    <th className="p-4 font-label-md text-on-surface-variant text-right">Saldo Saat Ini</th>
                    <th className="p-4 font-label-md text-on-surface-variant text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSavings.map((item) => (
                    <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-4 font-bold text-on-surface">{item.students?.full_name}</td>
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                          {getLesProgramInfo(item.students?.student_les)}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-on-surface text-right text-lg">Rp {parseFloat(item.balance || "0").toLocaleString('id-ID')}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/admin/tabungan/mutasi?q=${encodeURIComponent(item.students?.full_name || '')}`} className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface-variant hover:text-primary hover:border-primary transition-colors tooltip-trigger" title="Riwayat">
                            <History className="w-4 h-4" />
                          </Link>
                          <button onClick={() => openModal('deposit', item.students?.id)} className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface-variant hover:text-[#25D366] hover:border-[#25D366] transition-colors tooltip-trigger" title="Tabung / Setor">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => openModal('withdraw', item.students?.id)} className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface-variant hover:text-error hover:border-error transition-colors tooltip-trigger" title="Tarik">
                            <ArrowDownRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSavings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                        Tidak ada data saldo yang sesuai pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Riwayat Terakhir</h3>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {history.map((item) => {
                const isDeposit = item.type === 'deposit';
                return (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${isDeposit ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-error-container text-error'}`}>
                      {isDeposit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface truncate">{item.students?.full_name}</p>
                      <p className="text-body-sm text-on-surface-variant" title={item.description || ""}>
                        {item.description || (isDeposit ? 'Setoran' : 'Penarikan')}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">{new Date(item.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className={`font-bold ${isDeposit ? 'text-[#25D366]' : 'text-error'}`}>
                        {isDeposit ? '+' : '-'}Rp {parseFloat(item.amount).toLocaleString('id-ID')}
                      </p>
                      <button onClick={() => handleDeleteTransaction(item.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/50 rounded-lg transition-colors tooltip-trigger" title="Hapus Transaksi">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && (
                <p className="text-center text-on-surface-variant text-body-sm py-8">Belum ada riwayat transaksi tabungan.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabungan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">
                {transactionType === 'deposit' ? 'Setor Tabungan' : 'Tarik Tabungan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Pilih Murid</label>
                  <select 
                    required
                    value={formData.student_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface"
                  >
                    <option value="" disabled>-- Pilih Murid --</option>
                    {students.map(s => {
                      const savingAccount = savings.find(sav => sav.student_id === s.id);
                      const balance = savingAccount ? parseFloat(savingAccount.balance || "0") : 0;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.full_name} (Saldo: Rp {balance.toLocaleString('id-ID')})
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                {formData.student_id && (
                  <div className="p-4 rounded-xl bg-primary-container/20 border border-primary/20 flex justify-between items-center">
                    <span className="text-label-md font-bold text-on-surface-variant">Saldo Terakhir:</span>
                    <span className="text-headline-sm font-headline-sm text-primary">
                      Rp {(() => {
                        const savingAccount = savings.find(sav => sav.student_id === formData.student_id);
                        return (savingAccount ? parseFloat(savingAccount.balance || "0") : 0).toLocaleString('id-ID');
                      })()}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Tanggal Transaksi</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.created_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, created_at: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Nominal Transaksi (Rp)</label>
                  <input 
                    required 
                    type="number" 
                    min="1000" 
                    placeholder="Contoh: 50000" 
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-bold text-2xl" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Keterangan / Catatan</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Setoran Uang jajan anak" 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" 
                  />
                </div>
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className={`px-6 py-2.5 rounded-xl text-white shadow-sm font-headline-sm transition-colors flex items-center gap-2 ${transactionType === 'deposit' ? 'bg-primary hover:bg-primary-container' : 'bg-error hover:bg-error/80'}`}
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
