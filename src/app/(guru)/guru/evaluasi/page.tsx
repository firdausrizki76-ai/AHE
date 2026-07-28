"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, Search, CheckCircle, XCircle, Send, MessageCircle, Plus, X, Upload, Loader2, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store";

export default function GuruEvaluasiPage() {
  const { user } = useAuthStore();
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'riwayat'|'daftar'>('riwayat');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  const [isDaftarModalOpen, setIsDaftarModalOpen] = useState(false);
  const [isHasilModalOpen, setIsHasilModalOpen] = useState(false);
  
  const [selectedEval, setSelectedEval] = useState<any | null>(null);
  const [nextEvalNumber, setNextEvalNumber] = useState("");

  // Form states for Daftarkan Evaluasi
  const [daftarForm, setDaftarForm] = useState({
    student_id: "",
    student_les_id: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    duration_days: "3 Bulan 0 Hari"
  });

  // Form states for Input Hasil
  const [hasilForm, setHasilForm] = useState({
    status: "passed", // 'passed' | 'failed'
    score: "",
    notes: "",
    photo_url: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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

      // Fallback removed — teacher must be properly linked via user_id
      setTeacherProfile(teacher);

      // 2. Fetch evaluations
      let query = supabase
        .from("evaluations")
        .select(`
          *,
          students (
            *,
            registrations (whatsapp)
          ),
          student_les (*)
        `);

      if (teacher) {
        query = query.eq("evaluated_by", teacher.id);
      }

      const { data: evaluationsData, error: evalErr } = await query.order("created_at", { ascending: false });
      if (evalErr) throw evalErr;
      setEvaluations(evaluationsData || []);

      // 3. Fetch active students
      const { data: studentsData, error: studentErr } = await supabase
        .from("students")
        .select("*, student_les(*)")
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (studentErr) throw studentErr;
      setStudents(studentsData || []);
    } catch (err: any) {
      toast.error("Gagal memuat data evaluasi: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeacherProfileAndData();
  }, [fetchTeacherProfileAndData]);

  const filteredEvals = evaluations.filter(e => {
    const matchesSearch = e.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eval_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'riwayat') {
      return matchesSearch && (e.status === 'passed' || e.status === 'failed');
    } else {
      return matchesSearch && (e.status === 'scheduled' || e.status === 'ongoing');
    }
  });

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

  const openDaftarModal = async () => {
    setIsDaftarModalOpen(true);
    try {
      const { data, error } = await supabase.rpc("generate_eval_number");
      if (error) throw error;
      setNextEvalNumber(data);

      const firstStudent = students[0];
      const firstLes = firstStudent?.student_les?.[0];
      setDaftarForm({
        student_id: firstStudent?.id || "",
        student_les_id: firstLes?.id || "",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration_days: "3 Bulan 0 Hari"
      });
    } catch (err: any) {
      toast.error("Gagal mendapatkan nomor evaluasi: " + err.message);
    }
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const lesList = student?.student_les || [];
    setDaftarForm(prev => ({
      ...prev,
      student_id: studentId,
      student_les_id: lesList.length > 0 ? lesList[0].id : ""
    }));
  };

  const handleDaftarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const selectedStudent = students.find(s => s.id === daftarForm.student_id);
      const selectedLes = selectedStudent?.student_les?.find((l: any) => l.id === daftarForm.student_les_id);

      if (!selectedLes) {
        throw new Error("Murid belum terdaftar atau belum memilih program les");
      }

      const { error } = await supabase
        .from("evaluations")
        .insert({
          eval_number: nextEvalNumber,
          student_id: daftarForm.student_id,
          student_les_id: daftarForm.student_les_id,
          les_type: selectedLes.les_type,
          current_level: selectedLes.current_level,
          target_level: selectedLes.les_type === "les_mapel" ? selectedLes.current_level : selectedLes.current_level + 1,
          start_date: daftarForm.start_date,
          end_date: daftarForm.end_date,
          duration_days: 90, // default 3 bulan
          status: "scheduled",
          evaluated_by: teacherProfile?.id || null
        });

      if (error) throw error;

      toast.success("Evaluasi berhasil didaftarkan!");
      setIsDaftarModalOpen(false);
      fetchTeacherProfileAndData();
    } catch (err: any) {
      toast.error("Gagal mendaftarkan evaluasi: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const openHasilModal = (item: any) => {
    setSelectedEval(item);
    setHasilForm({
      status: "passed",
      score: "",
      notes: "",
      photo_url: ""
    });
    setPhotoFile(null);
    setIsHasilModalOpen(true);
  };

  const handleHasilSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEval) return;
    setSaveLoading(true);

    try {
      let fileId = "";
      if (photoFile) {
        const id = await uploadToDrive(photoFile, "evaluasi");
        if (id) fileId = id;
      }

      const isPassed = hasilForm.status === "passed";
      
      // 1. Update evaluations
      const { error: evalErr } = await supabase
        .from("evaluations")
        .update({
          status: hasilForm.status,
          score: parseFloat(hasilForm.score),
          notes: hasilForm.notes,
          photo_url: fileId || null,
          end_date: new Date().toISOString().split('T')[0],
          evaluated_by: teacherProfile?.id || null
        })
        .eq("id", selectedEval.id);
      if (evalErr) throw evalErr;

      // 2. If passed, update level in student_les
      if (isPassed && selectedEval.student_les) {
        const nextLvl = selectedEval.target_level;
        const maxLvl = selectedEval.student_les.les_type === "les_ahe" ? 8 : (selectedEval.student_les.les_type === "les_ase" ? 16 : 99);
        const isGraduated = nextLvl >= maxLvl;

        const { error: lesErr } = await supabase
          .from("student_les")
          .update({
            current_level: nextLvl,
            status: isGraduated ? "graduated" : "active",
            graduated_at: isGraduated ? new Date().toISOString().split('T')[0] : null
          })
          .eq("id", selectedEval.student_les_id);
        if (lesErr) throw lesErr;

        // 3. If graduated, create graduation record
        if (isGraduated && (selectedEval.les_type === 'les_ahe' || selectedEval.les_type === 'les_ase')) {
          const { data: certNum, error: certErr } = await supabase.rpc("generate_certificate_number");
          if (certErr) throw certErr;

          await supabase
            .from("graduations")
            .insert({
              student_id: selectedEval.student_id,
              student_les_id: selectedEval.student_les_id,
              les_type: selectedEval.les_type,
              graduation_date: new Date().toISOString().split('T')[0],
              certificate_number: certNum,
              photo_url: fileId || null,
              notes: "Lulus tingkat akhir"
            });
        }
      }

      toast.success("Hasil evaluasi berhasil disimpan!");
      setIsHasilModalOpen(false);
      fetchTeacherProfileAndData();
    } catch (err: any) {
      toast.error("Gagal menyimpan hasil evaluasi: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSendWA = async (type: 'evaluasi'|'naik_level', item: any) => {
    const parentPhone = item.students?.registrations?.whatsapp;
    if (!parentPhone) {
      toast.error("Nomor WhatsApp orang tua murid tidak ditemukan");
      return;
    }

    const studentName = item.students?.full_name;
    const lesName = getLesTypeLabel(item.les_type);
    
    let message = "";
    if (type === 'evaluasi') {
      message = `Halo Bapak/Ibu Wali dari Ananda ${studentName}. Menginfokan bahwa ujian evaluasi untuk kenaikan level Ananda dijadwalkan pada tanggal ${new Date(item.start_date).toLocaleDateString('id-ID')} s/d ${new Date(item.end_date).toLocaleDateString('id-ID')}. Mohon bantuan Bapak/Ibu untuk memotivasi belajar Ananda di rumah. Terima kasih. - AHE Tepus Wetan`;
    } else {
      const photoUrl = item.photo_url ? getDriveFileUrl(item.photo_url) : "";
      message = `Selamat Bapak/Ibu! Ananda ${studentName} dinyatakan LULUS Ujian Evaluasi dan naik ke Level ${item.target_level} pada program ${lesName}. ${photoUrl ? `Berikut kami lampirkan foto kelulusan Ananda: ${photoUrl}` : ''} Terima kasih atas kepercayaannya. - AHE Tepus Wetan`;
    }

    try {
      const { error } = await supabase.functions.invoke("send-whatsapp", {
        body: { recipient: parentPhone, message }
      });
      if (error) throw error;
      
      // Update WA notification flag
      await supabase
        .from("evaluations")
        .update({ wa_notif_sent: true })
        .eq("id", item.id);

      toast.success(`WhatsApp terkirim ke orang tua ${studentName}!`);
      fetchTeacherProfileAndData();
    } catch (err: any) {
      toast.error("Gagal mengirim WhatsApp: " + err.message);
    }
  };

  const selectedStudentObj = students.find(s => s.id === daftarForm.student_id);
  const studentLesList = selectedStudentObj?.student_les || [];

  return (
    <div className="space-y-8 font-body-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Evaluasi & Kenaikan</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Daftarkan evaluasi dan kelola kenaikan level murid.</p>
        </div>
        <button onClick={openDaftarModal} className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm w-fit cursor-pointer">
          <Plus className="w-5 h-5" /> Daftarkan Evaluasi
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        <button 
          onClick={() => setActiveTab('riwayat')}
          className={`px-6 py-3 font-headline-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'riwayat' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          Riwayat Evaluasi
        </button>
        <button 
          onClick={() => setActiveTab('daftar')}
          className={`px-6 py-3 font-headline-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'daftar' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          Daftar Menunggu Evaluasi
        </button>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">
            {activeTab === 'riwayat' ? 'Riwayat Ujian Evaluasi' : 'Daftar Murid Menunggu Evaluasi'}
          </h3>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Cari nama / no eval..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-64"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold text-body-md">Memuat data evaluasi...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">No Evaluasi</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Nama Murid</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Transisi Level</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvals.map((item) => (
                  <tr key={item.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 text-on-surface font-medium">{item.eval_number}</td>
                    <td className="p-4">
                      <div className="font-bold text-on-surface">{item.students?.full_name}</div>
                      <div className="text-body-sm text-on-surface-variant">{getStudentLesName(item.student_les)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-on-surface text-sm">{item.current_level}</span>
                        <Send className="w-4 h-4 text-on-surface-variant" />
                        <span className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm">{item.target_level}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {item.status === 'passed' && <span className="inline-flex items-center gap-1 text-primary font-bold bg-primary/10 px-3 py-1 rounded-full"><CheckCircle className="w-4 h-4"/> Lulus (Naik Level)</span>}
                      {item.status === 'failed' && <span className="inline-flex items-center gap-1 text-error font-bold bg-error/10 px-3 py-1 rounded-full"><XCircle className="w-4 h-4"/> Mengulang</span>}
                      {(item.status === 'scheduled' || item.status === 'ongoing') && <span className="inline-flex items-center gap-1 text-tertiary font-bold bg-tertiary/10 px-3 py-1 rounded-full"><ClipboardCheck className="w-4 h-4"/> Menunggu</span>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(item.status === 'scheduled' || item.status === 'ongoing') && (
                          <button 
                            onClick={() => openHasilModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary hover:bg-primary-container rounded-lg transition-colors font-label-sm font-bold shadow-sm cursor-pointer"
                            title="Input Hasil Evaluasi"
                          >
                            <Award className="w-4 h-4" /> Hasil
                          </button>
                        )}
                        <button 
                          onClick={() => handleSendWA('evaluasi', item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors font-label-sm font-bold cursor-pointer"
                          title="Kirim Pengingat Ujian via WA"
                        >
                          <MessageCircle className="w-4 h-4" /> Eval WA
                        </button>
                        {item.status === 'passed' && (
                          <button 
                            onClick={() => handleSendWA('naik_level', item)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary rounded-lg transition-colors font-label-sm font-bold cursor-pointer"
                            title="Kirim Notifikasi Naik Level via WA"
                          >
                            <Send className="w-4 h-4" /> Naik Level WA
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEvals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                      Tidak ada data evaluasi yang sesuai pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daftarkan Evaluasi Modal */}
      {isDaftarModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-primary" /> Daftarkan Evaluasi
              </h3>
              <button onClick={() => setIsDaftarModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleDaftarSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Pilih Murid</label>
                  <select 
                    required
                    value={daftarForm.student_id}
                    onChange={(e) => handleStudentChange(e.target.value)}
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
                    value={daftarForm.student_les_id}
                    onChange={(e) => setDaftarForm(prev => ({ ...prev, student_les_id: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                  >
                    <option value="" disabled>-- Pilih Program Les --</option>
                    {studentLesList.map((les: any) => (
                      <option key={les.id} value={les.id}>{getStudentLesName(les)}</option>
                    ))}
                  </select>
                  {studentLesList.length === 0 && daftarForm.student_id && (
                    <p className="text-error text-body-sm mt-1">Murid belum terdaftar di program les apapun.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Nomor Evaluasi (Otomatis)</label>
                  <input type="text" readOnly value={nextEvalNumber} className="w-full p-3 rounded-xl border border-outline bg-surface-container-lowest text-on-surface-variant font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Tanggal Mulai</label>
                    <input 
                      required 
                      type="date" 
                      value={daftarForm.start_date}
                      onChange={(e) => setDaftarForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Tanggal Selesai</label>
                    <input 
                      required 
                      type="date" 
                      value={daftarForm.end_date}
                      onChange={(e) => setDaftarForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Masa Tempuh Tampilan</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Contoh: 3 Bulan 0 Hari" 
                    value={daftarForm.duration_days}
                    onChange={(e) => setDaftarForm(prev => ({ ...prev, duration_days: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface" 
                  />
                </div>
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsDaftarModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading || studentLesList.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Daftarkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Input Hasil Modal */}
      {isHasilModalOpen && selectedEval && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-lg min-w-[300px] sm:min-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" /> Input Hasil Evaluasi
              </h3>
              <button onClick={() => setIsHasilModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleHasilSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="bg-surface-container p-4 rounded-xl border border-outline-variant space-y-1">
                  <p className="text-label-sm text-on-surface-variant uppercase">Murid</p>
                  <p className="font-bold text-on-surface text-lg">{selectedEval.students?.full_name}</p>
                  <p className="text-body-sm text-on-surface-variant">Nomor: {selectedEval.eval_number}</p>
                  <p className="text-body-sm text-on-surface-variant">Rencana Transisi Level: {selectedEval.current_level} &rarr; {selectedEval.target_level}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Hasil Kelulusan</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setHasilForm(prev => ({ ...prev, status: 'passed' }))}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${hasilForm.status === 'passed' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <CheckCircle className="w-5 h-5" /> Lulus
                    </button>
                    <button 
                      type="button"
                      onClick={() => setHasilForm(prev => ({ ...prev, status: 'failed' }))}
                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${hasilForm.status === 'failed' ? 'bg-error/10 border-error text-error shadow-sm' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <XCircle className="w-5 h-5" /> Mengulang
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Nilai Evaluasi (0-100)</label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    max="100" 
                    placeholder="90"
                    value={hasilForm.score}
                    onChange={(e) => setHasilForm(prev => ({ ...prev, score: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-bold text-2xl text-center text-on-surface" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-label-md font-bold text-on-surface">Catatan Penilaian</label>
                  <textarea 
                    required
                    placeholder="Catatan kelebihan atau kekurangan membaca/hitung..." 
                    rows={3}
                    value={hasilForm.notes}
                    onChange={(e) => setHasilForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface text-on-surface"
                  ></textarea>
                </div>

                {hasilForm.status === 'passed' && (
                  <div className="space-y-2">
                    <label className="text-label-md font-bold text-on-surface">Upload Foto Anak Naik Level</label>
                    <div className="border-2 border-dashed border-outline hover:border-primary transition-colors rounded-xl p-6 flex flex-col items-center justify-center text-on-surface-variant cursor-pointer bg-surface-container-lowest relative">
                      <Upload className="w-8 h-8 mb-2 text-primary" />
                      {photoFile ? (
                        <span className="font-bold text-primary">{photoFile.name}</span>
                      ) : (
                        <>
                          <span className="font-bold">Klik untuk memilih foto</span>
                          <span className="text-[10px] text-center mt-1">Format: JPG, PNG</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-surface-container bg-surface-container-lowest flex justify-end gap-3">
                <button type="button" onClick={() => setIsHasilModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors cursor-pointer">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Hasil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
