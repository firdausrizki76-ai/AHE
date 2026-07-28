"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { Star, Gift, CheckCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridPoinPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [studentPoints, setStudentPoints] = useState<any | null>(null);
  const [merchandiseList, setMerchandiseList] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemLoading, setRedeemLoading] = useState(false);

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
        // 2. Fetch student points
        const { data: ptsData, error: ptsErr } = await supabase
          .from("student_points")
          .select("*")
          .eq("student_id", studentData.id)
          .maybeSingle();
        if (!ptsErr) {
          setStudentPoints(ptsData);
        }

        // 3. Fetch merchandise catalog
        const { data: merchData, error: merchErr } = await supabase
          .from("merchandise")
          .select("*")
          .eq("is_active", true)
          .order("points_required", { ascending: true });
        if (!merchErr) {
          setMerchandiseList(merchData || []);
        }

        // 4. Fetch my redemptions
        const { data: redData, error: redErr } = await supabase
          .from("point_redemptions")
          .select(`
            *,
            merchandise (*)
          `)
          .eq("student_id", studentData.id)
          .order("redeemed_at", { ascending: false });
        if (!redErr) {
          setRedemptions(redData || []);
        }
      }
    } catch (err: any) {
      toast.error("Gagal memuat data poin: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRedeem = async (merch: any) => {
    if (!student || !studentPoints) return;
    
    const cost = parseInt(merch.points_required || "0");
    const stock = parseInt(merch.stock || "0");
    const activeBalance = (studentPoints.total_points || 0) - (studentPoints.redeemed_points || 0);

    if (activeBalance < cost) {
      toast.error(`Bintang Anda tidak mencukupi! (Butuh ${cost} Bintang, Saldo Anda ${activeBalance} Bintang)`);
      return;
    }

    if (stock < 1) {
      toast.error("Stok hadiah ini sudah habis!");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menukarkan ${cost} bintang untuk "${merch.name}"?`)) {
      return;
    }

    setRedeemLoading(true);
    try {
      // 1. Insert into point_redemptions
      const { data: redemption, error: redErr } = await supabase
        .from("point_redemptions")
        .insert({
          student_id: student.id,
          merchandise_id: merch.id,
          points_used: cost,
          status: "claimed"
        })
        .select()
        .single();
      if (redErr) throw redErr;

      // 2. Update student_points
      const { error: ptsErr } = await supabase
        .from("student_points")
        .update({
          redeemed_points: (studentPoints.redeemed_points || 0) + cost
        })
        .eq("id", studentPoints.id);
      if (ptsErr) throw ptsErr;

      // 3. Insert transaction log
      const { error: txErr } = await supabase
        .from("point_transactions")
        .insert({
          student_id: student.id,
          type: "redeem",
          points: cost,
          description: `Penukaran Bintang: ${merch.name}`,
          redemption_id: redemption.id
        });
      if (txErr) throw txErr;

      // 4. Update merchandise stock
      const { error: merchErr } = await supabase
        .from("merchandise")
        .update({
          stock: stock - 1
        })
        .eq("id", merch.id);
      if (merchErr) throw merchErr;

      toast.success(`Berhasil menukarkan Bintang dengan "${merch.name}"!`);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal melakukan penukaran: " + err.message);
    } finally {
      setRedeemLoading(false);
    }
  };

  const getDriveFileUrl = (fileId: string) => {
    if (!fileId) return "";
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eglbdqjpfdljnkcivfdf.supabase.co';
    return `${baseUrl}/functions/v1/drive-get-url?fileId=${fileId}`;
  };

  const myStars = studentPoints ? (studentPoints.total_points || 0) - (studentPoints.redeemed_points || 0) : 0;

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat data poin bintang...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <Star className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md">
      {/* Header & Balance Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Tukar Bintang & Hadiah</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kumpulkan bintang kehadiran dan tukarkan dengan merchandise menarik.</p>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant flex items-center gap-4 shrink-0">
          <div className="p-3.5 bg-primary/10 text-primary rounded-xl">
            <Star className="w-8 h-8 fill-primary" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Saldo Bintang Aktif</span>
            <h3 className="text-headline-lg font-extrabold text-on-surface">{myStars} Bintang</h3>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="space-y-4">
        <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" /> Katalog Hadiah & Merchandise
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {merchandiseList.map((merch) => {
            const hasEnough = myStars >= parseInt(merch.points_required);
            const isOutOfStock = parseInt(merch.stock || "0") < 1;

            return (
              <div key={merch.id} className="bg-surface rounded-2xl border border-outline-variant overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  {merch.photo_url ? (
                    <img 
                      src={getDriveFileUrl(merch.photo_url)} 
                      alt={merch.name} 
                      className="w-full h-40 object-cover border-b"
                    />
                  ) : (
                    <div className="w-full h-40 bg-surface-container flex items-center justify-center border-b text-on-surface-variant">
                      <Gift className="w-12 h-12" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-on-surface text-base line-clamp-1">{merch.name}</h4>
                    <p className="text-body-sm text-on-surface-variant line-clamp-2 min-h-[40px]">{merch.description || "-"}</p>
                    <div className="flex justify-between items-center text-xs font-bold pt-1">
                      <span className="text-primary flex items-center gap-1">
                        <Star className="w-4 h-4 fill-primary shrink-0" /> {merch.points_required} Bintang
                      </span>
                      <span className={isOutOfStock ? "text-error" : "text-tertiary"}>
                        Stok: {merch.stock || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button 
                    onClick={() => handleRedeem(merch)}
                    disabled={redeemLoading || isOutOfStock || !hasEnough}
                    className={`w-full py-2.5 rounded-xl font-headline-sm font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                      isOutOfStock 
                        ? 'bg-surface-container text-outline cursor-not-allowed shadow-none' 
                        : !hasEnough 
                          ? 'bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/20 hover:bg-[#FFB020]/20'
                          : 'bg-[#FFB020] text-white hover:bg-[#FFB020]/80'
                    }`}
                  >
                    {isOutOfStock ? "Stok Habis" : "Tukar Bintang"}
                  </button>
                </div>
              </div>
            );
          })}
          {merchandiseList.length === 0 && (
            <div className="p-12 text-center text-on-surface-variant italic col-span-full bg-surface-container/20 border border-dashed rounded-2xl">
              Katalog hadiah sedang kosong atau belum diaktifkan oleh admin.
            </div>
          )}
        </div>
      </div>

      {/* Redemption History Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Riwayat Penukaran Saya</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container">
                <th className="p-4 font-label-md text-on-surface-variant">Tanggal Penukaran</th>
                <th className="p-4 font-label-md text-on-surface-variant">Barang / Merchandise</th>
                <th className="p-4 font-label-md text-on-surface-variant text-center">Bintang Digunakan</th>
                <th className="p-4 font-label-md text-on-surface-variant">Status Pengambilan</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((red) => {
                const isClaimed = red.status === "claimed";
                const isPending = red.status === "pending";

                return (
                  <tr key={red.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface">
                      {new Date(red.redeemed_at || red.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-bold text-on-surface">
                      {red.merchandise?.name || "Hadiah"}
                    </td>
                    <td className="p-4 text-center font-extrabold text-primary">
                      {red.points_used} Bintang
                    </td>
                    <td className="p-4">
                      {isClaimed || red.status === "approved" || red.status === "processed" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tertiary-container/30 text-tertiary rounded-full font-bold text-label-sm">
                          <CheckCircle className="w-4 h-4" /> Berhasil Diambil
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-highest text-outline rounded-full font-bold text-label-sm">
                          <Clock className="w-4 h-4" /> Proses Penyiapan
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {redemptions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                    Belum ada penukaran bintang yang Anda lakukan.
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
