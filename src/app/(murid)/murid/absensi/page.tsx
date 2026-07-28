"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { CalendarCheck, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridAbsensiPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
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

      // Fallback removed — student must be properly linked via user_id
      setStudent(studentData);

      if (studentData) {
        // 2. Fetch student attendance
        const { data: attData, error: attErr } = await supabase
          .from("student_attendance")
          .select("*")
          .eq("student_id", studentData.id)
          .order("date", { ascending: false });

        if (attErr) throw attErr;
        setAttendance(attData || []);
      }
    } catch (err: any) {
      toast.error("Gagal memuat data absensi: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics calculation
  const totalDays = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'hadir').length;
  const permitCount = attendance.filter(a => a.status === 'izin').length;
  const alphaCount = attendance.filter(a => a.status === 'alpha' || a.status === 'alpha_point_deducted').length;

  const presentPercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;

  const getLesTypeLabel = (lesType: string) => {
    if (lesType === 'les_ahe') return 'AHE';
    if (lesType === 'les_ase') return 'ASE';
    if (lesType === 'les_mapel') return 'Mapel';
    return lesType || "Les";
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat data absensi...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <CalendarCheck className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Kehadiran Saya</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Pantau statistik kehadiran harian dan riwayat absensi Anda.</p>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant text-center space-y-1">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Persentase Kehadiran</p>
          <h3 className="text-headline-xl font-extrabold text-primary">{presentPercentage}%</h3>
          <p className="text-xs text-on-surface-variant">Dari total {totalDays} pertemuan</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant text-center space-y-1">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Hadir</p>
          <h3 className="text-headline-xl font-extrabold text-tertiary">{presentCount} Hari</h3>
          <p className="text-xs text-on-surface-variant">Pertemuan masuk</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant text-center space-y-1">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Izin</p>
          <h3 className="text-headline-xl font-extrabold text-[#712ae2]">{permitCount} Hari</h3>
          <p className="text-xs text-on-surface-variant">Izin tertulis / berhalangan</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant text-center space-y-1">
          <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Tanpa Keterangan</p>
          <h3 className="text-headline-xl font-extrabold text-error">{alphaCount} Hari</h3>
          <p className="text-xs text-on-surface-variant">Absen tanpa kabar (Alpha)</p>
        </div>
      </div>

      {/* Attendance History Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Jurnal Riwayat Absensi</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container">
                <th className="p-4 font-label-md text-on-surface-variant">Tanggal Pertemuan</th>
                <th className="p-4 font-label-md text-on-surface-variant">Program Les</th>
                <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                <th className="p-4 font-label-md text-on-surface-variant text-center">Reward Poin</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((att) => {
                const isHadir = att.status === "hadir";
                const isIzin = att.status === "izin";
                const isAlpha = att.status === "alpha" || att.status === "alpha_point_deducted";

                return (
                  <tr key={att.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface font-semibold">
                      {new Date(att.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-bold">
                        {getLesTypeLabel(att.les_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      {isHadir && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tertiary-container/30 text-tertiary rounded-full font-bold text-label-sm">
                          <CheckCircle className="w-4 h-4" /> Hadir
                        </span>
                      )}
                      {isIzin && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container/20 text-secondary rounded-full font-bold text-label-sm">
                          <Clock className="w-4 h-4" /> Izin
                        </span>
                      )}
                      {isAlpha && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-error-container/30 text-error rounded-full font-bold text-label-sm">
                          <XCircle className="w-4 h-4" /> Alpha
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-bold">
                      {isHadir ? (
                        <span className="text-primary">+1 Bintang</span>
                      ) : (
                        <span className="text-on-surface-variant">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                    Belum ada data kehadiran yang dicatat oleh tentor/guru.
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
