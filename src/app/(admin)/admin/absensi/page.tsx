"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Users, GraduationCap, CheckCircle, XCircle, Clock, Star, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function AbsensiPage() {
  const [activeTab, setActiveTab] = useState<'murid' | 'guru'>('murid');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [muridData, setMuridData] = useState<any[]>([]);
  const [guruData, setGuruData] = useState<any[]>([]);
  const [quickInput, setQuickInput] = useState("");

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
    setLoading(true);
    try {
      // 1. Fetch students & teachers
      const { data: studentsData, error: studentErr } = await supabase
        .from("students")
        .select("*, student_les(*), class_members(classes(name))")
        .order("full_name", { ascending: true });
      if (studentErr) throw studentErr;

      const { data: teachersData, error: teacherErr } = await supabase
        .from("teachers")
        .select("*")
        .order("full_name", { ascending: true });
      if (teacherErr) throw teacherErr;

      // 2. Fetch attendance for selected date
      const { data: studentAttData, error: studentAttErr } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("date", date);
      if (studentAttErr) throw studentAttErr;

      const { data: teacherAttData, error: teacherAttErr } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("date", date);
      if (teacherAttErr) throw teacherAttErr;

      setStudents(studentsData || []);
      setTeachers(teachersData || []);
      setStudentAttendance(studentAttData || []);
      setTeacherAttendance(teacherAttData || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat data absensi: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        };
      })
    );

    setGuruData(
      teachers.map(t => {
        const att = teacherAttendance.find(a => a.teacher_id === t.id);
        return {
          id: t.id,
          name: t.full_name,
          role: t.position || "Guru",
          status: att ? att.status : 'belum',
          timeIn: att?.check_in_time || '-',
          timeOut: att?.check_out_time || '-',
          attendanceId: att ? att.id : null,
          originalStatus: att ? att.status : 'belum',
        };
      })
    );
  }, [students, teachers, studentAttendance, teacherAttendance]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setMuridData(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
  };

  const handleTeacherStatusChange = (id: string, newStatus: string) => {
    setGuruData(prev => prev.map(g => {
      if (g.id === id) {
        return {
          ...g,
          status: newStatus,
          timeIn: newStatus === 'hadir' ? '15:00:00' : '-',
          timeOut: newStatus === 'hadir' ? '17:00:00' : '-',
        };
      }
      return g;
    }));
  };

  const handleQuickInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const value = quickInput.trim().toLowerCase();
    if (!value) return;

    if (activeTab === 'murid') {
      const found = students.find(s => s.nis?.toLowerCase() === value);
      if (found) {
        const current = muridData.find(m => m.id === found.id);
        const newStatus = current?.status === 'hadir' ? 'belum' : 'hadir';
        handleStatusChange(found.id, newStatus);
        toast.success(`${found.full_name} → ${newStatus === 'hadir' ? 'Hadir ✅' : 'Batal ❌'}`);
      } else {
        toast.error(`NIS "${quickInput.trim()}" tidak ditemukan`);
      }
    } else {
      const found = teachers.find(t => t.nip?.toLowerCase() === value);
      if (found) {
        const current = guruData.find(g => g.id === found.id);
        const newStatus = current?.status === 'hadir' ? 'belum' : 'hadir';
        handleTeacherStatusChange(found.id, newStatus);
        toast.success(`${found.full_name} → ${newStatus === 'hadir' ? 'Hadir ✅' : 'Batal ❌'}`);
      } else {
        toast.error(`NIP "${quickInput.trim()}" tidak ditemukan`);
      }
    }
    setQuickInput("");
  };

  const saveAttendance = async () => {
    setSaveLoading(true);
    try {
      if (activeTab === 'murid') {
        let savedCount = 0;
        let pointsAdded = 0;

        for (const item of muridData) {
          if (item.status === 'belum') {
            // Unchecked, skip or delete if previously checked
            if (item.attendanceId) {
              // Delete old record
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
            const { data: inserted, error: insErr } = await supabase
              .from("student_attendance")
              .upsert({
                student_id: item.id,
                date: date,
                status: item.status,
                les_type: item.les_type
              }, { onConflict: 'student_id,date' })
              .select()
              .single();
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

        toast.success(`Absensi disimpan! ${savedCount} data murid diproses. (+${pointsAdded} Poin Bintang diberikan)`);
      } else {
        let savedCount = 0;
        for (const item of guruData) {
          if (item.status === 'belum') {
            if (item.attendanceId) {
              const { error: delErr } = await supabase
                .from("teacher_attendance")
                .delete()
                .eq("id", item.attendanceId);
              if (delErr) throw delErr;
            }
            continue;
          }

          if (!item.attendanceId) {
            const { error: insErr } = await supabase
              .from("teacher_attendance")
              .upsert({
                teacher_id: item.id,
                date: date,
                status: item.status,
                check_in_time: item.timeIn === '-' ? null : item.timeIn,
                check_out_time: item.timeOut === '-' ? null : item.timeOut
              }, { onConflict: 'teacher_id,date' });
            if (insErr) throw insErr;
            savedCount++;
          } else if (item.status !== item.originalStatus) {
            const { error: updErr } = await supabase
              .from("teacher_attendance")
              .update({
                status: item.status,
                check_in_time: item.timeIn === '-' ? null : item.timeIn,
                check_out_time: item.timeOut === '-' ? null : item.timeOut
              })
              .eq("id", item.attendanceId);
            if (updErr) throw updErr;
            savedCount++;
          }
        }
        toast.success(`Absensi guru berhasil disimpan! ${savedCount} data diproses.`);
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyimpan absensi: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Rekap Absensi</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Kelola dan pantau kehadiran murid serta guru.</p>
      </div>

      {/* Tabs & Date Picker */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-surface p-2 rounded-2xl border border-outline-variant shadow-sm w-full">
        <div className="flex bg-surface-container-lowest p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('murid')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-label-md font-bold transition-all ${activeTab === 'murid' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
          >
            <Users className="w-5 h-5" /> Absensi Murid
          </button>
          <button 
            onClick={() => setActiveTab('guru')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-label-md font-bold transition-all ${activeTab === 'guru' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
          >
            <GraduationCap className="w-5 h-5" /> Absensi Guru
          </button>
        </div>
        
        <div className="relative w-full sm:w-auto pr-2">
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface font-bold"
          />
        </div>
      </div>

      {/* Quick NIS/NIP Input */}
      <div className="bg-surface p-4 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            type="text"
            placeholder={activeTab === 'murid' ? 'Ketik NIS murid lalu tekan Enter untuk toggle Hadir...' : 'Ketik NIP guru lalu tekan Enter untuk toggle Hadir...'}
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleQuickInput}
            className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md bg-surface-container-lowest text-on-surface"
          />
          <span className="text-label-sm text-on-surface-variant hidden sm:block">Tekan Enter ↵</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">
            Daftar Kehadiran {activeTab === 'murid' ? 'Murid' : 'Guru'}
          </h3>
          <span className="text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
            {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold text-body-md">Memuat data absensi...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Nama</th>
                  <th className="p-4 font-label-md text-on-surface-variant">{activeTab === 'murid' ? 'Program Les' : 'Jabatan'}</th>
                  {activeTab === 'guru' && <th className="p-4 font-label-md text-on-surface-variant">Jam Masuk</th>}
                  {activeTab === 'guru' && <th className="p-4 font-label-md text-on-surface-variant">Jam Keluar</th>}
                  <th className="p-4 font-label-md text-on-surface-variant text-center">Kehadiran</th>
                  {activeTab === 'murid' && <th className="p-4 font-label-md text-on-surface-variant text-center">Reward Poin</th>}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'murid' ? (
                  muridData.length > 0 ? (
                    muridData.map((item: any) => (
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
                      <td colSpan={4} className="p-8 text-center text-on-surface-variant">Belum ada data murid terdaftar.</td>
                    </tr>
                  )
                ) : (
                  guruData.length > 0 ? (
                    guruData.map((item: any) => (
                      <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-on-surface">{item.name}</div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                            {item.role}
                          </span>
                        </td>
                        <td className="p-4 text-on-surface font-medium">{item.timeIn}</td>
                        <td className="p-4 text-on-surface font-medium">{item.timeOut}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleTeacherStatusChange(item.id, 'hadir')} className={`p-2 rounded-lg border flex flex-col items-center gap-1 w-16 transition-all ${item.status === 'hadir' ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-[10px] font-bold uppercase">Hadir</span>
                            </button>
                            <button onClick={() => handleTeacherStatusChange(item.id, 'izin')} className={`p-2 rounded-lg border flex flex-col items-center gap-1 w-16 transition-all ${item.status === 'izin' ? 'bg-tertiary/10 border-tertiary text-tertiary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>
                              <Clock className="w-5 h-5" />
                              <span className="text-[10px] font-bold uppercase">Izin</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant">Belum ada data guru terdaftar.</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 bg-surface-container-lowest border-t border-surface-container flex justify-end">
          <button 
            onClick={saveAttendance} 
            disabled={saveLoading || loading}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan Absensi
          </button>
        </div>
      </div>
    </div>
  );
}
