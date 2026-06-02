"use client";

import { useState, useEffect, useCallback } from "react";
import { Award, Plus, Search, Edit, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store";

export default function GuruPrestasiPage() {
  const { user } = useAuthStore();
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'>('add');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    student_id: "",
    student_les_id: "",
    created_at: new Date().toISOString().split('T')[0],
    module_page: "",
    topic: "",
    score: "",
    notes: ""
  });

  const fetchTeacherProfileAndData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch teacher profile
      const { data: teacher, error: tErr } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (tErr) throw tErr;

      // Fallback: if no profile linked to auth, fetch first teacher as fallback
      let activeTeacher = teacher;
      if (!activeTeacher) {
        const { data: fallbackTeachers } = await supabase.from("teachers").select("*").limit(1);
        if (fallbackTeachers && fallbackTeachers.length > 0) {
          activeTeacher = fallbackTeachers[0];
        }
      }
      setTeacherProfile(activeTeacher);

      // 2. Fetch achievements scoped to teacher profile if found
      let query = supabase
        .from("achievements")
        .select(`
          *,
          students (full_name),
          student_les (*)
        `);

      if (activeTeacher) {
        query = query.eq("recorded_by", activeTeacher.id);
      }

      const { data: achievementsData, error: achErr } = await query.order("created_at", { ascending: false });
      if (achErr) throw achErr;
      setAchievements(achievementsData || []);

      // 3. Fetch all active students
      const { data: studentsData, error: studentErr } = await supabase
        .from("students")
        .select("*, student_les(*)")
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (studentErr) throw studentErr;
      setStudents(studentsData || []);
    } catch (err: any) {
      toast.error("Gagal memuat data prestasi: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeacherProfileAndData();
  }, [fetchTeacherProfileAndData]);

  const filteredAchievements = achievements.filter(a => 
    a.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLesTypeLabel = (lesType: string) => {
    if (lesType === 'les_ahe') return 'AHE';
    if (lesType === 'les_ase') return 'ASE';
    if (lesType === 'les_mapel') return 'Mapel';
    return lesType;
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

  const openModal = (mode: 'add'|'edit', item: any = null) => {
    setModalMode(mode);
    if (mode === 'add') {
      const firstStudent = students[0];
      const firstLes = firstStudent?.student_les?.[0];
      setFormData({
        student_id: firstStudent?.id || "",
        student_les_id: firstLes?.id || "",
        created_at: new Date().toISOString().split('T')[0],
        module_page: "",
        topic: "",
        score: "",
        notes: ""
      });
      setSelectedId(null);
    } else if (mode === 'edit' && item) {
      setSelectedId(item.id);
      setFormData({
        student_id: item.student_id,
        student_les_id: item.student_les_id || "",
        created_at: new Date(item.created_at).toISOString().split('T')[0],
        module_page: item.module_page || "",
        topic: item.topic || "",
        score: item.score?.toString() || "",
        notes: item.notes || ""
      });
    }
    setIsModalOpen(true);
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const lesList = student?.student_les || [];
    setFormData(prev => ({
      ...prev,
      student_id: studentId,
      student_les_id: lesList.length > 0 ? lesList[0].id : ""
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const selectedStudent = students.find(s => s.id === formData.student_id);
      const selectedLes = selectedStudent?.student_les?.find((l: any) => l.id === formData.student_les_id);

      if (!selectedLes) {
        throw new Error("Murid belum terdaftar atau belum memilih program les");
      }

      const payload = {
        student_id: formData.student_id,
        student_les_id: formData.student_les_id,
        les_type: selectedLes.les_type,
        level: selectedLes.current_level,
        module_page: formData.module_page,
        topic: formData.topic,
        score: parseFloat(formData.score),
        notes: formData.notes,
        created_at: new Date(formData.created_at).toISOString(),
        recorded_by: teacherProfile?.id || null
      };

      if (modalMode === 'add') {
        const { error } = await supabase
          .from("achievements")
          .insert(payload);
        if (error) throw error;
        toast.success("Data nilai berhasil ditambahkan!");
      } else {
        const { error } = await supabase
          .from("achievements")
          .update(payload)
          .eq("id", selectedId!);
        if (error) throw error;
        toast.success("Data nilai berhasil diperbarui!");
      }

      setIsModalOpen(false);
      fetchTeacherProfileAndData();
    } catch (err: any) {
      toast.error("Gagal menyimpan data nilai: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data nilai ini?")) return;
    try {
      const { error } = await supabase
        .from("achievements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Data nilai berhasil dihapus!");
      fetchTeacherProfileAndData();
    } catch (err: any) {
      toast.error("Gagal menghapus data nilai: " + err.message);
    }
  };

  const selectedStudentObj = students.find(s => s.id === formData.student_id);
  const studentLesList = selectedStudentObj?.student_les || [];

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Data Prestasi & Nilai</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Catat nilai perkembangan harian murid per modul.</p>
        </div>
        <button onClick={() => openModal('add')} className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm w-fit cursor-pointer">
          <Plus className="w-5 h-5" /> Input Nilai Baru
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Riwayat Nilai Murid</h3>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Cari nama murid..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-64"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold text-body-md">Memuat data prestasi...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Modul & Materi</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-center">Nilai</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Catatan</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAchievements.map((item) => (
                  <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{item.students?.full_name}</div>
                      <div className="text-body-sm text-on-surface-variant">
                        {getStudentLesName(item.student_les)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{item.module_page}</div>
                      <div className="text-body-sm text-on-surface-variant">{item.topic}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-12 bg-primary-container text-on-primary-container rounded-full text-headline-sm font-bold shadow-sm">
                        {Number(item.score || 0)}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant max-w-[200px] truncate" title={item.notes || ""}>
                      {item.notes || "-"}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button onClick={() => openModal('edit', item)} className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary cursor-pointer inline-block">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-error cursor-pointer inline-block">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAchievements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Tidak ada data prestasi yang sesuai pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nilai Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">
                {modalMode === 'add' ? 'Input Nilai Baru' : 'Edit Data Nilai'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Pilih Murid</label>
                    <select 
                      required
                      value={formData.student_id}
                      onChange={(e) => handleStudentChange(e.target.value)}
                      disabled={modalMode === 'edit'}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                    >
                      <option value="" disabled>-- Pilih Murid --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Program Les Murid</label>
                    <select 
                      required
                      value={formData.student_les_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_les_id: e.target.value }))}
                      disabled={modalMode === 'edit'}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                    >
                      <option value="" disabled>-- Pilih Program Les --</option>
                      {studentLesList.map((les: any) => (
                        <option key={les.id} value={les.id}>{getStudentLesName(les)}</option>
                      ))}
                    </select>
                    {studentLesList.length === 0 && formData.student_id && (
                      <p className="text-error text-body-sm mt-1">Murid belum terdaftar di program les apapun.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Tanggal Penilaian</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.created_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, created_at: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Modul</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Contoh: Modul 3 / Halaman 15" 
                      value={formData.module_page}
                      onChange={(e) => setFormData(prev => ({ ...prev, module_page: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Materi Pokok</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Contoh: Membaca Suku Kata" 
                      value={formData.topic}
                      onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Nilai Angka (0-100)</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="100" 
                      value={formData.score}
                      onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-bold text-2xl text-center text-on-surface" 
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-label-md font-bold text-on-surface">Catatan Tambahan</label>
                    <textarea 
                      placeholder="Komentar perkembangan murid..." 
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading || studentLesList.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'add' ? 'Simpan Data' : 'Perbarui Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
