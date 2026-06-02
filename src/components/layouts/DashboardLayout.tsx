"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { 
  LayoutDashboard, Users, UserCog, BookOpen, CalendarCheck, 
  Trophy, TrendingUp, GraduationCap, CreditCard, Wallet, 
  Gift, FileText, Menu, X, LogOut, Search, UserPlus
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const adminMenu: SidebarItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Pendaftaran", href: "/admin/pendaftaran", icon: FileText },
  { name: "Data Murid", href: "/admin/murid", icon: Users },
  { name: "Data Guru", href: "/admin/guru", icon: UserCog },
  { name: "Manajemen Kelas", href: "/admin/kelas", icon: BookOpen },
  { name: "Absensi", href: "/admin/absensi", icon: CalendarCheck },
  { name: "Prestasi", href: "/admin/prestasi", icon: Trophy },
  { name: "Evaluasi", href: "/admin/evaluasi", icon: TrendingUp },
  { name: "Wisuda", href: "/admin/wisuda", icon: GraduationCap },
  { name: "Pembayaran", href: "/admin/pembayaran", icon: CreditCard },
  { name: "Tabungan", href: "/admin/tabungan", icon: Wallet },
  { name: "Poin & Rewards", href: "/admin/poin", icon: Gift },
  { name: "Laporan", href: "/admin/laporan", icon: FileText },
];

const guruMenu: SidebarItem[] = [
  { name: "Beranda", href: "/guru/dashboard", icon: LayoutDashboard },
  { name: "Absen Kelas", href: "/guru/absen", icon: CalendarCheck },
  { name: "Input Prestasi", href: "/guru/prestasi", icon: Trophy },
  { name: "Evaluasi Murid", href: "/guru/evaluasi", icon: TrendingUp },
  { name: "Profil", href: "/guru/profil", icon: UserCog },
];

const muridMenu: SidebarItem[] = [
  { name: "Beranda", href: "/murid/dashboard", icon: LayoutDashboard },
  { name: "Tabungan", href: "/murid/tabungan", icon: Wallet },
  { name: "Tagihan", href: "/murid/tagihan", icon: CreditCard },
  { name: "Jenjang", href: "/murid/jenjang", icon: TrendingUp },
  { name: "Absensi", href: "/murid/absensi", icon: CalendarCheck },
  { name: "Tukar Poin", href: "/murid/poin", icon: Gift },
  { name: "Prestasi", href: "/murid/prestasi", icon: Trophy },
  { name: "Izin", href: "/murid/izin", icon: FileText },
  { name: "Profil", href: "/murid/profil", icon: UserCog },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = user?.role === "admin" ? adminMenu 
                  : user?.role === "guru" ? guruMenu 
                  : muridMenu;

  return (
    <div className="bg-background min-h-screen text-on-surface font-body-md overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-on-background/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Side Navigation Shell */}
      <aside className={`
        bg-surface-container-lowest h-screen w-64 fixed left-0 top-0 overflow-y-auto shadow-[20px_0_25px_-5px_rgba(113,42,226,0.05)] z-50 flex flex-col p-md
        transition-transform duration-300 ease-in-out custom-scrollbar
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-lg flex justify-between items-start">
          <div className="flex items-center gap-3">
            <img src="/LOGO UTAMA.png" alt="Logo Anak Hebat" width={44} height={44} className="object-contain drop-shadow-sm" />
            <div>
              <h1 className="text-headline-md font-headline-md font-extrabold text-primary leading-tight">Anak Hebat</h1>
              <p className="text-label-md font-label-md text-outline capitalize">{user?.role || 'Admin'} Portal</p>
            </div>
          </div>
          <button className="md:hidden text-on-surface-variant hover:text-primary" onClick={() => setIsMobileOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-grow space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all duration-200
                  ${isActive 
                    ? 'bg-secondary-container text-on-secondary-container active:scale-95' 
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-secondary'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-label-md font-label-md">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto pt-lg space-y-2 border-t border-surface-container">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-label-md font-label-md">Logout</span>
          </button>
        </div>
      </aside>

      {/* Top Navigation Shell */}
      <header className="fixed top-0 right-0 w-full md:w-[calc(100%-256px)] z-40 bg-surface-bright/80 backdrop-blur-md border-b border-surface-container md:border-none">
        <div className="flex justify-between items-center h-20 px-md">
          <div className="flex items-center gap-4 flex-grow">
            <button className="md:hidden text-on-surface-variant hover:text-primary" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-full text-body-sm focus:ring-2 focus:ring-secondary/20 font-body-md text-on-surface outline-none" placeholder="Search data..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-container/20 flex items-center justify-center text-primary font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-0 md:ml-64 pt-24 px-4 md:px-md pb-md min-h-screen">
        {children}
      </main>
    </div>
  );
}
