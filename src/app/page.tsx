"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { 
  ArrowRight, Star, Brain, GraduationCap, Smile, 
  UserPlus, User, Users, CalendarCheck, Medal, 
  TrendingUp, Award, CreditCard, Wallet,
  Mail, Phone, X, Menu, LogIn, CheckCircle2, Printer, Loader2
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const getLesProgramLabel = (types: string[], detail?: string) => {
    const labels = [];
    if (types.includes("les_ahe")) labels.push("Les AHE (Baca Tulis)");
    if (types.includes("les_ase")) labels.push("Les ASE (Matematika)");
    if (types.includes("les_mapel")) {
      labels.push(`Les Mapel (${detail || ''})`);
    }
    return labels.join(", ") || "Belum memilih";
  };

  const printReceipt = (data: any) => {
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

    const lesTypesLabel = getLesProgramLabel(data.les_types || [], data.les_mapel_detail);

    printWindow.document.write(`
      <html>
        <head>
          <title>Bukti Pendaftaran AHE - ${data.full_name}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #333;
              line-height: 1.6;
              padding: 40px;
            }
            .header {
              text-align: center;
              border-bottom: 3px double #712ae2;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #b80035;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
              margin-top: 0;
            }
            .title {
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 25px;
              color: #111c2d;
              letter-spacing: 1px;
            }
            .receipt-id {
              text-align: center;
              font-family: monospace;
              font-size: 14px;
              color: #555;
              margin-top: -20px;
              margin-bottom: 30px;
            }
            .table-data {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .table-data td {
              padding: 12px 10px;
              vertical-align: top;
              border-bottom: 1px solid #eee;
            }
            .table-data td.label {
              font-weight: bold;
              color: #555;
              width: 30%;
            }
            .instructions {
              background-color: #f9f9ff;
              border-left: 4px solid #712ae2;
              padding: 15px 20px;
              margin-top: 30px;
              border-radius: 4px;
            }
            .instructions h4 {
              margin-top: 0;
              margin-bottom: 8px;
              color: #712ae2;
            }
            .footer {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-space {
              height: 80px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header" style="display: flex; flex-direction: column; align-items: center;">
            <img src="/LOGO UTAMA.png" alt="Logo AHE" style="height: 60px; margin-bottom: 10px;" />
            <div class="logo">ANAK HEBAT (AHE)</div>
            <p class="subtitle">Pusat Layanan Bimbingan Belajar Kreatif & Menyenangkan</p>
          </div>
          
          <div class="title">BUKTI PENDAFTARAN MURID BARU</div>
          <div class="receipt-id">ID Pendaftaran: ${data.id || 'PENDING'}</div>
          
          <table class="table-data">
            <tr>
              <td class="label">Nama Lengkap</td>
              <td>: ${data.full_name}</td>
            </tr>
            <tr>
              <td class="label">Nama Panggilan</td>
              <td>: ${data.nickname || "-"}</td>
            </tr>
            <tr>
              <td class="label">Jenis Kelamin</td>
              <td>: ${data.gender === "L" ? "Laki-laki" : "Perempuan"}</td>
            </tr>
            <tr>
              <td class="label">Tempat, Tgl Lahir</td>
              <td>: ${data.birth_place || "-"}, ${data.birth_date ? new Date(data.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</td>
            </tr>
            <tr>
              <td class="label">Asal Sekolah</td>
              <td>: ${data.school_origin} (Kelas ${data.school_class})</td>
            </tr>
            <tr>
              <td class="label">Program Pilihan</td>
              <td>: <strong>${lesTypesLabel}</strong></td>
            </tr>
            <tr>
              <td class="label">Nama Orang Tua/Wali</td>
              <td>: ${[data.father_name, data.mother_name, data.guardian_name].filter(Boolean).join(" / ") || "-"}</td>
            </tr>
            <tr>
              <td class="label">No. WhatsApp / HP</td>
              <td>: ${data.whatsapp}</td>
            </tr>
            <tr>
              <td class="label">Alamat Rumah</td>
              <td>: ${data.address}, RT ${data.rt || "-"}/RW ${data.rw || "-"}, Desa ${data.village}, Kec. ${data.district}, Kab. ${data.regency}</td>
            </tr>
            <tr>
              <td class="label">Tanggal Daftar</td>
              <td>: ${dateStr}</td>
            </tr>
          </table>
          
          <div class="instructions">
            <h4>💡 Petunjuk Pendaftaran Selanjutnya:</h4>
            <p style="margin: 0; font-size: 14px; color: #444;">
              Silakan bawa/tunjukkan lembar bukti pendaftaran ini ke tempat les sebagai bukti pendaftaran fisik. Petugas pendaftaran kami akan segera menghubungi Anda melalui WhatsApp di nomor <strong>${data.whatsapp}</strong> untuk jadwal masuk/les perdana dan konfirmasi administrasi.
            </p>
          </div>
          
          <div class="footer">
            <div class="signature-box">
              <p>Pendaftar/Orang Tua</p>
              <div class="signature-space"></div>
              <p>___________________</p>
            </div>
            <div class="signature-box">
              <p>Yogyakarta, ${dateStr}</p>
              <p>Petugas Administrasi AHE</p>
              <div class="signature-space"></div>
              <p>___________________</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const lesTypes = Array.from(formData.getAll("les_types")) as string[];
    
    if (lesTypes.length === 0) {
      alert("Pilih minimal satu program les.");
      setIsSubmitting(false);
      return;
    }

    const photoFile = (e.currentTarget.elements.namedItem("photo_url") as HTMLInputElement)?.files?.[0];

    try {
      let photoUrlValue = null;
      if (photoFile) {
        try {
          // 1. Get folder ID from database
          const { data: folderData, error: folderError } = await supabase
            .from("drive_folders")
            .select("folder_id")
            .eq("name", "murid")
            .single();

          if (folderError) throw folderError;
          const folderId = folderData?.folder_id || "PLACEHOLDER_MURID_FOLDER_ID";

          // 2. Convert to base64
          const base64Data = await fileToBase64(photoFile);

          // 3. Upload to Google Drive Edge Function
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke("drive-upload", {
            body: {
              fileBase64: base64Data,
              mimeType: photoFile.type,
              fileName: `${Date.now()}_${photoFile.name}`,
              folderId: folderId
            }
          });

          if (uploadError) throw uploadError;
          if (uploadData?.error) throw new Error(uploadData.error);
          
          photoUrlValue = uploadData?.fileId || null;
        } catch (uploadErr: any) {
          console.error("Gagal mengunggah foto ke Google Drive:", uploadErr);
          // Tetap lanjutkan pendaftaran meski upload foto gagal demi kenyamanan user
        }
      }

      const registrationId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));

      // Insert data into supabase
      const payload = {
        id: registrationId,
        full_name: formData.get("full_name") as string,
        nickname: (formData.get("nickname") as string) || null,
        gender: formData.get("gender") as string,
        birth_place: (formData.get("birth_place") as string) || null,
        birth_date: (formData.get("birth_date") as string) || null,
        school_origin: formData.get("school_origin") as string,
        school_class: formData.get("school_class") as string,
        father_name: (formData.get("father_name") as string) || null,
        mother_name: (formData.get("mother_name") as string) || null,
        guardian_name: (formData.get("guardian_name") as string) || null,
        whatsapp: formData.get("whatsapp") as string,
        address: formData.get("address") as string,
        rt: (formData.get("rt") as string) || null,
        rw: (formData.get("rw") as string) || null,
        village: formData.get("village") as string,
        district: formData.get("district") as string,
        regency: formData.get("regency") as string,
        les_types: lesTypes,
        les_mapel_detail: (formData.get("les_mapel_detail") as string) || null,
        photo_url: photoUrlValue,
        status: "pending"
      };

      const { error } = await supabase
        .from("registrations")
        .insert(payload);

      if (error) throw error;

      setSubmittedData(payload);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Pendaftaran gagal:", err);
      alert("Gagal melakukan pendaftaran: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden">
      {/* TopNavBar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-surface/80 backdrop-blur-md shadow-md' : 'bg-transparent'}`}>
        <div className="flex justify-between items-center h-20 px-4 md:px-margin max-w-[var(--spacing-max-width)] mx-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <img src="/LOGO UTAMA.png" alt="AHE Logo" className="h-8 md:h-10 w-auto object-contain drop-shadow-sm" />
            <span className="text-sm sm:text-base md:text-headline-md font-headline-md text-primary font-bold whitespace-nowrap">AHE (Anak Hebat)</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md" href="#why-ahe">Mengapa AHE</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md" href="#programs">Program</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md" href="#contact">Kontak</a>
          </div>
          <div className="flex items-center gap-1.5 md:gap-4">
            {isAuthenticated ? (
              <button 
                className="bg-secondary text-on-secondary px-4 md:px-6 py-2 md:py-2.5 rounded-full font-label-sm md:font-label-md text-label-sm md:text-label-md active:scale-95 transition-transform duration-150 hover:bg-secondary-container shadow-sm flex items-center gap-1 md:gap-2" 
                onClick={() => router.push(`/${user?.role}/dashboard`)}
              >
                Dashboard
              </button>
            ) : (
              <button 
                className="bg-primary text-on-primary px-4 md:px-8 py-2 md:py-3 rounded-full font-label-sm md:font-label-md text-label-sm md:text-label-md active:scale-95 transition-transform duration-150 hover:bg-primary-container shadow-md flex items-center gap-1 md:gap-2" 
                onClick={() => setIsModalOpen(true)}
              >
                Daftar
              </button>
            )}
            {!isAuthenticated && (
              <button 
                className="flex text-primary hover:bg-primary/10 px-3 md:px-6 py-2 md:py-2.5 rounded-full font-label-sm md:font-label-md text-label-sm md:text-label-md transition-colors items-center gap-1 md:gap-2" 
                onClick={() => router.push('/login')}
              >
                <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4" /> Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-xl px-margin max-w-[var(--spacing-max-width)] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img src="/LOGO UTAMA.png" alt="Logo Utama AHE" className="h-28 w-auto object-contain drop-shadow-md animate-float" />
              <div className="flex flex-col gap-1">
                <span className="inline-block px-4 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-label-md self-start">Edukasi Masa Depan</span>
                <span className="text-body-sm text-on-surface-variant font-bold">Lembaga Bimbingan Belajar</span>
              </div>
            </div>
            <h1 className="text-headline-xl font-headline-xl text-on-surface">
              Bentuk <span className="text-primary">Anak Hebat</span>, Wujudkan Masa Depan Cemerlang!
            </h1>
            <p className="text-body-lg font-body-lg text-on-surface-variant">
              AHE hadir untuk mendampingi tumbuh kembang anak melalui sistem manajemen pembelajaran yang kreatif, terukur, dan menyenangkan bagi murid maupun guru.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <button 
                className="bg-primary text-on-primary px-10 py-4 rounded-xl font-label-md text-label-md bouncy-hover shadow-lg" 
                onClick={() => setIsModalOpen(true)}
              >
                Daftar Sekarang
              </button>
              <a className="border-2 border-secondary text-secondary px-10 py-4 rounded-xl font-label-md text-label-md bouncy-hover flex items-center gap-2" href="#programs">
                Lihat Program <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-4 bg-secondary-container/20 rounded-full blur-3xl group-hover:bg-secondary-container/30 transition-all duration-700"></div>
            <img alt="Anak Hebat Hero" className="relative w-full aspect-[4/3] object-cover object-[-10%_50%] rounded-xl shadow-2xl z-10" src="https://i.ibb.co.com/jvX8hgDG/frontpage.png"/>
            <div className="absolute -bottom-6 -left-6 bg-surface p-6 rounded-xl shadow-xl z-20 flex items-center gap-4 border border-surface-variant">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-on-secondary">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm">5000+</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">Anak Bergabung</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mengapa AHE Section */}
      <section className="bg-surface-container-low py-xl" id="why-ahe">
        <div className="px-margin max-w-[var(--spacing-max-width)] mx-auto">
          <div className="text-center mb-xl">
            <h2 className="text-headline-lg font-headline-lg text-on-surface mb-4">Mengapa Memilih AHE?</h2>
            <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl mx-auto">Kami mengedepankan kualitas dan kebahagiaan anak dalam setiap proses belajarnya.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-surface p-8 rounded-lg cloud-shadow bouncy-hover border border-surface-variant/50">
              <div className="w-16 h-16 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary mb-6">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="text-headline-sm font-headline-sm mb-3">Personalized Learning</h3>
              <p className="text-body-md font-body-md text-on-surface-variant">Kurikulum yang disesuaikan dengan minat dan bakat unik setiap anak agar potensi maksimal tercapai.</p>
            </div>
            <div className="bg-surface p-8 rounded-lg cloud-shadow bouncy-hover border border-surface-variant/50">
              <div className="w-16 h-16 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary mb-6">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-headline-sm font-headline-sm mb-3">Expert Teachers</h3>
              <p className="text-body-md font-body-md text-on-surface-variant">Dibimbing oleh pendidik profesional yang berpengalaman dan memiliki passion tinggi di dunia anak.</p>
            </div>
            <div className="bg-surface p-8 rounded-lg cloud-shadow bouncy-hover border border-surface-variant/50">
              <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center text-on-tertiary-fixed-variant mb-6">
                <Smile className="w-8 h-8" />
              </div>
              <h3 className="text-headline-sm font-headline-sm mb-3">Fun Environment</h3>
              <p className="text-body-md font-body-md text-on-surface-variant">Lingkungan belajar yang ceria dan interaktif, membuat anak selalu antusias untuk kembali belajar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Program Kami Section */}
      <section className="py-xl" id="programs">
        <div className="px-margin max-w-[var(--spacing-max-width)] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-xl gap-6 w-full" style={{ width: '100%' }}>
            <div className="max-w-xl w-full grow" style={{ width: '100%', maxWidth: '576px' }}>
              <h2 className="text-headline-lg font-headline-lg text-on-surface mb-4 w-full" style={{ width: '100%' }}>Layanan & Fitur Unggulan</h2>
              <p className="text-body-lg font-body-lg text-on-surface-variant w-full" style={{ width: '100%' }}>Satu platform terintegrasi untuk mengelola seluruh ekosistem pendidikan Anak Hebat secara profesional.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div className="col-span-2 row-span-2 bg-primary text-on-primary p-8 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <UserPlus className="w-48 h-48" />
              </div>
              <div>
                <UserPlus className="w-10 h-10 mb-4" />
                <h4 className="text-headline-md font-headline-md">Pendaftaran</h4>
              </div>
              <p className="text-body-md">Proses registrasi murid baru yang cepat dan paperless.</p>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all">
              <Smile className="w-8 h-8 text-secondary" />
              <span className="font-label-md text-label-md">Murid</span>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all">
              <User className="w-8 h-8 text-secondary" />
              <span className="font-label-md text-label-md">Guru</span>
            </div>
            <div className="col-span-2 bg-secondary p-8 rounded-xl text-on-secondary flex items-center justify-between group">
              <div>
                <h4 className="text-headline-sm font-headline-sm">Absensi Digital</h4>
                <p className="text-body-sm opacity-90">Kehadiran tercatat secara real-time.</p>
              </div>
              <CalendarCheck className="w-10 h-10 group-hover:rotate-12 transition-transform" />
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all">
              <Medal className="w-8 h-8 text-primary" />
              <span className="font-label-md text-label-md">Poin & Reward</span>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all">
              <TrendingUp className="w-8 h-8 text-primary" />
              <span className="font-label-md text-label-md">Evaluasi</span>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all">
              <Award className="w-8 h-8 text-primary" />
              <span className="font-label-md text-label-md">Wisuda</span>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all">
              <CreditCard className="w-8 h-8 text-primary" />
              <span className="font-label-md text-label-md">Pembayaran</span>
            </div>
            <div className="col-span-2 bg-surface-container p-8 rounded-xl flex items-center gap-6 border border-primary/20">
              <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-headline-sm font-headline-sm">Tabungan Siswa</h4>
                <p className="text-body-sm text-on-surface-variant">Latih disiplin finansial sejak dini dengan modul tabungan terintegrasi.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-inverse-surface border-t border-surface-variant dark:border-outline-variant w-full py-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin max-w-[var(--spacing-max-width)] mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src="/LOGO UTAMA.png" alt="AHE Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
              <span className="text-headline-sm font-headline-sm font-bold text-primary">AHE (Anak Hebat)</span>
            </div>
            <p className="text-body-sm font-body-sm text-on-surface-variant">© 2024 AHE (Anak Hebat). Memberdayakan masa depan melalui pendidikan kreatif.</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-label-md text-label-md text-on-surface">Navigasi</p>
            <a className="text-on-surface-variant hover:text-secondary hover:underline transition-all text-body-sm font-body-sm" href="#why-ahe">Tentang Kami</a>
            <a className="text-on-surface-variant hover:text-secondary hover:underline transition-all text-body-sm font-body-sm" href="#">Karir</a>
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-label-md text-label-md text-on-surface">Legal</p>
            <a className="text-on-surface-variant hover:text-secondary hover:underline transition-all text-body-sm font-body-sm" href="#">Kebijakan Privasi</a>
            <a className="text-on-surface-variant hover:text-secondary hover:underline transition-all text-body-sm font-body-sm" href="#">Syarat & Ketentuan</a>
          </div>
          <div className="flex flex-col gap-3" id="contact">
            <p className="font-label-md text-label-md text-on-surface">Hubungi Kami</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-2">
              <Mail className="w-4 h-4" /> ahetepuswetan@gmail.com
            </p>
            <p className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-2">
              <Phone className="w-4 h-4" /> 081227705767
            </p>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-on-background/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          
          {isSubmitted && submittedData ? (
            <div className="relative bg-surface w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 z-10">
              <div className="bg-primary p-6 text-on-primary flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <img src="/LOGO UTAMA.png" alt="AHE Logo" className="h-8 w-auto brightness-0 invert object-contain" />
                  <h3 className="text-headline-sm font-headline-sm font-bold">Pendaftaran Selesai</h3>
                </div>
                <button className="hover:bg-on-primary/20 rounded-full p-2 transition-colors" onClick={() => { setIsModalOpen(false); setIsSubmitted(false); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 bg-surface-container-lowest p-6 md:p-8 space-y-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
                  <h2 className="text-headline-md font-bold text-on-surface w-full">Pendaftaran Berhasil!</h2>
                  <p className="text-body-md text-on-surface-variant max-w-md w-full">
                    Terima kasih telah mendaftar di Anak Hebat (AHE). Data Anda telah berhasil tersimpan di sistem kami.
                  </p>
                </div>

                <div className="border border-outline-variant rounded-xl p-5 bg-surface space-y-4">
                  <h4 className="text-label-md font-bold text-primary border-b border-outline-variant pb-2">Ringkasan Pendaftaran:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
                    <div>
                      <span className="text-outline block text-xs">Nama Calon Murid:</span>
                      <span className="font-bold text-on-surface text-base">{submittedData.full_name}</span>
                    </div>
                    <div>
                      <span className="text-outline block text-xs">Program Les:</span>
                      <span className="font-bold text-secondary text-base">{getLesProgramLabel(submittedData.les_types || [], submittedData.les_mapel_detail)}</span>
                    </div>
                    <div>
                      <span className="text-outline block text-xs">Asal Sekolah:</span>
                      <span className="font-medium text-on-surface">{submittedData.school_origin} (Kelas {submittedData.school_class})</span>
                    </div>
                    <div>
                      <span className="text-outline block text-xs">No. WhatsApp Orang Tua:</span>
                      <span className="font-medium text-on-surface">{submittedData.whatsapp}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-outline block text-xs">Alamat Rumah:</span>
                      <span className="font-medium text-on-surface">
                        {submittedData.address}, RT {submittedData.rt || "-"}/RW {submittedData.rw || "-"}, Desa {submittedData.village}, Kec. {submittedData.district}, Kab. {submittedData.regency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center space-y-3">
                  <p className="text-body-md text-on-surface font-bold text-primary">
                    ⚠️ Silakan bawa/tunjukkan bukti pendaftaran ini ke tempat les sebagai bukti pendaftaran fisik.
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    Petugas kami akan segera menghubungi Anda di nomor WhatsApp <strong>{submittedData.whatsapp}</strong> untuk mengatur jadwal belajar dan administrasi.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button 
                    onClick={() => printReceipt(submittedData)}
                    className="flex-grow bg-secondary text-on-secondary py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary-container shadow-md transition-colors active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-5 h-5" /> Cetak Bukti Pendaftaran (PDF)
                  </button>
                  <button 
                    onClick={() => { setIsModalOpen(false); setIsSubmitted(false); }}
                    className="bg-surface-container hover:bg-surface-container-high text-on-surface font-bold py-3.5 px-8 rounded-xl transition-colors active:scale-95 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-surface w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 z-10">
              <div className="bg-primary p-6 text-on-primary flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <img src="/LOGO UTAMA.png" alt="AHE Logo" className="h-8 w-auto brightness-0 invert object-contain" />
                  <h3 className="text-headline-sm font-headline-sm">Form Pendaftaran Anak Hebat</h3>
                </div>
                <button disabled={isSubmitting} className="hover:bg-on-primary/20 rounded-full p-2 transition-colors disabled:opacity-50" onClick={() => setIsModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 bg-surface-container-lowest">
                <form className="p-6 md:p-8 space-y-8" onSubmit={handleRegister}>
                  
                  {/* 1. Data Anak */}
                  <div>
                    <h4 className="text-headline-sm font-headline-sm text-primary border-b border-surface-container pb-2 mb-4">Data Anak</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Lengkap *</label>
                        <input name="full_name" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Nama lengkap sesuai akta" required type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Panggilan</label>
                        <input name="nickname" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Nama panggilan anak" type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Jenis Kelamin *</label>
                        <select name="gender" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" required>
                          <option value="">Pilih Jenis Kelamin</option>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tempat Lahir</label>
                        <input name="birth_place" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Contoh: Yogyakarta" type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tanggal Lahir *</label>
                        <input name="birth_date" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" required type="date"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Foto Calon Murid</label>
                        <input name="photo_url" className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20" type="file" accept="image/*"/>
                      </div>
                    </div>
                  </div>

                  {/* 2. Data Sekolah */}
                  <div>
                    <h4 className="text-headline-sm font-headline-sm text-primary border-b border-surface-container pb-2 mb-4">Data Sekolah</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Asal Sekolah *</label>
                        <input name="school_origin" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Nama sekolah saat ini" required type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Kelas / Jenjang *</label>
                        <input name="school_class" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Contoh: Kelas 3 SD" required type="text"/>
                      </div>
                    </div>
                  </div>

                  {/* 3. Data Orang Tua / Kontak */}
                  <div>
                    <h4 className="text-headline-sm font-headline-sm text-primary border-b border-surface-container pb-2 mb-4">Data Orang Tua & Kontak</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Ayah</label>
                        <input name="father_name" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Nama lengkap Ayah" type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Ibu</label>
                        <input name="mother_name" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Nama lengkap Ibu" type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nama Wali (Opsional)</label>
                        <input name="guardian_name" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Nama Wali (jika ada)" type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nomor WhatsApp *</label>
                        <input name="whatsapp" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Contoh: 08123456789" required type="tel"/>
                      </div>
                    </div>
                  </div>

                  {/* 4. Data Alamat */}
                  <div>
                    <h4 className="text-headline-sm font-headline-sm text-primary border-b border-surface-container pb-2 mb-4">Alamat Rumah</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 flex flex-col md:col-span-2">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Alamat Lengkap (Jalan/Dusun) *</label>
                        <textarea name="address" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Detail jalan, perumahan, atau blok" required rows={2}></textarea>
                      </div>
                      <div className="flex gap-4">
                        <div className="space-y-2 flex flex-col w-1/2">
                          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">RT</label>
                          <input name="rt" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="001" type="text"/>
                        </div>
                        <div className="space-y-2 flex flex-col w-1/2">
                          <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">RW</label>
                          <input name="rw" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="002" type="text"/>
                        </div>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Desa / Kelurahan *</label>
                        <input name="village" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" required type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Kecamatan *</label>
                        <input name="district" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" required type="text"/>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Kabupaten / Kota *</label>
                        <input name="regency" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" required type="text"/>
                      </div>
                    </div>
                  </div>

                  {/* 5. Program Pilihan */}
                  <div>
                    <h4 className="text-headline-sm font-headline-sm text-primary border-b border-surface-container pb-2 mb-4">Pilihan Program Les</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 flex flex-col md:col-span-2">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Program Les (Pilih satu atau lebih) *</label>
                        <div className="flex flex-wrap gap-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer bg-surface p-3 rounded-lg border border-outline-variant hover:border-secondary hover:bg-secondary/5 transition-all">
                            <input type="checkbox" name="les_types" value="les_ahe" className="w-5 h-5 text-secondary rounded border-outline-variant focus:ring-secondary"/>
                            <span className="font-body-md font-bold text-on-surface">Les AHE (Baca Tulis)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-surface p-3 rounded-lg border border-outline-variant hover:border-secondary hover:bg-secondary/5 transition-all">
                            <input type="checkbox" name="les_types" value="les_ase" className="w-5 h-5 text-secondary rounded border-outline-variant focus:ring-secondary"/>
                            <span className="font-body-md font-bold text-on-surface">Les ASE (Matematika)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-surface p-3 rounded-lg border border-outline-variant hover:border-secondary hover:bg-secondary/5 transition-all">
                            <input type="checkbox" name="les_types" value="les_mapel" className="w-5 h-5 text-secondary rounded border-outline-variant focus:ring-secondary"/>
                            <span className="font-body-md font-bold text-on-surface">Les Mapel</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2 flex flex-col md:col-span-2">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Detail Mata Pelajaran (Jika pilih Les Mapel)</label>
                        <input name="les_mapel_detail" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface" placeholder="Contoh: Bahasa Inggris, IPA" type="text"/>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-surface-container">
                    <button 
                      disabled={isSubmitting}
                      className="w-full bg-primary text-on-primary py-4 rounded-xl font-headline-sm text-headline-sm hover:bg-primary-container shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer" 
                      type="submit"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Memproses Pendaftaran...
                        </>
                      ) : (
                        "Kirim Formulir Pendaftaran"
                      )}
                    </button>
                    <p className="text-center text-body-sm text-on-surface-variant mt-4">Dengan menekan tombol di atas, Anda menyatakan bahwa data yang diisi adalah benar.</p>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
