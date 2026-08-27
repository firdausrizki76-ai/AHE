"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Award, Plus, Search, Edit, Trash2, X, Loader2, Printer, Filter, Calendar, Users, Star, RotateCcw, BookOpen, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store";
import { formatDateIndo, getLocalDateString, getLocalMonthString } from "@/lib/dateUtils";

export default function GuruPrestasiPage() {
  const { user } = useAuthStore();
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'>('add');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter states
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [lesTypeFilter, setLesTypeFilter] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<'all' | 'month' | 'range'>("all");
  const [monthFilter, setMonthFilter] = useState<string>(getLocalMonthString());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Form states
  const [formData, setFormData] = useState({
    student_id: "",
    student_les_id: "",
    created_at: getLocalDateString(),
    module_page: "",
    topic: "",
    score: "",
    notes: ""
  });

  const fetchTeacherProfileAndData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch teacher profile
      const { data: teacher, error: tErr } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (tErr) throw tErr;

      setTeacherProfile(teacher);

      // 2. Fetch achievements scoped to teacher profile if found
      let query = supabase
        .from("achievements")
        .select(`
          *,
          students (id, full_name, nis),
          student_les (*)
        `);

      if (teacher) {
        query = query.eq("recorded_by", teacher.id);
      }

      const { data: achievementsData, error: achErr } = await query.order("created_at", { ascending: false });
      if (achErr) throw achErr;
      setAchievements(achievementsData || []);

      // 3. Fetch all active students
      const { data: studentsData, error: studentErr } = await supabase
        .from("students")
        .select("*, student_les(*)")
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (studentErr) throw studentErr;
      setStudents(studentsData || []);
    } catch (err: any) {
      toast.error("Gagal memuat data prestasi: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeacherProfileAndData();
  }, [fetchTeacherProfileAndData]);

  const getLesTypeLabel = (lesType: string) => {
    if (lesType === 'les_ahe') return 'AHE';
    if (lesType === 'les_ase') return 'ASE';
    if (lesType === 'les_mapel') return 'Mapel';
    return lesType || "Les";
  };

  const getStudentLesName = (les: any) => {
    if (!les) return "";
    let label = getLesTypeLabel(les.les_type);
    if (les.les_type === 'les_mapel') {
      label += ` (${les.les_mapel_name || ''})`;
    } else {
      label += ` Level ${les.current_level}`;
    }
    return label;
  };

  const filteredAchievements = useMemo(() => {
    return achievements.filter(item => {
      // 1. Student filter
      if (studentFilter !== "all" && item.student_id !== studentFilter) {
        return false;
      }

      // 2. Program Les filter
      if (lesTypeFilter !== "all" && item.les_type !== lesTypeFilter) {
        return false;
      }

      // 3. Date / Month filter
      const itemDate = (item.created_at || "").substring(0, 10);
      if (dateFilterType === "month" && monthFilter) {
        if (!itemDate.startsWith(monthFilter)) return false;
      } else if (dateFilterType === "range") {
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // 4. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentName = (item.students?.full_name || "").toLowerCase();
        const topic = (item.topic || "").toLowerCase();
        const modPage = (item.module_page || "").toLowerCase();
        const notes = (item.notes || "").toLowerCase();
        if (!studentName.includes(q) && !topic.includes(q) && !modPage.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [achievements, studentFilter, lesTypeFilter, dateFilterType, monthFilter, startDate, endDate, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAchievements.length;
    if (total === 0) {
      return { total: 0, avg: 0, highest: 0, lowest: 0, count100: 0 };
    }
    const scores = filteredAchievements.map(a => Number(a.score || 0));
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / total);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const count100 = scores.filter(s => s === 100).length;
    return { total, avg, highest, lowest, count100 };
  }, [filteredAchievements]);

  const resetFilters = () => {
    setStudentFilter("all");
    setLesTypeFilter("all");
    setDateFilterType("all");
    setMonthFilter(getLocalMonthString());
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  const isFilterActive = studentFilter !== "all" || lesTypeFilter !== "all" || dateFilterType !== "all" || searchQuery !== "";

  // Print Rekapan Prestasi Function
  const handlePrintRekapan = () => {
    if (filteredAchievements.length === 0) {
      toast.error("Tidak ada data prestasi yang sesuai untuk dicetak!");
      return;
    }

    const selectedStudentObj = studentFilter !== "all" ? students.find(s => s.id === studentFilter) : null;
    const studentNameLabel = selectedStudentObj ? selectedStudentObj.full_name : "Seluruh Murid";

    let periodLabel = "Seluruh Waktu";
    if (dateFilterType === "month" && monthFilter) {
      const [y, m] = monthFilter.split("-");
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      periodLabel = `Bulan ${monthNames[parseInt(m, 10) - 1]} ${y}`;
    } else if (dateFilterType === "range") {
      if (startDate && endDate) {
        periodLabel = `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;
      } else if (startDate) {
        periodLabel = `Mulai ${formatDateIndo(startDate)}`;
      } else if (endDate) {
        periodLabel = `Sampai ${formatDateIndo(endDate)}`;
      }
    }

    let programLabel = "Semua Program";
    if (lesTypeFilter === "les_ahe") programLabel = "Les AHE (Membaca)";
    else if (lesTypeFilter === "les_ase") programLabel = "Les ASE (Hitung)";
    else if (lesTypeFilter === "les_mapel") programLabel = "Les Mapel";

    const printDateStr = formatDateIndo(new Date());
    const teacherName = teacherProfile?.full_name || "Tentor / Guru Pengampu";

    const tableRows = filteredAchievements.map((item, idx) => {
      const dateStr = formatDateIndo(item.created_at);
      const studentName = item.students?.full_name || "-";
      const programInfo = getStudentLesName(item.student_les) || getLesTypeLabel(item.les_type);
      const modPage = item.module_page || "-";
      const topic = item.topic || "-";
      const score = item.score !== null && item.score !== undefined ? Number(item.score) : "-";
      const notes = item.notes || "-";

      return `
        <tr>
          <td style="text-align: center; padding: 7px 5px; border: 1px solid #cbd5e1; font-size: 9pt;">${idx + 1}</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; white-space: nowrap; font-size: 9pt;">${dateStr}</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 9.5pt;">${studentName}</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-size: 9pt;">${programInfo}</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-size: 9pt;">${modPage}</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-size: 9pt;">${topic}</td>
          <td style="text-align: center; padding: 7px 5px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 11pt; color: #1e40af;">${score}</td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-size: 8.5pt; color: #334155;">${notes}</td>
        </tr>
      `;
    }).join("");

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Rekapitulasi Prestasi Murid - ${periodLabel}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 12mm 15mm;
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #0f172a;
                margin: 0;
                padding: 0;
                font-size: 9.5pt;
                line-height: 1.35;
              }
              .header-box {
                text-align: center;
                border-bottom: 3px double #0f172a;
                padding-bottom: 8px;
                margin-bottom: 14px;
              }
              .main-title {
                font-size: 17pt;
                font-weight: 900;
                letter-spacing: 0.8px;
                color: #1e3a8a;
                margin: 0;
              }
              .subtitle {
                font-size: 10.5pt;
                font-weight: 600;
                color: #334155;
                margin-top: 2px;
              }
              .address {
                font-size: 8.5pt;
                color: #64748b;
                margin-top: 2px;
              }
              .doc-heading {
                text-align: center;
                font-size: 12.5pt;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 12px 0 10px 0;
                color: #0f172a;
              }
              .filter-info-bar {
                display: flex;
                justify-content: space-between;
                background-color: #f1f5f9;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                padding: 8px 14px;
                margin-bottom: 12px;
                font-size: 9pt;
              }
              .stats-cards {
                display: flex;
                gap: 10px;
                margin-bottom: 14px;
              }
              .stat-item {
                flex: 1;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 6px 10px;
                text-align: center;
              }
              .stat-item-label {
                font-size: 7.5pt;
                font-weight: 700;
                text-transform: uppercase;
                color: #64748b;
              }
              .stat-item-val {
                font-size: 13pt;
                font-weight: 800;
                color: #0f172a;
                margin-top: 1px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 18px;
              }
              th {
                background-color: #1e293b;
                color: #ffffff;
                font-size: 8.5pt;
                font-weight: 700;
                padding: 8px 6px;
                border: 1px solid #1e293b;
                text-align: left;
              }
              th.center { text-align: center; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .sig-section {
                margin-top: 25px;
                display: flex;
                justify-content: flex-end;
                page-break-inside: avoid;
              }
              .sig-card {
                text-align: center;
                width: 230px;
                font-size: 9.5pt;
              }
              .sig-space { height: 60px; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="header-box">
              <div class="main-title">ANAK HEBAT (AHE) TEPUS WETAN</div>
              <div class="subtitle">Pusat Belajar Membaca (AHE), Berhitung (ASE) & Pendampingan Mapel</div>
              <div class="address">Tepus Wetan, Kec. Kebumen | Telp / WhatsApp: 0812-XXXX-XXXX</div>
            </div>

            <div class="doc-heading">REKAPITULASI PRESTASI & PERKEMBANGAN NILAI SISWA</div>

            <div class="filter-info-bar">
              <div><strong>Periode:</strong> ${periodLabel}</div>
              <div><strong>Murid:</strong> ${studentNameLabel}</div>
              <div><strong>Program:</strong> ${programLabel}</div>
              <div><strong>Tanggal Cetak:</strong> ${printDateStr}</div>
            </div>

            <div class="stats-cards">
              <div class="stat-item">
                <div class="stat-item-label">Total Penilaian</div>
                <div class="stat-item-val">${stats.total} Data</div>
              </div>
              <div class="stat-item">
                <div class="stat-item-label">Rata-Rata Nilai</div>
                <div class="stat-item-val" style="color: #2563eb;">${stats.avg} / 100</div>
              </div>
              <div class="stat-item">
                <div class="stat-item-label">Nilai Tertinggi</div>
                <div class="stat-item-val" style="color: #16a34a;">${stats.total > 0 ? stats.highest : '-'}</div>
              </div>
              <div class="stat-item">
                <div class="stat-item-label">Nilai Terendah</div>
                <div class="stat-item-val" style="color: #dc2626;">${stats.total > 0 ? stats.lowest : '-'}</div>
              </div>
              <div class="stat-item">
                <div class="stat-item-label">Nilai Sempurna (100)</div>
                <div class="stat-item-val" style="color: #ca8a04;">${stats.count100} Kali</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="center" style="width: 32px;">No</th>
                  <th style="width: 90px;">Tanggal</th>
                  <th>Nama Murid</th>
                  <th>Program / Level</th>
                  <th>Modul & Halaman</th>
                  <th>Materi Pokok</th>
                  <th class="center" style="width: 48px;">Nilai</th>
                  <th>Catatan Tentor</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <div class="sig-section">
              <div class="sig-card">
                <div>Tepus Wetan, ${printDateStr}</div>
                <div>Tentor / Guru Pengampu</div>
                <div class="sig-space"></div>
                <div style="font-weight: bold; text-decoration: underline;">( ${teacherName} )</div>
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const openModal = (mode: 'add'|'edit', item: any = null) => {
    setModalMode(mode);
    if (mode === 'add') {
      const defaultStudent = studentFilter !== "all" 
        ? students.find(s => s.id === studentFilter) || students[0]
        : students[0];
      const firstLes = defaultStudent?.student_les?.[0];
      setFormData({
        student_id: defaultStudent?.id || "",
        student_les_id: firstLes?.id || "",
        created_at: getLocalDateString(),
        module_page: "",
        topic: "",
        score: "",
        notes: ""
      });
      setSelectedId(null);
    } else if (mode === 'edit' && item) {
      setSelectedId(item.id);
      setFormData({
        student_id: item.student_id,
        student_les_id: item.student_les_id || "",
        created_at: item.created_at ? item.created_at.substring(0, 10) : getLocalDateString(),
        module_page: item.module_page || "",
        topic: item.topic || "",
        score: item.score?.toString() || "",
        notes: item.notes || ""
      });
    }
    setIsModalOpen(true);
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const lesList = student?.student_les || [];
    setFormData(prev => ({
      ...prev,
      student_id: studentId,
      student_les_id: lesList.length > 0 ? lesList[0].id : ""
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const selectedStudent = students.find(s => s.id === formData.student_id);
      const selectedLes = selectedStudent?.student_les?.find((l: any) => l.id === formData.student_les_id);

      if (!selectedLes) {
        throw new Error("Murid belum terdaftar atau belum memilih program les");
      }

      const scoreNum = parseFloat(formData.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        throw new Error("Nilai angka harus antara 0 sampai 100");
      }

      const payload = {
        student_id: formData.student_id,
        student_les_id: formData.student_les_id,
        les_type: selectedLes.les_type,
        level: selectedLes.current_level,
        module_page: formData.module_page.trim(),
        topic: formData.topic.trim(),
        score: scoreNum,
        notes: formData.notes.trim() || null,
        created_at: new Date(`${formData.created_at}T12:00:00`).toISOString(),
        recorded_by: teacherProfile?.id || null
      };

      if (modalMode === 'add') {
        const { error } = await supabase
          .from("achievements")
          .insert(payload);
        if (error) throw error;
        toast.success("Data nilai berhasil ditambahkan!");
      } else {
        const { error } = await supabase
          .from("achievements")
          .update(payload)
          .eq("id", selectedId!);
        if (error) throw error;
        toast.success("Data nilai berhasil diperbarui!");
      }

      setIsModalOpen(false);
      fetchTeacherProfileAndData();
    } catch (err: any) {
      toast.error("Gagal menyimpan data nilai: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data nilai ini?")) return;
    try {
      const { error } = await supabase
        .from("achievements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Data nilai berhasil dihapus!");
      fetchTeacherProfileAndData();
    } catch (err: any) {
      toast.error("Gagal menghapus data nilai: " + err.message);
    }
  };

  const selectedStudentObj = students.find(s => s.id === formData.student_id);
  const studentLesList = selectedStudentObj?.student_les || [];

  return (
    <div className="space-y-6 font-body-md relative">
      {/* Header Title & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Data Prestasi & Nilai</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Catat nilai harian murid bimbingan Anda, filter periode, dan cetak laporan hasil belajar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handlePrintRekapan}
            disabled={filteredAchievements.length === 0}
            className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-5 py-3 rounded-xl font-headline-sm hover:bg-secondary-container/80 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-5 h-5" /> Cetak Rekapan ({filteredAchievements.length})
          </button>
          <button 
            onClick={() => openModal('add')} 
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Input Nilai Baru
          </button>
        </div>
      </div>

      {/* Summary Bento Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Penilaian</p>
            <h4 className="text-headline-md font-black text-on-surface mt-0.5">{stats.total}</h4>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rata-Rata Nilai</p>
            <h4 className="text-headline-md font-black text-blue-600 mt-0.5">{stats.avg} <span className="text-xs text-on-surface-variant font-normal">/ 100</span></h4>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nilai Tertinggi</p>
            <h4 className="text-headline-md font-black text-emerald-600 mt-0.5">{stats.total > 0 ? stats.highest : 0}</h4>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nilai 100 Sempurna</p>
            <h4 className="text-headline-md font-black text-amber-600 mt-0.5">{stats.count100} <span className="text-xs text-on-surface-variant font-normal">kali</span></h4>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        {/* Comprehensive Filter Toolbar */}
        <div className="p-4 border-b border-surface-container bg-surface-container-lowest flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Filter & Riwayat Nilai Murid
            </h3>

            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-error bg-error/10 hover:bg-error/20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Filter Murid */}
            <div className="lg:col-span-4 flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-outline-variant shadow-xs">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Filter Murid:</span>
                <select
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-on-surface focus:outline-none truncate cursor-pointer"
                >
                  <option value="all">Semua Murid Aktif ({students.length})</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.nis ? `(${s.nis})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Tanggal Mode Selector */}
            <div className="lg:col-span-4 flex flex-col gap-1">
              <div className="flex items-center gap-1 bg-surface px-3 py-2 rounded-xl border border-outline-variant shadow-xs">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Periode Tanggal:</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value as any)}
                      className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
                    >
                      <option value="all">Semua Waktu</option>
                      <option value="month">Per Bulan</option>
                      <option value="range">Rentang Tanggal</option>
                    </select>

                    {dateFilterType === "month" && (
                      <input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="bg-surface-container px-2 py-0.5 rounded text-xs font-bold text-on-surface focus:outline-none border border-outline-variant"
                      />
                    )}
                  </div>
                </div>
              </div>

              {dateFilterType === "range" && (
                <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-outline-variant text-xs">
                  <span className="text-on-surface-variant font-medium">Dari:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
                  />
                  <span className="text-on-surface-variant font-medium">s/d:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Filter Program Les */}
            <div className="lg:col-span-2 flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-outline-variant shadow-xs">
              <Filter className="w-4 h-4 text-on-surface-variant shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Program Les:</span>
                <select
                  value={lesTypeFilter}
                  onChange={(e) => setLesTypeFilter(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-on-surface focus:outline-none truncate cursor-pointer"
                >
                  <option value="all">Semua Program</option>
                  <option value="les_ahe">Les AHE (Baca)</option>
                  <option value="les_ase">Les ASE (Hitung)</option>
                  <option value="les_mapel">Les Mapel</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Cari materi / modul..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-xs font-medium bg-surface text-on-surface shadow-xs"
              />
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold text-body-md">Memuat data prestasi...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Modul & Materi</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-center">Nilai</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Catatan</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAchievements.map((item) => (
                  <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface whitespace-nowrap font-medium text-sm">
                      {formatDateIndo(item.created_at)}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-on-surface text-base">{item.students?.full_name}</div>
                      <div className="text-body-sm text-on-surface-variant">
                        {getStudentLesName(item.student_les)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{item.module_page || "-"}</div>
                      <div className="text-body-sm text-on-surface-variant">{item.topic || "-"}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-11 px-3 py-1 rounded-full text-headline-sm font-black shadow-sm ${
                        Number(item.score) === 100 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : Number(item.score) >= 80 
                          ? 'bg-primary-container text-on-primary-container' 
                          : 'bg-error-container text-on-error-container'
                      }`}>
                        {item.score}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant max-w-[220px] truncate" title={item.notes || ""}>
                      {item.notes || "-"}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1">
                      <button 
                        onClick={() => openModal('edit', item)} 
                        className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary cursor-pointer inline-block"
                        title="Edit Nilai"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-error cursor-pointer inline-block"
                        title="Hapus Nilai"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAchievements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-on-surface-variant">
                      <p className="font-bold text-base text-on-surface">Tidak ada data prestasi yang sesuai filter.</p>
                      <p className="text-xs text-on-surface-variant mt-1">Coba ubah filter murid, periode tanggal, atau klik "Reset Semua Filter".</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nilai Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                {modalMode === 'add' ? 'Input Nilai Baru' : 'Edit Data Nilai'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Pilih Murid</label>
                    <select 
                      required
                      value={formData.student_id}
                      onChange={(e) => handleStudentChange(e.target.value)}
                      disabled={modalMode === 'edit'}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                    >
                      <option value="" disabled>-- Pilih Murid --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} {s.nis ? `(${s.nis})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Program Les Murid</label>
                    <select 
                      required
                      value={formData.student_les_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_les_id: e.target.value }))}
                      disabled={modalMode === 'edit'}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                    >
                      <option value="" disabled>-- Pilih Program Les --</option>
                      {studentLesList.map((les: any) => (
                        <option key={les.id} value={les.id}>{getStudentLesName(les)}</option>
                      ))}
                    </select>
                    {studentLesList.length === 0 && formData.student_id && (
                      <p className="text-error text-body-sm mt-1">Murid belum terdaftar di program les apapun.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Tanggal Penilaian</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.created_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, created_at: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Modul & Halaman</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Contoh: Modul 3 / Halaman 15" 
                      value={formData.module_page}
                      onChange={(e) => setFormData(prev => ({ ...prev, module_page: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Materi Pokok</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Contoh: Membaca Suku Kata BA-BI-BU" 
                      value={formData.topic}
                      onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Nilai Angka (0-100)</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="100" 
                      value={formData.score}
                      onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-black text-2xl text-center text-primary" 
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-label-md font-bold text-on-surface">Catatan Perkembangan / Komentar Tentor</label>
                    <textarea 
                      placeholder="Contoh: Ananda sudah lancar membaca suku kata gabungan, artikulasi jelas..." 
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading || (modalMode === 'add' && studentLesList.length === 0)}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'add' ? 'Simpan Data Nilai' : 'Perbarui Data Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
