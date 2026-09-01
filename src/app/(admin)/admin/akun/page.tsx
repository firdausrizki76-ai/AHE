"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Users, KeyRound, Search, Plus, Trash2, 
  RotateCcw, Shield, GraduationCap, BookOpen, Copy, 
  Check, MessageSquare, AlertCircle, Sparkles, RefreshCw, X, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface UserAccount {
  id: string;
  email: string;
  role: 'admin' | 'guru' | 'murid';
  full_name: string;
  identifier: string;
  phone: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
  teacher_id: string | null;
  student_id: string | null;
}

export default function ManajemenAkunPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [unlinkedStudents, setUnlinkedStudents] = useState<any[]>([]);
  const [unlinkedTeachers, setUnlinkedTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'guru' | 'murid'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for Create Modal
  const [createForm, setCreateForm] = useState({
    role: 'murid' as 'admin' | 'guru' | 'murid',
    email: '',
    password: 'password',
    full_name: '',
    teacher_id: '',
    student_id: '',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Form states for Reset Modal
  const [newPassword, setNewPassword] = useState('password');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Fetch all accounts and unlinked data
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all auth users via RPC
      const { data, error } = await supabase.rpc('admin_get_users' as any);
      if (error) throw error;
      setUsers((data as any) || []);

      // 2. Fetch students without user_id
      const { data: studentsData, error: sErr } = await supabase
        .from('students')
        .select('id, nis, full_name, whatsapp')
        .is('user_id', null)
        .order('nis', { ascending: true });
      if (!sErr) setUnlinkedStudents(studentsData || []);

      // 3. Fetch teachers without user_id
      const { data: teachersData, error: tErr } = await supabase
        .from('teachers')
        .select('id, nip, full_name, whatsapp')
        .is('user_id', null)
        .order('full_name', { ascending: true });
      if (!tErr) setUnlinkedTeachers(teachersData || []);
    } catch (err: any) {
      console.error("Error fetching accounts:", err);
      toast.error("Gagal memuat daftar akun: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        u.email?.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query) ||
        u.identifier?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admin = users.filter(u => u.role === 'admin').length;
    const guru = users.filter(u => u.role === 'guru').length;
    const murid = users.filter(u => u.role === 'murid').length;
    const unlinkedCount = unlinkedStudents.length + unlinkedTeachers.length;
    return { total, admin, guru, murid, unlinkedCount };
  }, [users, unlinkedStudents, unlinkedTeachers]);

  // Copy credentials helper
  const copyCredentials = (user: UserAccount) => {
    const text = `Akun Portal Anak Hebat (AHE):\nUsername / NIS / NIP: ${user.identifier || user.email}\nEmail: ${user.email}\nRole: ${user.role.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    toast.success(`Informasi akun ${user.full_name} disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // WhatsApp helper
  const sendWhatsAppInfo = (user: UserAccount) => {
    if (!user.phone || user.phone === '-') {
      toast.error("Nomor WhatsApp tidak tersedia untuk akun ini");
      return;
    }
    let phoneNum = user.phone.replace(/[^0-9]/g, '');
    if (phoneNum.startsWith('0')) {
      phoneNum = '62' + phoneNum.slice(1);
    }
    const message = encodeURIComponent(
      `Halo ${user.full_name},\n\nBerikut informasi akun portal belajar AHE Tepus Wetan:\n👤 Username / NIS / NIP: *${user.identifier || user.email}*\n📧 Email: *${user.email}*\n🔑 Password Default: *password*\n🌐 Login di: ${window.location.origin}/login\n\nSilakan login dan periksa jadwal serta capaian belajar ananda. Terima kasih!`
    );
    window.open(`https://wa.me/${phoneNum}?text=${message}`, '_blank');
  };

  // Handle Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password) {
      toast.error("Email/username dan password wajib diisi");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_create_user' as any, {
        p_email: createForm.email,
        p_password: createForm.password,
        p_role: createForm.role,
        p_full_name: createForm.full_name || null,
        p_teacher_id: createForm.teacher_id || null,
        p_student_id: createForm.student_id || null,
      });

      if (error) throw error;

      toast.success(`Akun baru (${createForm.email}) berhasil dibuat!`);
      setIsCreateModalOpen(false);
      setCreateForm({
        role: 'murid',
        email: '',
        password: 'password',
        full_name: '',
        teacher_id: '',
        student_id: '',
      });
      await fetchAccounts();
    } catch (err: any) {
      console.error("Create account error:", err);
      toast.error(`Gagal membuat akun: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 4) {
      toast.error("Password minimal 4 karakter");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_reset_password' as any, {
        p_user_id: selectedUser.id,
        p_new_password: newPassword,
      });

      if (error) throw error;

      toast.success(`Password untuk ${selectedUser.full_name} berhasil diubah!`);
      setIsResetModalOpen(false);
      setSelectedUser(null);
      setNewPassword('password');
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(`Gagal mereset password: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_delete_user' as any, {
        p_user_id: selectedUser.id,
      });

      if (error) throw error;

      toast.success(`Akun ${selectedUser.full_name} (${selectedUser.email}) berhasil dihapus.`);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      await fetchAccounts();
    } catch (err: any) {
      console.error("Delete user error:", err);
      toast.error(`Gagal menghapus akun: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Generate Accounts
  const handleBatchGenerate = async () => {
    setActionLoading(true);
    try {
      let createdStudents = 0;
      let createdTeachers = 0;

      const { data: sCount, error: sErr } = await supabase.rpc('admin_batch_generate_student_accounts' as any, {
        p_default_password: 'password'
      });
      if (sErr) throw sErr;
      createdStudents = (sCount as any) || 0;

      const { data: tCount, error: tErr } = await supabase.rpc('admin_batch_generate_teacher_accounts' as any, {
        p_default_password: 'password'
      });
      if (tErr) throw tErr;
      createdTeachers = (tCount as any) || 0;

      toast.success(`Berhasil membuat ${createdStudents} akun murid dan ${createdTeachers} akun guru secara otomatis.`);
      await fetchAccounts();
    } catch (err: any) {
      console.error("Batch generate error:", err);
      toast.error(`Gagal melakukan generate akun: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-body-md">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface flex items-center gap-3">
            <KeyRound className="w-8 h-8 text-primary" />
            Manajemen Akun Pengguna
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Kelola akun autentikasi real (Admin, Guru, Murid), reset password, dan pantau status login.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleBatchGenerate}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-xl font-bold transition-all disabled:opacity-50 text-label-md"
          >
            <Sparkles className="w-4 h-4" />
            Generate Akun Otomatis
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-bold shadow-md transition-all text-label-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Akun Baru
          </button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-sm font-medium">Total Akun</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-headline-lg font-extrabold text-on-surface mt-2">{loading ? "..." : stats.total}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-sm font-medium">Admin</span>
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-headline-lg font-extrabold text-purple-600 mt-2">{loading ? "..." : stats.admin}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-sm font-medium">Guru</span>
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-headline-lg font-extrabold text-amber-600 mt-2">{loading ? "..." : stats.guru}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-sm font-medium">Murid</span>
            <GraduationCap className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-headline-lg font-extrabold text-emerald-600 mt-2">{loading ? "..." : stats.murid}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-sm font-medium">Belum Punya Akun</span>
            <AlertCircle className="w-5 h-5 text-error" />
          </div>
          <p className="text-headline-lg font-extrabold text-error mt-2">{loading ? "..." : stats.unlinkedCount}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { key: 'all', label: 'Semua Akun' },
            { key: 'admin', label: 'Admin' },
            { key: 'guru', label: 'Guru' },
            { key: 'murid', label: 'Murid' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-label-sm font-bold transition-all whitespace-nowrap ${
                roleFilter === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Cari nama, email, NIS, NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="p-2.5 bg-surface-container hover:bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container text-on-surface-variant text-label-sm font-bold">
                <th className="p-4">Pengguna / Nama</th>
                <th className="p-4">Username / ID Login</th>
                <th className="p-4">Email Real</th>
                <th className="p-4">Role</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4">Login Terakhir</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-body-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span className="font-bold">Memuat daftar akun pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    <p className="font-bold text-headline-sm">Tidak ada akun ditemukan</p>
                    <p className="text-body-sm mt-1">Coba ubah kata kunci pencarian atau filter role.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleBadge = 
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : u.role === 'guru' ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300';

                  return (
                    <tr key={u.id} className="hover:bg-surface-container-lowest/60 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-label-sm ${
                            u.role === 'admin' ? 'bg-purple-600 text-white'
                            : u.role === 'guru' ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                          }`}>
                            {u.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-on-surface">{u.full_name || '-'}</div>
                            <div className="text-body-xs text-on-surface-variant">
                              {u.teacher_id ? 'Guru Terhubung' : u.student_id ? 'Murid Terhubung' : 'Akun Standalone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono bg-surface-container-high px-2.5 py-1 rounded-md text-body-xs font-semibold text-on-surface">
                          {u.identifier || '-'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-body-xs text-on-surface-variant">
                        {u.email}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-xs font-bold border ${roleBadge} uppercase`}>
                          {u.role === 'admin' && <Shield className="w-3 h-3" />}
                          {u.role === 'guru' && <BookOpen className="w-3 h-3" />}
                          {u.role === 'murid' && <GraduationCap className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-body-sm text-on-surface-variant">
                        {u.phone !== '-' ? (
                          <button 
                            onClick={() => sendWhatsAppInfo(u)}
                            className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                            title="Kirim info login via WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {u.phone}
                          </button>
                        ) : (
                          <span className="text-outline">-</span>
                        )}
                      </td>
                      <td className="p-4 text-body-xs text-on-surface-variant">
                        {u.last_sign_in_at 
                          ? new Date(u.last_sign_in_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                          : 'Belum pernah login'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyCredentials(u)}
                            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                            title="Salin Kredensial Akun"
                          >
                            {copiedId === u.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword('password');
                              setIsResetModalOpen(true);
                            }}
                            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-amber-600 transition-colors"
                            title="Reset Password"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-error transition-colors"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah Akun Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white w-full max-w-lg rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Tambah Akun Baru
              </h3>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateAccount} className="p-6 space-y-5">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-label-sm font-bold text-on-surface">Pilih Role Akun</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['murid', 'guru', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setCreateForm({
                          ...createForm,
                          role: r,
                          teacher_id: '',
                          student_id: '',
                        });
                      }}
                      className={`py-3 px-2 rounded-xl border text-center font-bold text-label-sm capitalize transition-all ${
                        createForm.role === r
                          ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary'
                          : 'border-outline-variant hover:border-primary text-on-surface-variant'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Linking helper if murid */}
              {createForm.role === 'murid' && unlinkedStudents.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-label-sm font-bold text-on-surface">Hubungkan ke Data Murid (Opsional)</label>
                  <select
                    value={createForm.student_id}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const st = unlinkedStudents.find(s => s.id === sId);
                      setCreateForm({
                        ...createForm,
                        student_id: sId,
                        full_name: st?.full_name || createForm.full_name,
                        email: st?.nis ? `${st.nis.toLowerCase().replace(/[^a-z0-9]/g, '')}@ahe.com` : createForm.email,
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Buat akun murid bebas / belum terhubung --</option>
                    {unlinkedStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nis} - {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Linking helper if guru */}
              {createForm.role === 'guru' && unlinkedTeachers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-label-sm font-bold text-on-surface">Hubungkan ke Data Guru (Opsional)</label>
                  <select
                    value={createForm.teacher_id}
                    onChange={(e) => {
                      const tId = e.target.value;
                      const tch = unlinkedTeachers.find(t => t.id === tId);
                      setCreateForm({
                        ...createForm,
                        teacher_id: tId,
                        full_name: tch?.full_name || createForm.full_name,
                        email: tch?.nip ? `${tch.nip.toLowerCase().replace(/[^a-z0-9]/g, '')}@ahe.com` : createForm.email,
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Buat akun guru bebas / belum terhubung --</option>
                    {unlinkedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nip || 'No-NIP'} - {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-on-surface">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap..."
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Email / Username */}
              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-on-surface">Username / Email Login</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AHE260010 atau email@domain.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary font-mono"
                />
                <p className="text-body-xs text-on-surface-variant">Jika tanpa @ domain, otomatis ditambahkan @ahe.com</p>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-on-surface">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container font-bold text-label-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-bold shadow-md transition-all text-label-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                Reset Password Akun
              </h3>
              <button 
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-5">
              {/* Target User Info Card */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/50 space-y-1">
                <p className="text-label-xs font-bold text-on-surface-variant uppercase">Akun Pengguna:</p>
                <p className="font-bold text-on-surface text-body-md">{selectedUser.full_name}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="font-mono text-body-xs text-on-surface-variant bg-white px-2 py-0.5 rounded border border-outline-variant/60">
                    {selectedUser.identifier || selectedUser.email}
                  </span>
                  <span className="text-label-xs uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              {/* New Password Input */}
              <div className="space-y-1.5">
                <label className="text-label-sm font-bold text-on-surface">Password Baru</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password baru..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-white text-on-surface text-body-md focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-body-xs text-on-surface-variant block font-medium">Preset Cepat:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setNewPassword('password')}
                    className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-label-xs font-bold font-mono text-on-surface border border-outline-variant/60 transition-colors"
                  >
                    password
                  </button>
                  {selectedUser.identifier && selectedUser.identifier !== '-' && (
                    <button
                      type="button"
                      onClick={() => setNewPassword(selectedUser.identifier)}
                      className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-label-xs font-bold font-mono text-on-surface border border-outline-variant/60 transition-colors"
                    >
                      {selectedUser.identifier}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNewPassword('123456')}
                    className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-label-xs font-bold font-mono text-on-surface border border-outline-variant/60 transition-colors"
                  >
                    123456
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container font-bold text-label-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl font-bold shadow-md transition-all text-label-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Password Baru'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Akun */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest">
              <h3 className="text-headline-sm font-headline-sm text-error flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-error" />
                Hapus Akun Pengguna
              </h3>
              <button 
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-body-md text-on-surface">
                Apakah Anda yakin ingin menghapus akun login untuk <strong className="text-primary">{selectedUser.full_name}</strong> ({selectedUser.email})?
              </p>
              <div className="text-body-xs text-error bg-error-container/40 border border-error-container p-3.5 rounded-xl space-y-1">
                <p className="font-bold">Perhatian:</p>
                <p>Akun ini tidak akan dapat login lagi ke portal. Data murid / guru di sistem akan tetap tersimpan dan status tautan akun dilepas.</p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container font-bold text-label-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-error text-white hover:bg-error/90 rounded-xl font-bold shadow-md transition-all text-label-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menghapus...
                    </>
                  ) : (
                    'Ya, Hapus Akun'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
