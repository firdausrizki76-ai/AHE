"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Search, CheckCircle, XCircle, FileText, Plus, ArrowUpRight, X, AlertCircle, Loader2, History, Printer, Filter, Calendar, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function PembayaranPage() {
  const [viewMode, setViewMode] = useState<'tagihan' | 'riwayat'>('tagihan');
  const [bills, setBills] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create'|'pay'>('create');

  // Filter Tagihan state
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // History / Riwayat Pembayaran state
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyMethodFilter, setHistoryMethodFilter] = useState<'all' | 'tunai' | 'transfer' | 'tabungan'>('all');
  const [historySearch, setHistorySearch] = useState('');
  
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  
  // Form state for Create Bill
  const [createForm, setCreateForm] = useState({
    student_id: "",
    payment_type_id: "",
    amount: "",
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ""
  });

  // Form state for Pay Bill
  const [payForm, setPayForm] = useState({
    payment_method: "tunai", // 'tunai' | 'tabungan' | 'transfer'
    paid_at: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_bills")
        .select(`
          *,
          students (
            *,
            registrations (whatsapp),
            savings_accounts (*)
          ),
          payment_types (*),
          payment_transactions (*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat tagihan: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudentsAndTypes = async () => {
    try {
      const { data: std, error: stdErr } = await supabase
        .from("students")
        .select("*")
        .eq("status", "active")
        .order("full_name");
      if (stdErr) throw stdErr;
      setStudents(std || []);

      const { data: pts, error: ptsErr } = await supabase
        .from("payment_types")
        .select("*")
        .order("name");
      if (ptsErr) throw ptsErr;
      setPaymentTypes(pts || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBills();
    fetchStudentsAndTypes();
  }, [fetchBills]);

  const fetchHistoryTransactions = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select(`
          *,
          students (full_name, nis),
          payment_bills (
            bill_month,
            due_date,
            payment_types (name, les_type)
          )
        `)
        .gte("paid_at", `${historyStartDate}T00:00:00`)
        .lte("paid_at", `${historyEndDate}T23:59:59`)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      setHistoryTransactions(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat riwayat pembayaran: " + err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyStartDate, historyEndDate]);

  useEffect(() => {
    if (viewMode === "riwayat") {
      fetchHistoryTransactions();
    }
  }, [viewMode, fetchHistoryTransactions]);

  const filteredBills = bills.filter(b => {
    const matchSearch = (b.students?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (b.payment_transactions?.[0]?.receipt_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.id.substring(0, 8).toLowerCase().includes(searchQuery.toLowerCase());
    const isOverdue = b.status === "unpaid" && new Date(b.due_date) < new Date();
    const matchStatus = statusFilter === "all" ? true :
                        statusFilter === "overdue" ? isOverdue :
                        b.status === statusFilter;
    const matchType = typeFilter === "all" || b.payment_type_id === typeFilter;
    const matchMonth = !monthFilter || monthFilter === "all" || (b.bill_month && b.bill_month.startsWith(monthFilter));
    return matchSearch && matchStatus && matchType && matchMonth;
  });

  const filteredHistoryTransactions = historyTransactions.filter((tx) => {
    const studentName = tx.students?.full_name || students.find(s => s.id === tx.student_id)?.full_name || "";
    const receipt = tx.receipt_number || "";
    const notes = tx.notes || "";
    const matchSearch =
      studentName.toLowerCase().includes(historySearch.toLowerCase()) ||
      receipt.toLowerCase().includes(historySearch.toLowerCase()) ||
      notes.toLowerCase().includes(historySearch.toLowerCase());
    const matchMethod = historyMethodFilter === "all" || tx.payment_method === historyMethodFilter;
    return matchSearch && matchMethod;
  });

  const handleReprintReceipt = (tx: any) => {
    const receiptNum = tx.receipt_number || `KWT-${tx.id.substring(0, 8)}`;
    const studentName = tx.students?.full_name || students.find(s => s.id === tx.student_id)?.full_name || "Siswa";
    const amount = parseFloat(tx.amount || 0);
    const paymentFor = tx.payment_bills?.payment_types?.name || "Pembayaran SPP/Tagihan";
    const notesStr = tx.notes ? `(${tx.notes})` : "";
    const methodLabel = tx.payment_method === 'tabungan' ? 'Potong Tabungan' : tx.payment_method === 'transfer' ? 'Transfer Bank' : 'Tunai / Cash';
    const dateStr = new Date(tx.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Kwitansi - ${receiptNum}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
              .title { font-size: 18pt; font-weight: bold; }
              .receipt-no { font-size: 11pt; margin-top: 5px; }
              .row { display: flex; margin-bottom: 10px; font-size: 12pt; }
              .label { width: 180px; }
              .value { font-weight: bold; }
              .amount-box { border: 2px solid #000; padding: 10px 15px; font-size: 16pt; font-weight: bold; display: inline-block; margin-top: 15px; }
              .footer { margin-top: 40px; text-align: right; font-size: 11pt; }
              .signature { margin-top: 50px; font-weight: bold; text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">AHE TEPUS WETAN</div>
              <div>Pusat Les AHE, ASE & Mapel</div>
              <div class="receipt-no">KWITANSI: ${receiptNum}</div>
            </div>
            <div class="row"><div class="label">Diterima Dari:</div><div class="value">${studentName.toUpperCase()}</div></div>
            <div class="row"><div class="label">Untuk Pembayaran:</div><div class="value">${paymentFor.toUpperCase()} ${notesStr}</div></div>
            <div class="row"><div class="label">Metode Pembayaran:</div><div class="value">${methodLabel}</div></div>
            <div class="amount-box">RP ${amount.toLocaleString('id-ID')},-</div>
            <div class="footer">
              <div>Tepus Wetan, ${dateStr}</div>
              <div class="signature">Administrasi AHE</div>
            </div>
            <script>window.onload = function() { window.print(); window.close(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Revenue current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const totalRevenue = bills
    .filter(b => {
      if (b.status !== 'paid') return false;
      const date = new Date(b.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  const pendingCount = bills.filter(b => b.status === 'unpaid').length;

  const handlePrintReceipt = (bill: any) => {
    const transaction = bill.payment_transactions?.[0];
    if (!transaction) {
      toast.error("Transaksi pembayaran tidak ditemukan");
      return;
    }

    const studentName = bill.students?.full_name || "";
    const receiptNum = transaction.receipt_number || "NO-RECEIPT";
    const amount = parseFloat(bill.amount);
    const dateStr = new Date(transaction.paid_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const paymentMethodLabel = transaction.payment_method === 'tunai' ? 'TUNAI' : (transaction.payment_method === 'tabungan' ? 'POTONG TABUNGAN' : 'TRANSFER BANK');
    const paymentFor = bill.payment_types?.name || "Pembayaran Les";
    const notesStr = transaction.notes ? `(${transaction.notes})` : "";

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Kwitansi - ${receiptNum}</title>
            <style>
              @page {
                size: 210mm 100mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 10mm;
                width: 190mm;
                height: 80mm;
                font-family: 'Courier New', Courier, monospace;
                border: 2px dashed #000;
                position: relative;
              }
              .header {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #000;
                padding-bottom: 2mm;
                margin-bottom: 4mm;
              }
              .title {
                font-size: 16pt;
                font-weight: bold;
              }
              .receipt-no {
                font-size: 12pt;
                font-weight: bold;
              }
              .row {
                display: flex;
                margin-bottom: 2.5mm;
                font-size: 11pt;
              }
              .label {
                width: 50mm;
                font-weight: bold;
              }
              .value {
                flex-grow: 1;
              }
              .amount-box {
                border: 2px solid #000;
                padding: 2mm 5mm;
                font-size: 14pt;
                font-weight: bold;
                display: inline-block;
                margin-top: 4mm;
              }
              .footer {
                position: absolute;
                bottom: 8mm;
                right: 15mm;
                text-align: center;
              }
              .signature {
                margin-top: 15mm;
                font-weight: bold;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">AHE TEPUS WETAN</div>
                <div style="font-size: 9pt;">Pusat Les AHE, ASE & Mapel</div>
              </div>
              <div class="receipt-no">KWITANSI: ${receiptNum}</div>
            </div>
            
            <div class="row">
              <div class="label">Telah Diterima Dari:</div>
              <div class="value">${studentName.toUpperCase()}</div>
            </div>
            
            <div class="row">
              <div class="label">Untuk Pembayaran  :</div>
              <div class="value">${paymentFor.toUpperCase()} ${notesStr}</div>
            </div>
            
            <div class="row">
              <div class="label">Metode Pembayaran :</div>
              <div class="value">${paymentMethodLabel}</div>
            </div>
            
            <div class="amount-box">
              RP ${amount.toLocaleString('id-ID')},-
            </div>
            
            <div class="footer">
              <div>Tepus Wetan, ${dateStr}</div>
              <div class="signature">Administrasi AHE</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    toast.success(`Mencetak kwitansi ${receiptNum}...`);
  };

  const openCreateModal = () => {
    setModalMode('create');
    const firstStudent = students[0];
    const firstType = paymentTypes[0];
    setCreateForm({
      student_id: firstStudent?.id || "",
      payment_type_id: firstType?.id || "",
      amount: firstType?.amount?.toString() || "0",
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleTypeChange = (typeId: string) => {
    const pt = paymentTypes.find(p => p.id === typeId);
    setCreateForm(prev => ({
      ...prev,
      payment_type_id: typeId,
      amount: pt?.amount?.toString() || "0",
      notes: pt ? `Pembayaran ${pt.name}` : ""
    }));
  };

  const openPayModal = (bill: any) => {
    setSelectedBill(bill);
    setModalMode('pay');
    setPayForm({
      payment_method: "tunai",
      paid_at: new Date().toISOString().split('T')[0],
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      if (modalMode === 'create') {
        const pt = paymentTypes.find(p => p.id === createForm.payment_type_id);
        const { error } = await supabase
          .from("payment_bills")
          .insert({
            student_id: createForm.student_id,
            payment_type_id: createForm.payment_type_id,
            amount: parseFloat(createForm.amount),
            due_date: createForm.due_date,
            les_type: pt?.les_type || null,
            status: "unpaid",
            bill_month: new Date().toISOString().split('T')[0].substring(0, 7) + "-01"
          });
        if (error) throw error;
        toast.success("Tagihan baru berhasil dibuat!");
      } else {
        // Pay mode
        if (!selectedBill) return;

        const isSavings = payForm.payment_method === 'tabungan';
        const savingsAccount = selectedBill.students?.savings_accounts;
        const currentBalance = savingsAccount ? parseFloat(savingsAccount.balance) : 0;
        const amountToPay = parseFloat(selectedBill.amount);

        if (isSavings) {
          if (!savingsAccount) {
            throw new Error("Akun tabungan murid tidak ditemukan");
          }
          if (currentBalance < amountToPay) {
            throw new Error(`Saldo tabungan murid tidak mencukupi (Saldo: Rp ${currentBalance.toLocaleString('id-ID')})`);
          }
        }

        // 1. Generate receipt number
        const { data: rcptNum, error: rcptErr } = await supabase.rpc("generate_receipt_number");
        if (rcptErr) throw rcptErr;

        // 2. Insert into payment_transactions
        const { data: tx, error: txErr } = await supabase
          .from("payment_transactions")
          .insert({
            bill_id: selectedBill.id,
            student_id: selectedBill.student_id,
            amount: amountToPay,
            payment_method: payForm.payment_method,
            paid_at: new Date(payForm.paid_at).toISOString(),
            receipt_number: rcptNum,
            notes: payForm.notes
          })
          .select()
          .single();
        if (txErr) throw txErr;

        // 3. Update payment_bills status
        const { error: billErr } = await supabase
          .from("payment_bills")
          .update({ status: "paid" })
          .eq("id", selectedBill.id);
        if (billErr) throw billErr;

        // 4. Deduct savings if applicable
        if (isSavings) {
          const newBalance = currentBalance - amountToPay;
          const { error: savAccErr } = await supabase
            .from("savings_accounts")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", savingsAccount.id);
          if (savAccErr) throw savAccErr;

          const { error: savTxErr } = await supabase
            .from("savings_transactions")
            .insert({
              student_id: selectedBill.student_id,
              savings_id: savingsAccount.id,
              type: "deduction",
              amount: amountToPay,
              balance_after: newBalance,
              description: `Potong Tabungan untuk SPP/Tagihan: ${selectedBill.payment_types?.name}`,
              payment_transaction_id: tx.id
            });
          if (savTxErr) throw savTxErr;
        }

        // 5. Send WhatsApp notification
        const parentPhone = selectedBill.students?.registrations?.whatsapp;
        if (parentPhone) {
          const studentName = selectedBill.students?.full_name;
          const typeName = selectedBill.payment_types?.name || "Tagihan Les";
          const paidDateStr = new Date(payForm.paid_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
          const methodName = payForm.payment_method === 'tunai' ? 'Tunai' : (payForm.payment_method === 'tabungan' ? 'Potong Tabungan' : 'Transfer Bank');
          
          const message = `Halo Bapak/Ibu Wali dari Ananda ${studentName}. Pembayaran tagihan ${typeName} sebesar Rp ${amountToPay.toLocaleString('id-ID')} telah DITERIMA pada tanggal ${paidDateStr} dengan metode ${methodName}. No Kwitansi: ${rcptNum}. Terima kasih. - AHE Tepus Wetan`;
          
          await supabase.functions.invoke("send-whatsapp", {
            body: { recipient: parentPhone, message }
          });
        }

        toast.success(`Pembayaran invoice ${rcptNum} berhasil diproses!`);
      }

      setIsModalOpen(false);
      fetchBills();
    } catch (err: any) {
      toast.error("Gagal memproses transaksi: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const selectedStudentObj = students.find(s => s.id === createForm.student_id);
  const currentSavings = selectedBill?.students?.savings_accounts?.balance 
    ? parseFloat(selectedBill.students.savings_accounts.balance) 
    : 0;

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Pembayaran SPP & Tagihan</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola SPP, pembayaran lainnya, dan potong tabungan.</p>
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm w-fit">
          <Plus className="w-5 h-5" /> Buat Tagihan Baru
        </button>
      </div>

      {/* Top Level Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-2 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode("tagihan")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              viewMode === "tagihan"
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Daftar Tagihan & SPP
          </button>
          <button
            onClick={() => setViewMode("riwayat")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              viewMode === "riwayat"
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <History className="w-4 h-4" />
            History / Riwayat Transaksi
          </button>
        </div>
      </div>

      {viewMode === "tagihan" && (
        <>
          {/* Stats Bento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl">
            <ArrowUpRight className="w-8 h-8" />
          </div>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <div>
              <p className="text-label-md text-on-surface-variant">Pemasukan Bulan Ini</p>
              <h3 className="text-display-sm font-headline-lg text-on-surface">Rp {totalRevenue.toLocaleString('id-ID')}</h3>
            </div>
          )}
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-error-container text-on-error-container rounded-xl">
            <XCircle className="w-8 h-8" />
          </div>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-error" />
          ) : (
            <div>
              <p className="text-label-md text-on-surface-variant">Menunggu Pembayaran</p>
              <h3 className="text-display-sm font-headline-lg text-on-surface">{pendingCount} Tagihan</h3>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        {/* Advanced Filter Toolbar for Tagihan */}
        <div className="p-4 border-b border-surface-container bg-surface-container-lowest flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <h3 className="text-base font-bold text-on-surface mr-2">Daftar Tagihan & Status</h3>
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-surface px-3 py-1.5 rounded-xl border border-outline-variant">
              <Filter className="w-3.5 h-3.5 text-on-surface-variant" />
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="unpaid">Belum Bayar</option>
                <option value="paid">Lunas</option>
                <option value="overdue">Jatuh Tempo</option>
              </select>
            </div>
            {/* Jenis Tagihan Filter */}
            <div className="flex items-center gap-1 bg-surface px-3 py-1.5 rounded-xl border border-outline-variant">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-on-surface focus:outline-none max-w-[150px]"
              >
                <option value="all">Semua Jenis Tagihan</option>
                {paymentTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>
            {/* Bulan Filter */}
            <div className="flex items-center gap-1 bg-surface px-3 py-1.5 rounded-xl border border-outline-variant text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Bulan:</span>
              <input
                type="month"
                value={monthFilter === "all" ? "" : monthFilter}
                onChange={(e) => setMonthFilter(e.target.value || "all")}
                className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
              />
              {monthFilter !== "all" && (
                <button onClick={() => setMonthFilter("all")} className="text-error font-bold ml-1 text-xs">✕</button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Cari nama atau invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant text-sm font-medium bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl font-bold text-sm hover:bg-secondary-container/80 transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak Tagihan
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold text-body-md">Memuat data pembayaran...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">No. Invoice</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Jenis Tagihan</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Nominal</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Metode</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((item) => {
                  const tx = item.payment_transactions?.[0];
                  const invoiceNo = tx?.receipt_number || `BILL-${item.id.substring(0, 8).toUpperCase()}`;
                  const displayDate = tx ? tx.paid_at : item.created_at;
                  
                  let methodLabel = "-";
                  if (tx) {
                    if (tx.payment_method === 'tunai') methodLabel = 'Tunai';
                    else if (tx.payment_method === 'tabungan') methodLabel = 'Potong Tabungan';
                    else if (tx.payment_method === 'transfer') methodLabel = 'Transfer';
                  }

                  return (
                    <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-4 font-medium text-on-surface-variant">{invoiceNo}</td>
                      <td className="p-4 text-on-surface">{new Date(displayDate).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 font-bold text-on-surface">{item.students?.full_name}</td>
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                          {item.payment_types?.name || "Pembayaran"}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-on-surface">Rp {parseFloat(item.amount).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-on-surface-variant font-medium">
                        {tx?.payment_method === 'tabungan' ? (
                          <span className="text-primary font-bold">{methodLabel}</span>
                        ) : methodLabel}
                      </td>
                      <td className="p-4">
                        {item.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-primary font-bold bg-primary/10 px-3 py-1 rounded-full"><CheckCircle className="w-4 h-4"/> Lunas</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-error font-bold bg-error/10 px-3 py-1 rounded-full"><XCircle className="w-4 h-4"/> Belum Bayar</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {item.status === 'paid' && (
                          <button 
                            onClick={() => handlePrintReceipt(item)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors font-label-sm font-bold"
                          >
                            <FileText className="w-4 h-4" /> Kwitansi
                          </button>
                        )}
                        {item.status === 'unpaid' && (
                          <button onClick={() => openPayModal(item)} className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-on-primary hover:bg-primary-container rounded-lg transition-colors font-label-sm font-bold shadow-sm">
                            Proses Bayar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-on-surface-variant">
                      Tidak ada data tagihan yang sesuai filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {viewMode === "riwayat" && (
        <div className="space-y-6">
          {/* Riwayat Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center bg-surface p-4 rounded-2xl border border-outline-variant shadow-sm">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="flex flex-wrap items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-outline-variant text-xs font-bold">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Dari:</span>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
                />
                <span>s/d:</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-outline-variant">
                <Filter className="w-3.5 h-3.5 text-on-surface-variant" />
                <select
                  value={historyMethodFilter}
                  onChange={(e: any) => setHistoryMethodFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
                >
                  <option value="all">Semua Metode</option>
                  <option value="tunai">Tunai / Cash</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="tabungan">Potong Tabungan</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              <div className="relative flex-1 lg:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Cari siswa atau no. kwitansi..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant text-sm font-medium bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl font-bold text-sm hover:bg-secondary-container/80 transition-colors"
              >
                <Printer className="w-4 h-4" /> Cetak Riwayat
              </button>
            </div>
          </div>

          {/* Table Riwayat Pembayaran */}
          <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
              <h3 className="text-base font-bold text-on-surface">
                Riwayat Transaksi Pembayaran
              </h3>
              <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
                {filteredHistoryTransactions.length} Transaksi
              </span>
            </div>

            {historyLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="font-bold text-sm">Memuat riwayat transaksi...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-surface-container">
                      <th className="p-4 font-bold text-on-surface-variant">Waktu Bayar</th>
                      <th className="p-4 font-bold text-on-surface-variant">No. Kwitansi</th>
                      <th className="p-4 font-bold text-on-surface-variant">Nama Siswa</th>
                      <th className="p-4 font-bold text-on-surface-variant">Untuk Tagihan</th>
                      <th className="p-4 font-bold text-on-surface-variant">Metode</th>
                      <th className="p-4 font-bold text-on-surface-variant">Nominal</th>
                      <th className="p-4 font-bold text-on-surface-variant text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                          Tidak ada catatan riwayat transaksi dengan filter saat ini.
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryTransactions.map((tx: any) => {
                        const studentName = tx.students?.full_name || students.find(s => s.id === tx.student_id)?.full_name || "Siswa";
                        const nis = tx.students?.nis || "-";
                        const paymentFor = tx.payment_bills?.payment_types?.name || "SPP / Tagihan";
                        const dateFormatted = new Date(tx.paid_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <tr key={tx.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                            <td className="p-4 font-medium text-on-surface">{dateFormatted}</td>
                            <td className="p-4 font-mono font-bold text-primary">{tx.receipt_number || "-"}</td>
                            <td className="p-4">
                              <div className="font-bold text-on-surface">{studentName}</div>
                              <div className="text-xs text-on-surface-variant">NIS: {nis}</div>
                            </td>
                            <td className="p-4 font-medium text-on-surface">{paymentFor}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                  tx.payment_method === "tunai"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tx.payment_method === "transfer"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {tx.payment_method === "tunai" ? "Tunai" : tx.payment_method === "transfer" ? "Transfer" : "Tabungan"}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-on-surface">Rp {parseFloat(tx.amount || 0).toLocaleString("id-ID")}</td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleReprintReceipt(tx)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 rounded-lg transition-colors text-xs font-bold"
                              >
                                <Printer className="w-3.5 h-3.5" /> Kwitansi
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pembayaran Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                {modalMode === 'create' ? <><Plus className="w-5 h-5 text-primary"/> Buat Tagihan Baru</> : <><Wallet className="w-5 h-5 text-primary"/> Proses Pembayaran</>}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                {modalMode === 'create' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Pilih Murid</label>
                      <select 
                        required
                        value={createForm.student_id}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, student_id: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface"
                      >
                        <option value="" disabled>-- Pilih Murid --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jenis Pembayaran / Tagihan</label>
                      <select 
                        required
                        value={createForm.payment_type_id}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface"
                      >
                        <option value="" disabled>-- Pilih Jenis Tagihan --</option>
                        {paymentTypes.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Rp {parseFloat(p.amount).toLocaleString('id-ID')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nominal Tagihan (Rp)</label>
                      <input 
                        required 
                        type="number" 
                        value={createForm.amount}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" 
                        placeholder="Contoh: 150000" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tanggal Jatuh Tempo</label>
                      <input 
                        required 
                        type="date" 
                        value={createForm.due_date}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Deskripsi (Opsional)</label>
                      <input 
                        type="text" 
                        value={createForm.notes}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" 
                        placeholder="Contoh: SPP Bulan Juni 2026" 
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant space-y-2">
                      <p className="text-label-sm text-on-surface-variant uppercase">Invoice / Tagihan</p>
                      <p className="font-bold text-on-surface text-lg">{selectedBill?.payment_types?.name}</p>
                      <p className="text-body-sm text-on-surface-variant">Murid: {selectedBill?.students?.full_name}</p>
                      
                      <div className="mt-2 pt-2 border-t border-surface-container flex justify-between">
                        <span className="text-on-surface-variant">Total Tagihan:</span>
                        <span className="font-bold text-error text-lg">Rp {parseFloat(selectedBill?.amount || "0").toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <label className="text-label-md font-bold text-on-surface">Metode Pembayaran</label>
                      <select 
                        value={payForm.payment_method}
                        onChange={(e) => setPayForm(prev => ({ ...prev, payment_method: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-bold text-primary"
                      >
                        <option value="tunai">Tunai / Cash</option>
                        <option value="tabungan">Potong Tabungan Murid</option>
                        <option value="transfer">Transfer Bank</option>
                      </select>
                    </div>

                    {payForm.payment_method === 'tabungan' && (
                      <div className="bg-secondary-container/30 border border-secondary/20 p-4 rounded-xl flex gap-3 mt-2">
                        <Wallet className="w-6 h-6 text-secondary shrink-0" />
                        <div>
                          <p className="text-label-sm font-bold text-on-surface">Saldo Tabungan Saat Ini</p>
                          <p className="text-headline-sm font-bold text-secondary mt-1">Rp {currentSavings.toLocaleString('id-ID')}</p>
                          <p className="text-body-sm text-on-surface-variant mt-1">
                            Sisa saldo setelah dipotong: <strong>Rp {Math.max(0, currentSavings - parseFloat(selectedBill?.amount || "0")).toLocaleString('id-ID')}</strong>
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {payForm.payment_method === 'tunai' && (
                      <div className="bg-[#25D366]/10 border border-[#25D366]/20 p-4 rounded-xl flex gap-3 mt-2">
                        <AlertCircle className="w-5 h-5 text-[#25D366] shrink-0" />
                        <p className="text-body-sm text-[#075E54]">Pastikan Anda telah menerima uang tunai dari wali murid sebelum memproses pembayaran ini.</p>
                      </div>
                    )}

                    <div className="space-y-2 mt-4">
                      <label className="text-label-md font-bold text-on-surface">Tanggal Bayar</label>
                      <input 
                        required 
                        type="date" 
                        value={payForm.paid_at}
                        onChange={(e) => setPayForm(prev => ({ ...prev, paid_at: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" 
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="text-label-md font-bold text-on-surface">Keterangan / Catatan Transaksi</label>
                      <input 
                        type="text" 
                        value={payForm.notes}
                        onChange={(e) => setPayForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" 
                        placeholder="Contoh: Lunas dibayar oleh Ibu Murid"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle className="w-4 h-4" /> {modalMode === 'create' ? 'Buat Tagihan' : 'Konfirmasi Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
