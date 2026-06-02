"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { CreditCard, Printer, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridTagihanPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid'>('unpaid');

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
        // 2. Fetch bills
        const { data: billsData, error: billsErr } = await supabase
          .from("payment_bills")
          .select(`
            *,
            students (full_name),
            payment_types (*),
            payment_transactions (*)
          `)
          .eq("student_id", activeStudent.id)
          .order("created_at", { ascending: false });

        if (billsErr) throw billsErr;
        setBills(billsData || []);
      }
    } catch (err: any) {
      toast.error("Gagal memuat tagihan: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBills = bills.filter(b => {
    if (activeTab === 'paid') {
      return b.status === 'paid';
    } else {
      return b.status === 'unpaid';
    }
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const handlePrintReceipt = (bill: any) => {
    const transaction = bill.payment_transactions?.[0];
    if (!transaction) {
      toast.error("Transaksi pembayaran tidak ditemukan");
      return;
    }

    const studentName = bill.students?.full_name || student?.full_name || "";
    const receiptNum = transaction.receipt_number || "NO-RECEIPT";
    const amount = Number(bill.amount);
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

  const getLesTypeLabel = (lesType: string) => {
    if (lesType === 'les_ahe') return 'Les AHE';
    if (lesType === 'les_ase') return 'Les ASE';
    if (lesType === 'les_mapel') return 'Les Mapel';
    return lesType || "Umum";
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat data tagihan...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <CreditCard className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Tagihan & Pembayaran</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Lihat status pembayaran SPP atau tagihan pendaftaran Anda.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        <button 
          onClick={() => setActiveTab('unpaid')}
          className={`px-6 py-3 font-headline-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'unpaid' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          Belum Lunas
        </button>
        <button 
          onClick={() => setActiveTab('paid')}
          className={`px-6 py-3 font-headline-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'paid' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          Riwayat Lunas
        </button>
      </div>

      {/* Bills Card/List */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">
            {activeTab === 'unpaid' ? 'Tagihan Menunggu Pembayaran' : 'Tagihan Terbayar'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container">
                <th className="p-4 font-label-md text-on-surface-variant">Keterangan</th>
                <th className="p-4 font-label-md text-on-surface-variant">Program Les</th>
                <th className="p-4 font-label-md text-on-surface-variant">Jatuh Tempo</th>
                <th className="p-4 font-label-md text-on-surface-variant text-right">Nominal</th>
                <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                {activeTab === 'paid' && <th className="p-4 font-label-md text-on-surface-variant text-right">Cetak</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => {
                const isPaid = bill.status === "paid";
                return (
                  <tr key={bill.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{bill.payment_types?.name || "SPP Bulanan"}</div>
                      <div className="text-body-sm text-on-surface-variant">Bulan: {bill.bill_month ? new Date(bill.bill_month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : "-"}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-bold">
                        {getLesTypeLabel(bill.les_type)}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface">
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                    </td>
                    <td className="p-4 text-right font-extrabold text-on-surface">
                      {formatRupiah(Number(bill.amount || 0))}
                    </td>
                    <td className="p-4">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tertiary-container/30 text-tertiary rounded-full font-bold text-label-sm">
                          <CheckCircle className="w-4 h-4" /> Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-error-container/30 text-error rounded-full font-bold text-label-sm">
                          <XCircle className="w-4 h-4" /> Belum Lunas
                        </span>
                      )}
                    </td>
                    {isPaid && (
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handlePrintReceipt(bill)}
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-secondary cursor-pointer inline-flex items-center gap-1"
                          title="Cetak Kwitansi"
                        >
                          <Printer className="w-4 h-4" />
                          <span className="text-xs font-bold">Cetak</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'paid' ? 6 : 5} className="p-8 text-center text-on-surface-variant">
                    Tidak ada tagihan dalam kategori ini.
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
