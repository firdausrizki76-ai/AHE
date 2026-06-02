"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { User } from "@/lib/store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, BookOpen, GraduationCap, ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Map username to email
      let email = username.trim();
      if (!email.includes("@")) {
        if (email === "guru") {
          email = "guru1@ahe.com";
        } else if (email === "murid") {
          email = "murid1@ahe.com";
        } else {
          email = `${email}@ahe.com`;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "Username atau password salah" : error.message);
      } else if (data.session) {
        toast.success(`Selamat datang kembali!`);
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsLoading(false);
    }
  };

  const isAdminActive = username === 'admin';
  const isGuruActive = username === 'guru' || username === 'guru1';
  const isMuridActive = username === 'murid' || username === 'murid1';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden font-body-md">
      {/* Dynamic Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-bl from-primary/10 via-secondary/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-tr from-secondary/10 via-primary-container/5 to-transparent"></div>
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-primary/20 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-secondary/20 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="w-full max-w-[400px] z-10 relative">
        <Link href="/" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-6 transition-colors font-label-md font-bold">
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Beranda
        </Link>
        
        <div className="bg-surface w-full rounded-2xl shadow-2xl overflow-hidden border border-surface-container">
          <div className="p-8 text-center bg-surface-container-lowest border-b border-surface-container">
            {/* Logo Utama */}
            <img src="/LOGO UTAMA.png" alt="Logo Anak Hebat" width={80} height={80} className="mx-auto mb-4 object-contain drop-shadow-sm" />
            <h1 className="text-headline-md font-headline-md text-on-surface mb-2">Masuk ke Portal</h1>
            <p className="text-body-sm text-on-surface-variant">Silakan masukkan akun Anda untuk melanjutkan</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2 flex flex-col">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Username / Email</label>
                <input 
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface-container-lowest text-on-surface" 
                  placeholder="Masukkan username atau email" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  type="text"
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Password</label>
                <input 
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all font-body-md bg-surface-container-lowest text-on-surface" 
                  placeholder="Masukkan password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-headline-sm text-headline-sm hover:bg-primary-container shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:active:scale-100"
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
          </div>
          
          <div className="bg-surface-container-low p-6 border-t border-surface-container">
            <p className="text-center font-label-sm text-on-surface-variant mb-4">PILIH DEMO LOGIN</p>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => { setUsername('admin'); setPassword('password'); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl bg-surface border transition-colors group ${isAdminActive ? 'border-primary shadow-sm bg-primary/5' : 'border-outline-variant hover:border-primary'}`}
              >
                <Shield className={`w-5 h-5 mb-1 transition-transform group-hover:scale-110 ${isAdminActive ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span className={`text-label-sm font-bold ${isAdminActive ? 'text-primary' : 'text-on-surface'}`}>admin</span>
              </button>
              <button 
                onClick={() => { setUsername('guru'); setPassword('password'); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl bg-surface border transition-colors group ${isGuruActive ? 'border-secondary shadow-sm bg-secondary/5' : 'border-outline-variant hover:border-secondary'}`}
              >
                <BookOpen className={`w-5 h-5 mb-1 transition-transform group-hover:scale-110 ${isGuruActive ? 'text-secondary' : 'text-on-surface-variant'}`} />
                <span className={`text-label-sm font-bold ${isGuruActive ? 'text-secondary' : 'text-on-surface'}`}>guru</span>
              </button>
              <button 
                onClick={() => { setUsername('murid'); setPassword('password'); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl bg-surface border transition-colors group ${isMuridActive ? 'border-tertiary shadow-sm bg-tertiary/5' : 'border-outline-variant hover:border-tertiary'}`}
              >
                <GraduationCap className={`w-5 h-5 mb-1 transition-transform group-hover:scale-110 ${isMuridActive ? 'text-tertiary' : 'text-on-surface-variant'}`} />
                <span className={`text-label-sm font-bold ${isMuridActive ? 'text-tertiary' : 'text-on-surface'}`}>murid</span>
              </button>
            </div>
            <p className="text-center text-label-sm text-on-surface-variant mt-4">Klik salah satu role untuk langsung mengisi form.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
