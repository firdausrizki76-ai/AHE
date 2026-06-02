"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { Wallet, Star, BookOpen, Clock, Calendar, Award, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function MuridDashboardPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch student profile along with related tables
      const { data: studentData, error: sErr } = await supabase
        .from("students")
        .select("*, student_points(*), savings_accounts(*), student_les(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sErr) throw sErr;

      let activeStudent = studentData;
      // Fallback for development if not linked
      if (!activeStudent) {
        const { data: fallbacks } = await supabase
          .from("students")
          .select("*, student_points(*), savings_accounts(*), student_les(*)")
          .limit(1);
        if (fallbacks && fallbacks.length > 0) {
          activeStudent = fallbacks[0];
        }
      }
      setStudent(activeStudent);

      if (activeStudent) {
        // 2. Fetch student classes
        const { data: memberClasses, error: mcErr } = await supabase
          .from("class_members")
          .select(`
            id,
            classes (
              *,
              teachers (full_name)
            )
          `)
          .eq("student_id", activeStudent.id);
        if (!mcErr) {
          setClasses(memberClasses?.map(mc => mc.classes).filter(Boolean) || []);
        }

        // 3. Fetch active evaluations
        const { data: activeEvals, error: aeErr } = await supabase
          .from("evaluations")
          .select("*")
          .eq("student_id", activeStudent.id)
          .in("status", ["scheduled", "ongoing"])
          .order("start_date", { ascending: true })
          .limit(3);
        if (!aeErr) {
          setEvaluations(activeEvals || []);
        }

        // 4. Fetch recent achievements/scores
        const { data: recentScores, error: rsErr } = await supabase
          .from("achievements")
          .select("*")
          .eq("student_id", activeStudent.id)
          .order("created_at", { ascending: false })
          .limit(3);
        if (!rsErr) {
          setAchievements(recentScores || []);
        }
      }
    } catch (err: any) {
      toast.error("Gagal memuat data dashboard: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat dashboard murid...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <BookOpen className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun murid Anda belum terhubung ke profil data murid. Hubungi admin untuk menyelesaikan pendaftaran.</p>
      </div>
    );
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const getLesProgramInfo = (studentLesList: any[]) => {
    if (!studentLesList || studentLesList.length === 0) return "Belum terdaftar";
    return studentLesList.map(les => {
      let typeLabel = "";
      if (les.les_type === "les_ahe") typeLabel = `AHE Lvl ${les.current_level}`;
      else if (les.les_type === "les_ase") typeLabel = `ASE Lvl ${les.current_level}`;
      else if (les.les_type === "les_mapel") typeLabel = `Mapel (${les.les_mapel_name || ""})`;
      return typeLabel;
    }).join(", ");
  };

  const activePoints = student.student_points?.[0]
    ? (student.student_points[0].total_points || 0) - (student.student_points[0].redeemed_points || 0)
    : 0;

  const savingsBalance = student.savings_accounts?.[0]
    ? (student.savings_accounts[0].balance || 0)
    : 0;

  return (
    <div className="space-y-8 font-body-md">
      {/* Welcome Header */}
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">
          Halo, <span className="text-primary font-extrabold">{student.nickname || student.full_name}</span>! 👋
        </h2>
        <p className="text-body-md text-on-surface-variant mt-1">NIS: <span className="font-bold">{student.nis || "-"}</span> | Semangat belajar hari ini!</p>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tabungan Bento Card */}
        <Link href="/murid/tabungan" className="group bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-outline opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-4">
            <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Tabungan Saya</p>
            <h3 className="text-headline-lg font-extrabold text-on-surface mt-1">{formatRupiah(Number(savingsBalance))}</h3>
          </div>
        </Link>

        {/* Poin/Bintang Bento Card */}
        <Link href="/murid/poin" className="group bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex flex-col justify-between hover:border-primary hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Star className="w-6 h-6 fill-primary" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-outline opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-4">
            <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Bintang Aktif</p>
            <h3 className="text-headline-lg font-extrabold text-on-surface mt-1">{activePoints} Bintang</h3>
          </div>
        </Link>

        {/* Jenjang/Level Bento Card */}
        <Link href="/murid/jenjang" className="group bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex flex-col justify-between hover:border-tertiary hover:shadow-md transition-all sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-tertiary/10 text-tertiary rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-outline opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-4">
            <p className="text-label-sm text-on-surface-variant uppercase font-bold tracking-wider">Program Aktif</p>
            <h3 className="text-headline-md font-bold text-on-surface mt-1 truncate">{getLesProgramInfo(student.student_les)}</h3>
          </div>
        </Link>
      </div>

      {/* Main Grid: Schedule and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Card: Schedule */}
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-4">
          <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2">Jadwal Les Saya</h3>
          <div className="space-y-3">
            {classes.length > 0 ? (
              classes.map((cls) => (
                <div key={cls.id} className="flex justify-between items-center p-4 bg-surface-container rounded-xl border border-outline-variant">
                  <div className="space-y-1">
                    <p className="font-bold text-on-surface">{cls.name}</p>
                    <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {cls.schedule || "Jadwal belum diatur"}
                    </p>
                    <p className="text-[11px] text-primary font-bold uppercase tracking-wide">Tentor: {cls.teachers?.full_name || "-"}</p>
                  </div>
                  <span className="text-body-sm font-bold bg-secondary/15 text-secondary px-3 py-1.5 rounded-full border border-secondary/20">
                    {cls.room || "Ruang 1"}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-on-surface-variant italic">Belum terdaftar di kelas manapun. Hubungi admin untuk penjadwalan.</div>
            )}
          </div>
        </div>

        {/* Right Card: Upcoming Evaluations & Recent Achievements */}
        <div className="space-y-6">
          {/* Evaluations list */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2">Ujian Evaluasi Mendatang</h3>
            <div className="space-y-3">
              {evaluations.length > 0 ? (
                evaluations.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl border border-[#FFD070]/30 bg-[#FFFDF5]/40">
                    <div className="p-3 bg-[#FFB020]/15 text-[#FFB020] rounded-xl shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">Nomor: {ev.eval_number}</p>
                      <p className="text-body-sm text-on-surface-variant">Rencana Kenaikan: Level {ev.current_level} &rarr; Level {ev.target_level}</p>
                      <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> {new Date(ev.start_date).toLocaleDateString('id-ID')} s.d. {new Date(ev.end_date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-on-surface-variant italic text-sm">Tidak ada jadwal evaluasi terdekat.</div>
              )}
            </div>
          </div>

          {/* Recent daily scores */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2">Perkembangan Nilai Terakhir</h3>
            <div className="space-y-3">
              {achievements.length > 0 ? (
                achievements.map((ach) => (
                  <div key={ach.id} className="flex justify-between items-center p-3 bg-surface-container rounded-xl border border-outline-variant">
                    <div>
                      <p className="font-bold text-on-surface text-sm">{ach.module_page}</p>
                      <p className="text-body-sm text-on-surface-variant">{ach.topic}</p>
                      <p className="text-[10px] text-outline mt-0.5">{new Date(ach.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-primary-container text-on-primary-container rounded-full text-body-md font-extrabold shadow-sm shrink-0">
                      {Number(ach.score || 0)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-on-surface-variant italic text-sm">Belum ada riwayat nilai yang dicatat.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
