"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { initializeMockData } from '@/lib/mockData';
import { supabase } from '@/lib/supabase/client';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, login, logout } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    initializeMockData();

    // Set a safety timeout to ensure the app doesn't hang on "Memuat Portal..." indefinitely
    const timeoutId = setTimeout(() => {
      console.warn('Auth check timed out, setting loading to false.');
      setLoading(false);
    }, 2500);

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeoutId);
      if (session) {
        try {
          // Fetch user profile to determine role
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            let name = session.user.email || '';
            const role = profile.role as 'admin' | 'guru' | 'murid';

            // Fetch name from role-specific tables
            if (role === 'guru') {
              const { data: teacher } = await supabase
                .from('teachers')
                .select('full_name')
                .eq('user_id', session.user.id)
                .single();
              if (teacher) name = teacher.full_name;
            } else if (role === 'murid') {
              const { data: student } = await supabase
                .from('students')
                .select('full_name')
                .eq('user_id', session.user.id)
                .single();
              if (student) name = student.full_name;
            } else {
              name = 'Admin';
            }

            login({
              id: session.user.id,
              name,
              username: session.user.email?.split('@')[0] || '',
              role,
            });
          } else {
            // Fallback if profile is not found (default to murid)
            login({
              id: session.user.id,
              name: session.user.email || '',
              username: session.user.email?.split('@')[0] || '',
              role: 'murid',
            });
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        logout();
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [login, logout]);

  useEffect(() => {
    if (!mounted || loading) return;

    const isPublicRoute = pathname === '/login' || pathname === '/daftar' || pathname === '/';
    
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      if (pathname === '/login' || pathname === '/') {
        // Redirect to respective dashboard
        router.push(`/${user?.role}/dashboard`);
        return;
      }

      // Role guard
      if (pathname.startsWith('/admin') && user?.role !== 'admin') {
        router.push(`/${user?.role}/dashboard`);
      } else if (pathname.startsWith('/guru') && user?.role !== 'guru') {
        router.push(`/${user?.role}/dashboard`);
      } else if (pathname.startsWith('/murid') && user?.role !== 'murid') {
        router.push(`/${user?.role}/dashboard`);
      }
    }
  }, [isAuthenticated, pathname, mounted, loading, router, user]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary font-bold">
        Memuat Portal...
      </div>
    );
  }

  return <>{children}</>;
}
