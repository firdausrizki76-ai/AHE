"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Wallet, Search, CheckCircle, XCircle, FileText, Plus, ArrowUpRight, X, 
  AlertCircle, Loader2, History, Printer, Filter, Calendar, CreditCard, 
  RefreshCw, Edit2, Trash2, Tag, Layers, Check, Settings2, MessageCircle, 
  Send, Copy, Users, CalendarPlus, Sparkles, CheckSquare, Square
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { getLocalDateString, getLocalMonthString, formatDateIndo, formatDateTimeIndo } from "@/lib/dateUtils";

export default function PembayaranPage() {
  const [viewMode, setViewMode] = useState<'tagihan' | 'riwayat' | 'jenis_tagihan'>('tagihan');
  const [bills, setBills] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'pay'>('create');

  // Master Payment Types CRUD state
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeModalMode, setTypeModalMode] = useState<'create' | 'edit'>('create');
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const [typeFormData, setTypeFormData] = useState({
    name: "",
    amount: "",
    les_type: "all",
    is_recurring: true
  });
  const [typeSaveLoading, setTypeSaveLoading] = useState(false);

  // Generate Monthly Bills (Massal) state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    month: getLocalMonthString(),
    payment_type_id: "",
    amount: "",
    due_date: (() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}-10`;
    })(),
    filterProgram: "all",
    selectedStudentIds: [] as string[]
  });
  const [generateStudentSearch, setGenerateStudentSearch] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);

  // Direct WhatsApp Modal state
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waData, setWaData] = useState({
    phone: "",
    studentName: "",
    type: "reminder" as "reminder" | "receipt",
    message: ""
  });

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
    return getLocalDateString(d);
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => getLocalDateString());
  const [historyMethodFilter, setHistoryMethodFilter] = useState<'all' | 'tunai' | 'transfer' | 'tabungan'>('all');
  const [historySearch, setHistorySearch] = useState('');
  
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  
  // Form state for Create Bill
  const [createForm, setCreateForm] = useState({
    student_id: "",
    payment_type_id: "",
    amount: "",
    bill_month: getLocalMonthString(),
    due_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 10);
      return getLocalDateString(d);
    })(),
    notes: ""
  });

  // Form state for Edit Bill
  const [editForm, setEditForm] = useState({
    id: "",
    student_id: "",
    payment_type_id: "",
    amount: "",
    bill_month: getLocalMonthString(),
    due_date: getLocalDateString(),
    status: "unpaid",
    notes: ""
  });

  // Form state for Pay Bill
  const [payForm, setPayForm] = useState({
    payment_method: "tunai", // 'tunai' | 'tabungan' | 'transfer'
    paid_at: getLocalDateString(),
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
        .select("*, student_les(*), registrations(whatsapp), savings_accounts(*)")
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
          students (
            full_name, 
            nis,
            registrations (whatsapp)
          ),
          payment_bills (
            id,
            bill_month,
            due_date,
            amount,
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

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const matchSearch = 
        (b.students?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (b.students?.nis || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.payment_transactions?.[0]?.receipt_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.substring(0, 8).toLowerCase().includes(searchQuery.toLowerCase());
      
      const isOverdue = b.status === "unpaid" && b.due_date && new Date(b.due_date) < new Date();
      const matchStatus = statusFilter === "all" ? true :
                          statusFilter === "overdue" ? isOverdue :
                          b.status === statusFilter;
      const matchType = typeFilter === "all" || b.payment_type_id === typeFilter;
      const matchMonth = !monthFilter || monthFilter === "all" || (b.bill_month && b.bill_month.startsWith(monthFilter));
      return matchSearch && matchStatus && matchType && matchMonth;
    });
  }, [bills, searchQuery, statusFilter, typeFilter, monthFilter]);

  const filteredHistoryTransactions = useMemo(() => {
    return historyTransactions.filter((tx) => {
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
  }, [historyTransactions, students, historySearch, historyMethodFilter]);

  const handleReprintReceipt = (tx: any) => {
    const receiptNum = tx.receipt_number || `KWT-${tx.id.substring(0, 8)}`;
    const studentName = tx.students?.full_name || students.find(s => s.id === tx.student_id)?.full_name || "Siswa";
    const amount = Number(tx.amount || 0);
    const paymentFor = tx.payment_bills?.payment_types?.name || "Pembayaran SPP/Tagihan";
    const notesStr = tx.notes ? `(${tx.notes})` : "";
    const methodLabel = tx.payment_method === 'tabungan' ? 'Potong Tabungan' : tx.payment_method === 'transfer' ? 'Transfer Bank' : 'Tunai / Cash';
    const dateStr = formatDateIndo(tx.paid_at);

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

  const handlePrintReceipt = (bill: any) => {
    const transaction = bill.payment_transactions?.[0];
    if (!transaction) {
      toast.error("Transaksi pembayaran tidak ditemukan");
      return;
    }

    const studentName = bill.students?.full_name || "";
    const receiptNum = transaction.receipt_number || "NO-RECEIPT";
    const amount = Number(bill.amount || 0);
    const dateStr = formatDateIndo(transaction.paid_at);
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

  // Revenue current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const totalRevenue = bills
    .filter(b => {
      if (b.status !== 'paid') return false;
      const date = new Date(b.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const pendingCount = bills.filter(b => b.status === 'unpaid').length;

  // Format Helper for WhatsApp Messages
  const generateWhatsAppMessage = (bill: any, type: 'reminder' | 'receipt') => {
    const student = bill.students;
    const studentName = student?.full_name || "Siswa";
    const nis = student?.nis ? `(NIS: ${student.nis})` : "";
    const paymentTypeName = bill.payment_types?.name || "Tagihan Les";
    const amount = Number(bill.amount || 0).toLocaleString('id-ID');
    
    let monthStr = "-";
    if (bill.bill_month) {
      const [y, m] = bill.bill_month.substring(0, 7).split("-");
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      if (m && monthNames[parseInt(m, 10) - 1]) {
        monthStr = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
      }
    }

    if (type === 'reminder') {
      const dueDateStr = bill.due_date ? formatDateIndo(bill.due_date) : "-";
      return `*PEMBERITAHUAN TAGIHAN BELAJAR AHE*
