"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, BookOpen, Clock, Calendar, Edit, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function KelasPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'>('add');
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    les_type: "les_ahe",
    schedule: "",
    room: "Ruang Utama",
    teacher_id: "",
    level: 1,
    capacity: 6,
  });

  const fetchClassesAndTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select(`
          *,
          teachers (full_name),
          class_members (count)
        `)
        .order("name", { ascending: true });

      if (classesError) throw classesError;

      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("status", "active")
        .order("full_name", { ascending: true });

      if (teachersError) throw teachersError;

      setClasses(classesData || []);
      setTeachers(teachersData || []);
      
      // Set default teacher in form data if available
      if (teachersData && teachersData.length > 0) {
        setFormData(prev => ({ ...prev, teacher_id: teachersData[0].id }));
      }
    } catch (err: any) {
      toast.error("Gagal memuat data kelas: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassesAndTeachers();
  }, [fetchClassesAndTeachers]);

  const openModal = (mode: 'add'|'edit', cls: any = null) => {
    setModalMode(mode);
    setSelectedClass(cls);
    
    if (mode === 'edit' && cls) {
      setFormData({
        name: cls.name || "",
        les_type: cls.les_type || "les_ahe",
        schedule: cls.schedule || "",
        room: cls.room || "Ruang Utama",
        teacher_id: cls.teacher_id || (teachers[0]?.id || ""),
        level: cls.level || 1,
        capacity: cls.capacity || 6,
      });
    } else {
      setFormData({
        name: "",
        les_type: "les_ahe",
        schedule: "",
        room: "Ruang Utama",
        teacher_id: teachers[0]?.id || "",
        level: 1,
        capacity: 6,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const payload = {
        name: formData.name,
        les_type: formData.les_type,
        schedule: formData.schedule,
        room: formData.room,
        teacher_id: formData.teacher_id || null,
        level: formData.les_type !== "les_mapel" ? formData.level : null,
        capacity: Number(formData.capacity)
      };

      if (modalMode === 'add') {
        const { error } = await supabase
          .from("classes")
          .insert({
            ...payload,
            status: "active"
          });

        if (error) throw error;
        toast.success(`Kelas ${formData.name} berhasil dibuat!`);
      } else {
        if (!selectedClass) return;

        const { error } = await supabase
          .from("classes")
          .update(payload)
          .eq("id", selectedClass.id);

        if (error) throw error;
        toast.success(`Kelas ${formData.name} berhasil diperbarui!`);
      }

      await fetchClassesAndTeachers();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan data kelas: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Manajemen Kelas</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola jadwal, kapasitas, dan pengajar untuk tiap kelas.</p>
        </div>
        <button onClick={() => openModal('add')} className="inline-flex items-center gap-2 bg-tertiary text-on-tertiary px-6 py-3 rounded-xl font-headline-sm hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors shadow-sm w-fit">
          <Plus className="w-5 h-5" /> Buat Kelas Baru
        </button>
      </div>

      {/* Grid Kelas */}
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant font-bold">Memuat data kelas...</div>
      ) : classes.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant">Belum ada kelas yang terdaftar.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const studentCount = cls.class_members?.[0]?.count || 0;
            const capacity = cls.capacity || 6;
            const isFull = studentCount >= capacity;
            const percentage = Math.min(100, (studentCount / capacity) * 100);
            
            return (
              <div key={cls.id} className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden hover:border-tertiary transition-colors group">
                <div className="p-6 border-b border-surface-container bg-surface-container-lowest">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-headline-sm font-headline-sm text-on-surface">{cls.name}</h3>
                      <span className="inline-block px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-bold mt-2 uppercase tracking-wider">
                        {cls.les_type === "les_ahe" ? "Les AHE" : cls.les_type === "les_ase" ? "Les ASE" : "Les Mapel"}
                      </span>
                    </div>
                    <button onClick={() => openModal('edit', cls)} className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-tertiary">
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <Calendar className="w-5 h-5 text-tertiary" />
                      <span className="text-body-md">{cls.schedule || "Belum ada jadwal"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <Clock className="w-5 h-5 text-tertiary" />
                      <span className="text-body-md">{cls.room || "Ruang Utama"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <BookOpen className="w-5 h-5 text-tertiary" />
                      <span className="text-body-md font-bold text-on-surface">{cls.teachers?.full_name || "Belum ada guru"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-surface">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-label-md font-bold text-on-surface flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Kapasitas
                    </span>
                    <span className="text-label-md font-bold text-on-surface-variant">
                      {studentCount} / {capacity} Anak
                    </span>
                  </div>
                  <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-error' : 'bg-primary'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  {isFull && <p className="text-label-sm text-error font-bold mt-2">Kelas Penuh!</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kelas Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">
                {modalMode === 'add' ? 'Buat Kelas Baru' : 'Edit Data Kelas'}
              </h3>
              <button disabled={saveLoading} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Nama Kelas</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} required type="text" className="w-full p-3 rounded-xl border border-outline focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none bg-surface" placeholder="Contoh: AHE Level 1" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Program</label>
                    <select name="les_type" value={formData.les_type} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none bg-surface">
                      <option value="les_ahe">AHE (Anak Hebat)</option>
                      <option value="les_ase">ASE (Anak Soleh)</option>
                      <option value="les_mapel">Bimbel Mapel</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Jadwal Hari & Jam</label>
                    <input name="schedule" value={formData.schedule} onChange={handleInputChange} required type="text" className="w-full p-3 rounded-xl border border-outline focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none bg-surface" placeholder="Contoh: Senin & Rabu 14.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Ruang / Lokasi</label>
                    <input name="room" value={formData.room} onChange={handleInputChange} required type="text" className="w-full p-3 rounded-xl border border-outline focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none bg-surface" placeholder="Contoh: Ruang Utama" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Guru Pengajar</label>
                    <select name="teacher_id" value={formData.teacher_id} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none bg-surface">
                      <option value="">Pilih Guru Pengajar</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                  {formData.les_type !== "les_mapel" && (
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Level / Tingkatan</label>
                      <input name="level" value={formData.level} onChange={handleInputChange} required type="number" min="1" max={formData.les_type === "les_ahe" ? 8 : 16} className="w-full p-3 rounded-xl border border-outline focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none bg-surface" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Kapasitas Kelas (Anak)</label>
                    <input name="capacity" value={formData.capacity} onChange={handleInputChange} required type="number" min="1" className="w-full p-3 rounded-xl border border-outline focus:border-tertiary focus:ring-1 focus:ring-tertiary outline-none bg-surface" />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                {saveLoading ? (
                  <div className="flex items-center gap-2 text-tertiary font-bold py-2">
                    <div className="w-5 h-5 border-2 border-tertiary border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan data...
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors">
                      Batal
                    </button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-tertiary text-on-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container shadow-sm font-headline-sm transition-colors">
                      {modalMode === 'add' ? 'Simpan Data' : 'Perbarui Data'}
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
