"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Gift, Search, ArrowRight, X, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function PoinPage() {
  const [studentPoints, setStudentPoints] = useState<any[]>([]);
  const [merchandiseList, setMerchandiseList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    merchandise_id: ""
  });

  // Merchandise form state
  const [isMerchModalOpen, setIsMerchModalOpen] = useState(false);
  const [merchModalMode, setMerchModalMode] = useState<'add'|'edit'>('add');
  const [selectedMerchForEdit, setSelectedMerchForEdit] = useState<any | null>(null);
  const [merchFormData, setMerchFormData] = useState({
    name: "",
    points_required: 1,
    stock: 0,
    description: ""
  });

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

  const fetchPoinData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch student points leaderboard
      const { data: ptsData, error: ptsErr } = await supabase
        .from("student_points")
        .select(`
          *,
          students (
            *,
            student_les (*)
          )
        `);
      if (ptsErr) throw ptsErr;
      setStudentPoints(ptsData || []);

      // 2. Fetch merchandise catalog
      const { data: merchData, error: merchErr } = await supabase
        .from("merchandise")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (merchErr) throw merchErr;
      setMerchandiseList(merchData || []);

      // 3. Fetch active students with points for dropdown
      const { data: stdData, error: stdErr } = await supabase
        .from("students")
        .select("*, student_points(*)")
        .eq("status", "active")
        .order("full_name");
      if (stdErr) throw stdErr;
      setStudents(stdData || []);
    } catch (err: any) {
      toast.error("Gagal memuat data poin: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoinData();
  }, [fetchPoinData]);

  const filteredPoints = studentPoints.filter(p => 
    p.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Leaderboard sorting: balance descending
  const sortedPoints = [...filteredPoints].sort((a, b) => {
    const balA = (a.total_points || 0) - (a.redeemed_points || 0);
    const balB = (b.total_points || 0) - (b.redeemed_points || 0);
    return balB - balA;
  });

  const openModal = () => {
    const firstStudent = students[0];
    const firstMerch = merchandiseList[0];
    setFormData({
      student_id: firstStudent?.id || "",
      merchandise_id: firstMerch?.id || ""
    });
    setIsModalOpen(true);
  };

  const openMerchModal = (mode: 'add'|'edit', merch: any = null) => {
    setMerchModalMode(mode);
    setSelectedMerchForEdit(merch);
    if (mode === 'edit' && merch) {
      setMerchFormData({
        name: merch.name || "",
        points_required: merch.points_required || 1,
        stock: merch.stock || 0,
        description: merch.description || ""
      });
    } else {
      setMerchFormData({
        name: "",
        points_required: 1,
        stock: 10,
        description: ""
      });
    }
    setIsMerchModalOpen(true);
  };

  const handleSaveMerch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const payload = {
        name: merchFormData.name,
        points_required: Number(merchFormData.points_required),
        stock: Number(merchFormData.stock),
        description: merchFormData.description || null
      };

      if (merchModalMode === 'add') {
        const { error } = await supabase
          .from("merchandise")
          .insert({
            ...payload,
            is_active: true
          });

        if (error) throw error;
        toast.success(`Hadiah "${merchFormData.name}" berhasil ditambahkan!`);
      } else {
        if (!selectedMerchForEdit) return;

        const { error } = await supabase
          .from("merchandise")
          .update(payload)
          .eq("id", selectedMerchForEdit.id);

        if (error) throw error;
        toast.success(`Hadiah "${merchFormData.name}" berhasil diperbarui!`);
      }

      await fetchPoinData();
      setIsMerchModalOpen(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan hadiah: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteMerch = async (merch: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus hadiah "${merch.name}" dari katalog?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("merchandise")
        .update({ is_active: false })
        .eq("id", merch.id);

      if (error) throw error;
      toast.success(`Hadiah "${merch.name}" berhasil dihapus dari katalog.`);
      await fetchPoinData();
    } catch (err: any) {
      toast.error("Gagal menghapus hadiah: " + err.message);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const student = students.find(s => s.id === formData.student_id);
      const merchandise = merchandiseList.find(m => m.id === formData.merchandise_id);

      if (!student) throw new Error("Murid tidak ditemukan");
      if (!merchandise) throw new Error("Hadiah tidak ditemukan");

      // Verify points sufficiency
      const pointsRecord = student.student_points?.[0];
      const totalPoints = pointsRecord ? pointsRecord.total_points : 0;
      const redeemedPoints = pointsRecord ? pointsRecord.redeemed_points : 0;
      const activeBalance = totalPoints - redeemedPoints;
      
      const cost = parseInt(merchandise.points_required);
      const stock = parseInt(merchandise.stock || "0");

      if (activeBalance < cost) {
        throw new Error(`Poin bintang murid tidak mencukupi (Poin saat ini: ${activeBalance} Bintang, Hadiah membutuhkan: ${cost} Bintang)`);
      }

      if (stock < 1) {
        throw new Error("Stok hadiah telah habis!");
      }

      // 1. Insert into point_redemptions
      const { data: redemption, error: redErr } = await supabase
        .from("point_redemptions")
        .insert({
          student_id: student.id,
          merchandise_id: merchandise.id,
          points_used: cost,
          status: "claimed"
        })
        .select()
        .single();
      if (redErr) throw redErr;

      // 2. Update student_points (increment redeemed_points)
      const { error: ptsErr } = await supabase
        .from("student_points")
        .update({
          redeemed_points: redeemedPoints + cost,
          updated_at: new Date().toISOString()
        })
        .eq("id", pointsRecord.id);
      if (ptsErr) throw ptsErr;

      // 3. Insert transaction log
      const { error: txErr } = await supabase
        .from("point_transactions")
        .insert({
          student_id: student.id,
          type: "redeem",
          points: cost,
          description: `Penukaran Hadiah: ${merchandise.name}`,
          redemption_id: redemption.id
        });
      if (txErr) throw txErr;

      // 4. Update merchandise stock
      const { error: merchErr } = await supabase
        .from("merchandise")
        .update({
          stock: stock - 1
        })
        .eq("id", merchandise.id);
      if (merchErr) throw merchErr;

      toast.success("Penukaran poin berhasil! Stok hadiah telah diperbarui.");
      setIsModalOpen(false);
      fetchPoinData();
    } catch (err: any) {
      toast.error("Gagal menukarkan poin: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Estimator values for Modal
  const selectedStudent = students.find(s => s.id === formData.student_id);
  const selectedStudentPts = selectedStudent?.student_points?.[0];
  const currentPts = selectedStudentPts ? (selectedStudentPts.total_points - selectedStudentPts.redeemed_points) : 0;

  const selectedMerch = merchandiseList.find(m => m.id === formData.merchandise_id);
  const merchCost = selectedMerch ? parseInt(selectedMerch.points_required) : 0;
  const afterPts = currentPts - merchCost;

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Poin Bintang & Hadiah</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola perolehan poin bintang murid dan penukaran hadiah.</p>
        </div>
        <button 
          onClick={openModal} 
          disabled={loading || students.length === 0 || merchandiseList.length === 0}
          className="inline-flex items-center gap-2 bg-[#FFB020] text-white px-6 py-3 rounded-xl font-headline-sm hover:bg-[#FFB020]/80 disabled:opacity-50 transition-colors shadow-sm w-fit"
        >
          <Gift className="w-5 h-5" /> Tukar Poin
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Klasemen Poin Murid</h3>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Cari nama murid..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-[#FFB020] focus:border-[#FFB020] outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-64"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-bold text-body-md">Memuat klasemen poin...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-surface-container">
                    <th className="p-4 font-label-md text-on-surface-variant">Peringkat</th>
                    <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                    <th className="p-4 font-label-md text-on-surface-variant">Program</th>
                    <th className="p-4 font-label-md text-on-surface-variant text-right">Saldo Bintang</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPoints.map((item, index) => {
                    const balance = (item.total_points || 0) - (item.redeemed_points || 0);
                    return (
                      <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4 font-bold text-on-surface-variant">#{index + 1}</td>
                        <td className="p-4 font-bold text-on-surface">{item.students?.full_name}</td>
                        <td className="p-4">
                          <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                            {getLesProgramInfo(item.students?.student_les)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2 font-bold text-lg">
                            <span>{balance}</span>
                            <Star className="w-5 h-5 fill-[#FFB020] text-[#FFB020]" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedPoints.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                        Tidak ada data poin yang sesuai pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Katalog Hadiah</h3>
            <button 
              onClick={() => openMerchModal('add')}
              className="inline-flex items-center gap-1 bg-[#FFF4E5] text-[#FFB020] px-3 py-1.5 rounded-xl text-label-md font-bold hover:bg-[#FFB020] hover:text-white border border-[#FFD070] transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {merchandiseList.map(reward => (
                <div key={reward.id} className="bg-surface p-4 rounded-2xl border border-outline-variant shadow-sm flex items-center justify-between group">
                  <div className="space-y-1">
                    <h4 className="font-bold text-on-surface">{reward.name}</h4>
                    <p className="text-label-sm text-on-surface-variant">Sisa Stok: {reward.stock}</p>
                    {reward.description && <p className="text-body-sm text-on-surface-variant">{reward.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-[#FFF4E5] px-3 py-1.5 rounded-lg flex items-center gap-1 border border-[#FFD070]">
                      <span className="font-bold text-[#FFB020]">{reward.points_required}</span>
                      <Star className="w-4 h-4 fill-[#FFB020] text-[#FFB020]" />
                    </div>
                    <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openMerchModal('edit', reward)}
                        className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-[#FFB020] transition-colors"
                        title="Edit Hadiah"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMerch(reward)}
                        className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-error transition-colors"
                        title="Hapus Hadiah"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {merchandiseList.length === 0 && (
                <p className="text-center text-on-surface-variant text-body-sm py-8">Katalog hadiah kosong.</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Modal Tukar Hadiah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <Gift className="w-6 h-6 text-[#FFB020]" /> Tukar Poin Bintang
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Pilih Murid</label>
                  <select 
                    required
                    value={formData.student_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-[#FFB020] focus:ring-1 focus:ring-[#FFB020] outline-none bg-surface"
                  >
                    <option value="" disabled>-- Pilih Murid --</option>
                    {students.map(s => {
                      const ptsRec = s.student_points?.[0];
                      const bal = ptsRec ? (ptsRec.total_points - ptsRec.redeemed_points) : 0;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({bal} Bintang)
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Pilih Hadiah</label>
                  <select 
                    required
                    value={formData.merchandise_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, merchandise_id: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#FFB020] focus:ring-1 focus:ring-[#FFB020] outline-none bg-surface"
                  >
                    <option value="" disabled>-- Pilih Hadiah --</option>
                    {merchandiseList.map(m => {
                      const isOutOfStock = parseInt(m.stock || "0") < 1;
                      return (
                        <option key={m.id} value={m.id} disabled={isOutOfStock}>
                          {m.name} ({m.points_required} Bintang) {isOutOfStock ? "- STOK HABIS" : `(Stok: ${m.stock})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                {formData.student_id && formData.merchandise_id && (
                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant mt-4">
                    <h4 className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">Estimasi Sisa Poin</h4>
                    <div className="flex items-center justify-between font-bold text-lg">
                      <div className="flex items-center gap-1 text-on-surface">
                        {currentPts} <Star className="w-4 h-4 fill-[#FFB020] text-[#FFB020]" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-on-surface-variant" />
                      <div className={`flex items-center gap-1 ${afterPts < 0 ? 'text-error' : 'text-[#FFB020]'}`}>
                        {afterPts} <Star className="w-4 h-4 fill-[#FFB020] text-[#FFB020]" />
                      </div>
                    </div>
                    {afterPts < 0 && (
                      <p className="text-error text-body-sm mt-2 font-bold text-center">Bintang murid tidak mencukupi untuk menukar hadiah ini!</p>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading || afterPts < 0}
                  className="px-6 py-2.5 rounded-xl bg-[#FFB020] text-white hover:bg-[#FFB020]/80 disabled:opacity-50 shadow-sm font-headline-sm transition-colors flex items-center gap-2"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Konfirmasi Penukaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Hadiah */}
      {isMerchModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-md min-w-[300px] sm:min-w-[450px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <Gift className="w-6 h-6 text-[#FFB020]" />
                {merchModalMode === 'add' ? 'Tambah Hadiah Baru' : 'Edit Data Hadiah'}
              </h3>
              <button disabled={saveLoading} onClick={() => setIsMerchModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSaveMerch} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Nama Hadiah</label>
                  <input 
                    name="name" 
                    value={merchFormData.name} 
                    onChange={(e) => setMerchFormData(prev => ({ ...prev, name: e.target.value }))} 
                    required 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-outline focus:border-[#FFB020] focus:ring-1 focus:ring-[#FFB020] outline-none bg-surface" 
                    placeholder="Contoh: Pensil Karakter, Buku Tulis" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Bintang Dibutuhkan</label>
                    <input 
                      name="points_required" 
                      value={merchFormData.points_required} 
                      onChange={(e) => setMerchFormData(prev => ({ ...prev, points_required: Number(e.target.value) }))} 
                      required 
                      type="number" 
                      min="1" 
                      className="w-full p-3 rounded-xl border border-outline focus:border-[#FFB020] focus:ring-1 focus:ring-[#FFB020] outline-none bg-surface" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Stok</label>
                    <input 
                      name="stock" 
                      value={merchFormData.stock} 
                      onChange={(e) => setMerchFormData(prev => ({ ...prev, stock: Number(e.target.value) }))} 
                      required 
                      type="number" 
                      min="0" 
                      className="w-full p-3 rounded-xl border border-outline focus:border-[#FFB020] focus:ring-1 focus:ring-[#FFB020] outline-none bg-surface" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Deskripsi (Opsional)</label>
                  <textarea 
                    name="description" 
                    value={merchFormData.description} 
                    onChange={(e) => setMerchFormData(prev => ({ ...prev, description: e.target.value }))} 
                    className="w-full p-3 rounded-xl border border-outline focus:border-[#FFB020] focus:ring-1 focus:ring-[#FFB020] outline-none bg-surface min-h-[80px]" 
                    placeholder="Deskripsi singkat hadiah..." 
                  />
                </div>
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                {saveLoading ? (
                  <div className="flex items-center gap-2 text-[#FFB020] font-bold py-2">
                    <div className="w-5 h-5 border-2 border-[#FFB020] border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan...
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsMerchModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors">
                      Batal
                    </button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#FFB020] text-white hover:bg-[#FFB020]/80 shadow-sm font-headline-sm transition-colors">
                      {merchModalMode === 'add' ? 'Simpan' : 'Perbarui'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

