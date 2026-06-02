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

    let isMounted = true;

    // Safety timeout of 1.5 seconds to prevent blank screen if session checks hang
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth check timed out, setting loading to false.');
        setLoading(false);
      }
    }, 1500);

    // Fetch user profile and update Zustand store
    const checkSession = async (session: any) => {
      if (!isMounted) return;
      
      if (session) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            let name = session.user.email || '';
            const role = profile.role as 'admin' | 'guru' | 'murid';

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

            if (isMounted) {
              login({
                id: session.user.id,
                name,
                username: session.user.email?.split('@')[0] || '',
                role,
              });
            }
          } else {
            if (isMounted) {
              login({
                id: session.user.id,
                name: session.user.email || '',
                username: session.user.email?.split('@')[0] || '',
                role: 'murid',
              });
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        if (isMounted) {
          logout();
        }
      }

      if (isMounted) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    // 1. Get initial session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkSession(session);
    }).catch((err) => {
      console.error('Initial session retrieval failed:', err);
      if (isMounted) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    });

    // 2. Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          clearTimeout(timeoutId);
          logout();
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session) {
        checkSession(session);
      }
    });

    // 3. Focus listener: check session validity when user returns to tab
    const handleFocus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isAuthenticated) {
          console.warn('Session expired or invalid on window focus, logging out...');
          if (isMounted) {
            logout();
            router.push('/login');
          }
        } else if (session && !isAuthenticated) {
          checkSession(session);
        }
      } catch (err) {
        console.error('Error validating session on window focus:', err);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [login, logout, isAuthenticated, router]);

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
