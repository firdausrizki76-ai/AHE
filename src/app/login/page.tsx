"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, BookOpen, GraduationCap, ArrowLeft, LogIn, Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Silakan masukkan email, NIS, NIP, atau username Anda.");
      return;
    }
    if (!password) {
      toast.error("Silakan masukkan password Anda.");
      return;
    }

    setIsLoading(true);

    try {
      let emailToAuth = identifier.trim();

      // Resolve identifier (Email, NIS, NIP, Username) dynamically via RPC
      try {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc('resolve_login_identifier' as any, {
          p_identifier: identifier.trim()
        });

        if (!rpcError && resolvedEmail) {
          emailToAuth = resolvedEmail as string;
        } else if (!emailToAuth.includes("@")) {
          emailToAuth = `${emailToAuth.toLowerCase()}@ahe.com`;
        }
      } catch (rpcErr) {
        if (!emailToAuth.includes("@")) {
          emailToAuth = `${emailToAuth.toLowerCase()}@ahe.com`;
        }
      }

      // Supabase Authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          toast.error("Username/Email atau password salah. Silakan periksa kembali.");
        } else {
          toast.error(error.message);
        }
      } else if (data.session) {
        toast.success("Berhasil masuk ke portal!");
      }
    } catch (error: any) {
      console.error("Login exception:", error);
      toast.error("Terjadi kendala pada sistem autentikasi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (idVal: string, passVal: string) => {
    setIdentifier(idVal);
    setPassword(passVal);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden font-body-md">
      {/* Dynamic Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-bl from-primary/10 via-secondary/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-tr from-secondary/10 via-primary-container/5 to-transparent"></div>
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-primary/20 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-secondary/20 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="w-full max-w-[420px] z-10 relative">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-6 transition-colors font-label-md font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Beranda
        </Link>
        
        <div className="bg-surface w-full rounded-2xl shadow-2xl overflow-hidden border border-surface-container">
          <div className="p-8 text-center bg-surface-container-lowest border-b border-surface-container">
            {/* Logo Utama */}
            <img src="/LOGO UTAMA.png" alt="Logo Anak Hebat" width={80} height={80} className="mx-auto mb-4 object-contain drop-shadow-sm" />
            <h1 className="text-headline-md font-headline-md text-on-surface mb-2">Masuk ke Portal</h1>
            <p className="text-body-sm text-on-surface-variant">Gunakan NIS (Murid), NIP (Guru), atau Email Terdaftar</p>
          </div>
          
          <div className="p-8 space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
                  Email / NIS / NIP / Username
                </label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md bg-surface-container-lowest text-on-surface placeholder:text-outline" 
                  placeholder="Contoh: AHE260003 / AHETW-001 / admin" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  type="text"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input 
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md bg-surface-container-lowest text-on-surface pr-11 placeholder:text-outline" 
                    placeholder="Masukkan password Anda" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-headline-sm text-headline-sm hover:bg-primary/90 shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:active:scale-100"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Masuk
                  </>
                )}
              </button>
            </form>

            {/* Collapsible Info / Quick Reference for testing */}
            <div className="pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-between text-label-sm text-on-surface-variant hover:text-primary transition-colors py-1"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Info className="w-4 h-4 text-primary" />
                  Contoh Akun Riil Database
                </span>
                <span className="text-body-xs underline">{showHelp ? 'Tutup' : 'Lihat Akun'}</span>
              </button>

              {showHelp && (
                <div className="mt-3 space-y-2.5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => handleQuickFill('admin', 'password')}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface border border-purple-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-center group"
                    >
                      <Shield className="w-4 h-4 text-purple-600 mb-1" />
                      <span className="text-label-xs font-bold text-on-surface">Admin</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">admin</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleQuickFill('AHETW-001', 'password')}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-center group"
                    >
                      <BookOpen className="w-4 h-4 text-amber-600 mb-1" />
                      <span className="text-label-xs font-bold text-on-surface">Guru (Sawitri)</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">AHETW-001</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleQuickFill('AHE260003', 'password')}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center group"
                    >
                      <GraduationCap className="w-4 h-4 text-emerald-600 mb-1" />
                      <span className="text-label-xs font-bold text-on-surface">Murid (Mahesvari)</span>
                      <span className="text-[10px] text-on-surface-variant font-mono">AHE260003</span>
                    </button>
                  </div>
                  <p className="text-center text-[11px] text-on-surface-variant">
                    Password default: <strong className="font-mono">password</strong>. Klik tombol role di atas untuk auto-fill form.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-surface-container-low px-6 py-4 border-t border-surface-container text-center">
            <p className="text-body-xs text-on-surface-variant">
              Belum punya akun murid? <Link href="/daftar" className="text-primary font-bold hover:underline">Daftar Murid Baru</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