━━━━━━━━━━━━━━━━━━━━
Yth. Bapak/Ibu Wali dari *${studentName}* ${nis}

Kami dari *AHE TEPUS WETAN* ingin menginformasikan rincian tagihan bimbingan belajar Ananda:

📋 *Rincian Tagihan:*
• *Jenis Tagihan*: ${paymentTypeName}
• *Periode*: ${monthStr}
• *Nominal*: Rp ${amount},-
• *Jatuh Tempo*: ${dueDateStr}
• *Status*: 🔴 *BELUM DIBAYAR*
━━━━━━━━━━━━━━━━━━━━
💳 *Metode Pembayaran:*
1. *Tunai*: Di tempat les / kantor AHE Tepus Wetan
2. *Potong Tabungan*: Otomatis potong dari saldo tabungan ananda
3. *Transfer Bank*:
   • Bank BRI: (Konfirmasi nomor rekening ke admin)

Mohon konfirmasi jika telah melakukan pembayaran. Terima kasih atas perhatian dan kepercayaannya. 🙏✨

Salam hangat,
*Admin AHE Tepus Wetan*`;
    } else {
      // Receipt / Kwitansi Lunas
      const tx = bill.payment_transactions?.[0];
      const receiptNum = tx?.receipt_number || `KWT-${bill.id.substring(0, 8).toUpperCase()}`;
      const paidDate = tx?.paid_at ? formatDateIndo(tx.paid_at) : formatDateIndo(new Date());
      const methodStr = tx?.payment_method === 'tabungan' ? 'Potong Tabungan' : tx?.payment_method === 'transfer' ? 'Transfer Bank' : 'Tunai / Cash';
      
      return `*BUKTI PEMBAYARAN / KWITANSI RESMI*
━━━━━━━━━━━━━━━━━━━━
Yth. Bapak/Ibu Wali dari *${studentName}* ${nis}

Alhamdulillah, pembayaran tagihan belajar Ananda telah kami terima dengan status *LUNAS*:

🧾 *Rincian Pembayaran:*
• *No. Kwitansi*: ${receiptNum}
• *Jenis Pembayaran*: ${paymentTypeName}
• *Periode*: ${monthStr}
• *Nominal*: *Rp ${amount},-*
• *Tanggal Bayar*: ${paidDate}
• *Metode Bayar*: ${methodStr}
• *Status*: 🟢 *LUNAS*
━━━━━━━━━━━━━━━━━━━━
Terima kasih banyak atas pembayarannya. Semoga Ananda *${studentName}* senantiasa bersemangat belajar, cerdas, dan semakin berprestasi di AHE! 🌟📚

Salam hangat,
*Admin AHE Tepus Wetan*`;
    }
  };

  // Direct WhatsApp Trigger
  const handleOpenDirectWA = (bill: any, type: 'reminder' | 'receipt') => {
    const rawPhone = bill.students?.registrations?.whatsapp || "";
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone;
    }

    const message = generateWhatsAppMessage(bill, type);
    setWaData({
      phone: cleanPhone,
      studentName: bill.students?.full_name || "Murid",
      type,
      message
    });
    setIsWaModalOpen(true);
  };

  const handleOpenDirectWAFromTx = (tx: any) => {
    const student = tx.students;
    const rawPhone = student?.registrations?.whatsapp || "";
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone;
    }

    const studentName = student?.full_name || "Siswa";
    const nis = student?.nis ? `(NIS: ${student.nis})` : "";
    const paymentTypeName = tx.payment_bills?.payment_types?.name || "SPP / Tagihan";
    const amount = Number(tx.amount || 0).toLocaleString('id-ID');
    const receiptNum = tx.receipt_number || `KWT-${tx.id.substring(0, 8).toUpperCase()}`;
    const paidDate = formatDateIndo(tx.paid_at);
    const methodStr = tx.payment_method === 'tabungan' ? 'Potong Tabungan' : tx.payment_method === 'transfer' ? 'Transfer Bank' : 'Tunai / Cash';
    
    let monthStr = "-";
    if (tx.payment_bills?.bill_month) {
      const [y, m] = tx.payment_bills.bill_month.substring(0, 7).split("-");
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      if (m && monthNames[parseInt(m, 10) - 1]) {
        monthStr = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
      }
    }

    const message = `*BUKTI PEMBAYARAN / KWITANSI RESMI*
━━━━━━━━━━━━━━━━━━━━
Yth. Bapak/Ibu Wali dari *${studentName}* ${nis}

Alhamdulillah, pembayaran tagihan belajar Ananda telah kami terima dengan status *LUNAS*:

🧾 *Rincian Pembayaran:*
• *No. Kwitansi*: ${receiptNum}
• *Jenis Pembayaran*: ${paymentTypeName}
• *Periode*: ${monthStr}
• *Nominal*: *Rp ${amount},-*
• *Tanggal Bayar*: ${paidDate}
• *Metode Bayar*: ${methodStr}
• *Status*: 🟢 *LUNAS*
━━━━━━━━━━━━━━━━━━━━
Terima kasih banyak atas pembayarannya. Semoga Ananda *${studentName}* senantiasa bersemangat belajar, cerdas, dan semakin berprestasi di AHE! 🌟📚

