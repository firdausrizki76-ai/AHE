"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { 
  Sparkles, CheckCircle2, ArrowLeft, Printer, 
  Upload, User, MapPin, Phone, BookOpen, ShieldCheck, 
  Calendar, Building2, Check, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function PendaftaranOnlinePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    nickname: "",
    gender: "L",
    birth_place: "",
    birth_date: "",
    school_origin: "",
    school_class: "",
    father_name: "",
    mother_name: "",
    guardian_name: "",
    whatsapp: "",
    address: "",
    rt: "",
    rw: "",
    village: "",
    district: "",
    regency: "Magelang",
    les_types: ["les_ahe"] as string[],
    les_mapel_detail: "",
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProgramToggle = (program: string) => {
    setFormData(prev => {
      const exists = prev.les_types.includes(program);
      if (exists) {
        if (prev.les_types.length === 1) {
          toast.error("Pilih minimal satu program belajar");
          return prev;
        }
        return { ...prev, les_types: prev.les_types.filter(p => p !== program) };
      } else {
        return { ...prev, les_types: [...prev.les_types, program] };
      }
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.whatsapp || !formData.address || !formData.school_origin) {
      toast.error("Mohon lengkapi semua data wajib bertanda bintang (*)");
      return;
    }

    if (formData.les_types.length === 0) {
      toast.error("Pilih minimal satu program belajar.");
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrlValue = null;
      const photoFile = fileInputRef.current?.files?.[0];

      if (photoFile) {
        try {
          const { data: folderData } = await supabase
            .from("drive_folders")
            .select("folder_id")
            .eq("name", "murid")
            .single();

          const folderId = folderData?.folder_id || "PLACEHOLDER_MURID_FOLDER_ID";
          const base64Data = await fileToBase64(photoFile);

          const { data: uploadData, error: uploadError } = await supabase.functions.invoke("drive-upload", {
            body: {
              fileBase64: base64Data,
              mimeType: photoFile.type,
              fileName: `${Date.now()}_${photoFile.name}`,
              folderId: folderId
            }
          });

          if (!uploadError && uploadData?.fileId) {
            photoUrlValue = uploadData.fileId;
          }
        } catch (uploadErr) {
          console.warn("Gagal upload foto ke drive, melanjutkan pendaftaran:", uploadErr);
        }
      }

      const registrationId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));

      const payload = {
        id: registrationId,
        full_name: formData.full_name,
        nickname: formData.nickname || null,
        gender: formData.gender,
        birth_place: formData.birth_place || null,
        birth_date: formData.birth_date || null,
        school_origin: formData.school_origin,
        school_class: formData.school_class,
        father_name: formData.father_name || null,
        mother_name: formData.mother_name || null,
        guardian_name: formData.guardian_name || null,
        whatsapp: formData.whatsapp,
        address: formData.address,
        rt: formData.rt || null,
        rw: formData.rw || null,
        village: formData.village || "",
        district: formData.district || "",
        regency: formData.regency || "Magelang",
        les_types: formData.les_types,
        les_mapel_detail: formData.les_types.includes("les_mapel") ? formData.les_mapel_detail : null,
        photo_url: photoUrlValue,
        status: "pending"
      };

      const { error } = await supabase
        .from("registrations")
        .insert(payload);

      if (error) throw error;

      setSubmittedData(payload);
      setIsSubmitted(true);
      toast.success("Pendaftaran berhasil dikirim!");
    } catch (err: any) {
      console.error("Pendaftaran error:", err);
      toast.error("Gagal mengirim pendaftaran: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const printProof = () => {
    if (!submittedData) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Mohon izinkan pop-up untuk mencetak bukti pendaftaran.");
      return;
    }

    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const programLabels: string[] = [];
    if (submittedData.les_types?.includes("les_ahe")) programLabels.push("AHE (Belajar Membaca)");
    if (submittedData.les_types?.includes("les_ase")) programLabels.push("ASE (Anak Soleh - Mengaji)");
    if (submittedData.les_types?.includes("les_mapel")) programLabels.push(`Bimbel Mapel (${submittedData.les_mapel_detail || "Semua Mapel"})`);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bukti Pendaftaran - ${submittedData.full_name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; max-width: 750px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #b80035; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #b80035; font-size: 22px; text-transform: uppercase; }
            .header p { margin: 4px 0 0 0; color: #64748b; font-size: 13px; }
            .title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 18px; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            td { padding: 7px 4px; vertical-align: top; font-size: 13px; }
            td.label { width: 35%; color: #475569; font-weight: 600; }
            .instructions { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 16px; }
            .instructions h4 { margin: 0 0 4px 0; color: #0f172a; font-size: 13px; }
            .instructions p { margin: 0; font-size: 12px; color: #475569; line-height: 1.5; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; }
            .sign { text-align: center; width: 200px; font-size: 13px; }
            .sign-space { height: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BIMBEL AHE TEPUS WETAN</h1>
            <p>Pusat Belajar Membaca, Mengaji & Bimbingan Belajar Anak Hebat</p>
          </div>
          <div class="title">BUKTI TANDA PENDAFTARAN ONLINE</div>
          <table>
            <tr><td class="label">ID Pendaftaran</td><td>: <strong>${submittedData.id}</strong></td></tr>
            <tr><td class="label">Nama Lengkap Anak</td><td>: <strong>${submittedData.full_name}</strong></td></tr>
            <tr><td class="label">Nama Panggilan</td><td>: ${submittedData.nickname || "-"}</td></tr>
            <tr><td class="label">Jenis Kelamin</td><td>: ${submittedData.gender === "L" ? "Laki-laki" : "Perempuan"}</td></tr>
            <tr><td class="label">Tempat, Tanggal Lahir</td><td>: ${submittedData.birth_place || "-"}, ${submittedData.birth_date || "-"}</td></tr>
            <tr><td class="label">Asal Sekolah / Kelas</td><td>: ${submittedData.school_origin} (Kelas ${submittedData.school_class})</td></tr>
            <tr><td class="label">Program Pilihan</td><td>: <strong>${programLabels.join(", ")}</strong></td></tr>
            <tr><td class="label">Nama Orang Tua / Wali</td><td>: ${[submittedData.father_name, submittedData.mother_name, submittedData.guardian_name].filter(Boolean).join(" / ") || "-"}</td></tr>
            <tr><td class="label">No. WhatsApp / HP</td><td>: ${submittedData.whatsapp}</td></tr>
            <tr><td class="label">Alamat Lengkap</td><td>: ${submittedData.address}, RT ${submittedData.rt || "-"}/RW ${submittedData.rw || "-"}, Desa ${submittedData.village || "-"}, Kec. ${submittedData.district || "-"}, Kab. ${submittedData.regency || "-"}</td></tr>
            <tr><td class="label">Tanggal Pendaftaran</td><td>: ${dateStr}</td></tr>
          </table>
          <div class="instructions">
            <h4>Petunjuk Selanjutnya:</h4>
            <p>Silakan simpan atau cetak lembar bukti pendaftaran ini. Tim administrasi AHE akan segera menghubungi Anda melalui WhatsApp di nomor <strong>${submittedData.whatsapp}</strong> untuk konfirmasi jadwal belajar perdana.</p>
          </div>
          <div class="footer">
            <div class="sign">
              <p>Orang Tua / Pendaftar</p>
              <div class="sign-space"></div>
              <p>___________________</p>
            </div>
            <div class="sign">
              <p>Yogyakarta, ${dateStr}</p>
              <p>Admin AHE</p>
              <div class="sign-space"></div>
              <p>___________________</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isSubmitted && submittedData) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center font-body-md">
        <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Pendaftaran Berhasil Terkirim!</h2>
            <p className="text-sm text-slate-600">
              Terima kasih telah mendaftarkan ananda <strong className="text-primary">{submittedData.full_name}</strong> di AHE Tepus Wetan.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs sm:text-sm text-slate-700">
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">ID Pendaftaran:</span>
              <span className="font-mono font-bold text-slate-900">{submittedData.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Nama Calon Siswa:</span>
              <span className="font-bold text-slate-900">{submittedData.full_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Asal Sekolah:</span>
              <span>{submittedData.school_origin} (Kelas {submittedData.school_class})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">No. WhatsApp:</span>
              <span className="font-bold text-emerald-600">{submittedData.whatsapp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Menunggu Konfirmasi Admin
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-left space-y-1">
            <p className="font-bold text-amber-800">Langkah Selanjutnya:</p>
            <p className="text-amber-700">
              Tim administrasi kami akan mereview formulir pendaftaran dan menghubungi Anda via WhatsApp untuk aktivasi akun portal belajar dan informasi jadwal kelas perdana.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={printProof}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan Bukti
            </button>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-sm transition-all"
            >
              Menuju Halaman Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-body-md py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-primary transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sudah punya akun?</span>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-primary hover:underline"
            >
              Masuk Portal
            </Link>
          </div>
        </div>

        {/* Header Title Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Penerimaan Murid Baru
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Formulir Pendaftaran Online AHE
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Daftarkan ananda untuk program belajar membaca (AHE), mengaji (ASE), dan bimbingan belajar mata pelajaran. Biaya pendaftaran gratis.
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          
          {/* Section 1: Pilihan Program Belajar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Pilihan Program Belajar <span className="text-rose-500">*</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "les_ahe", name: "Les AHE", desc: "Belajar Membaca Cepat & Asyik (Anak Hebat)" },
                { id: "les_ase", name: "Les ASE", desc: "Belajar Mengaji & Doa Harian (Anak Soleh)" },
                { id: "les_mapel", name: "Bimbel Mapel", desc: "Bimbingan Belajar Mata Pelajaran SD/SMP" },
              ].map((p) => {
                const isSelected = formData.les_types.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProgramToggle(p.id)}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sm text-slate-900">{p.name}</span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected ? "bg-primary border-primary text-white" : "border-slate-300"
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{p.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {formData.les_types.includes("les_mapel") && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-slate-700 block">Detail Mata Pelajaran / Jenjang</label>
                <input
                  type="text"
                  name="les_mapel_detail"
                  placeholder="Contoh: Matematika & IPA Kelas 4 SD, atau Mapel SMP..."
                  value={formData.les_mapel_detail}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Section 2: Data Calon Murid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Data Calon Murid
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Nama Lengkap Anak <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Nama lengkap sesuai akta / KK..."
                  value={formData.full_name}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Panggilan</label>
                <input
                  type="text"
                  name="nickname"
                  placeholder="Contoh: Budi, Rais..."
                  value={formData.nickname}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Jenis Kelamin <span className="text-rose-500">*</span></label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tempat Lahir</label>
                <input
                  type="text"
                  name="birth_place"
                  placeholder="Kota kelahiran..."
                  value={formData.birth_place}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tanggal Lahir</label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Asal Sekolah / TK / PAUD <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  name="school_origin"
                  required
                  placeholder="Contoh: TK Pertiwi, SDN 1 Tepus..."
                  value={formData.school_origin}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Kelas di Sekolah <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  name="school_class"
                  required
                  placeholder="Contoh: TK A, TK B, 1 SD, 2 SD..."
                  value={formData.school_class}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Data Orang Tua / Wali & WhatsApp */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Data Orang Tua / Wali & Kontak
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Ayah</label>
                <input
                  type="text"
                  name="father_name"
                  placeholder="Nama ayah kandung..."
                  value={formData.father_name}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Ibu</label>
                <input
                  type="text"
                  name="mother_name"
                  placeholder="Nama ibu kandung..."
                  value={formData.mother_name}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  required
                  placeholder="Contoh: 081234567890"
                  value={formData.whatsapp}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary font-mono"
                />
                <p className="text-[11px] text-slate-500">Nomor ini digunakan untuk konfirmasi penerimaan, jadwal belajar, dan akun portal murid.</p>
              </div>
            </div>
          </div>

          {/* Section 4: Alamat Domisili */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Alamat Domisili Calon Murid
              </h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Alamat Lengkap / Dusun / Jalan <span className="text-rose-500">*</span></label>
                <textarea
                  name="address"
                  required
                  rows={2}
                  placeholder="Nama jalan, gang, dusun, atau patokan rumah..."
                  value={formData.address}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">RT</label>
                  <input
                    type="text"
                    name="rt"
                    placeholder="001"
                    value={formData.rt}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">RW</label>
                  <input
                    type="text"
                    name="rw"
                    placeholder="002"
                    value={formData.rw}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Desa / Kelurahan</label>
                  <input
                    type="text"
                    name="village"
                    placeholder="Nama desa..."
                    value={formData.village}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Kecamatan</label>
                  <input
                    type="text"
                    name="district"
                    placeholder="Kecamatan..."
                    value={formData.district}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Kabupaten / Kota</label>
                  <input
                    type="text"
                    name="regency"
                    placeholder="Kabupaten..."
                    value={formData.regency}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Foto Calon Murid (Opsional) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Unggah Foto Calon Murid (Opsional)
              </h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview Foto" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                <p className="text-[11px] text-slate-500">Format JPG / PNG, maksimal 5MB. Foto dapat dilengkapi nanti saat masuk kelas.</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white hover:bg-primary/90 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengirim Data Pendaftaran...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Kirim Formulir Pendaftaran
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
