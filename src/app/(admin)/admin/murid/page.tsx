"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, UserCheck, UserMinus, Search, Edit, Plus, X, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import BarcodeCardModal from "@/components/attendance/BarcodeCardModal";

export default function MuridPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'>('add');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<any | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Filter & Sort states
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortField, setSortField] = useState<'nis' | 'full_name' | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Form states
  const [formData, setFormData] = useState({
    nis: "",
    nik: "",
    full_name: "",
    nickname: "",
    gender: "L",
    birth_place: "",
    birth_date: "",
    school_origin: "",
    school_class: "",
    kk_number: "",
    father_name: "",
    mother_name: "",
    whatsapp: "",
    address: "",
    rt: "",
    rw: "",
    village: "",
    district: "",
    regency: "",
    enrollment_date: new Date().toISOString().split('T')[0],
    status: "active",
    les_type: "les_ahe",
    les_mapel_name: "",
    current_level: 1,
    class_id: "",
    photo_url: "",
    birth_cert_url: "",
    kk_url: ""
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [birthCertFile, setBirthCertFile] = useState<File | null>(null);
  const [kkFile, setKkFile] = useState<File | null>(null);
  const [classesList, setClassesList] = useState<any[]>([]);

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

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          student_les (*),
          class_members (
            class_id,
            classes (
              id,
              name,
              les_type,
              level,
              les_mapel_name
            )
          )
        `)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat data murid: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*, teachers(full_name)")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) throw error;
      setClassesList(data || []);
    } catch (err: any) {
      console.error("Gagal memuat kelas:", err);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [fetchStudents, fetchClasses]);

  const activeCount = students.filter(s => s.status === 'active').length;
  const inactiveCount = students.filter(s => s.status === 'inactive').length;

  // Get unique class names for filter dropdown
  const classNames = useMemo(() => {
    const names = new Set<string>();
    students.forEach(s => {
      const className = s.class_members?.[0]?.classes?.name;
      if (className) names.add(className);
    });
    return Array.from(names).sort();
  }, [students]);

  const handleSort = (field: 'nis' | 'full_name') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-40" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      // Search filter
      const phoneNum = s.whatsapp || s.registrations?.whatsapp || "";
      const matchSearch = !searchQuery || 
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phoneNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      const matchStatus = !filterStatus || s.status === filterStatus;
      
      // Class filter
      const studentClassName = s.class_members?.[0]?.classes?.name || '';
      const matchClass = !filterClass || studentClassName === filterClass;
      
      return matchSearch && matchStatus && matchClass;
    });

    // Sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        const valA = (a[sortField] || '').toLowerCase();
        const valB = (b[sortField] || '').toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [students, searchQuery, filterStatus, filterClass, sortField, sortDirection]);

  const filteredClasses = classesList.filter(c => {
    if (c.les_type !== formData.les_type) return false;
    if (formData.les_type === 'les_mapel') {
      return c.les_mapel_name?.toLowerCase() === formData.les_mapel_name?.toLowerCase();
    } else {
      return c.level === Number(formData.current_level);
    }
  });

  useEffect(() => {
    if (formData.class_id) {
      const isValid = classesList.some(c => 
        c.id === formData.class_id &&
        c.les_type === formData.les_type &&
        (formData.les_type === 'les_mapel' 
          ? c.les_mapel_name?.toLowerCase() === formData.les_mapel_name?.toLowerCase()
          : c.level === Number(formData.current_level))
      );
      if (!isValid) {
        setFormData(prev => ({ ...prev, class_id: "" }));
      }
    }
  }, [formData.les_type, formData.current_level, formData.les_mapel_name, classesList, formData.class_id]);

  const getLesProgramInfo = (student: any) => {
    const studentLesList = student.student_les || [];
    if (studentLesList.length === 0) return "Belum terdaftar";
    
    const programInfo = studentLesList.map((les: any) => {
      let typeLabel = "";
      if (les.les_type === "les_ahe") typeLabel = `AHE Lvl ${les.current_level}`;
      else if (les.les_type === "les_ase") typeLabel = `ASE Lvl ${les.current_level}`;
      else if (les.les_type === "les_mapel") typeLabel = `Mapel (${les.les_mapel_name || ""})`;
      return typeLabel;
    }).join(", ");

    const className = student.class_members?.[0]?.classes?.name;
    if (className) {
      return `${programInfo} (${className})`;
    }
    return `${programInfo} (Belum masuk kelas)`;
  };

  const openModal = (mode: 'add'|'edit', student: any = null) => {
    setModalMode(mode);
    setSelectedStudent(student);
    
    // Reset file selections
    setPhotoFile(null);
    setBirthCertFile(null);
    setKkFile(null);

    if (mode === 'edit' && student) {
      const currentLes = student.student_les?.[0] || {};
      const currentClassId = student.class_members?.[0]?.class_id || "";
      setFormData({
        nis: student.nis || "",
        nik: student.nik || "",
        full_name: student.full_name || "",
        nickname: student.nickname || "",
        gender: student.gender || "L",
        birth_place: student.birth_place || "",
        birth_date: student.birth_date || "",
        school_origin: student.school_origin || "",
        school_class: student.school_class || "",
        kk_number: student.kk_number || "",
        father_name: student.father_name || "",
        mother_name: student.mother_name || "",
        whatsapp: student.whatsapp || student.registrations?.whatsapp || "",
        address: student.address || "",
        rt: student.rt || "",
        rw: student.rw || "",
        village: student.village || "",
        district: student.district || "",
        regency: student.regency || "",
        enrollment_date: student.enrollment_date || new Date().toISOString().split('T')[0],
        status: student.status || "active",
        les_type: currentLes.les_type || "les_ahe",
        les_mapel_name: currentLes.les_mapel_name || "",
        current_level: currentLes.current_level || 1,
        class_id: currentClassId,
        photo_url: student.photo_url || "",
        birth_cert_url: student.birth_cert_url || "",
        kk_url: student.kk_url || "",
      });
    } else {
      setFormData({
        nis: "",
        nik: "",
        full_name: "",
        nickname: "",
        gender: "L",
        birth_place: "",
        birth_date: "",
        school_origin: "",
        school_class: "",
        kk_number: "",
        father_name: "",
        mother_name: "",
        whatsapp: "",
        address: "",
        rt: "",
        rw: "",
        village: "",
        district: "",
        regency: "",
        enrollment_date: new Date().toISOString().split('T')[0],
        status: "active",
        les_type: "les_ahe",
        les_mapel_name: "",
        current_level: 1,
        class_id: "",
        photo_url: "",
        birth_cert_url: "",
        kk_url: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      let photoUrlValue = formData.photo_url || null;
      let birthCertUrlValue = formData.birth_cert_url || null;
      let kkUrlValue = formData.kk_url || null;

      if (photoFile) {
        const fileId = await uploadToDrive(photoFile, "murid");
        if (fileId) photoUrlValue = fileId;
      }
      if (birthCertFile) {
        const fileId = await uploadToDrive(birthCertFile, "murid");
        if (fileId) birthCertUrlValue = fileId;
      }
      if (kkFile) {
        const fileId = await uploadToDrive(kkFile, "murid");
        if (fileId) kkUrlValue = fileId;
      }

      if (modalMode === 'add') {
        // Use manually entered NIS
        const nis = formData.nis.trim();
        if (!nis) {
          toast.error("NIS wajib diisi!");
          setSaveLoading(false);
          return;
        }

        // 1. Insert Student
        const { data: newStudent, error: studentError } = await supabase
          .from("students")
          .insert({
            nis,
            nik: formData.nik || null,
            full_name: formData.full_name,
            nickname: formData.nickname || null,
            gender: formData.gender,
            birth_place: formData.birth_place || null,
            birth_date: formData.birth_date || null,
            school_origin: formData.school_origin || null,
            school_class: formData.school_class || null,
            kk_number: formData.kk_number || null,
            father_name: formData.father_name || null,
            mother_name: formData.mother_name || null,
            whatsapp: formData.whatsapp ? formData.whatsapp.trim() : null,
            address: formData.address || null,
            rt: formData.rt || null,
            rw: formData.rw || null,
            village: formData.village || null,
            district: formData.district || null,
            regency: formData.regency || null,
            enrollment_date: formData.enrollment_date || null,
            status: formData.status,
            photo_url: photoUrlValue,
            birth_cert_url: birthCertUrlValue,
            kk_url: kkUrlValue
          })
          .select()
          .single();

        if (studentError || !newStudent) throw studentError || new Error("Failed to insert student");

        // 2. Insert Student Les
        let maxLevel = null;
        if (formData.les_type === "les_ahe") maxLevel = 8;
        else if (formData.les_type === "les_ase") maxLevel = 16;

        const { error: lesError } = await supabase
          .from("student_les")
          .insert({
            student_id: newStudent.id,
            les_type: formData.les_type,
            current_level: formData.current_level,
            max_level: maxLevel,
            les_mapel_name: formData.les_type === "les_mapel" ? formData.les_mapel_name : null,
            status: "active"
          });

        if (lesError) throw lesError;

        // 3. Insert Class Member if class is selected
        if (formData.class_id) {
          const { error: memberError } = await supabase
            .from("class_members")
            .insert({
              class_id: formData.class_id,
              student_id: newStudent.id
            });
          if (memberError) throw memberError;
        }

        toast.success(`Data murid ${formData.full_name} berhasil ditambahkan!`);
      } else {
        // Edit Mode
        if (!selectedStudent) return;

        // 1. Update Student
        const { error: studentError } = await supabase
          .from("students")
          .update({
            nis: formData.nis.trim(),
            nik: formData.nik || null,
            full_name: formData.full_name,
            nickname: formData.nickname || null,
            gender: formData.gender,
            birth_place: formData.birth_place || null,
            birth_date: formData.birth_date || null,
            school_origin: formData.school_origin || null,
            school_class: formData.school_class || null,
            kk_number: formData.kk_number || null,
            father_name: formData.father_name || null,
            mother_name: formData.mother_name || null,
            whatsapp: formData.whatsapp ? formData.whatsapp.trim() : null,
            address: formData.address || null,
            rt: formData.rt || null,
            rw: formData.rw || null,
            village: formData.village || null,
            district: formData.district || null,
            regency: formData.regency || null,
            enrollment_date: formData.enrollment_date || null,
            status: formData.status,
            photo_url: photoUrlValue,
            birth_cert_url: birthCertUrlValue,
            kk_url: kkUrlValue
          })
          .eq("id", selectedStudent.id);

        if (studentError) throw studentError;

        // 2. Upsert/Update student_les
        let maxLevel = null;
        if (formData.les_type === "les_ahe") maxLevel = 8;
        else if (formData.les_type === "les_ase") maxLevel = 16;

        const existingLes = selectedStudent.student_les?.[0];
        if (existingLes) {
          const { error: lesError } = await supabase
            .from("student_les")
            .update({
              les_type: formData.les_type,
              current_level: formData.current_level,
              max_level: maxLevel,
              les_mapel_name: formData.les_type === "les_mapel" ? formData.les_mapel_name : null,
              status: formData.status === "active" ? "active" : "inactive"
            })
            .eq("id", existingLes.id);
          if (lesError) throw lesError;
        } else {
          const { error: lesError } = await supabase
            .from("student_les")
            .insert({
              student_id: selectedStudent.id,
              les_type: formData.les_type,
              current_level: formData.current_level,
              max_level: maxLevel,
              les_mapel_name: formData.les_type === "les_mapel" ? formData.les_mapel_name : null,
              status: "active"
            });
          if (lesError) throw lesError;
        }

        // 3. Sync class membership
        const oldClassId = selectedStudent.class_members?.[0]?.class_id || "";
        if (formData.class_id !== oldClassId) {
          await supabase
            .from("class_members")
            .delete()
            .eq("student_id", selectedStudent.id);

          if (formData.class_id) {
            const { error: memberError } = await supabase
              .from("class_members")
              .insert({
                student_id: selectedStudent.id,
                class_id: formData.class_id
              });
            if (memberError) throw memberError;
          }
        }

        toast.success(`Data murid ${formData.full_name} berhasil diperbarui!`);
      }

      await fetchStudents();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan data: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data murid "${name}"? Seluruh data tabungan, poin, dan program les terkait murid ini juga akan dihapus.`)) {
      return;
    }

    try {
      // Delete child records first to satisfy FK constraints
      await supabase.from("student_les").delete().eq("student_id", id);
      await supabase.from("savings_accounts").delete().eq("student_id", id);
      await supabase.from("student_points").delete().eq("student_id", id);
      await supabase.from("student_attendance").delete().eq("student_id", id);
      await supabase.from("achievements").delete().eq("student_id", id);
      await supabase.from("evaluations").delete().eq("student_id", id);
      await supabase.from("graduations").delete().eq("student_id", id);
      await supabase.from("leave_requests").delete().eq("student_id", id);
      await supabase.from("payment_bills").delete().eq("student_id", id);
      await supabase.from("payment_transactions").delete().eq("student_id", id);
      await supabase.from("savings_transactions").delete().eq("student_id", id);
      await supabase.from("point_transactions").delete().eq("student_id", id);
      await supabase.from("point_redemptions").delete().eq("student_id", id);
      await supabase.from("class_members").delete().eq("student_id", id);

      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(`Data murid ${name} berhasil dihapus.`);
      await fetchStudents();
    } catch (err: any) {
      console.error("Gagal menghapus murid:", err);
      toast.error("Gagal menghapus data murid: " + err.message);
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
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Data Murid</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Kelola data murid, kelas, dan status keaktifan.</p>
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
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm w-fit"
          >
            <Plus className="w-5 h-5" /> Tambah Murid
          </button>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-primary-container text-on-primary-container rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Total Murid</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : students.length}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Murid Aktif</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : activeCount}</h3>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-4">
          <div className="p-4 bg-error-container text-on-error-container rounded-xl">
            <UserMinus className="w-8 h-8" />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">Cuti / Nonaktif</p>
            <h3 className="text-display-sm font-headline-lg text-on-surface">{loading ? "..." : inactiveCount}</h3>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-6 border-b border-surface-container bg-surface-container-lowest space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Daftar Murid</h3>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Cari nama atau NIS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface text-on-surface w-full sm:w-64"
              />
            </div>
          </div>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Filter className="w-4 h-4" />
              <span className="text-label-sm font-bold uppercase tracking-wider">Filter:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-body-sm bg-surface text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-body-sm bg-surface text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
            >
              <option value="">Semua Kelas</option>
              {classNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {(filterStatus || filterClass) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterClass(''); }}
                className="px-3 py-1.5 rounded-lg text-body-sm text-error hover:bg-error-container/30 font-bold transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-bold">Memuat data murid...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-container">
                  <th className="p-4 font-label-md text-on-surface-variant">
                    <button onClick={() => handleSort('nis')} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer">
                      NIS {getSortIcon('nis')}
                    </button>
                  </th>
                  <th className="p-4 font-label-md text-on-surface-variant">
                    <button onClick={() => handleSort('full_name')} className="inline-flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer">
                      Nama Lengkap {getSortIcon('full_name')}
                    </button>
                  </th>
                  <th className="p-4 font-label-md text-on-surface-variant">Program & Kelas</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Tanggal Bergabung</th>
                  <th className="p-4 font-label-md text-on-surface-variant">Status</th>
                  <th className="p-4 font-label-md text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-surface-container hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="p-4 font-medium text-on-surface-variant">{student.nis}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {student.photo_url ? (
                          <img src={getDriveFileUrl(student.photo_url)} alt="Foto Murid" className="w-10 h-10 rounded-full object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                            {student.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-on-surface">{student.full_name}</div>
                          <div className="text-body-sm text-on-surface-variant flex items-center gap-2 flex-wrap">
                            <span>{student.school_origin || "-"} (Kl. {student.school_class || "-"})</span>
                            {(student.whatsapp || student.registrations?.whatsapp) && (
                              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                                WA: {student.whatsapp || student.registrations?.whatsapp}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold">
                        {getLesProgramInfo(student)}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface">
                      {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('id-ID') : "-"}
                    </td>
                    <td className="p-4">
                      {student.status === 'active' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-tertiary-container/50 text-tertiary font-bold text-label-sm">Aktif</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-error-container/50 text-error font-bold text-label-sm">Nonaktif</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setPreviewStudent(student); setIsPreviewOpen(true); }} 
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-secondary"
                          title="Preview Biodata"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openModal('edit', student)} 
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
                          title="Edit Data"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id, student.full_name)} 
                          className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-error"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Tidak ada data murid yang sesuai pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Murid Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">
                {modalMode === 'add' ? 'Tambah Murid Baru' : 'Edit Data Murid'}
              </h3>
              <button disabled={saveLoading} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Profil Anak</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">NIS (Nomor Induk Siswa) <span className="text-error">*</span></label>
                      <input required name="nis" value={formData.nis} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Contoh: AHE-2026-001" />
                      {modalMode === 'edit' && <p className="text-body-sm text-on-surface-variant">⚠️ Ubah NIS hanya jika diperlukan</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">NIK Anak</label>
                      <input name="nik" value={formData.nik} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Sesuai KK" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nama Lengkap</label>
                      <input required name="full_name" value={formData.full_name} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Nama Lengkap" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nama Panggilan</label>
                      <input required name="nickname" value={formData.nickname} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Nama Panggilan" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jenis Kelamin</label>
                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface">
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tempat Lahir</label>
                      <input required name="birth_place" value={formData.birth_place} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Kota" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tanggal Lahir</label>
                      <input required name="birth_date" value={formData.birth_date} onChange={handleInputChange} type="date" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Informasi Sekolah</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Asal Sekolah</label>
                      <input required name="school_origin" value={formData.school_origin} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Nama Sekolah" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Kelas Sekolah</label>
                      <input required name="school_class" value={formData.school_class} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Kelas Saat Ini" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Data Orang Tua & Alamat</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Nomor KK</label>
                      <input name="kk_number" value={formData.kk_number} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Nomor Kartu Keluarga" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nama Ayah</label>
                      <input required name="father_name" value={formData.father_name} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Nama Lengkap Ayah" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Nama Ibu</label>
                      <input required name="mother_name" value={formData.mother_name} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Nama Lengkap Ibu" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface flex items-center justify-between">
                        <span>Nomor WhatsApp (Orang Tua / Wali)</span>
                        <span className="text-[11px] text-primary font-normal">Contoh: 08123456789</span>
                      </label>
                      <input 
                        name="whatsapp" 
                        value={formData.whatsapp} 
                        onChange={handleInputChange} 
                        type="text" 
                        className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface font-mono" 
                        placeholder="08xxxxxxxxxx atau 628xxxxxxxxxx" 
                      />
                      <p className="text-xs text-on-surface-variant">Digunakan untuk konfirmasi pendaftaran, pengiriman bukti kwitansi SPP, dan tagihan belajar.</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Alamat Lengkap</label>
                      <textarea required name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface min-h-[80px]" placeholder="Nama Jalan, Gg, No Rumah"></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">RT</label>
                        <input name="rt" value={formData.rt} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">RW</label>
                        <input name="rw" value={formData.rw} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Desa / Kelurahan</label>
                      <input required name="village" value={formData.village} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Kecamatan</label>
                      <input required name="district" value={formData.district} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Kabupaten / Kota</label>
                      <input required name="regency" value={formData.regency} onChange={handleInputChange} type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Program Les</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Tanggal Masuk</label>
                      <input required name="enrollment_date" value={formData.enrollment_date} onChange={handleInputChange} type="date" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Status Murid</label>
                      <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface">
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif / Cuti</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Jenis Les</label>
                      <select name="les_type" value={formData.les_type} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface">
                        <option value="les_ahe">Les AHE</option>
                        <option value="les_ase">Les ASE</option>
                        <option value="les_mapel">Les MAPEL</option>
                      </select>
                    </div>
                    {formData.les_type === "les_mapel" ? (
                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Detail Mata Pelajaran</label>
                        <input name="les_mapel_name" value={formData.les_mapel_name} onChange={handleInputChange} required type="text" className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" placeholder="Contoh: Matematika, IPA" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-label-md font-bold text-on-surface">Level / Tingkatan</label>
                        <input name="current_level" value={formData.current_level} onChange={handleInputChange} required type="number" min="1" max={formData.les_type === "les_ahe" ? "8" : "16"} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface" />
                      </div>
                    )}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Kelas Les (di AHE)</label>
                      <select name="class_id" value={formData.class_id} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface">
                        <option value="">-- Pilih Kelas Les --</option>
                        {filteredClasses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.schedule || "Tanpa Jadwal"}) - Tentor: {c.teachers?.full_name || "Tanpa Tentor"}
                          </option>
                        ))}
                      </select>
                      {filteredClasses.length === 0 && (
                        <p className="text-body-sm text-error font-bold mt-1">
                          ⚠️ Belum ada kelas aktif yang cocok untuk program & level ini. Silakan buat kelas baru di menu Kelas.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-label-md font-bold text-primary uppercase tracking-wider border-b border-outline-variant pb-2">Berkas Lampiran (Upload Scan)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Foto Murid</label>
                      <input onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} type="file" accept="image/*" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-semibold" />
                      {formData.photo_url && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={getDriveFileUrl(formData.photo_url)} alt="Foto Murid" className="w-14 h-14 rounded-lg object-cover border" />
                          <span className="text-xs text-on-surface-variant">Foto tersimpan</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md font-bold text-on-surface">Scan Akta Kelahiran</label>
                      <input onChange={(e) => setBirthCertFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-semibold" />
                      {formData.birth_cert_url && (
                        <div className="mt-2">
                          <a href={getDriveFileUrl(formData.birth_cert_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1">
                            📄 Lihat Scan Akta Kelahiran
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-label-md font-bold text-on-surface">Scan Kartu Keluarga (KK)</label>
                      <input onChange={(e) => setKkFile(e.target.files?.[0] || null)} type="file" accept="image/*,application/pdf" className="w-full p-2.5 rounded-xl border border-outline bg-surface text-body-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-semibold" />
                      {formData.kk_url && (
                        <div className="mt-2">
                          <a href={getDriveFileUrl(formData.kk_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1">
                            📄 Lihat Scan KK
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
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan data...
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-outline text-on-surface hover:bg-surface-container font-headline-sm transition-colors">
                      Batal
                    </button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-sm font-headline-sm transition-colors">
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
      {isPreviewOpen && previewStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-background/60 backdrop-blur-sm">
          <div className="relative bg-surface w-full max-w-2xl min-w-[300px] sm:min-w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Detail Biodata Murid</h3>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 max-h-[75vh]">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-outline-variant">
                {previewStudent.photo_url ? (
                  <img src={getDriveFileUrl(previewStudent.photo_url)} alt="Foto Murid" className="w-28 h-28 rounded-2xl object-cover border-2 border-primary shadow-sm" />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-headline-xl border-2 border-primary shadow-sm">
                    {previewStudent.full_name.charAt(0)}
                  </div>
                )}
                <div className="text-center sm:text-left space-y-1">
                  <h4 className="text-headline-md font-bold text-on-surface">{previewStudent.full_name}</h4>
                  <p className="text-body-md text-on-surface-variant font-medium">NIS: <span className="font-bold text-primary">{previewStudent.nis}</span></p>
                  <span className={`inline-block px-3 py-1 rounded-full text-label-sm font-bold ${previewStudent.status === 'active' ? 'bg-tertiary-container text-tertiary' : 'bg-error-container text-error'}`}>
                    {previewStudent.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-body-md">
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">NIK Anak</span>
                  <span className="font-bold text-on-surface">{previewStudent.nik || "-"}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Nama Panggilan</span>
                  <span className="font-bold text-on-surface">{previewStudent.nickname || "-"}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Jenis Kelamin</span>
                  <span className="font-bold text-on-surface">{previewStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Tempat, Tanggal Lahir</span>
                  <span className="font-bold text-on-surface">
                    {previewStudent.birth_place || "-"}, {previewStudent.birth_date ? new Date(previewStudent.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Asal Sekolah & Kelas</span>
                  <span className="font-bold text-on-surface">{previewStudent.school_origin || "-"} (Kelas {previewStudent.school_class || "-"})</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Program Les Terdaftar</span>
                  <span className="font-bold text-secondary">{getLesProgramInfo(previewStudent)}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Nomor KK</span>
                  <span className="font-bold text-on-surface">{previewStudent.kk_number || "-"}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Tanggal Masuk</span>
                  <span className="font-bold text-on-surface">
                    {previewStudent.enrollment_date ? new Date(previewStudent.enrollment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Nama Orang Tua (Ayah / Ibu)</span>
                  <span className="font-bold text-on-surface">
                    {[previewStudent.father_name, previewStudent.mother_name].filter(Boolean).join(" / ") || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Nomor WhatsApp Wali</span>
                  {previewStudent.whatsapp || previewStudent.registrations?.whatsapp ? (
                    <a 
                      href={`https://wa.me/${(previewStudent.whatsapp || previewStudent.registrations?.whatsapp).replace(/\D/g, '').replace(/^0/, '62')}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1.5"
                    >
                      <span>{previewStudent.whatsapp || previewStudent.registrations?.whatsapp}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs">Kirim Pesan</span>
                    </a>
                  ) : (
                    <span className="font-bold text-on-surface">-</span>
                  )}
                </div>
                <div className="md:col-span-2">
                  <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Alamat Rumah</span>
                  <span className="font-bold text-on-surface">
                    {previewStudent.address || "-"}, RT {previewStudent.rt || "-"}/RW {previewStudent.rw || "-"}, Desa {previewStudent.village || "-"}, Kec. {previewStudent.district || "-"}, Kab. {previewStudent.regency || "-"}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant space-y-3">
                <h4 className="text-label-md font-bold text-primary uppercase tracking-wider">Berkas Lampiran Scan</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container rounded-xl flex items-center justify-between border">
                    <span className="font-bold text-body-sm text-on-surface">Scan Akta Kelahiran</span>
                    {previewStudent.birth_cert_url ? (
                      <a href={getDriveFileUrl(previewStudent.birth_cert_url)} target="_blank" rel="noopener noreferrer" className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-primary-container transition-colors">
                        Buka File
                      </a>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Belum diupload</span>
                    )}
                  </div>
                  <div className="p-4 bg-surface-container rounded-xl flex items-center justify-between border">
                    <span className="font-bold text-body-sm text-on-surface">Scan Kartu Keluarga (KK)</span>
                    {previewStudent.kk_url ? (
                      <a href={getDriveFileUrl(previewStudent.kk_url)} target="_blank" rel="noopener noreferrer" className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-body-sm hover:bg-primary-container transition-colors">
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
              <button onClick={() => setIsPreviewOpen(false)} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-headline-sm hover:bg-primary-container transition-colors shadow-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <BarcodeCardModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title="Cetak Kartu Absensi Siswa"
        type="siswa"
        items={students.map((s) => {
          let programText = "AHE";
          if (s.student_les && s.student_les.length > 0) {
            const t = s.student_les[0].les_type;
            if (t === "les_ahe") programText = `AHE Lvl ${s.student_les[0].current_level || 1}`;
            else if (t === "les_ase") programText = `ASE Lvl ${s.student_les[0].current_level || 1}`;
            else if (t === "les_mapel") programText = `Mapel (${s.student_les[0].les_mapel_name || "Umum"})`;
          }
          const clsName = s.class_members?.[0]?.classes?.name;
          const subtitle = clsName ? `${programText} • ${clsName}` : programText;
          return {
            id: s.id,
            name: s.full_name,
            subtitle: `NIS: ${s.nis || "-"} | ${subtitle}`,
            code: `STU-${s.id}`,
            photo_url: s.photo_url || "",
            badge: programText,
          };
        })}
      />
    </div>
  );
}
