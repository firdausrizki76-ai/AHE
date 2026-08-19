"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { Users, User, CheckCircle, XCircle, Clock, Star, Loader2, Save, LogIn, LogOut, QrCode, Camera, BarChart3, History, Printer, Filter, Calendar, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { getLocalDateString, getLocalMonthString, formatDateIndo } from "@/lib/dateUtils";
import BarcodeCardModal from "@/components/attendance/BarcodeCardModal";
import BarcodeScannerModal from "@/components/attendance/BarcodeScannerModal";

export default function GuruAbsenPage() {
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'harian' | 'rekap' | 'riwayat'>('harian');
  const [activeTab, setActiveTab] = useState<'murid' | 'saya'>('murid');
  const [date, setDate] = useState(() => getLocalDateString());
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeModalType, setBarcodeModalType] = useState<'siswa' | 'guru'>('siswa');
  const [manualCodeInput, setManualCodeInput] = useState("");

  // State Rekap Absensi
  const [rekapMonth, setRekapMonth] = useState(() => getLocalMonthString());
  const [rekapStudentAtt, setRekapStudentAtt] = useState<any[]>([]);
  const [rekapTeacherAtt, setRekapTeacherAtt] = useState<any[]>([]);
  const [rekapSearch, setRekapSearch] = useState("");
  const [rekapLoading, setRekapLoading] = useState(false);

  // State Riwayat Absensi
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => getLocalDateString());
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "hadir" | "izin" | "alpha">("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStudentAtt, setHistoryStudentAtt] = useState<any[]>([]);
  const [historyTeacherAtt, setHistoryTeacherAtt] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterStatusSiswa, setFilterStatusSiswa] = useState<'active' | 'inactive' | 'all'>('active');

  // Data lists
  const [students, setStudents] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  
  // UI states
  const [muridData, setMuridData] = useState<any[]>([]);
  const [myAttendance, setMyAttendance] = useState({
    id: null as string | null,
    status: "belum", // 'hadir' | 'izin' | 'alpha' | 'sakit' | 'belum'
    timeIn: "-",
    timeOut: "-",
    notes: "",
    originalStatus: "belum"
  });

  const getLesProgramInfo = (student: any) => {
    const studentLesList = student.student_les || [];
    if (studentLesList.length === 0) return "Belum terdaftar";
    const programInfo = studentLesList.map((les: any) => {
      let typeLabel = "";
      if (les.les_type === "les_ahe") typeLabel = `AHE Lvl ${les.current_level}`;
      else if (les.les_type === "les_ase") typeLabel = `ASE Lvl ${les.current_level}`;
      else if (les.les_type === "les_mapel") typeLabel = `Mapel (${les.les_mapel_name || ""})`;
      return typeLabel;
    }).join(", ");

    const className = student.class_members?.[0]?.classes?.name;
    if (className) {
      return `${programInfo} (${className})`;
    }
    return `${programInfo} (Belum masuk kelas)`;
  };

  const getPrimaryLesType = (studentLesList: any[]) => {
    if (!studentLesList || studentLesList.length === 0) return null;
    return studentLesList[0].les_type;
  };

  const fetchData = useCallback(async () => {
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

      // Fallback removed — teacher must be properly linked via user_id
      setTeacherProfile(teacher);

      // 2. Fetch all students
      const { data: studentsData, error: studentErr } = await supabase
        .from("students")
        .select("*, student_les(*), class_members(classes(name))")
        .order("full_name", { ascending: true });
      if (studentErr) throw studentErr;
      setStudents(studentsData || []);

      // 3. Fetch student attendance for selected date
      const { data: studentAttData, error: studentAttErr } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("date", date);
      if (studentAttErr) throw studentAttErr;
      setStudentAttendance(studentAttData || []);

      // 4. Fetch self attendance for selected date
      if (teacher) {
        const { data: myAtt, error: myAttErr } = await supabase
          .from("teacher_attendance")
          .select("*")
          .eq("teacher_id", teacher.id)
          .eq("date", date)
          .maybeSingle();

        if (!myAttErr && myAtt) {
          setMyAttendance({
            id: myAtt.id,
            status: myAtt.status,
            timeIn: myAtt.check_in_time || "-",
            timeOut: myAtt.check_out_time || "-",
            notes: myAtt.notes || "",
            originalStatus: myAtt.status
          });
        } else {
          setMyAttendance({
            id: null,
            status: "belum",
            timeIn: "-",
            timeOut: "-",
            notes: "",
            originalStatus: "belum"
          });
        }
      }
    } catch (err: any) {
      toast.error("Gagal memuat data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchRekapData = useCallback(async () => {
    setRekapLoading(true);
    try {
      const startDay = `${rekapMonth}-01`;
      const endDay = `${rekapMonth}-31`;
      const { data: sAtt, error: sErr } = await supabase
        .from("student_attendance")
        .select("*")
        .gte("date", startDay)
        .lte("date", endDay);
      if (sErr) throw sErr;
      setRekapStudentAtt(sAtt || []);

      if (teacherProfile?.id) {
        const { data: tAtt, error: tErr } = await supabase
          .from("teacher_attendance")
          .select("*")
          .eq("teacher_id", teacherProfile.id)
          .gte("date", startDay)
          .lte("date", endDay);
        if (tErr) throw tErr;
        setRekapTeacherAtt(tAtt || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat rekap: " + err.message);
    } finally {
      setRekapLoading(false);
    }
  }, [rekapMonth, teacherProfile]);

  useEffect(() => {
    if (viewMode === "rekap") {
      fetchRekapData();
    }
  }, [viewMode, fetchRekapData]);

  const fetchHistoryData = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data: sAtt, error: sErr } = await supabase
        .from("student_attendance")
        .select("*, students(full_name, nis, student_les(*), class_members(classes(name)))")
        .gte("date", historyStartDate)
        .lte("date", historyEndDate)
        .order("date", { ascending: false });
      if (sErr) throw sErr;
      setHistoryStudentAtt(sAtt || []);

      if (teacherProfile?.id) {
        const { data: tAtt, error: tErr } = await supabase
          .from("teacher_attendance")
          .select("*, teachers(full_name, nip, position)")
          .eq("teacher_id", teacherProfile.id)
          .gte("date", historyStartDate)
          .lte("date", historyEndDate)
          .order("date", { ascending: false });
        if (tErr) throw tErr;
        setHistoryTeacherAtt(tAtt || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat riwayat: " + err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyStartDate, historyEndDate, teacherProfile]);

  useEffect(() => {
    if (viewMode === "riwayat") {
      fetchHistoryData();
    }
  }, [viewMode, fetchHistoryData]);

  // Sync muridData list
  useEffect(() => {
    setMuridData(
      students.map(s => {
        const att = studentAttendance.find(a => a.student_id === s.id);
        return {
          id: s.id,
          name: s.full_name,
          class: getLesProgramInfo(s),
          les_type: getPrimaryLesType(s.student_les),
          status: att ? att.status : 'belum',
          attendanceId: att ? att.id : null,
          originalStatus: att ? att.status : 'belum',
          studentStatus: s.status || 'active',
        };
      })
    );
  }, [students, studentAttendance]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setMuridData(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
  };

  const handleSelfStatusChange = (status: string) => {
    setMyAttendance(prev => ({
      ...prev,
      status,
      timeIn: status === 'hadir' ? (prev.timeIn === '-' ? new Date().toTimeString().split(' ')[0] : prev.timeIn) : '-',
      timeOut: status === 'hadir' ? prev.timeOut : '-'
    }));
  };

  const handleCheckInNow = () => {
    const nowTime = new Date().toTimeString().split(' ')[0];
    setMyAttendance(prev => ({
      ...prev,
      status: "hadir",
      timeIn: nowTime
    }));
    toast.success(`Check-In dicatat: Jam ${nowTime.substring(0, 5)}`);
  };

  const handleCheckOutNow = () => {
    const nowTime = new Date().toTimeString().split(' ')[0];
    setMyAttendance(prev => ({
      ...prev,
      timeOut: nowTime
    }));
    toast.success(`Check-Out dicatat: Jam ${nowTime.substring(0, 5)}`);
  };

  const saveStudentAttendance = async () => {
    setSaveLoading(true);
    try {
      let savedCount = 0;
      let pointsAdded = 0;

      for (const item of muridData) {
        if (item.status === 'belum') {
          // Unchecked, delete if previously checked
          if (item.attendanceId) {
            const { error: delErr } = await supabase
              .from("student_attendance")
              .delete()
              .eq("id", item.attendanceId);
            if (delErr) throw delErr;

            if (item.originalStatus === 'hadir') {
              // Decrement points
              const { data: txs } = await supabase
                .from("point_transactions")
                .select("id")
                .eq("attendance_id", item.attendanceId);
              if (txs && txs.length > 0) {
                await supabase.from("point_transactions").delete().eq("id", txs[0].id);
              }
              const { data: pts } = await supabase
                .from("student_points")
                .select("total_points")
                .eq("student_id", item.id)
                .single();
              if (pts) {
                await supabase
                  .from("student_points")
                  .update({ total_points: Math.max(0, (pts.total_points || 0) - 1) })
                  .eq("student_id", item.id);
              }
            }
          }
          continue;
        }

        if (!item.attendanceId) {
          // Insert new record — use upsert to handle constraint
          const { error: insErr } = await supabase
            .from("student_attendance")
            .upsert({
              student_id: item.id,
              date: date,
              status: item.status,
              les_type: item.les_type
            }, { onConflict: 'student_id,date' });
          if (insErr) throw insErr;
          if (item.status === 'hadir') {
            pointsAdded++;
          }
          savedCount++;
        } else if (item.status !== item.originalStatus) {
          // Update existing record
          const { error: updErr } = await supabase
            .from("student_attendance")
            .update({ status: item.status, points_earned: item.status === 'hadir' ? 1 : 0 })
            .eq("id", item.attendanceId);
          if (updErr) throw updErr;

          // Reconcile points
          if (item.originalStatus === 'hadir' && item.status !== 'hadir') {
            // Deduct points
            const { data: txs } = await supabase
              .from("point_transactions")
              .select("id")
              .eq("attendance_id", item.attendanceId);
            if (txs && txs.length > 0) {
              await supabase.from("point_transactions").delete().eq("id", txs[0].id);
            }
            const { data: pts } = await supabase
              .from("student_points")
              .select("total_points")
              .eq("student_id", item.id)
              .single();
            if (pts) {
              await supabase
                .from("student_points")
                .update({ total_points: Math.max(0, (pts.total_points || 0) - 1) })
                .eq("student_id", item.id);
            }
          } else if (item.originalStatus !== 'hadir' && item.status === 'hadir') {
            // Add points
            const { data: pts } = await supabase
              .from("student_points")
              .select("total_points")
              .eq("student_id", item.id)
              .single();
            const currentPts = pts ? (pts.total_points || 0) : 0;
            await supabase
              .from("student_points")
              .update({ total_points: currentPts + 1 })
              .eq("student_id", item.id);
            await supabase
              .from("point_transactions")
              .insert({
                student_id: item.id,
                type: "earn",
                points: 1,
                description: "Poin kehadiran",
                attendance_id: item.attendanceId
              });
            pointsAdded++;
          }
          savedCount++;
        }
      }

      toast.success(`Absensi murid disimpan! ${savedCount} data diproses. (+${pointsAdded} Poin Bintang diberikan)`);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menyimpan absensi murid: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const saveSelfAttendance = async () => {
    if (!teacherProfile) {
      toast.error("Profil guru tidak terdeteksi");
      return;
    }
    setSaveLoading(true);

    try {
      if (myAttendance.status === 'belum') {
        if (myAttendance.id) {
          const { error } = await supabase
            .from("teacher_attendance")
            .delete()
            .eq("id", myAttendance.id);
          if (error) throw error;
        }
        toast.success("Kehadiran mandiri dikosongkan.");
      } else {
        const payload = {
          teacher_id: teacherProfile.id,
          date: date,
          status: myAttendance.status,
          check_in_time: myAttendance.timeIn === '-' ? null : myAttendance.timeIn,
          check_out_time: myAttendance.timeOut === '-' ? null : myAttendance.timeOut,
          notes: myAttendance.notes
        };

        if (!myAttendance.id) {
          const { error } = await supabase
            .from("teacher_attendance")
            .insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("teacher_attendance")
            .update(payload)
            .eq("id", myAttendance.id);
          if (error) throw error;
        }
        toast.success("Absensi mandiri berhasil disimpan!");
      }
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menyimpan absensi mandiri: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleBarcodeScan = async (scannedCode: string) => {
    if (!scannedCode || !scannedCode.trim()) return;
    const cleanCode = scannedCode.trim().toUpperCase();

    // 1. Check if it's a teacher (TCH-{id} or NIP or ID)
    if (
      cleanCode.startsWith("TCH-") ||
      cleanCode === teacherProfile?.id?.toUpperCase() ||
      cleanCode === teacherProfile?.nip?.toUpperCase()
    ) {
      const nowTime = new Date().toTimeString().split(" ")[0];
      setMyAttendance((prev) => ({
        ...prev,
        status: "hadir",
        timeIn: prev.timeIn === "-" ? nowTime : prev.timeIn,
      }));
      try {
        const payload = {
          teacher_id: teacherProfile.id,
          date: date,
          status: "hadir",
          check_in_time: myAttendance.timeIn === "-" ? nowTime : myAttendance.timeIn,
          check_out_time: myAttendance.timeOut === "-" ? null : myAttendance.timeOut,
          notes: myAttendance.notes,
        };
        await supabase
          .from("teacher_attendance")
          .upsert(payload, { onConflict: "teacher_id,date" });
        toast.success(`✅ Absen Guru "${teacherProfile.full_name}" BERHASIL HADIR!`);
        fetchData();
      } catch (err: any) {
        toast.error("Gagal mencatat absen guru: " + err.message);
      }
      return;
    }

    // 2. Check if it's a student (STU-{id} or NIS or ID)
    const student = students.find(
      (s) =>
        `STU-${s.id}`.toUpperCase() === cleanCode ||
        s.id.toUpperCase() === cleanCode ||
        (s.nis && s.nis.toUpperCase() === cleanCode)
    );

    if (!student) {
      toast.error(`❌ Kode barcode tidak terdaftar: ${scannedCode}`);
      return;
    }

    const currentItem = muridData.find((m) => m.id === student.id);
    if (currentItem && currentItem.status === "hadir") {
      toast.info(`ℹ️ Siswa ${student.full_name} sudah tercatat Hadir hari ini.`);
      return;
    }

    try {
      const { data: upserted, error: insErr } = await supabase
        .from("student_attendance")
        .upsert(
          {
            student_id: student.id,
            date: date,
            status: "hadir",
            les_type: getPrimaryLesType(student.student_les) || "les_ahe",
          },
          { onConflict: "student_id,date" }
        )
        .select()
        .single();

      if (insErr) throw insErr;

      setMuridData((prev) =>
        prev.map((m) =>
          m.id === student.id
            ? { ...m, status: "hadir", attendanceId: upserted?.id || m.attendanceId }
            : m
        )
      );
      toast.success(`🎉 ${student.full_name} BERHASIL HADIR! (+1 Poin Bintang)`);
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal mencatat kehadiran ${student.full_name}: ` + err.message);
    }
  };

  // Compute Rekap List for Murid
  const muridRekapList = students
    .map((s) => {
      const sAtts = rekapStudentAtt.filter((a) => a.student_id === s.id);
      const hadirCount = sAtts.filter((a) => a.status === "hadir").length;
      const izinCount = sAtts.filter((a) => a.status === "izin").length;
      const alphaCount = sAtts.filter((a) => a.status === "alpha").length;
      const totalDays = hadirCount + izinCount + alphaCount;
      const percentage = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 0;
      return {
        id: s.id,
        name: s.full_name,
        nis: s.nis || "-",
        program: getLesProgramInfo(s),
        hadir: hadirCount,
        izin: izinCount,
        alpha: alphaCount,
        totalDays,
        percentage,
      };
    })
    .filter((item) =>
      item.name.toLowerCase().includes(rekapSearch.toLowerCase()) ||
      item.nis.toLowerCase().includes(rekapSearch.toLowerCase()) ||
      item.program.toLowerCase().includes(rekapSearch.toLowerCase())
    );

  // Compute Rekap List for Saya (Guru)
  const sayaRekapList = teacherProfile
    ? [
        (() => {
          const tAtts = rekapTeacherAtt;
          const hadirCount = tAtts.filter((a) => a.status === "hadir").length;
          const izinCount = tAtts.filter((a) => a.status === "izin").length;
          const alphaCount = tAtts.filter((a) => a.status === "alpha").length;
          const totalDays = hadirCount + izinCount + alphaCount;
          const percentage = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 0;
          return {
            id: teacherProfile.id,
            name: teacherProfile.full_name,
            nip: teacherProfile.nip || "-",
            position: teacherProfile.position || "Guru",
            hadir: hadirCount,
            izin: izinCount,
            alpha: alphaCount,
            totalDays,
            percentage,
          };
        })(),
      ]
    : [];

  // Compute Filtered History List
  const filteredHistoryList = (activeTab === "murid" ? historyStudentAtt : historyTeacherAtt).filter((item) => {
    const name = activeTab === "murid"
      ? (item.students?.full_name || "")
      : (item.teachers?.full_name || "");
    const matchSearch = name.toLowerCase().includes(historySearch.toLowerCase());
    const matchStatus = historyStatusFilter === "all" || item.status === historyStatusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate stats for Rekap Bulanan
  const currentRekapList = activeTab === "murid" ? muridRekapList : sayaRekapList;
  const totalRekapHadir = currentRekapList.reduce((sum, i) => sum + i.hadir, 0);
  const totalRekapIzin = currentRekapList.reduce((sum, i) => sum + i.izin, 0);
  const totalRekapAlpha = currentRekapList.reduce((sum, i) => sum + i.alpha, 0);
  const avgRekapPercentage = currentRekapList.length > 0
    ? Math.round(currentRekapList.reduce((sum, i) => sum + i.percentage, 0) / currentRekapList.length)
    : 0;

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Absen Kelas & Mengajar</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Lakukan absensi murid kelas AHE/ASE/Mapel dan absensi mandiri mengajar via Scan Barcode.</p>
      </div>

      {/* Top Level Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-2 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode("harian")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              viewMode === "harian"
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <QrCode className="w-4 h-4" />
            Absensi Harian & Scan
          </button>
          <button
            onClick={() => setViewMode("rekap")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              viewMode === "rekap"
                ? "bg-primary text-on-primary shadow-md"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Rekap Absensi (Bulanan)
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
            History / Riwayat Absensi
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <button
            onClick={() => {
              setBarcodeModalType("siswa");
              setIsBarcodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
          >
            <QrCode className="h-3.5 w-3.5" /> Cetak Kartu Siswa
          </button>
          <button
            onClick={() => {
              setBarcodeModalType("guru");
              setIsBarcodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
          >
            <QrCode className="h-3.5 w-3.5" /> Kartu Saya
          </button>
        </div>
      </div>

      {viewMode === "rekap" && (
        <div className="space-y-6">
          {/* Rekap Toolbar */}
          <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-surface p-4 rounded-2xl border border-outline-variant shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex bg-surface-container-lowest p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("murid")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    activeTab === "murid"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Users className="w-4 h-4" /> Rekap Murid
                </button>
                <button
                  onClick={() => setActiveTab("saya")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    activeTab === "saya"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <User className="w-4 h-4" /> Rekap Saya
                </button>
              </div>

              <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-outline-variant">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-on-surface-variant">Bulan:</span>
                <input
                  type="month"
                  value={rekapMonth}
                  onChange={(e) => setRekapMonth(e.target.value)}
                  className="bg-transparent text-sm font-bold text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Cari nama atau program..."
                  value={rekapSearch}
                  onChange={(e) => setRekapSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant text-sm font-medium bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-xl font-bold text-sm hover:bg-secondary-container/80 transition-colors"
              >
                <Printer className="w-4 h-4" /> Cetak Rekap
              </button>
            </div>
          </div>

          {/* Stats Cards for Rekap */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
              <p className="text-xs text-on-surface-variant font-bold">Rata-rata Kehadiran</p>
              <h3 className="text-2xl font-bold text-primary mt-1">{rekapLoading ? "..." : `${avgRekapPercentage}%`}</h3>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
              <p className="text-xs text-on-surface-variant font-bold">Total Hadir (H)</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{rekapLoading ? "..." : totalRekapHadir}</h3>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
              <p className="text-xs text-on-surface-variant font-bold">Total Izin / Sakit (I)</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{rekapLoading ? "..." : totalRekapIzin}</h3>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
              <p className="text-xs text-on-surface-variant font-bold">Total Alpha (A)</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{rekapLoading ? "..." : totalRekapAlpha}</h3>
            </div>
          </div>

          {/* Table Rekap */}
          <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
              <h3 className="text-base font-bold text-on-surface">
                Rekap Kehadiran Bulanan — {activeTab === "murid" ? "Murid" : "Saya"} ({rekapMonth})
              </h3>
              <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
                {currentRekapList.length} {activeTab === "murid" ? "Murid" : "Data Saya"}
              </span>
            </div>

            {rekapLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="font-bold text-sm">Memuat rekap absensi bulanan...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-surface-container">
                      <th className="p-4 font-bold text-on-surface-variant">Nama {activeTab === "murid" ? "Murid" : "Guru"}</th>
                      <th className="p-4 font-bold text-on-surface-variant">{activeTab === "murid" ? "Program / Kelas" : "Jabatan"}</th>
                      <th className="p-4 font-bold text-on-surface-variant text-center">Hadir (H)</th>
                      <th className="p-4 font-bold text-on-surface-variant text-center">Izin / Sakit (I)</th>
                      <th className="p-4 font-bold text-on-surface-variant text-center">Alpha (A)</th>
                      <th className="p-4 font-bold text-on-surface-variant text-center">Total Pertemuan</th>
                      <th className="p-4 font-bold text-on-surface-variant">Persentase Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRekapList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                          Tidak ada data untuk periode {rekapMonth}
                        </td>
                      </tr>
                    ) : (
                      currentRekapList.map((item: any) => (
                        <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-on-surface">{item.name}</div>
                            <div className="text-xs text-on-surface-variant">{activeTab === "murid" ? `NIS: ${item.nis}` : `NIP: ${item.nip}`}</div>
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                              {activeTab === "murid" ? item.program : item.position}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              {item.hadir}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                              {item.izin}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              {item.alpha}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-on-surface">
                            {item.totalDays} Hari
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-surface-container-highest h-2.5 rounded-full overflow-hidden w-24">
                                <div
                                  className={`h-full rounded-full ${
                                    item.percentage >= 80
                                      ? "bg-emerald-500"
                                      : item.percentage >= 60
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                                />
                              </div>
                              <span className="font-bold text-xs w-10 text-right">{item.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "riwayat" && (
        <div className="space-y-6">
          {/* Riwayat Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center bg-surface p-4 rounded-2xl border border-outline-variant shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex bg-surface-container-lowest p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("murid")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    activeTab === "murid"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Users className="w-4 h-4" /> Riwayat Murid
                </button>
                <button
                  onClick={() => setActiveTab("saya")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    activeTab === "saya"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <User className="w-4 h-4" /> Riwayat Saya
                </button>
              </div>

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
                  value={historyStatusFilter}
                  onChange={(e: any) => setHistoryStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-on-surface focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="alpha">Alpha</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              <div className="relative flex-1 lg:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Cari nama di riwayat..."
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

          {/* Table Riwayat */}
          <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="p-4 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
              <h3 className="text-base font-bold text-on-surface">
                Log Riwayat Kehadiran — {activeTab === "murid" ? "Murid" : "Saya"}
              </h3>
              <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
                {filteredHistoryList.length} Catatan
              </span>
            </div>

            {historyLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="font-bold text-sm">Memuat riwayat absensi...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-surface-container">
                      <th className="p-4 font-bold text-on-surface-variant">Tanggal</th>
                      <th className="p-4 font-bold text-on-surface-variant">Nama {activeTab === "murid" ? "Murid" : "Guru"}</th>
                      <th className="p-4 font-bold text-on-surface-variant">{activeTab === "murid" ? "Program / Kelas" : "Jabatan"}</th>
                      {activeTab === "saya" && <th className="p-4 font-bold text-on-surface-variant">Jam Masuk</th>}
                      {activeTab === "saya" && <th className="p-4 font-bold text-on-surface-variant">Jam Keluar</th>}
                      <th className="p-4 font-bold text-on-surface-variant text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                          Tidak ada catatan riwayat absensi dengan filter saat ini
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryList.map((item: any) => {
                        const name = activeTab === "murid"
                          ? (item.students?.full_name || "Siswa")
                          : (item.teachers?.full_name || "Guru");
                        const programOrRole = activeTab === "murid"
                          ? (item.les_type === "les_ahe" ? "AHE" : item.les_type === "les_ase" ? "ASE" : "Mapel")
                          : (item.teachers?.position || "Guru");
                        const dateFormatted = formatDateIndo(item.date, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });

                        return (
                          <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                            <td className="p-4 font-medium text-on-surface">{dateFormatted}</td>
                            <td className="p-4 font-bold text-on-surface">{name}</td>
                            <td className="p-4">
                              <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                                {programOrRole}
                              </span>
                            </td>
                            {activeTab === "saya" && <td className="p-4 font-medium">{item.check_in_time || "-"}</td>}
                            {activeTab === "saya" && <td className="p-4 font-medium">{item.check_out_time || "-"}</td>}
                            <td className="p-4 text-center">
                              {item.status === "hadir" ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3.5 h-3.5" /> Hadir
                                </span>
                              ) : item.status === "izin" ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" /> Izin / Sakit
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5" /> Alpha
                                </span>
                              )}
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

      {viewMode === "harian" && (
        <>
          {/* SCANNER BARCODE CARD (HERO SECTION) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 border-2 border-amber-500/30 shadow-md dark:from-amber-500/20 dark:to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
              <QrCode className="h-4 w-4" /> MODE SCAN BARCODE & QR CODE
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Absensi Cepat via Scanner / Kamera
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Scan barcode kartu siswa atau guru. Sistem otomatis mencatat Hadir dan menambah +1 Poin Reward Bintang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-amber-700 active:scale-95"
            >
              <Camera className="h-5 w-5" />
              Scan Kamera (HP / Webcam)
            </button>
            <button
              onClick={() => {
                setBarcodeModalType("siswa");
                setIsBarcodeModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-white px-4 py-3 text-sm font-semibold text-amber-700 shadow-sm hover:bg-amber-50 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700"
            >
              <QrCode className="h-4 w-4" />
              Cetak Kartu Siswa
            </button>
            <button
              onClick={() => {
                setBarcodeModalType("guru");
                setIsBarcodeModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <QrCode className="h-4 w-4" />
              Kartu Saya
            </button>
          </div>
        </div>

        {/* Quick Barcode Gun Input Box */}
        <div className="mt-5 pt-5 border-t border-amber-500/20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeScan(manualCodeInput);
              setManualCodeInput("");
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Scan dengan Barcode Gun USB atau ketik kode (lalu tekan Enter)..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="w-full rounded-xl border-2 border-amber-500/40 bg-white py-2.5 pl-4 pr-16 font-mono text-sm font-bold text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:bg-slate-800 dark:text-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded">
                ENTER
              </span>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Proses Scan
            </button>
          </form>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-surface p-2 rounded-2xl border border-outline-variant shadow-sm w-full">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex bg-surface-container-lowest p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('murid')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-label-md font-bold transition-all ${activeTab === 'murid' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              <Users className="w-5 h-5" /> Absensi Murid
            </button>
            <button 
              onClick={() => setActiveTab('saya')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-label-md font-bold transition-all ${activeTab === 'saya' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              <User className="w-5 h-5" /> Absensi Mandiri (Saya)
            </button>
          </div>
          
          {activeTab === 'murid' && (
            <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-outline-variant">
              <Filter className="w-4 h-4 text-on-surface-variant" />
              <select
                value={filterStatusSiswa}
                onChange={(e: any) => setFilterStatusSiswa(e.target.value)}
                className="bg-transparent text-sm font-bold text-on-surface focus:outline-none"
              >
                <option value="active">Murid Aktif</option>
                <option value="inactive">Murid Nonaktif</option>
                <option value="all">Semua Murid</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="relative w-full sm:w-auto pr-2 flex items-center gap-2 bg-surface-container-lowest px-3 rounded-xl border border-outline-variant">
          <span className="text-sm font-bold text-on-surface-variant whitespace-nowrap">Tanggal Absensi:</span>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-auto py-2.5 bg-transparent focus:outline-none transition-all font-body-md text-on-surface font-bold"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="font-bold text-body-md">Memuat informasi kehadiran...</p>
        </div>
      ) : activeTab === 'murid' ? (
        /* Student Attendance Table */
        <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Kehadiran Murid</h3>
            <span className="text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
              {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Nama</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Program Les</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-center">Kehadiran</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-center">Reward Poin</th>
                </tr>
              </thead>
              <tbody>
                {muridData.filter(m => filterStatusSiswa === 'all' || m.studentStatus === filterStatusSiswa).length > 0 ? (
                  muridData.filter(m => filterStatusSiswa === 'all' || m.studentStatus === filterStatusSiswa).map((item) => (
                    <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-on-surface">{item.name}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                          {item.class}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleStatusChange(item.id, 'hadir')} className={`p-2 rounded-lg border flex flex-col items-center gap-1 w-16 transition-all ${item.status === 'hadir' ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Hadir</span>
                          </button>
                          <button onClick={() => handleStatusChange(item.id, 'izin')} className={`p-2 rounded-lg border flex flex-col items-center gap-1 w-16 transition-all ${item.status === 'izin' ? 'bg-tertiary/10 border-tertiary text-tertiary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                            <Clock className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Izin</span>
                          </button>
                          <button onClick={() => handleStatusChange(item.id, 'alpha')} className={`p-2 rounded-lg border flex flex-col items-center gap-1 w-16 transition-all ${item.status === 'alpha' ? 'bg-error/10 border-error text-error' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                            <XCircle className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Alpha</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {item.status === 'hadir' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FFF4E5] text-[#FFB020] rounded-full font-bold text-label-sm border border-[#FFD070]">
                            <Star className="w-4 h-4 fill-[#FFB020]" /> +1 Bintang
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-on-surface-variant">Belum ada murid terdaftar untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-surface-container-lowest border-t border-surface-container flex justify-end">
            <button 
              onClick={saveStudentAttendance} 
              disabled={saveLoading || muridData.length === 0}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Absensi Murid
            </button>
          </div>
        </div>
      ) : !teacherProfile ? (
        /* Teacher profile not linked */
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
          <User className="w-12 h-12 text-primary" />
          <p className="font-bold text-headline-sm text-on-surface">Profil Guru Belum Terhubung</p>
          <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data guru. Hubungi admin untuk menautkan akun Anda ke data guru.</p>
        </div>
      ) : (
        /* Teacher Self Attendance Card */
        <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Absensi Mandiri Saya</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">Catat jam masuk & keluar mengajar untuk hari ini.</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-label-md font-bold text-on-surface">Pilih Kehadiran</label>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => handleSelfStatusChange('hadir')}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition-all ${myAttendance.status === 'hadir' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}
                >
                  <CheckCircle className="w-5 h-5" /> Hadir
                </button>
                <button 
                  onClick={() => handleSelfStatusChange('izin')}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition-all ${myAttendance.status === 'izin' ? 'bg-tertiary/10 border-tertiary text-tertiary shadow-sm' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}
                >
                  <Clock className="w-5 h-5" /> Izin
                </button>
                <button 
                  onClick={() => handleSelfStatusChange('sakit')}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition-all ${myAttendance.status === 'sakit' ? 'bg-error/10 border-error text-error shadow-sm' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}
                >
                  <XCircle className="w-5 h-5" /> Sakit
                </button>
              </div>
            </div>

            {myAttendance.status === 'hadir' && (
              <div className="grid grid-cols-2 gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                <div className="space-y-2">
                  <label className="text-label-sm font-bold text-on-surface">Jam Masuk (Check-In)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={myAttendance.timeIn}
                      onChange={(e) => setMyAttendance(prev => ({ ...prev, timeIn: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border outline-none bg-surface text-center font-bold text-lg" 
                    />
                    <button 
                      onClick={handleCheckInNow}
                      className="px-3 bg-secondary text-on-secondary rounded-lg font-bold flex items-center justify-center hover:bg-secondary/80 text-sm"
                      title="Check In Sekarang"
                    >
                      <LogIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-label-sm font-bold text-on-surface">Jam Keluar (Check-Out)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={myAttendance.timeOut}
                      onChange={(e) => setMyAttendance(prev => ({ ...prev, timeOut: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border outline-none bg-surface text-center font-bold text-lg" 
                    />
                    <button 
                      onClick={handleCheckOutNow}
                      className="px-3 bg-secondary text-on-secondary rounded-lg font-bold flex items-center justify-center hover:bg-secondary/80 text-sm"
                      title="Check Out Sekarang"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-label-md font-bold text-on-surface">Catatan / Keterangan (Opsional)</label>
              <textarea 
                placeholder="Contoh: Mengajar kelas tambahan, Sakit flu berat, dll."
                value={myAttendance.notes}
                onChange={(e) => setMyAttendance(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface"
              />
            </div>
          </div>

          <div className="p-4 bg-surface-container-lowest border-t border-surface-container flex justify-end">
            <button 
              onClick={saveSelfAttendance} 
              disabled={saveLoading}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Absensi Mandiri
            </button>
          </div>
        </div>
      )}
        </>
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          handleBarcodeScan(code);
        }}
      />

      <BarcodeCardModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title={barcodeModalType === "siswa" ? "Cetak Kartu Absensi Siswa" : "Cetak Kartu Absensi Saya"}
        type={barcodeModalType}
        items={
          barcodeModalType === "siswa"
            ? students.map((s) => {
                let programText = "AHE";
                if (s.student_les && s.student_les.length > 0) {
                  const t = s.student_les[0].les_type;
                  if (t === "les_ahe") programText = `AHE Lvl ${s.student_les[0].current_level || 1}`;
                  else if (t === "les_ase") programText = `ASE Lvl ${s.student_les[0].current_level || 1}`;
                  else if (t === "les_mapel") programText = `Mapel (${s.student_les[0].les_mapel_name || "Umum"})`;
                }
                const clsName = s.class_members?.[0]?.classes?.name;
                const subtitle = clsName ? `${programText} • ${clsName}` : programText;
                return {
                  id: s.id,
                  name: s.full_name,
                  subtitle: `NIS: ${s.nis || "-"} | ${subtitle}`,
                  code: `STU-${s.id}`,
                  photo_url: s.photo_url || "",
                  badge: programText,
                };
              })
            : teacherProfile
            ? [
                {
                  id: teacherProfile.id,
                  name: teacherProfile.full_name,
                  subtitle: `NIP: ${teacherProfile.nip || "-"} | ${teacherProfile.position || "Guru"}`,
                  code: `TCH-${teacherProfile.id}`,
                  photo_url: teacherProfile.photo_url || "",
                  badge: teacherProfile.position || "Guru Utama",
                },
              ]
            : []
        }
      />
    </div>
  );
}
