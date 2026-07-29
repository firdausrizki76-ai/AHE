"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCog, UserCheck, UserMinus, Search, Edit, Plus, X, Eye, Trash2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import BarcodeCardModal from "@/components/attendance/BarcodeCardModal";

export default function GuruPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'>('add');
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTeacher, setPreviewTeacher] = useState<any | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nip: "",
    nik: "",
    full_name: "",
    gender: "L",
    whatsapp: "",
    birth_place: "",
    birth_date: "",
    address: "",
    rt: "",
    rw: "",
    village: "",
    district: "",
    regency: "",
    position: "Guru Utama",
    status: "active",
    photo_url: "",
    kk_url: "",
    ktp_url: "",
    ijazah_url: ""
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [kkFile, setKkFile] = useState<File | null>(null);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ijazahFile, setIjazahFile] = useState<File | null>(null);

  const getDriveFileUrl = (fileId: string) => {
    if (!fileId) return "";
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eglbdqjpfdljnkcivfdf.supabase.co';
    return `${baseUrl}/functions/v1/drive-get-url?fileId=${fileId}`;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadToDrive = async (file: File, folderName: string): Promise<string | null> => {
    try {
      const { data: folderData, error: folderError } = await supabase
        .from("drive_folders")
        .select("folder_id")
        .eq("name", folderName)
        .single();

      if (folderError) throw folderError;
      const folderId = folderData?.folder_id;
      if (!folderId) throw new Error("Folder ID tidak ditemukan");

      const base64Data = await fileToBase64(file);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke("drive-upload", {
        body: {
          fileBase64: base64Data,
          mimeType: file.type,
          fileName: `${Date.now()}_${file.name}`,
          folderId: folderId
        }
      });

      if (uploadError) throw uploadError;
      if (uploadData?.error) throw new Error(uploadData.error);
      
      return uploadData?.fileId || null;
    } catch (err: any) {
      console.error("Gagal mengunggah file ke Google Drive:", err);
      toast.error(`Gagal mengunggah file ${file.name}: ${err.message}`);
      return null;
    }
  };

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat data guru: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const activeCount = teachers.filter(t => t.status === 'active').length;
  const inactiveCount = teachers.filter(t => t.status === 'inactive').length;

  const filteredTeachers = teachers.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.nip && t.nip.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openModal = (mode: 'add'|'edit', teacher: any = null) => {
    setModalMode(mode);
    setSelectedTeacher(teacher);
    
    // Reset file selections
    setPhotoFile(null);
    setKkFile(null);
    setKtpFile(null);
    setIjazahFile(null);

    if (mode === 'edit' && teacher) {
      setFormData({
        nip: teacher.nip || "",
        nik: teacher.nik || "",
        full_name: teacher.full_name || "",
        gender: teacher.gender || "L",
        whatsapp: teacher.whatsapp || "",
        birth_place: teacher.birth_place || "",
        birth_date: teacher.birth_date || "",
        address: teacher.address || "",
        rt: teacher.rt || "",
        rw: teacher.rw || "",
        village: teacher.village || "",
        district: teacher.district || "",
        regency: teacher.regency || "",
        position: teacher.position || "Guru Utama",
        status: teacher.status || "active",
        photo_url: teacher.photo_url || "",
        kk_url: teacher.kk_url || "",
        ktp_url: teacher.ktp_url || "",
        ijazah_url: teacher.ijazah_url || "",
      });
    } else {
      setFormData({
        nip: "",
        nik: "",
        full_name: "",
        gender: "L",
        whatsapp: "",
        birth_place: "",
        birth_date: "",
        address: "",
        rt: "",
        rw: "",
        village: "",
        district: "",
        regency: "",
        position: "Guru Utama",
        status: "active",
        photo_url: "",
        kk_url: "",
        ktp_url: "",
        ijazah_url: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      let photoUrlValue = formData.photo_url || null;
      let kkUrlValue = formData.kk_url || null;
      let ktpUrlValue = formData.ktp_url || null;
      let ijazahUrlValue = formData.ijazah_url || null;

      if (photoFile) {
        const fileId = await uploadToDrive(photoFile, "guru");
        if (fileId) photoUrlValue = fileId;
      }
      if (kkFile) {
        const fileId = await uploadToDrive(kkFile, "guru");
        if (fileId) kkUrlValue = fileId;
      }
      if (ktpFile) {
        const fileId = await uploadToDrive(ktpFile, "guru");
        if (fileId) ktpUrlValue = fileId;
      }
      if (ijazahFile) {
        const fileId = await uploadToDrive(ijazahFile, "guru");
        if (fileId) ijazahUrlValue = fileId;
      }

      if (modalMode === 'add') {
        const { error } = await supabase
          .from("teachers")
          .insert({
            nip: formData.nip || null,
            nik: formData.nik || null,
            full_name: formData.full_name,
            gender: formData.gender,
            whatsapp: formData.whatsapp || null,
            birth_place: formData.birth_place || null,
            birth_date: formData.birth_date || null,
            address: formData.address || null,
            rt: formData.rt || null,
            rw: formData.rw || null,
            village: formData.village || null,
            district: formData.district || null,
            regency: formData.regency || null,
            position: formData.position,
            status: formData.status,
            photo_url: photoUrlValue,
            kk_url: kkUrlValue,
            ktp_url: ktpUrlValue,
            ijazah_url: ijazahUrlValue
          });

        if (error) throw error;
        toast.success(`Data guru ${formData.full_name} berhasil ditambahkan!`);
      } else {
        if (!selectedTeacher) return;

        const { error } = await supabase
          .from("teachers")
          .update({
            nip: formData.nip || null,
            nik: formData.nik || null,
            full_name: formData.full_name,
            gender: formData.gender,
            whatsapp: formData.whatsapp || null,
            birth_place: formData.birth_place || null,
            birth_date: formData.birth_date || null,
            address: formData.address || null,
            rt: formData.rt || null,
            rw: formData.rw || null,
            village: formData.village || null,
            district: formData.district || null,
            regency: formData.regency || null,
            position: formData.position,
            status: formData.status,
            photo_url: photoUrlValue,
            kk_url: kkUrlValue,
            ktp_url: ktpUrlValue,
            ijazah_url: ijazahUrlValue
          })
          .eq("id", selectedTeacher.id);

        if (error) throw error;
        toast.success(`Data guru ${formData.full_name} berhasil diperbarui!`);
      }

      await fetchTeachers();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan data: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data guru "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      // De-associate classrooms taught by this teacher first to prevent FK constraint failures
      await supabase.from("classes").update({ teacher_id: null }).eq("teacher_id", id);
      await supabase.from("teacher_attendance").delete().eq("teacher_id", id);

      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(`Data guru ${name} berhasil dihapus.`);
      await fetchTeachers();
    } catch (err: any) {
      console.error("Gagal menghapus guru:", err);
      toast.error("Gagal menghapus data guru: " + err.message);
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
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Data Guru / Tentor</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola staf pengajar, absensi, dan informasi kontak.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsBarcodeModalOpen(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-3 rounded-xl font-headline-sm hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm"
          >
            <QrCode className="w-5 h-5" /> Cetak Kartu Barcode
          </button>
          <button
            onClick={() => openModal('add')}
            className="inline-flex items-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-xl font-headline-sm hover:bg-secondary-container hover:text-on-secondary-container transition-colors shadow-sm w-fit"
          >
            <Plus className="w-5 h-5" /> Tambah Guru
          </button>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-secondary-container text-on-secondary-container rounded-xl">
            <UserCog className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Total Guru</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : teachers.length}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Guru Aktif</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : activeCount}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-error-container text-on-error-container rounded-xl">
            <UserMinus className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Nonaktif / Cuti</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : inactiveCount}</h3>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Guru</h3>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Cari nama atau NIP..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-bold">Memuat data guru...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">Profil</th>
                  <th className="p-4 font-label-md text-on-surface-variant">NIP</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Peran</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Kontak</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {teacher.photo_url ? (
                          <img src={getDriveFileUrl(teacher.photo_url)} alt="Foto Guru" className="w-10 h-10 rounded-full object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-lg">
                            {teacher.full_name.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-on-surface">{teacher.full_name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-on-surface-variant">{teacher.nip || "-"}</td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-surface-container text-on-surface rounded-full text-label-sm font-bold">
                        {teacher.position || "-"}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface">{teacher.whatsapp || "-"}</td>
                    <td className="p-4">
                      {teacher.status === 'active' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-tertiary-container/50 text-tertiary font-bold text-label-sm">Aktif</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-error-container/50 text-error font-bold text-label-sm">Nonaktif</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setPreviewTeacher(teacher); setIsPreviewOpen(true); }} 
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-secondary"
                          title="Preview Biodata"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openModal('edit', teacher)} 
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-secondary"
                          title="Edit Data"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(teacher.id, teacher.full_name)} 
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-error"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Tidak ada data guru yang sesuai pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Guru Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">
                {modalMode === 'add' ? 'Tambah Guru Baru' : 'Edit Data Guru'}
              </h3>
              <button disabled={saveLoading} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Data Pribadi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">NIP</label>
                      <input name="nip" value={formData.nip} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" placeholder="Nomor Induk Pegawai" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">NIK</label>
                      <input required name="nik" value={formData.nik} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" placeholder="Nomor Induk Kependudukan" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Nama Lengkap</label>
                      <input required name="full_name" value={formData.full_name} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" placeholder="Nama Lengkap sesuai KTP" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jenis Kelamin</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface">
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nomor WhatsApp</label>
                      <input required name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" placeholder="Contoh: 62812..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tempat Lahir</label>
                      <input required name="birth_place" value={formData.birth_place} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" placeholder="Kota Kelahiran" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tanggal Lahir</label>
                      <input required name="birth_date" value={formData.birth_date} onChange={handleInputChange} type="date" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Alamat</h4>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Alamat Lengkap</label>
                    <textarea required name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface min-h-[80px]" placeholder="Nama Jalan, Gg, No Rumah"></textarea>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">RT</label>
                      <input name="rt" value={formData.rt} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">RW</label>
                      <input name="rw" value={formData.rw} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Desa / Kelurahan</label>
                      <input name="village" value={formData.village} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Kecamatan</label>
                      <input name="district" value={formData.district} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Kabupaten / Kota</label>
                      <input name="regency" value={formData.regency} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Status & Jabatan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jabatan / Peran</label>
                      <select name="position" value={formData.position} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface">
                        <option value="Guru Utama">Guru Utama</option>
                        <option value="Guru Pengganti">Guru Pengganti</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Status Guru</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface">
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif / Cuti</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Berkas Lampiran (Upload Scan)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Foto Guru</label>
                      <input onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} type="file" accept="image/*" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold" />
                      {formData.photo_url && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={getDriveFileUrl(formData.photo_url)} alt="Foto Guru" className="w-14 h-14 rounded-lg object-cover border" />
                          <span className="text-xs text-on-surface-variant">Foto tersimpan</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Scan Kartu Keluarga (KK)</label>
                      <input onChange={(e) => setKkFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold" />
                      {formData.kk_url && (
                        <div className="mt-2">
                          <a href={getDriveFileUrl(formData.kk_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline font-bold inline-flex items-center gap-1">
                            📄 Lihat Scan KK
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Scan KTP</label>
                      <input onChange={(e) => setKtpFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold" />
                      {formData.ktp_url && (
                        <div className="mt-2">
                          <a href={getDriveFileUrl(formData.ktp_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline font-bold inline-flex items-center gap-1">
                            📄 Lihat Scan KTP
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Scan Ijazah</label>
                      <input onChange={(e) => setIjazahFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold" />
                      {formData.ijazah_url && (
                        <div className="mt-2">
                          <a href={getDriveFileUrl(formData.ijazah_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline font-bold inline-flex items-center gap-1">
                            📄 Lihat Scan Ijazah
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                {saveLoading ? (
                  <div className="flex items-center gap-2 text-secondary font-bold py-2">
                    <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan data...
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors">
                      Batal
                    </button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-secondary text-on-secondary hover:bg-secondary-container shadow-sm font-headline-sm transition-colors">
                      {modalMode === 'add' ? 'Simpan Data' : 'Perbarui Data'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Biodata Modal */}
      {isPreviewOpen && previewTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Detail Biodata Guru / Tentor</h3>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 max-h-[75vh]">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-outline-variant">
                {previewTeacher.photo_url ? (
                  <img src={getDriveFileUrl(previewTeacher.photo_url)} alt="Foto Guru" className="w-28 h-28 rounded-2xl object-cover border-2 border-secondary shadow-sm" />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-headline-xl border-2 border-secondary shadow-sm">
                    {previewTeacher.full_name.charAt(0)}
                  </div>
                )}
                <div className="text-center sm:text-left space-y-1">
                  <h4 className="text-headline-md font-bold text-on-surface">{previewTeacher.full_name}</h4>
                  <p className="text-body-md text-on-surface-variant font-medium">NIP: <span className="font-bold text-secondary">{previewTeacher.nip || "-"}</span></p>
                  <span className={`inline-block px-3 py-1 rounded-full text-label-sm font-bold ${previewTeacher.status === 'active' ? 'bg-tertiary-container text-tertiary' : 'bg-error-container text-error'}`}>
                    {previewTeacher.status === 'active' ? 'Aktif' : 'Nonaktif / Cuti'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-body-md">
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">NIK</span>
                  <span className="font-bold text-on-surface">{previewTeacher.nik || "-"}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Jabatan / Peran</span>
                  <span className="font-bold text-on-surface">{previewTeacher.position || "-"}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Jenis Kelamin</span>
                  <span className="font-bold text-on-surface">{previewTeacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Tempat, Tanggal Lahir</span>
                  <span className="font-bold text-on-surface">
                    {previewTeacher.birth_place || "-"}, {previewTeacher.birth_date ? new Date(previewTeacher.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Nomor WhatsApp</span>
                  <span className="font-bold text-on-surface">{previewTeacher.whatsapp || "-"}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Alamat Rumah</span>
                  <span className="font-bold text-on-surface">
                    {previewTeacher.address || "-"}, RT {previewTeacher.rt || "-"}/RW {previewTeacher.rw || "-"}, Desa {previewTeacher.village || "-"}, Kec. {previewTeacher.district || "-"}, Kab. {previewTeacher.regency || "-"}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant space-y-3">
                <h4 className="text-label-md font-bold text-secondary uppercase tracking-wider">Berkas Lampiran Scan</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border text-center">
                    <span className="font-bold text-body-sm text-on-surface">Scan KK</span>
                    {previewTeacher.kk_url ? (
                      <a href={getDriveFileUrl(previewTeacher.kk_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors">
                        Buka File
                      </a>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Belum diupload</span>
                    )}
                  </div>
                  <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border text-center">
                    <span className="font-bold text-body-sm text-on-surface">Scan KTP</span>
                    {previewTeacher.ktp_url ? (
                      <a href={getDriveFileUrl(previewTeacher.ktp_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors">
                        Buka File
                      </a>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Belum diupload</span>
                    )}
                  </div>
                  <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border text-center">
                    <span className="font-bold text-body-sm text-on-surface">Scan Ijazah</span>
                    {previewTeacher.ijazah_url ? (
                      <a href={getDriveFileUrl(previewTeacher.ijazah_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors">
                        Buka File
                      </a>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Belum diupload</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end">
              <button onClick={() => setIsPreviewOpen(false)} className="px-6 py-2.5 bg-secondary text-on-secondary rounded-xl font-headline-sm hover:bg-secondary-container transition-colors shadow-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeCardModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title="Cetak Kartu Absensi Guru"
        type="guru"
        items={teachers.map((t) => ({
          id: t.id,
          name: t.full_name,
          subtitle: `NIP: ${t.nip || "-"} | ${t.position || "Guru"}`,
          code: `TCH-${t.id}`,
          photo_url: t.photo_url || "",
          badge: t.position || "Guru Utama",
        }))}
      />
    </div>
  );
}
