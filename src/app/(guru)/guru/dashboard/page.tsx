"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { Users, BookOpen, Clock, Loader2, ArrowUpRight, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

export default function GuruDashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  
  // Scoped stats
  const [stats, setStats] = useState({
    studentCount: 0,
    classCount: 0,
    evalCount: 0
  });

  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [upcomingEvals, setUpcomingEvals] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch teacher record mapped to this user_id
      const { data: teacher, error: tErr } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tErr) throw tErr;
      setTeacherProfile(teacher);

      let teacherId = teacher?.id;
      let classesQuery = supabase.from("classes").select("*, teachers(full_name)");
      let evalsQuery = supabase.from("evaluations").select("*, students(full_name)").in("status", ["scheduled", "ongoing"]);

      if (teacherId) {
        classesQuery = classesQuery.eq("teacher_id", teacherId);
        evalsQuery = evalsQuery.eq("evaluated_by", teacherId);
      }

      const { data: clData, error: clErr } = await clQueryScope(classesQuery);
      if (clErr) throw clErr;
      setMyClasses(clData || []);

      const { data: evData, error: evErr } = await evalsQuery.limit(5);
      if (evErr) throw evErr;
      setUpcomingEvals(evData || []);

      // Calculate counts
      const classIds = (clData || []).map((c: any) => c.id);
      let studentCount = 0;

      if (classIds.length > 0) {
        const { data: mbrs, error: mbrErr } = await supabase
          .from("class_members")
          .select("student_id");
        if (!mbrErr && mbrs) {
          // unique student count
          const uniqueIds = new Set(mbrs.map((m: any) => m.student_id));
          studentCount = uniqueIds.size;
        }
      } else {
        // Teacher profile not linked
        studentCount = 0;
      }

      // If no teacherId, fallbacks
      const finalClassCount = teacherId ? (clData || []).length : 0;
      
      let finalEvalCount = 0;
      if (teacherId) {
        const { count, error: evCountErr } = await supabase
          .from("evaluations")
          .select("id", { count: "exact", head: true })
          .eq("evaluated_by", teacherId)
          .in("status", ["scheduled", "ongoing"]);
        if (!evCountErr && count !== null) finalEvalCount = count;
      } else {
        const { count, error: evCountErr } = await supabase
          .from("evaluations")
          .select("id", { count: "exact", head: true })
          .in("status", ["scheduled", "ongoing"]);
        if (!evCountErr && count !== null) finalEvalCount = count;
      }

      setStats({
        studentCount,
        classCount: teacherId ? finalClassCount : (clData || []).length,
        evalCount: finalEvalCount
      });

    } catch (err: any) {
      console.error(err);
      toast.error("Gagal memuat data dashboard: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  async function clQueryScope(query: any) {
    return await query;
  }

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const teacherName = teacherProfile?.full_name || user?.name || "Guru AHE";

  return (
    <div className="space-y-8 font-body-md">
      {/* Welcome Banner */}
      <div className="bg-primary-container text-on-primary-container rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg">Selamat Datang Kembali, {teacherName}!</h2>
          <p className="text-body-md opacity-80 mt-1">Portal Guru - Kelola absensi harian, nilai prestasi, dan uji kelulusan level murid.</p>
        </div>
        <div className="bg-primary/10 p-3 rounded-2xl text-headline-sm font-bold border border-primary/20">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="font-bold text-body-md">Memuat informasi dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
              <div className="p-4 bg-primary-container text-on-primary-container rounded-xl">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Murid Diajar</p>
                <h3 className="text-display-sm font-headline-lg text-on-surface">{stats.studentCount} Murid</h3>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
              <div className="p-4 bg-secondary-container text-on-secondary-container rounded-xl">
                <BookOpen className="w-8 h-8 text-secondary" />
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Jadwal Kelas</p>
                <h3 className="text-display-sm font-headline-lg text-on-surface">{stats.classCount} Kelas</h3>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
              <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl">
                <Clock className="w-8 h-8 text-tertiary" />
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Menunggu Evaluasi</p>
                <h3 className="text-display-sm font-headline-lg text-on-surface">{stats.evalCount} Ujian</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Class schedule list */}
            <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden flex flex-col">
              <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
                <h3 className="text-headline-sm font-headline-sm text-on-surface">Jadwal Mengajar Saya</h3>
                <Link href="/guru/absen" className="text-label-md font-bold text-primary flex items-center gap-1 hover:underline">
                  Buka Absen <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-6 divide-y divide-surface-container flex-1">
                {myClasses.length > 0 ? (
                  myClasses.map((c) => (
                    <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold text-on-surface text-lg">{c.name}</p>
                        <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Jadwal: {c.schedule || "Belum diatur"}
                        </p>
                      </div>
                      <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                        {c.room || "Ruang Kelas"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-on-surface-variant py-8">Anda tidak memiliki jadwal kelas mengajar aktif.</p>
                )}
              </div>
            </div>

            {/* Upcoming evaluations */}
            <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden flex flex-col">
              <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex justify-between items-center">
                <h3 className="text-headline-sm font-headline-sm text-on-surface">Ujian Terdekat</h3>
                <Link href="/guru/evaluasi" className="text-label-md font-bold text-primary flex items-center gap-1 hover:underline">
                  Kelola <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {upcomingEvals.length > 0 ? (
                  upcomingEvals.map((e) => (
                    <div key={e.id} className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-tertiary-container text-on-tertiary-container shrink-0">
                        <Clock className="w-5 h-5 text-tertiary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface truncate">{e.students?.full_name}</p>
                        <p className="text-body-sm text-on-surface-variant">Level {e.current_level} &rarr; {e.target_level}</p>
                        <p className="text-[10px] text-on-surface-variant">Ujian: {new Date(e.start_date).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-on-surface-variant py-8">Tidak ada jadwal ujian evaluasi murid saat ini.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
