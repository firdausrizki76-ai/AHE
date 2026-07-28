"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { FileText, Plus, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridIzinPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: ""
  });

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
        // 2. Fetch leave requests
        const { data: requestsData, error: reqErr } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("student_id", studentData.id)
          .order("date", { ascending: false });

        if (reqErr) throw reqErr;
        setLeaveRequests(requestsData || []);
      }
    } catch (err: any) {
      toast.error("Gagal memuat data izin: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (!formData.reason.trim()) {
      toast.error("Alasan izin harus diisi!");
      return;
    }

    setSubmitLoading(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .insert({
          student_id: student.id,
          date: formData.date,
          reason: formData.reason,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Pengajuan izin berhasil dikirim!");
      setFormData({
        date: new Date().toISOString().split('T')[0],
        reason: ""
      });
      fetchData();
    } catch (err: any) {
      toast.error("Gagal mengirim pengajuan izin: " + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat data pengajuan izin...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <FileText className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Izin & Ketidakhadiran</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Ajukan permohonan izin sakit/acara keluarga secara mandiri kepada tentor.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submit Form Card */}
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant h-fit">
          <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Form Pengajuan Izin
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-label-md font-bold text-on-surface">Tanggal Berhalangan</label>
              <input 
                required 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-label-md font-bold text-on-surface">Alasan Izin</label>
              <textarea 
                required
                placeholder="Contoh: Sakit demam tinggi, Acara pernikahan keluarga besar di luar kota, dll." 
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface text-sm"
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={submitLoading}
              className="w-full py-3 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-headline-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Kirim Pengajuan
            </button>
          </form>
        </div>

        {/* History Card */}
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Pengajuan Izin</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal Izin</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Alasan / Keterangan</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((req) => {
                  const isApproved = req.status === "approved" || req.status === "disetujui";
                  const isRejected = req.status === "rejected" || req.status === "ditolak";
                  const isPending = req.status === "pending";

                  return (
                    <tr key={req.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-4 text-on-surface font-semibold">
                        {new Date(req.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-on-surface-variant text-sm max-w-[300px] truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="p-4">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-tertiary-container/30 text-tertiary rounded-full font-bold text-label-sm">
                            <CheckCircle className="w-3.5 h-3.5" /> Disetujui
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-error-container/30 text-error rounded-full font-bold text-label-sm">
                            <XCircle className="w-3.5 h-3.5" /> Ditolak
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container-highest text-outline rounded-full font-bold text-label-sm">
                            <Clock className="w-3.5 h-3.5" /> Menunggu
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-on-surface-variant">
                      Belum ada pengajuan izin ketidakhadiran yang diajukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
