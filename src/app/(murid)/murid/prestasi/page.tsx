"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { Trophy, Star, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridPrestasiPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
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

      let activeStudent = studentData;
      if (!activeStudent) {
        const { data: fallbacks } = await supabase.from("students").select("id, full_name, nickname").limit(1);
        if (fallbacks && fallbacks.length > 0) {
          activeStudent = fallbacks[0];
        }
      }
      setStudent(activeStudent);

      if (activeStudent) {
        // 2. Fetch student achievements/scores
        const { data: scoresData, error: scoresErr } = await supabase
          .from("achievements")
          .select(`
            *,
            student_les (*)
          `)
          .eq("student_id", activeStudent.id)
          .order("created_at", { ascending: false });

        if (scoresErr) throw scoresErr;
        setAchievements(scoresData || []);
      }
    } catch (err: any) {
      toast.error("Gagal memuat data prestasi: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Average score
  const totalScores = achievements.length;
  const averageScore = totalScores > 0 
    ? Math.round(achievements.reduce((sum, item) => sum + Number(item.score || 0), 0) / totalScores) 
    : 0;

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat data nilai...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <Trophy className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      {/* Header & Stats Bento */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Prestasi & Nilai Saya</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Pantau perkembangan nilai pengerjaan modul harian Anda.</p>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant flex items-center gap-4 shrink-0">
          <div className="p-3.5 bg-primary/10 text-primary rounded-xl">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Rata-Rata Nilai</span>
            <h3 className="text-headline-lg font-extrabold text-on-surface">{averageScore} / 100</h3>
          </div>
        </div>
      </div>

      {/* Daily progress list */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Riwayat Nilai Harian</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container">
                <th className="p-4 font-label-md text-on-surface-variant">Tanggal Penilaian</th>
                <th className="p-4 font-label-md text-on-surface-variant">Program Les</th>
                <th className="p-4 font-label-md text-on-surface-variant">Modul & Materi</th>
                <th className="p-4 font-label-md text-on-surface-variant text-center">Nilai Angka</th>
                <th className="p-4 font-label-md text-on-surface-variant">Catatan Tentor</th>
              </tr>
            </thead>
            <tbody>
              {achievements.map((item) => (
                <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="p-4 text-on-surface-variant text-body-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{new Date(item.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-bold">
                      {getStudentLesName(item.student_les)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-on-surface">{item.module_page}</div>
                    <div className="text-body-sm text-on-surface-variant">{item.topic}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-11 h-11 bg-primary-container text-on-primary-container rounded-full text-body-md font-extrabold shadow-sm">
                      {Number(item.score || 0)}
                    </span>
                  </td>
                  <td className="p-4 text-on-surface-variant text-body-sm" title={item.notes || ""}>
                    {item.notes || "-"}
                  </td>
                </tr>
              ))}
              {achievements.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    Belum ada nilai harian yang dicatat oleh tentor/guru Anda.
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
