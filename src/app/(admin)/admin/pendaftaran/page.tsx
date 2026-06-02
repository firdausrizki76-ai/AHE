"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, Eye, FileText, Check, X } from "lucide-react";
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
        // Invoke approve-registration Edge Function
        const { data, error } = await supabase.functions.invoke("approve-registration", {
          body: { registration_id: selectedReg.id }
        });

        if (error) throw error;
        toast.success(`Pendaftaran ${selectedReg.full_name} berhasil diterima. Akun murid telah dibuat.`);
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
    } catch (err: any) {
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
      labels.push(`Les Mapel (${detail || ''})`);
    }
    return labels.join(", ") || "Belum memilih";
  };

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const acceptedCount = registrations.filter(r => r.status === 'accepted').length;

  return (
    <div className="space-y-8 font-body-md">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Pendaftaran Murid Baru</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Kelola dan review form pendaftaran yang masuk.</p>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Menunggu Review</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : pendingCount}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-primary-container text-on-primary-container rounded-xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Diterima</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : acceptedCount}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-secondary-container text-on-secondary-container rounded-xl">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Total Pendaftar</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : registrations.length}</h3>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Formulir Masuk</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-bold">Memuat data pendaftaran...</div>
          ) : registrations.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">Belum ada formulir pendaftaran masuk.</div>
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
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{reg.full_name}</div>
                      <div className="text-body-sm text-on-surface-variant">{reg.school_origin} (Kl. {reg.school_class}) ({reg.gender})</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                        {getLesProgramLabel(reg.les_types || [], reg.les_mapel_detail)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{reg.father_name || reg.mother_name || reg.guardian_name || "-"}</div>
                      <div className="text-body-sm text-on-surface-variant">{reg.whatsapp}</div>
                    </td>
                    <td className="p-4 text-on-surface">{new Date(reg.submitted_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">
                      {reg.status === 'pending' && <span className="inline-flex items-center gap-1 text-tertiary font-bold"><Clock className="w-4 h-4"/> Menunggu</span>}
                      {reg.status === 'accepted' && <span className="inline-flex items-center gap-1 text-primary font-bold"><CheckCircle2 className="w-4 h-4"/> Diterima</span>}
                      {reg.status === 'rejected' && <span className="inline-flex items-center gap-1 text-error font-bold"><XCircle className="w-4 h-4"/> Ditolak</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setSelectedReg(reg); setIsModalOpen(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary rounded-lg transition-colors font-label-md font-bold"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-on-background/60 backdrop-blur-sm" onClick={() => !actionLoading && setIsModalOpen(false)}></div>
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Review Pendaftaran</h3>
              <button disabled={actionLoading} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 text-body-md">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase">Nama Calon Murid</p>
                  <p className="font-bold text-on-surface text-lg">{selectedReg.full_name}</p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase">Program Pilihan</p>
                  <p className="font-bold text-primary text-lg">{getLesProgramLabel(selectedReg.les_types || [], selectedReg.les_mapel_detail)}</p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase">Asal Sekolah</p>
                  <p className="font-medium text-on-surface">{selectedReg.school_origin} (Kelas {selectedReg.school_class})</p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase">Jenis Kelamin</p>
                  <p className="font-medium text-on-surface">{selectedReg.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                </div>
                <div className="col-span-2 border-t border-surface-container pt-4 mt-2"></div>
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase">Nama Ayah / Ibu</p>
                  <p className="font-bold text-on-surface">{selectedReg.father_name || "-"} / {selectedReg.mother_name || "-"}</p>
                </div>
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase">No. WhatsApp</p>
                  <p className="font-medium text-on-surface">{selectedReg.whatsapp}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-label-sm text-on-surface-variant uppercase">Alamat Lengkap</p>
                  <p className="font-medium text-on-surface">
                    {selectedReg.address || "-"}, RT {selectedReg.rt || "-"}/RW {selectedReg.rw || "-"}, Desa {selectedReg.village || "-"}, Kec. {selectedReg.district || "-"}, Kab. {selectedReg.regency || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface-container-lowest border-t border-surface-container flex gap-4 justify-end">
              {actionLoading ? (
                <div className="flex items-center gap-2 text-primary font-bold">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  Memproses Pendaftaran...
                </div>
              ) : selectedReg.status === 'pending' ? (
                <>
                  <button onClick={() => handleAction('rejected')} className="px-6 py-3 rounded-xl border-2 border-error text-error hover:bg-error hover:text-white font-headline-sm transition-colors flex items-center gap-2">
                    <XCircle className="w-5 h-5" /> Tolak
                  </button>
                  <button onClick={() => handleAction('accepted')} className="px-6 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-headline-sm transition-colors flex items-center gap-2 shadow-lg">
                    <Check className="w-5 h-5" /> Terima Pendaftaran
                  </button>
                </>
              ) : (
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-headline-sm transition-colors">
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
