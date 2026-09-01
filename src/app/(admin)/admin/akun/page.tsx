"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="space-y-6 md:space-y-8 font-body-md max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            <span>Manajemen Akun</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Kelola akun autentikasi real (Admin, Guru, Murid), reset password, dan pantau status login.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={handleBatchGenerate}
            disabled={actionLoading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl font-bold transition-all disabled:opacity-50 text-xs sm:text-sm active:scale-95 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="whitespace-nowrap">Generate Otomatis</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold shadow-md transition-all text-xs sm:text-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="whitespace-nowrap">Tambah Akun</span>
          </button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Akun</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{loading ? "..." : stats.total}</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Admin</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-2">{loading ? "..." : stats.admin}</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Guru</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">{loading ? "..." : stats.guru}</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Murid</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">{loading ? "..." : stats.murid}</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Belum Tertaut</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-2">{loading ? "..." : stats.unlinkedCount}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'admin', label: 'Admin' },
            { key: 'guru', label: 'Guru' },
            { key: 'murid', label: 'Murid' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key as any)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap text-center ${
                roleFilter === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, email, NIS, NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-primary focus:bg-white transition-colors"
            />
          </div>
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-primary transition-colors shrink-0"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MOBILE VIEW: Cards Layout (Visible only on mobile/tablet screens) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <span className="font-bold text-sm">Memuat daftar akun...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <p className="font-bold text-base text-slate-800">Tidak ada akun ditemukan</p>
            <p className="text-xs mt-1">Coba ubah kata kunci pencarian.</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const roleBadge = 
              u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200'
              : u.role === 'guru' ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200';

            return (
              <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                      u.role === 'admin' ? 'bg-purple-600'
                      : u.role === 'guru' ? 'bg-amber-600'
                      : 'bg-emerald-600'
                    }`}>
                      {u.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{u.full_name || '-'}</h4>
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">{u.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadge} uppercase shrink-0`}>
                    {u.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">ID / NIS / NIP:</span>
                    <span className="font-mono font-bold text-slate-800">{u.identifier || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">WhatsApp:</span>
                    {u.phone !== '-' ? (
                      <button 
                        onClick={() => sendWhatsAppInfo(u)}
                        className="text-emerald-600 font-semibold flex items-center gap-1 hover:underline"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span className="truncate">{u.phone}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => copyCredentials(u)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === u.id ? 'Tersalin' : 'Salin'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(u);
                      setNewPassword('password');
                      setIsResetModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(u);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW: Table Layout (Visible on desktop md screens and up) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Pengguna / Nama</th>
                <th className="p-4">Username / ID</th>
                <th className="p-4">Email Real</th>
                <th className="p-4">Role</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4">Login Terakhir</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span className="font-bold">Memuat daftar akun pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <p className="font-bold text-base text-slate-800">Tidak ada akun ditemukan</p>
                    <p className="text-xs mt-1">Coba ubah kata kunci pencarian atau filter role.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleBadge = 
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : u.role === 'guru' ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                            u.role === 'admin' ? 'bg-purple-600'
                            : u.role === 'guru' ? 'bg-amber-600'
                            : 'bg-emerald-600'
                          }`}>
                            {u.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.full_name || '-'}</div>
                            <div className="text-xs text-slate-500">
                              {u.teacher_id ? 'Guru Terhubung' : u.student_id ? 'Murid Terhubung' : 'Akun Standalone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-800 border border-slate-200">
                          {u.identifier || '-'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600">
                        {u.email}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge} uppercase`}>
                          {u.role === 'admin' && <Shield className="w-3 h-3" />}
                          {u.role === 'guru' && <BookOpen className="w-3 h-3" />}
                          {u.role === 'murid' && <GraduationCap className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600">
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
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {u.last_sign_in_at 
                          ? new Date(u.last_sign_in_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                          : 'Belum pernah login'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyCredentials(u)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-primary transition-colors"
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
                            className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                            title="Reset Password"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
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

      {/* PORTAL MODAL: Reset Password (Rendered directly into document.body to avoid stacking issues) */}
      {mounted && isResetModalOpen && selectedUser && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                Reset Password Akun
              </h3>
              <button 
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleResetPassword} className="p-5 space-y-4 overflow-y-auto max-h-[75dvh]">
              {/* Target User Info Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Akun Pengguna:</p>
                <p className="font-bold text-slate-900 text-sm sm:text-base">{selectedUser.full_name}</p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedUser.identifier || selectedUser.email}
                  </span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              {/* New Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Password Baru</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password baru..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 block font-medium">Pilihan Preset Cepat:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setNewPassword('password')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 border border-slate-200 transition-colors active:scale-95"
                  >
                    password
                  </button>
                  {selectedUser.identifier && selectedUser.identifier !== '-' && (
                    <button
                      type="button"
                      onClick={() => setNewPassword(selectedUser.identifier)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 border border-slate-200 transition-colors active:scale-95"
                    >
                      {selectedUser.identifier}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNewPassword('123456')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 border border-slate-200 transition-colors active:scale-95"
                  >
                    123456
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl font-bold shadow-md transition-all text-xs sm:text-sm disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL MODAL: Tambah Akun Baru */}
      {mounted && isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Tambah Akun Baru
              </h3>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateAccount} className="p-5 space-y-4 overflow-y-auto max-h-[75dvh]">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Pilih Role Akun</label>
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
                      className={`py-2.5 px-2 rounded-xl border text-center font-bold text-xs sm:text-sm capitalize transition-all ${
                        createForm.role === r
                          ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary'
                          : 'border-slate-200 hover:border-primary text-slate-600'
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
                  <label className="text-xs font-bold text-slate-700 uppercase">Hubungkan ke Data Murid (Opsional)</label>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-primary"
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
                  <label className="text-xs font-bold text-slate-700 uppercase">Hubungkan ke Data Guru (Opsional)</label>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-primary"
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
                <label className="text-xs font-bold text-slate-700 uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap..."
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Email / Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Username / Email Login</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AHE260010 atau email@domain.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-primary font-mono"
                />
                <p className="text-[11px] text-slate-500">Jika tanpa @ domain, otomatis ditambahkan @ahe.com</p>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-primary pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold shadow-md transition-all text-xs sm:text-sm disabled:opacity-50 active:scale-95"
                >
                  {actionLoading ? 'Menyimpan...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL MODAL: Hapus Akun */}
      {mounted && isDeleteModalOpen && selectedUser && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="text-base sm:text-lg font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Hapus Akun Pengguna
              </h3>
              <button 
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[75dvh]">
              <p className="text-xs sm:text-sm text-slate-700">
                Apakah Anda yakin ingin menghapus akun login untuk <strong className="text-primary">{selectedUser.full_name}</strong> ({selectedUser.email})?
              </p>
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1">
                <p className="font-bold">Perhatian:</p>
                <p>Akun ini tidak akan dapat login lagi ke portal. Data murid / guru di sistem akan tetap tersimpan dan status tautan akun dilepas.</p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold shadow-md transition-all text-xs sm:text-sm disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Menghapus...
                    </>
                  ) : (
                    'Ya, Hapus Akun'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
