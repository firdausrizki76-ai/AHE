"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { BookOpen, TrendingUp, Calendar, Award, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridJenjangPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [studentLes, setStudentLes] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
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
        // 2. Fetch student les
        const { data: lesData, error: lesErr } = await supabase
          .from("student_les")
          .select("*")
          .eq("student_id", studentData.id);
        if (!lesErr) {
          setStudentLes(lesData || []);
        }

        // 3. Fetch evaluations
        const { data: evalsData, error: evalsErr } = await supabase
          .from("evaluations")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false });
        if (!evalsErr) {
          setEvaluations(evalsData || []);
        }
      }
    } catch (err: any) {
      toast.error("Gagal memuat data jenjang: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLesTypeLabel = (lesType: string) => {
    if (lesType === 'les_ahe') return 'AHE (Anak Hebat)';
    if (lesType === 'les_ase') return 'ASE (Anak Sekolah)';
    if (lesType === 'les_mapel') return 'Mata Pelajaran (Mapel)';
    return lesType || "Umum";
  };

  const getLesColor = (lesType: string) => {
    if (lesType === 'les_ahe') return 'primary';
    if (lesType === 'les_ase') return 'secondary';
    return 'tertiary';
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat data jenjang...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <TrendingUp className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Jenjang & Progress Belajar</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Pantau kemajuan level program les AHE/ASE/Mapel yang Anda ikuti.</p>
      </div>

      {/* Les Programs Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {studentLes.map((les) => {
          const colorKey = getLesColor(les.les_type);
          const isMapel = les.les_type === "les_mapel";
          const maxLevel = les.les_type === "les_ahe" ? 8 : (les.les_type === "les_ase" ? 16 : 1);
          const levelVal = Number(les.current_level || 1);
          const percentage = isMapel ? 100 : Math.min(100, Math.round((levelVal / maxLevel) * 100));

          return (
            <div key={les.id} className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-label-sm font-bold bg-${colorKey}-container text-on-${colorKey}-container capitalize`}>
                    {getLesTypeLabel(les.les_type)}
                  </span>
                  {isMapel && les.les_mapel_name && (
                    <p className="font-bold text-on-surface text-lg mt-2">{les.les_mapel_name}</p>
                  )}
                  {!isMapel && (
                    <h3 className="text-headline-sm font-extrabold text-on-surface mt-2">Level {levelVal} / {maxLevel}</h3>
                  )}
                </div>
                <div className="p-3 bg-surface-container rounded-xl">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>

              {/* Progress Bar */}
              {!isMapel && (
                <div className="space-y-2">
                  <div className="flex justify-between text-body-sm font-bold text-on-surface-variant">
                    <span>Progress Kelulusan</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden border">
                    <div 
                      className={`h-full bg-${colorKey} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div className="pt-2 flex justify-between items-center text-body-sm">
                <span className="text-on-surface-variant font-medium">Status Keaktifan:</span>
                {les.status === 'active' && (
                  <span className="px-2.5 py-0.5 rounded bg-tertiary-container/40 text-tertiary font-bold">Aktif</span>
                )}
                {les.status === 'graduated' && (
                  <span className="px-2.5 py-0.5 rounded bg-primary/10 text-primary font-bold">Lulus (Alumni)</span>
                )}
                {les.status === 'inactive' && (
                  <span className="px-2.5 py-0.5 rounded bg-error-container/40 text-error font-bold">Nonaktif</span>
                )}
              </div>
            </div>
          );
        })}
        {studentLes.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant bg-surface border rounded-2xl italic md:col-span-2">
            Belum terdaftar di program les apapun. Hubungi admin untuk pendaftaran kelas.
          </div>
        )}
      </div>

      {/* Evaluations Table Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Riwayat Ujian Evaluasi</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container">
                <th className="p-4 font-label-md text-on-surface-variant">No Evaluasi</th>
                <th className="p-4 font-label-md text-on-surface-variant">Program Les</th>
                <th className="p-4 font-label-md text-on-surface-variant">Tanggal Pelaksanaan</th>
                <th className="p-4 font-label-md text-on-surface-variant">Transisi Level</th>
                <th className="p-4 font-label-md text-on-surface-variant text-center">Skor</th>
                <th className="p-4 font-label-md text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => {
                const isPassed = ev.status === "passed";
                const isFailed = ev.status === "failed";
                const isPending = ev.status === "scheduled" || ev.status === "ongoing";

                return (
                  <tr key={ev.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface font-bold">{ev.eval_number}</td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-0.5 bg-surface-container text-on-surface rounded-full text-label-sm font-bold">
                        {getLesTypeLabel(ev.les_type)}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant text-body-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{new Date(ev.start_date).toLocaleDateString('id-ID')} - {new Date(ev.end_date).toLocaleDateString('id-ID')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface">
                      Level {ev.current_level} &rarr; Level {ev.target_level}
                    </td>
                    <td className="p-4 text-center font-extrabold text-on-surface">
                      {ev.score !== null ? Number(ev.score) : "-"}
                    </td>
                    <td className="p-4">
                      {isPassed && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full font-bold text-label-sm">
                          <CheckCircle className="w-4 h-4" /> Lulus
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-error/10 text-error rounded-full font-bold text-label-sm">
                          <XCircle className="w-4 h-4" /> Mengulang
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary-container/30 text-tertiary rounded-full font-bold text-label-sm">
                          <Clock className="w-4 h-4" /> Menunggu
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {evaluations.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    Belum ada riwayat ujian evaluasi yang tercatat.
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
