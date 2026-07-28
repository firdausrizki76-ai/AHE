"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { Users, User, CheckCircle, XCircle, Clock, Star, Loader2, Save, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function GuruAbsenPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'murid' | 'saya'>('murid');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);

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

      // 2. Fetch all active students
      const { data: studentsData, error: studentErr } = await supabase
        .from("students")
        .select("*, student_les(*), class_members(classes(name))")
        .eq("status", "active")
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

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Absen Kelas & Mengajar</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Lakukan absensi murid kelas AHE/ASE/Mapel dan absensi mandiri mengajar.</p>
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
            onClick={() => setActiveTab('saya')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-label-md font-bold transition-all ${activeTab === 'saya' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
          >
            <User className="w-5 h-5" /> Absensi Mandiri (Saya)
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
                {muridData.length > 0 ? (
                  muridData.map((item) => (
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
                    <td colSpan={4} className="p-8 text-center text-on-surface-variant">Belum ada murid aktif terdaftar.</td>
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
    </div>
  );
}
