"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";
import { User, Phone, MapPin, Calendar, BookOpen, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MuridProfilPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch student
      const { data: studentData, error: sErr } = await supabase
        .from("students")
        .select(`
          *,
          registrations (*)
        `)
        .eq("user_id", user.id)
        .maybeSingle();
      if (sErr) throw sErr;

      let activeStudent = studentData;
      if (!activeStudent) {
        const { data: fallbacks } = await supabase
          .from("students")
          .select(`
            *,
            registrations (*)
          `)
          .limit(1);
        if (fallbacks && fallbacks.length > 0) {
          activeStudent = fallbacks[0];
        }
      }
      setStudent(activeStudent);
    } catch (err: any) {
      toast.error("Gagal memuat profil: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getDriveFileUrl = (fileId: string) => {
    if (!fileId) return "";
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eglbdqjpfdljnkcivfdf.supabase.co';
    return `${baseUrl}/functions/v1/drive-get-url?fileId=${fileId}`;
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-bold text-body-md">Memuat profil murid...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3 bg-surface rounded-2xl border text-center">
        <User className="w-12 h-12 text-primary" />
        <p className="font-bold text-headline-sm text-on-surface">Akun Belum Ditautkan</p>
        <p className="text-body-md text-on-surface-variant max-w-md">Akun Anda belum terhubung dengan data murid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body-md relative">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Profil Saya</h2>
        <p className="text-body-md text-on-surface-variant mt-1">Detail informasi biodata dan dokumen lampiran pendaftaran Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Header */}
        <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col items-center text-center space-y-4 h-fit">
          <div className="relative">
            {student.photo_url ? (
              <img src={getDriveFileUrl(student.photo_url)} alt="Foto Murid" className="w-32 h-32 rounded-2xl object-cover border-2 border-primary shadow-sm" />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-headline-xl border-2 border-primary shadow-sm">
                {student.nickname?.charAt(0) || student.full_name?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface">{student.full_name}</h3>
            <p className="text-body-md text-on-surface-variant font-medium mt-1">NIS: <span className="font-bold text-primary">{student.nis || "-"}</span></p>
            <span className={`inline-block px-3 py-1 rounded-full text-label-sm font-bold mt-2 ${student.status === 'active' ? 'bg-tertiary-container text-tertiary' : 'bg-error-container text-error'}`}>
              {student.status === 'active' ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          
          <div className="w-full pt-4 border-t border-outline-variant text-left space-y-3">
            <div className="flex items-center gap-3 text-on-surface-variant">
              <User className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="text-xs text-outline block">Nama Panggilan</span>
                <span className="font-bold text-on-surface text-sm">{student.nickname || "-"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Phone className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="text-xs text-outline block">Nomor WhatsApp Wali</span>
                <span className="font-bold text-on-surface text-sm">{student.registrations?.whatsapp || "-"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Calendar className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="text-xs text-outline block">Tempat, Tanggal Lahir</span>
                <span className="font-bold text-on-surface text-sm">
                  {student.birth_place || "-"}, {student.birth_date ? new Date(student.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Detail Biodata & Dokumen */}
        <div className="lg:col-span-2 space-y-6">
          {/* Biodata Card */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-6">
            <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2">Detail Biodata Lengkap</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-body-md">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">NIK Murid</span>
                <span className="font-bold text-on-surface">{student.nik || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Nomor KK</span>
                <span className="font-bold text-on-surface">{student.kk_number || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Jenis Kelamin</span>
                <span className="font-bold text-on-surface">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Asal Sekolah & Kelas</span>
                <span className="font-bold text-on-surface">{student.school_origin || "-"} (Kelas {student.school_class || "-"})</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Nama Ayah</span>
                <span className="font-bold text-on-surface">{student.father_name || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Nama Ibu</span>
                <span className="font-bold text-on-surface">{student.mother_name || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">Tanggal Masuk Les</span>
                <span className="font-bold text-on-surface">{student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</span>
              </div>
              
              <div className="sm:col-span-2 flex gap-3 items-start pt-2">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-1" />
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">Alamat Rumah</span>
                  <span className="font-bold text-on-surface block">
                    {student.address || "-"}
                  </span>
                  <span className="text-body-sm text-on-surface-variant block mt-0.5">
                    RT {student.rt || "-"}/RW {student.rw || "-"}, Desa {student.village || "-"}, Kec. {student.district || "-"}, Kab. {student.regency || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Files Card */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-outline-variant space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface border-b border-outline-variant pb-2">Dokumen Pendaftaran Saya</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border border-outline-variant text-center">
                <div className="flex flex-col items-center">
                  <FileText className="w-8 h-8 text-primary mb-1" />
                  <span className="font-bold text-body-md text-on-surface">Scan Kartu Keluarga (KK)</span>
                </div>
                {student.kk_url ? (
                  <a href={getDriveFileUrl(student.kk_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors cursor-pointer block text-center">
                    Lihat Scan KK
                  </a>
                ) : (
                  <span className="text-xs text-on-surface-variant italic py-1">Belum diupload</span>
                )}
              </div>
              <div className="p-4 bg-surface-container rounded-xl flex flex-col justify-between gap-3 border border-outline-variant text-center">
                <div className="flex flex-col items-center">
                  <FileText className="w-8 h-8 text-primary mb-1" />
                  <span className="font-bold text-body-md text-on-surface">Scan Akta Kelahiran</span>
                </div>
                {student.birth_cert_url ? (
                  <a href={getDriveFileUrl(student.birth_cert_url)} target="_blank" rel="noopener noreferrer" className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-secondary-container transition-colors cursor-pointer block text-center">
                    Lihat Scan Akta
                  </a>
                ) : (
                  <span className="text-xs text-on-surface-variant italic py-1">Belum diupload</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
