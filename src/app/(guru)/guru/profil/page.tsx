"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCog, Edit, X, Upload, Loader2, Phone, MapPin, Calendar, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store";

export default function GuruProfilPage() {
  const { user } = useAuthStore();
  const [teacher, setTeacher] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const fetchTeacherProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch teacher profile linked to user_id
      const { data: teacherData, error: tErr } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tErr) throw tErr;

      // Fallback: if no profile linked to auth, fetch first teacher as fallback
      let activeTeacher = teacherData;
      if (!activeTeacher) {
        const { data: fallbackTeachers } = await supabase.from("teachers").select("*").limit(1);
        if (fallbackTeachers && fallbackTeachers.length > 0) {
          activeTeacher = fallbackTeachers[0];
        }
      }

      setTeacher(activeTeacher);
      if (activeTeacher) {
        setFormData({
          nip: activeTeacher.nip || "",
          nik: activeTeacher.nik || "",
          full_name: activeTeacher.full_name || "",
          gender: activeTeacher.gender || "L",
          whatsapp: activeTeacher.whatsapp || "",
          birth_place: activeTeacher.birth_place || "",
          birth_date: activeTeacher.birth_date || "",
          address: activeTeacher.address || "",
          rt: activeTeacher.rt || "",
          rw: activeTeacher.rw || "",
          village: activeTeacher.village || "",
          district: activeTeacher.district || "",
          regency: activeTeacher.regency || "",
          position: activeTeacher.position || "Guru Utama",
          status: activeTeacher.status || "active",
          photo_url: activeTeacher.photo_url || "",
          kk_url: activeTeacher.kk_url || "",
          ktp_url: activeTeacher.ktp_url || "",
          ijazah_url: activeTeacher.ijazah_url || ""
        });
      }
    } catch (err: any) {
      toast.error("Gagal memuat profil guru: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeacherProfile();
  }, [fetchTeacherProfile]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
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
        .eq("id", teacher.id);

      if (error) throw error;
      toast.success("Profil berhasil diperbarui!");
      setIsModalOpen(false);
      fetchTeacherProfile();
    } catch (err: any) {
      toast.error("Gagal menyimpan profil: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat profil guru...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <UserCog className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Profil Belum Terhubung</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data guru. Hubungi admin untuk menautkan akun Anda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Profil Saya</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola biodata pribadi, dokumen, dan kontak mengajar Anda.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm w-fit cursor-pointer">
          <Edit className="w-5 h-5" /> Edit Profil
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Header */}
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col items-center text-center space-y-4 h-fit">
          <div className="relative">
            {teacher.photo_url ? (
              <img src={getDriveFileUrl(teacher.photo_url)} alt="Foto Guru" className="w-32 h-32 rounded-2xl object-cover border-2 border-primary shadow-sm" />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-headline-xl border-2 border-primary shadow-sm">
                {teacher.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface">{teacher.full_name}</h3>
            <p className="text-body-md text-on-surface-variant font-medium mt-1">NIP: <span className="font-bold text-primary">{teacher.nip || "-"}</span></p>
            <span className={`inline-block px-3 py-1 rounded-full text-label-sm font-bold mt-2 ${teacher.status === 'active' ? 'bg-tertiary-container text-tertiary' : 'bg-error-container text-error'}`}>
              {teacher.status === 'active' ? 'Aktif' : 'Nonaktif / Cuti'}
            </span>
          </div>
          
          <div className="w-full pt-4 border-t border-outline-variant text-left space-y-3">
            <div className="flex items-center gap-3 text-on-surface-variant">
              <User className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="text-xs text-outline block">Jabatan / Peran</span>
                <span className="font-bold text-on-surface text-sm">{teacher.position || "Guru Utama"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Phone className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="text-xs text-outline block">Nomor WhatsApp</span>
                <span className="font-bold text-on-surface text-sm">{teacher.whatsapp || "-"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Calendar className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="text-xs text-outline block">Tempat, Tanggal Lahir</span>
                <span className="font-bold text-on-surface text-sm">
                  {teacher.birth_place || "-"}, {teacher.birth_date ? new Date(teacher.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Detail Biodata & Dokumen */}
        <div className="lg:col-span-2 space-y-6">
          {/* Biodata Card */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-6">
            <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2">Detail Biodata</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">NIK</span>
                <span className="font-bold text-on-surface text-lg">{teacher.nik || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Jenis Kelamin</span>
                <span className="font-bold text-on-surface text-lg">{teacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
              <div className="sm:col-span-2 flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-1" />
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">Alamat Tinggal</span>
                  <span className="font-bold text-on-surface text-lg block">
                    {teacher.address || "-"}
                  </span>
                  <span className="text-body-md text-on-surface-variant mt-1 block">
                    RT {teacher.rt || "-"}/RW {teacher.rw || "-"}, Desa {teacher.village || "-"}, Kec. {teacher.district || "-"}, Kab. {teacher.regency || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Files Card */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2">Berkas Lampiran Scan</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border border-outline-variant text-center">
                <div className="flex flex-col items-center">
                  <FileText className="w-8 h-8 text-primary mb-1" />
                  <span className="font-bold text-body-md text-on-surface">Scan KK</span>
                </div>
                {teacher.kk_url ? (
                  <a href={getDriveFileUrl(teacher.kk_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors cursor-pointer block text-center">
                    Buka File
                  </a>
                ) : (
                  <span className="text-xs text-on-surface-variant italic py-1">Belum diupload</span>
                )}
              </div>
              <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border border-outline-variant text-center">
                <div className="flex flex-col items-center">
                  <FileText className="w-8 h-8 text-primary mb-1" />
                  <span className="font-bold text-body-md text-on-surface">Scan KTP</span>
                </div>
                {teacher.ktp_url ? (
                  <a href={getDriveFileUrl(teacher.ktp_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors cursor-pointer block text-center">
                    Buka File
                  </a>
                ) : (
                  <span className="text-xs text-on-surface-variant italic py-1">Belum diupload</span>
                )}
              </div>
              <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border border-outline-variant text-center">
                <div className="flex flex-col items-center">
                  <FileText className="w-8 h-8 text-primary mb-1" />
                  <span className="font-bold text-body-md text-on-surface">Scan Ijazah</span>
                </div>
                {teacher.ijazah_url ? (
                  <a href={getDriveFileUrl(teacher.ijazah_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors cursor-pointer block text-center">
                    Buka File
                  </a>
                ) : (
                  <span className="text-xs text-on-surface-variant italic py-1">Belum diupload</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profil Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">
                Edit Profil Saya
              </h3>
              <button disabled={saveLoading} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Data Pribadi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">NIP</label>
                      <input name="nip" value={formData.nip} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" placeholder="Nomor Induk Pegawai" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">NIK</label>
                      <input required name="nik" value={formData.nik} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" placeholder="Nomor Induk Kependudukan" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Nama Lengkap</label>
                      <input required name="full_name" value={formData.full_name} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" placeholder="Nama Lengkap" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jenis Kelamin</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface">
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nomor WhatsApp</label>
                      <input required name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" placeholder="Contoh: 62812..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tempat Lahir</label>
                      <input required name="birth_place" value={formData.birth_place} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" placeholder="Kota Kelahiran" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tanggal Lahir</label>
                      <input required name="birth_date" value={formData.birth_date} onChange={handleInputChange} type="date" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Alamat</h4>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Alamat Lengkap</label>
                    <textarea required name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface min-h-[80px]" placeholder="Nama Jalan, Gg, No Rumah"></textarea>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">RT</label>
                      <input name="rt" value={formData.rt} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">RW</label>
                      <input name="rw" value={formData.rw} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Desa / Kelurahan</label>
                      <input name="village" value={formData.village} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Kecamatan</label>
                      <input name="district" value={formData.district} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Kabupaten / Kota</label>
                      <input name="regency" value={formData.regency} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Berkas Lampiran (Upload Scan)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Foto Profil</label>
                      <input onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} type="file" accept="image/*" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold text-on-surface" />
                      {formData.photo_url && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={getDriveFileUrl(formData.photo_url)} alt="Foto Profil" className="w-14 h-14 rounded-lg object-cover border border-outline-variant" />
                          <span className="text-xs text-on-surface-variant">Foto tersimpan</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Scan Kartu Keluarga (KK)</label>
                      <input onChange={(e) => setKkFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold text-on-surface" />
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
                      <input onChange={(e) => setKtpFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold text-on-surface" />
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
                      <input onChange={(e) => setIjazahFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-secondary-container file:text-on-secondary-container file:font-semibold text-on-surface" />
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
                  <div className="flex items-center gap-2 text-primary font-bold py-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyimpan data...
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer">
                      Batal
                    </button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors cursor-pointer">
                      Perbarui Data
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
