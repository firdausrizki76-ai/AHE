"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, Eye, FileText, Check, X, Phone, User, Calendar, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function PendaftaranPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat data pendaftaran: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleAction = async (status: "accepted" | "rejected") => {
    if (!selectedReg) return;
    setActionLoading(true);
    
    try {
      if (status === "accepted") {
        let success = false;
        let createdNis = "";

        // 1. Try Edge Function first (which also triggers WhatsApp via Fonnte)
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke("approve-registration", {
            body: { registration_id: selectedReg.id }
          });

          if (!edgeError && edgeData?.success) {
            success = true;
            createdNis = edgeData.nis || "";
          }
        } catch (edgeErr) {
          console.warn("Edge function invocation failed, fallback to direct RPC:", edgeErr);
        }

        // 2. If Edge Function failed or had network issues, call database RPC directly
        if (!success) {
          const { data: rpcData, error: rpcError } = await supabase.rpc("admin_approve_registration" as any, {
            p_registration_id: selectedReg.id
          });

          if (rpcError) throw rpcError;
          createdNis = (rpcData as any)?.nis || "";
        }

        toast.success(`Pendaftaran ${selectedReg.full_name} berhasil diterima! NIS: ${createdNis || "Baru"}. Akun murid telah dibuat.`);
      } else {
        // Direct update for rejection
        const { error } = await supabase
          .from("registrations")
          .update({ 
            status: "rejected", 
            reviewed_at: new Date().toISOString()
          })
          .eq("id", selectedReg.id);

        if (error) throw error;
        toast.success(`Pendaftaran ${selectedReg.full_name} ditolak.`);
      }

      // Refresh list
      await fetchRegistrations();
      setIsModalOpen(false);
      setSelectedReg(null);
    } catch (err: any) {
      console.error("Gagal memproses pendaftaran:", err);
      toast.error(`Gagal memproses pendaftaran: ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getLesProgramLabel = (types: string[], detail?: string) => {
    const labels = [];
    if (types.includes("les_ahe")) labels.push("Les AHE");
    if (types.includes("les_ase")) labels.push("Les ASE");
    if (types.includes("les_mapel")) {
      labels.push(`Les Mapel (${detail || 'Semua Mapel'})`);
    }
    return labels.join(", ") || "Belum memilih";
  };

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const acceptedCount = registrations.filter(r => r.status === 'accepted').length;

  return (
    <div className="space-y-6 md:space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary shrink-0" />
          Pendaftaran Murid Baru
        </h2>
        <p className="text-body-md text-on-surface-variant mt-1">Kelola dan review form pendaftaran online yang masuk.</p>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Menunggu Review</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : pendingCount}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-primary-container text-on-primary-container rounded-xl shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Diterima</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : acceptedCount}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-secondary-container text-on-secondary-container rounded-xl shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Total Pendaftar</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : registrations.length}</h3>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-5 border-b border-surface-container bg-surface-container-lowest flex items-center justify-between">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Formulir Masuk</h3>
          <button
            onClick={fetchRegistrations}
            disabled={loading}
            className="p-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant font-bold flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Memuat data pendaftaran...</span>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">Belum ada formulir pendaftaran masuk.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Nama Pendaftar</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Program</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Orang Tua & WA</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{reg.full_name}</div>
                      <div className="text-body-sm text-on-surface-variant">{reg.school_origin} (Kl. {reg.school_class}) • {reg.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                        {getLesProgramLabel(reg.les_types || [], reg.les_mapel_detail)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{reg.father_name || reg.mother_name || reg.guardian_name || "-"}</div>
                      <div className="text-body-sm text-emerald-600 font-semibold">{reg.whatsapp}</div>
                    </td>
                    <td className="p-4 text-on-surface text-body-sm">{new Date(reg.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4">
                      {reg.status === 'pending' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5"/> Menunggu</span>}
                      {reg.status === 'accepted' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5"/> Diterima</span>}
                      {reg.status === 'rejected' && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800"><XCircle className="w-3.5 h-3.5"/> Ditolak</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setSelectedReg(reg); setIsModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl transition-all font-bold text-label-sm shadow-sm active:scale-95"
                      >
                        <Eye className="w-4 h-4" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {isModalOpen && selectedReg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-background/60 backdrop-blur-sm" onClick={() => !actionLoading && setIsModalOpen(false)}></div>
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[550px] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant z-10">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <div>
                <h3 className="text-headline-sm font-headline-sm text-on-surface">Review Pendaftaran</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">ID: {selectedReg.id}</p>
              </div>
              <button 
                disabled={actionLoading} 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Nama Calon Murid</p>
                  <p className="font-extrabold text-on-surface text-base mt-0.5">{selectedReg.full_name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Panggilan: {selectedReg.nickname || '-'}</p>
                </div>

                <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Program Pilihan</p>
                  <p className="font-extrabold text-primary text-base mt-0.5">{getLesProgramLabel(selectedReg.les_types || [], selectedReg.les_mapel_detail)}</p>
                </div>

                <div>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase">Asal Sekolah & Kelas</p>
                  <p className="font-medium text-on-surface mt-0.5">{selectedReg.school_origin} (Kelas {selectedReg.school_class})</p>
                </div>

                <div>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase">Jenis Kelamin</p>
                  <p className="font-medium text-on-surface mt-0.5">{selectedReg.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                </div>

                <div>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase">Tempat, Tanggal Lahir</p>
                  <p className="font-medium text-on-surface mt-0.5">{selectedReg.birth_place || '-'}, {selectedReg.birth_date || '-'}</p>
                </div>

                <div>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase">No. WhatsApp</p>
                  <p className="font-bold text-emerald-600 mt-0.5">{selectedReg.whatsapp}</p>
                </div>

                <div className="sm:col-span-2 border-t border-surface-container pt-3">
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase">Nama Orang Tua / Wali</p>
                  <p className="font-medium text-on-surface mt-0.5">
                    Ayah: <strong>{selectedReg.father_name || "-"}</strong> • Ibu: <strong>{selectedReg.mother_name || "-"}</strong>
                    {selectedReg.guardian_name ? ` • Wali: ${selectedReg.guardian_name}` : ''}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase">Alamat Domisili</p>
                  <p className="font-medium text-on-surface mt-0.5">
                    {selectedReg.address || "-"}, RT {selectedReg.rt || "-"}/RW {selectedReg.rw || "-"}, Desa {selectedReg.village || "-"}, Kec. {selectedReg.district || "-"}, Kab. {selectedReg.regency || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-surface-container-lowest border-t border-surface-container flex gap-3 justify-end items-center">
              {actionLoading ? (
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  Memproses Pendaftaran...
                </div>
              ) : selectedReg.status === 'pending' ? (
                <>
                  <button 
                    type="button"
                    onClick={() => handleAction('rejected')} 
                    className="px-5 py-2.5 rounded-xl border border-error text-error hover:bg-error/10 font-bold text-sm transition-all flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Tolak
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleAction('accepted')} 
                    className="px-5 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-bold text-sm transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Check className="w-4 h-4" /> Terima & Buat Akun Murid
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-bold text-sm transition-colors"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