Salam hangat,
*Admin AHE Tepus Wetan*`;

    setWaData({
      phone: cleanPhone,
      studentName,
      type: "receipt",
      message
    });
    setIsWaModalOpen(true);
  };

  const handleSendDirectWA = () => {
    let cleanPhone = waData.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("Silakan masukkan nomor WhatsApp orang tua yang valid (contoh: 0812... / 62812...)");
      return;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waData.message)}`;
    window.open(url, '_blank');
    setIsWaModalOpen(false);
    toast.success("Membuka WhatsApp...");
  };

  const handleCopyWAMessage = () => {
    navigator.clipboard.writeText(waData.message);
    toast.success("Teks pesan WhatsApp berhasil disalin!");
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    const firstStudent = students[0];
    const firstType = paymentTypes[0];
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 10);
    setCreateForm({
      student_id: firstStudent?.id || "",
      payment_type_id: firstType?.id || "",
      amount: firstType?.amount !== null && firstType?.amount !== undefined ? String(firstType.amount) : "0",
      bill_month: getLocalMonthString(),
      due_date: getLocalDateString(defaultDue),
      notes: firstType ? `Pembayaran ${firstType.name}` : ""
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (bill: any) => {
    setSelectedBill(bill);
    setModalMode('edit');
    const monthStr = bill.bill_month ? bill.bill_month.substring(0, 7) : getLocalMonthString();
    setEditForm({
      id: bill.id,
      student_id: bill.student_id,
      payment_type_id: bill.payment_type_id || "",
      amount: bill.amount !== null && bill.amount !== undefined ? String(bill.amount) : "0",
      bill_month: monthStr,
      due_date: bill.due_date ? bill.due_date.substring(0, 10) : getLocalDateString(),
      status: bill.status || "unpaid",
      notes: bill.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleTypeChange = (typeId: string) => {
    const pt = paymentTypes.find(p => p.id === typeId);
    setCreateForm(prev => ({
      ...prev,
      payment_type_id: typeId,
      amount: pt?.amount !== null && pt?.amount !== undefined ? String(pt.amount) : "0",
      notes: pt ? `Pembayaran ${pt.name}` : ""
    }));
  };

  const openPayModal = (bill: any) => {
    setSelectedBill(bill);
    setModalMode('pay');
    setPayForm({
      payment_method: "tunai",
      paid_at: getLocalDateString(),
      notes: ""
    });
    setIsModalOpen(true);
  };

  // Payment Types CRUD Handlers
  const openCreateTypeModal = () => {
    setTypeModalMode('create');
    setSelectedType(null);
    setTypeFormData({
      name: "",
      amount: "",
      les_type: "all",
      is_recurring: true
    });
    setIsTypeModalOpen(true);
  };

  const openEditTypeModal = (pt: any) => {
    setTypeModalMode('edit');
    setSelectedType(pt);
    setTypeFormData({
      name: pt.name || "",
      amount: pt.amount !== null && pt.amount !== undefined ? String(pt.amount) : "",
      les_type: pt.les_type || "all",
      is_recurring: pt.is_recurring ?? true
    });
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeFormData.name.trim()) {
      toast.error("Nama jenis tagihan wajib diisi");
      return;
    }
    const amt = parseFloat(typeFormData.amount);
    if (isNaN(amt) || amt < 0) {
      toast.error("Nominal tagihan harus berupa angka valid");
      return;
    }

    setTypeSaveLoading(true);
    try {
      const payload = {
        name: typeFormData.name.trim(),
        amount: amt,
        les_type: typeFormData.les_type === "all" ? null : typeFormData.les_type,
        is_recurring: typeFormData.is_recurring
      };

      if (typeModalMode === 'create') {
        const { error } = await supabase
          .from("payment_types")
          .insert(payload);
        if (error) throw error;
        toast.success("Jenis pembayaran baru berhasil ditambahkan!");
      } else {
        const { error } = await supabase
          .from("payment_types")
          .update(payload)
          .eq("id", selectedType.id);
        if (error) throw error;
        toast.success("Jenis pembayaran berhasil diperbarui!");
      }

      setIsTypeModalOpen(false);
      fetchStudentsAndTypes();
    } catch (err: any) {
      toast.error("Gagal menyimpan jenis pembayaran: " + err.message);
    } finally {
      setTypeSaveLoading(false);
    }
  };

  const handleDeleteType = async (pt: any) => {
    if (!confirm(`Hapus jenis pembayaran "${pt.name}"? Tagihan yang sudah tercatat tetap tersimpan di riwayat.`)) return;
    try {
      const { error } = await supabase
        .from("payment_types")
        .delete()
        .eq("id", pt.id);
      if (error) throw error;
      toast.success(`Jenis pembayaran "${pt.name}" berhasil dihapus.`);
      fetchStudentsAndTypes();
    } catch (err: any) {
      toast.error("Gagal menghapus jenis pembayaran: " + err.message);
    }
  };

  // Delete Bill Handler (With Safe Cascade & Savings Refund)
  const handleDeleteBill = async (bill: any) => {
    const studentName = bill.students?.full_name || "Siswa";
    const typeName = bill.payment_types?.name || "Tagihan";
    const amountStr = Number(bill.amount || 0).toLocaleString('id-ID');
    const isPaid = bill.status === 'paid';

    const confirmMsg = isPaid
      ? `PERINGATAN: Tagihan "${typeName}" untuk ${studentName} sebesar Rp ${amountStr} berstatus LUNAS.\n\nMenghapus tagihan ini akan menghapus riwayat kwitansi pembayaran dan mengembalikan saldo tabungan (jika pembayaran via potong tabungan).\n\nApakah Anda yakin ingin menghapus tagihan ini?`
      : `Apakah Anda yakin ingin menghapus tagihan "${typeName}" untuk ${studentName} sebesar Rp ${amountStr}?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      if (isPaid) {
        // 1. Fetch transactions for this bill
        const { data: txs, error: txsErr } = await supabase
          .from("payment_transactions")
          .select("*")
          .eq("bill_id", bill.id);
        
        if (txsErr) throw txsErr;

        for (const tx of (txs || [])) {
          // If paid via savings, refund balance
          if (tx.payment_method === 'tabungan') {
            const savingsAcc = bill.students?.savings_accounts;
            if (savingsAcc) {
              const currentBal = Number(savingsAcc.balance || 0);
              const refundAmt = Number(tx.amount || 0);
              const newBal = currentBal + refundAmt;

              // Delete savings transaction
              await supabase
                .from("savings_transactions")
                .delete()
                .eq("payment_transaction_id", tx.id);

              // Update savings account balance
              await supabase
                .from("savings_accounts")
                .update({ balance: newBal, updated_at: new Date().toISOString() })
                .eq("id", savingsAcc.id);
            }
          }

          // Delete payment transaction
          const { error: delTxErr } = await supabase
            .from("payment_transactions")
            .delete()
            .eq("id", tx.id);
          if (delTxErr) throw delTxErr;
        }
      }

      // 2. Delete payment_bills
      const { error: delBillErr } = await supabase
        .from("payment_bills")
        .delete()
        .eq("id", bill.id);
      if (delBillErr) throw delBillErr;

      toast.success(`Tagihan "${typeName}" untuk ${studentName} berhasil dihapus.`);
      fetchBills();
    } catch (err: any) {
      toast.error("Gagal menghapus tagihan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Create / Edit / Pay Bill
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      if (modalMode === 'create') {
        const pt = paymentTypes.find(p => p.id === createForm.payment_type_id);
        const billMonthFormatted = `${createForm.bill_month}-01`;
        const { error } = await supabase
          .from("payment_bills")
          .insert({
            student_id: createForm.student_id,
            payment_type_id: createForm.payment_type_id,
            amount: parseFloat(createForm.amount),
            due_date: createForm.due_date,
            les_type: pt?.les_type || null,
            status: "unpaid",
            bill_month: billMonthFormatted
          });
        if (error) throw error;
        toast.success("Tagihan baru berhasil dibuat!");
      } else if (modalMode === 'edit') {
        const pt = paymentTypes.find(p => p.id === editForm.payment_type_id);
        const billMonthFormatted = `${editForm.bill_month}-01`;
        const { error } = await supabase
          .from("payment_bills")
          .update({
            student_id: editForm.student_id,
            payment_type_id: editForm.payment_type_id,
            amount: parseFloat(editForm.amount),
            due_date: editForm.due_date,
            les_type: pt?.les_type || null,
            status: editForm.status,
            bill_month: billMonthFormatted
          })
          .eq("id", editForm.id);
        if (error) throw error;
        toast.success("Data tagihan berhasil diperbarui!");
      } else {
        // Pay mode
        if (!selectedBill) return;

        const isSavings = payForm.payment_method === 'tabungan';
        const savingsAccount = selectedBill.students?.savings_accounts;
        const currentBalance = savingsAccount ? Number(savingsAccount.balance || 0) : 0;
        const amountToPay = Number(selectedBill.amount || 0);

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

  // Generate Monthly Bills Functions
  const openGenerateModal = () => {
    const recurringType = paymentTypes.find(p => p.is_recurring) || paymentTypes[0];
    const activeStudentIds = students.map(s => s.id);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const defaultMonth = `${y}-${m}`;
    const defaultDue = `${y}-${m}-10`;

    setGenerateForm({
      month: defaultMonth,
      payment_type_id: recurringType?.id || "",
      amount: recurringType?.amount !== null && recurringType?.amount !== undefined ? String(recurringType.amount) : "0",
      due_date: defaultDue,
      filterProgram: recurringType?.les_type || "all",
      selectedStudentIds: activeStudentIds
    });
    setGenerateStudentSearch("");
    setIsGenerateModalOpen(true);
  };

  const handleGenerateTypeChange = (typeId: string) => {
    const pt = paymentTypes.find(p => p.id === typeId);
    const lesType = pt?.les_type || "all";
    
    let targetStudentIds = students.map(s => s.id);
    if (lesType && lesType !== "all") {
      const matched = students
        .filter(s => (s.student_les || []).some((l: any) => l.les_type === lesType))
        .map(s => s.id);
      if (matched.length > 0) {
        targetStudentIds = matched;
      }
    }

    setGenerateForm(prev => ({
      ...prev,
      payment_type_id: typeId,
      amount: pt?.amount !== null && pt?.amount !== undefined ? String(pt.amount) : "0",
      filterProgram: lesType,
      selectedStudentIds: targetStudentIds
    }));
  };

  const toggleStudentSelection = (studentId: string) => {
    setGenerateForm(prev => {
      const exists = prev.selectedStudentIds.includes(studentId);
      return {
        ...prev,
        selectedStudentIds: exists 
          ? prev.selectedStudentIds.filter(id => id !== studentId)
          : [...prev.selectedStudentIds, studentId]
      };
    });
  };

  const selectAllFilteredStudents = (studentIds: string[]) => {
    setGenerateForm(prev => ({
      ...prev,
      selectedStudentIds: Array.from(new Set([...prev.selectedStudentIds, ...studentIds]))
    }));
  };

  const deselectAllFilteredStudents = (studentIds: string[]) => {
    const removeSet = new Set(studentIds);
    setGenerateForm(prev => ({
      ...prev,
      selectedStudentIds: prev.selectedStudentIds.filter(id => !removeSet.has(id))
    }));
  };

  const handleExecuteGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateForm.payment_type_id) {
      toast.error("Pilih jenis tagihan terlebih dahulu");
      return;
    }
    if (generateForm.selectedStudentIds.length === 0) {
      toast.error("Pilih minimal 1 murid untuk digenerate tagihannya");
      return;
    }
    const amt = parseFloat(generateForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Nominal tagihan harus lebih dari 0");
      return;
    }

    setGenerateLoading(true);
    try {
      const pt = paymentTypes.find(p => p.id === generateForm.payment_type_id);
      const billMonthFormatted = `${generateForm.month}-01`;

      // 1. Check existing bills to prevent duplicates
      const { data: existingBills, error: checkErr } = await supabase
        .from("payment_bills")
        .select("student_id")
        .eq("payment_type_id", generateForm.payment_type_id)
        .eq("bill_month", billMonthFormatted);

      if (checkErr) throw checkErr;
      const existingStudentIdSet = new Set((existingBills || []).map(b => b.student_id));

      // 2. Filter insert payload
      const toInsert = generateForm.selectedStudentIds
        .filter(studentId => !existingStudentIdSet.has(studentId))
        .map(studentId => ({
          student_id: studentId,
          payment_type_id: generateForm.payment_type_id,
          amount: amt,
          due_date: generateForm.due_date,
          les_type: pt?.les_type || null,
          status: "unpaid",
          bill_month: billMonthFormatted
        }));

      const skippedCount = generateForm.selectedStudentIds.length - toInsert.length;

      if (toInsert.length === 0) {
        toast.info(`Semua (${skippedCount}) murid yang dipilih sudah memiliki tagihan ${pt?.name} untuk periode ${generateForm.month}.`);
        setIsGenerateModalOpen(false);
        return;
      }

      // 3. Batch insert
      const { error: insErr } = await supabase
        .from("payment_bills")
        .insert(toInsert);

      if (insErr) throw insErr;

      toast.success(`Berhasil membuat ${toInsert.length} tagihan periode ${generateForm.month}! ${skippedCount > 0 ? `(${skippedCount} dilewati karena sudah ada)` : ''}`);
      setIsGenerateModalOpen(false);
      fetchBills();
    } catch (err: any) {
      toast.error("Gagal membuat tagihan bulanan: " + err.message);
    } finally {
      setGenerateLoading(false);
    }
  };

  const currentSavings = selectedBill?.students?.savings_accounts?.balance 
    ? Number(selectedBill.students.savings_accounts.balance || 0) 
    : 0;

  // Filtered students for generate modal
  const generateModalStudents = useMemo(() => {
    return students.filter(s => {
      if (generateStudentSearch.trim()) {
        const q = generateStudentSearch.toLowerCase();
        const matchName = (s.full_name || "").toLowerCase().includes(q);
        const matchNis = (s.nis || "").toLowerCase().includes(q);
        if (!matchName && !matchNis) return false;
      }
      if (generateForm.filterProgram !== "all") {
        const hasProgram = (s.student_les || []).some((l: any) => l.les_type === generateForm.filterProgram);
        if (!hasProgram) return false;
      }
      return true;
    });
  }, [students, generateStudentSearch, generateForm.filterProgram]);

  return (
    <div className="space-y-6 font-body-md relative">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Pembayaran SPP & Tagihan</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola tagihan bulanan, SPP massal, aksi edit/hapus, dan notifikasi direct WhatsApp.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={openGenerateModal}
            className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-5 py-3 rounded-xl font-headline-sm hover:bg-secondary-container/80 transition-colors shadow-sm cursor-pointer"
          >
            <CalendarPlus className="w-5 h-5 text-secondary" /> Generate Tagihan Bulanan
          </button>
          <button 
            onClick={openCreateModal} 
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Buat Tagihan Baru
          </button>
        </div>
      </div>

      {/* Top Level Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-2 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode("tagihan")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              viewMode === "tagihan"
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Daftar Tagihan & SPP ({bills.length})
          </button>
          <button
            onClick={() => setViewMode("riwayat")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              viewMode === "riwayat"
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <History className="w-4 h-4" />
            History / Riwayat Transaksi
          </button>
          <button
            onClick={() => setViewMode("jenis_tagihan")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              viewMode === "jenis_tagihan"
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Kelola Jenis Pembayaran & Tarif
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
                    className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
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
                    className="bg-transparent text-xs font-bold text-on-surface focus:outline-none max-w-[150px] cursor-pointer"
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
                  <span>Periode:</span>
                  <input
                    type="month"
                    value={monthFilter === "all" ? "" : monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value || "all")}
                    className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
                  />
                  {monthFilter !== "all" && (
                    <button onClick={() => setMonthFilter("all")} className="text-error font-bold ml-1 text-xs cursor-pointer">✕</button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <div className="relative flex-1 lg:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Cari siswa atau invoice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant text-sm font-medium bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl font-bold text-sm hover:bg-secondary-container/80 transition-colors cursor-pointer"
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
                      <th className="p-4 font-label-md text-on-surface-variant">No. Invoice / ID</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Periode & Jatuh Tempo</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Jenis Tagihan</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Nominal</th>
                      <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                      <th className="p-4 font-label-md text-on-surface-variant text-center">Kirim WA</th>
                      <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((item) => {
                      const tx = item.payment_transactions?.[0];
                      const invoiceNo = tx?.receipt_number || `BILL-${item.id.substring(0, 8).toUpperCase()}`;
                      
                      let monthLabel = "-";
                      if (item.bill_month) {
                        const [y, m] = item.bill_month.substring(0, 7).split("-");
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                        if (m && monthNames[parseInt(m, 10) - 1]) {
                          monthLabel = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
                        }
                      }

                      return (
                        <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-xs text-primary">{invoiceNo}</td>
                          <td className="p-4">
                            <div className="font-bold text-on-surface text-sm">{monthLabel}</div>
                            <div className="text-xs text-on-surface-variant">
                              Jatuh tempo: {item.due_date ? formatDateIndo(item.due_date) : '-'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-on-surface text-base">{item.students?.full_name}</div>
                            <div className="text-xs text-on-surface-variant">
                              {item.students?.registrations?.whatsapp ? `WA: ${item.students.registrations.whatsapp}` : 'WA: -'}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                              {item.payment_types?.name || "Pembayaran"}
                            </span>
                          </td>
                          <td className="p-4 font-black text-on-surface text-base">
                            Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="p-4">
                            {item.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 text-primary font-bold bg-primary/10 px-3 py-1 rounded-full text-xs">
                                <CheckCircle className="w-3.5 h-3.5"/> Lunas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-error font-bold bg-error/10 px-3 py-1 rounded-full text-xs">
                                <XCircle className="w-3.5 h-3.5"/> Belum Bayar
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.status === 'paid' ? (
                              <button
                                onClick={() => handleOpenDirectWA(item, 'receipt')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Kirim Kwitansi via WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                WA Kwitansi
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenDirectWA(item, 'reminder')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                                title="Kirim Tagihan / Reminder via WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                                WA Tagihan
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === 'paid' && (
                                <button 
                                  onClick={() => handlePrintReceipt(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-outline-variant text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors text-xs font-bold cursor-pointer"
                                  title="Cetak Kwitansi Fisik"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Kwitansi
                                </button>
                              )}
                              {item.status === 'unpaid' && (
                                <button 
                                  onClick={() => openPayModal(item)} 
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary hover:bg-primary-container rounded-lg transition-colors text-xs font-bold shadow-sm cursor-pointer"
                                >
                                  Bayar
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary rounded-lg transition-colors cursor-pointer"
                                title="Edit Tagihan"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBill(item)}
                                className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-error rounded-lg transition-colors cursor-pointer"
                                title="Hapus Tagihan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
                  className="bg-transparent text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
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
                className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl font-bold text-sm hover:bg-secondary-container/80 transition-colors cursor-pointer"
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
                        const dateFormatted = formatDateTimeIndo(tx.paid_at);

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
                            <td className="p-4 font-black text-on-surface text-base">
                              Rp {Number(tx.amount || 0).toLocaleString("id-ID")}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenDirectWAFromTx(tx)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  title="Kirim Kwitansi via WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WA
                                </button>
                                <button
                                  onClick={() => handleReprintReceipt(tx)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Kwitansi
                                </button>
                              </div>
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

      {viewMode === "jenis_tagihan" && (
        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Master Jenis Pembayaran & Tarif
              </h3>
              <p className="text-body-md text-on-surface-variant mt-1">
                Atur nama tagihan, nominal biaya standar (SPP, Modul, Kaos, dll), dan program les terkait.
              </p>
            </div>
            <button
              onClick={openCreateTypeModal}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-container transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Jenis Tagihan
            </button>
          </div>

          <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
              <h4 className="text-base font-bold text-on-surface">Daftar Jenis Tagihan ({paymentTypes.length})</h4>
              <span className="text-xs font-bold text-on-surface-variant">Klik "Edit Tarif" untuk mengubah nominal atau nama tagihan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-surface-container">
                    <th className="p-4 font-bold text-on-surface-variant">Nama Jenis Tagihan</th>
                    <th className="p-4 font-bold text-on-surface-variant">Program Les Terkait</th>
                    <th className="p-4 font-bold text-on-surface-variant">Sifat Tagihan</th>
                    <th className="p-4 font-bold text-on-surface-variant text-right">Tarif Standar (Rp)</th>
                    <th className="p-4 font-bold text-on-surface-variant text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTypes.map((pt) => {
                    let programBadge = "Semua / Umum";
                    let programClass = "bg-surface-container text-on-surface";
                    if (pt.les_type === "les_ahe") {
                      programBadge = "Les AHE";
                      programClass = "bg-primary/10 text-primary";
                    } else if (pt.les_type === "les_ase") {
                      programBadge = "Les ASE";
                      programClass = "bg-secondary/15 text-secondary";
                    } else if (pt.les_type === "les_mapel") {
                      programBadge = "Les Mapel";
                      programClass = "bg-[#712ae2]/10 text-[#712ae2]";
                    }

                    return (
                      <tr key={pt.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4 font-bold text-on-surface text-base">
                          {pt.name}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${programClass}`}>
                            {programBadge}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${pt.is_recurring ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {pt.is_recurring ? 'Rutin Bulanan (SPP)' : 'Sekali Bayar / Non-Rutin'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-right text-on-surface text-base">
                          Rp {Number(pt.amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditTypeModal(pt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-primary hover:bg-primary hover:text-on-primary transition-colors text-xs font-bold shadow-sm cursor-pointer"
                              title="Edit Nama & Tarif"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit Tarif
                            </button>
                            <button
                              onClick={() => handleDeleteType(pt)}
                              className="p-1.5 bg-surface border border-outline-variant rounded-lg text-error hover:bg-error hover:text-white transition-colors cursor-pointer"
                              title="Hapus Jenis Tagihan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paymentTypes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                        Belum ada data jenis pembayaran. Klik "Tambah Jenis Tagihan" untuk membuat baru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit / Pay Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                {modalMode === 'create' && <><Plus className="w-5 h-5 text-primary"/> Buat Tagihan Baru</>}
                {modalMode === 'edit' && <><Edit2 className="w-5 h-5 text-primary"/> Edit Data Tagihan</>}
                {modalMode === 'pay' && <><Wallet className="w-5 h-5 text-primary"/> Proses Pembayaran</>}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                {modalMode === 'create' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Pilih Murid</label>
                      <select 
                        required
                        value={createForm.student_id}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, student_id: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface cursor-pointer"
                      >
                        <option value="" disabled>-- Pilih Murid --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name} {s.nis ? `(${s.nis})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jenis Tagihan / SPP</label>
                      <select 
                        required
                        value={createForm.payment_type_id}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface cursor-pointer"
                      >
                        <option value="" disabled>-- Pilih Jenis Tagihan --</option>
                        {paymentTypes.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Rp {Number(p.amount || 0).toLocaleString('id-ID')})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Periode Bulan Tagihan</label>
                        <input 
                          required 
                          type="month" 
                          value={createForm.bill_month}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, bill_month: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface font-bold" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Tanggal Jatuh Tempo</label>
                        <input 
                          required 
                          type="date" 
                          value={createForm.due_date}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, due_date: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nominal Tagihan (Rp)</label>
                      <input 
                        required 
                        type="number" 
                        min="0"
                        step="1000"
                        value={createForm.amount}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-black text-xl text-primary" 
                        placeholder="Contoh: 150000" 
                      />
                    </div>
                  </>
                )}

                {modalMode === 'edit' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Murid Terkait</label>
                      <select 
                        required
                        value={editForm.student_id}
                        onChange={(e) => setEditForm(prev => ({ ...prev, student_id: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface cursor-pointer"
                      >
                        <option value="" disabled>-- Pilih Murid --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name} {s.nis ? `(${s.nis})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jenis Tagihan</label>
                      <select 
                        required
                        value={editForm.payment_type_id}
                        onChange={(e) => setEditForm(prev => ({ ...prev, payment_type_id: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface cursor-pointer"
                      >
                        <option value="" disabled>-- Pilih Jenis Tagihan --</option>
                        {paymentTypes.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Periode Bulan</label>
                        <input 
                          required 
                          type="month" 
                          value={editForm.bill_month}
                          onChange={(e) => setEditForm(prev => ({ ...prev, bill_month: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface font-bold" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Tanggal Jatuh Tempo</label>
                        <input 
                          required 
                          type="date" 
                          value={editForm.due_date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Nominal Tagihan (Rp)</label>
                        <input 
                          required 
                          type="number" 
                          min="0"
                          step="1000"
                          value={editForm.amount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-black text-xl text-primary" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Status Tagihan</label>
                        <select 
                          value={editForm.status}
                          onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface font-bold cursor-pointer"
                        >
                          <option value="unpaid">Belum Bayar</option>
                          <option value="paid">Lunas</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {modalMode === 'pay' && (
                  <>
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant space-y-2">
                      <p className="text-label-sm text-on-surface-variant uppercase">Invoice / Tagihan</p>
                      <p className="font-bold text-on-surface text-lg">{selectedBill?.payment_types?.name}</p>
                      <p className="text-body-sm text-on-surface-variant">Murid: <strong>{selectedBill?.students?.full_name}</strong></p>
                      
                      <div className="mt-2 pt-2 border-t border-surface-container flex justify-between items-center">
                        <span className="text-on-surface-variant">Total Tagihan:</span>
                        <span className="font-black text-error text-xl">Rp {Number(selectedBill?.amount || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <label className="text-label-md font-bold text-on-surface">Metode Pembayaran</label>
                      <select 
                        value={payForm.payment_method}
                        onChange={(e) => setPayForm(prev => ({ ...prev, payment_method: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-bold text-primary cursor-pointer"
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
                            Sisa saldo setelah dipotong: <strong>Rp {Math.max(0, currentSavings - Number(selectedBill?.amount || 0)).toLocaleString('id-ID')}</strong>
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
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="text-label-md font-bold text-on-surface">Keterangan / Catatan Transaksi</label>
                      <input 
                        type="text" 
                        value={payForm.notes}
                        onChange={(e) => setPayForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                        placeholder="Contoh: Lunas dibayar oleh Orang Tua Murid"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'create' && <><CheckCircle className="w-4 h-4" /> Buat Tagihan</>}
                  {modalMode === 'edit' && <><Check className="w-4 h-4" /> Simpan Perubahan</>}
                  {modalMode === 'pay' && <><CheckCircle className="w-4 h-4" /> Konfirmasi Pembayaran</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Monthly Bills Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[650px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-primary" /> Generate Tagihan Bulanan (Massal)
              </h3>
              <button onClick={() => setIsGenerateModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>

            <form onSubmit={handleExecuteGenerate} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 text-xs text-on-surface">
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                  <p>Fitur ini otomatis membuat tagihan periode bulanan untuk banyak murid sekaligus. Tagihan yang sudah ada pada periode & jenis yang sama tidak akan terduplikasi.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Periode Bulan Tagihan</label>
                    <input
                      required
                      type="month"
                      value={generateForm.month}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, month: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface font-bold text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Jenis Tagihan / SPP</label>
                    <select
                      required
                      value={generateForm.payment_type_id}
                      onChange={(e) => handleGenerateTypeChange(e.target.value)}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface font-bold cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Jenis Tagihan --</option>
                      {paymentTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name} {pt.is_recurring ? '(SPP Rutin)' : ''} - Rp {Number(pt.amount || 0).toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Nominal Tagihan per Murid (Rp)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="1000"
                      value={generateForm.amount}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-black text-xl text-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Tanggal Jatuh Tempo</label>
                    <input
                      required
                      type="date"
                      value={generateForm.due_date}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                    />
                  </div>
                </div>

                {/* Target Students Selection */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-2">
                    <div>
                      <label className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" /> Target Murid ({generateForm.selectedStudentIds.length} dari {generateModalStudents.length} terpilih)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllFilteredStudents(generateModalStudents.map(s => s.id))}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-outline-variant">|</span>
                      <button
                        type="button"
                        onClick={() => deselectAllFilteredStudents(generateModalStudents.map(s => s.id))}
                        className="text-xs font-bold text-error hover:underline cursor-pointer"
                      >
                        Batal Semua
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        type="text"
                        placeholder="Cari murid dalam daftar..."
                        value={generateStudentSearch}
                        onChange={(e) => setGenerateStudentSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-outline-variant text-xs bg-surface text-on-surface focus:outline-none"
                      />
                    </div>
                    <select
                      value={generateForm.filterProgram}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, filterProgram: e.target.value }))}
                      className="text-xs font-bold p-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none cursor-pointer"
                    >
                      <option value="all">Semua Program</option>
                      <option value="les_ahe">Hanya Les AHE</option>
                      <option value="les_ase">Hanya Les ASE</option>
                      <option value="les_mapel">Hanya Les Mapel</option>
                    </select>
                  </div>

                  <div className="border border-outline-variant rounded-xl max-h-56 overflow-y-auto divide-y divide-surface-container bg-surface-container-lowest">
                    {generateModalStudents.map(s => {
                      const isSelected = generateForm.selectedStudentIds.includes(s.id);
                      const programs = (s.student_les || []).map((l: any) => l.les_type === 'les_ahe' ? 'AHE' : l.les_type === 'les_ase' ? 'ASE' : 'Mapel').join(', ');
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStudentSelection(s.id)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-on-surface-variant shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-on-surface truncate">{s.full_name}</p>
                              <p className="text-[11px] text-on-surface-variant">NIS: {s.nis || '-'} | Program: {programs || '-'}</p>
                            </div>
                          </div>
                          {s.registrations?.whatsapp && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold shrink-0">
                              WA Aktif
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {generateModalStudents.length === 0 && (
                      <div className="p-6 text-center text-xs text-on-surface-variant">
                        Tidak ada murid yang sesuai filter pencarian.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={generateLoading || generateForm.selectedStudentIds.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {generateLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CalendarPlus className="w-4 h-4" /> Buat {generateForm.selectedStudentIds.length} Tagihan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct WhatsApp Modal / Composer */}
      {isWaModalOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[480px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-[#25D366]/10">
              <h3 className="text-headline-sm font-headline-sm text-[#075E54] flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                {waData.type === 'reminder' ? 'Kirim Tagihan via WhatsApp' : 'Kirim Kwitansi Lunas via WhatsApp'}
              </h3>
              <button onClick={() => setIsWaModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-label-md font-bold text-on-surface">Nomor WhatsApp Wali ({waData.studentName})</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    value={waData.phone}
                    onChange={(e) => setWaData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none bg-surface text-on-surface font-bold"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">Nomor otomatis diformat ke format internasional (+62).</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-label-md font-bold text-on-surface">Format & Preview Pesan WhatsApp</label>
                  <button
                    type="button"
                    onClick={handleCopyWAMessage}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Salin Pesan
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={waData.message}
                  onChange={(e) => setWaData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-outline focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none bg-surface text-on-surface font-mono text-xs leading-relaxed"
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendDirectWA}
                className="px-6 py-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#1EBE5D] shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer font-bold"
              >
                <Send className="w-4 h-4" /> Buka WhatsApp Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Payment Type (Jenis Tagihan) Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[480px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                {typeModalMode === 'create' ? <><Plus className="w-5 h-5 text-primary"/> Tambah Jenis Tagihan Baru</> : <><Edit2 className="w-5 h-5 text-primary"/> Edit Jenis Tagihan & Tarif</>}
              </h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>

            <form onSubmit={handleSaveType} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Nama Jenis Tagihan / Pembayaran</label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: SPP Les AHE, Uang Pendaftaran, Kaos Les"
                    value={typeFormData.name}
                    onChange={(e) => setTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Tarif Standar / Nominal (Rp)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Contoh: 150000"
                    value={typeFormData.amount}
                    onChange={(e) => setTypeFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-bold text-xl text-on-surface"
                  />
                  <p className="text-[11px] text-on-surface-variant">Nominal ini akan otomatis terisi saat admin membuat tagihan baru untuk murid.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Program Les Terkait</label>
                  <select
                    value={typeFormData.les_type}
                    onChange={(e) => setTypeFormData(prev => ({ ...prev, les_type: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface cursor-pointer"
                  >
                    <option value="all">Semua Program / Tagihan Umum</option>
                    <option value="les_ahe">Les AHE (Membaca)</option>
                    <option value="les_ase">Les ASE (Hitung)</option>
                    <option value="les_mapel">Les Mapel (Mata Pelajaran)</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-label-md font-bold text-on-surface block">Siklus Pembayaran</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-on-surface">
                      <input
                        type="radio"
                        name="is_recurring"
                        checked={typeFormData.is_recurring === true}
                        onChange={() => setTypeFormData(prev => ({ ...prev, is_recurring: true }))}
                        className="text-primary focus:ring-primary cursor-pointer"
                      />
                      <span>Rutin Bulanan (SPP)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-on-surface">
                      <input
                        type="radio"
                        name="is_recurring"
                        checked={typeFormData.is_recurring === false}
                        onChange={() => setTypeFormData(prev => ({ ...prev, is_recurring: false }))}
                        className="text-primary focus:ring-primary cursor-pointer"
                      />
                      <span>Sekali Bayar / Non-Rutin</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={typeSaveLoading}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {typeSaveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Check className="w-4 h-4" /> {typeModalMode === 'create' ? 'Simpan Jenis Tagihan' : 'Perbarui Tarif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
