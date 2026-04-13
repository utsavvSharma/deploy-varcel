"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'team_leader' | 'sales';
}

type RoleType = 'admin' | 'team_leader' | 'sales';

export function useAuth(requiredRole?: RoleType | RoleType[]) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Stabilize the role value so array literals don't cause infinite re-renders
  const roleKey = requiredRole
    ? (Array.isArray(requiredRole) ? requiredRole.slice().sort().join(',') : requiredRole)
    : '';
  const allowedRoles = useMemo<RoleType[] | null>(() => {
    if (!requiredRole) return null;
    return Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  }, [roleKey]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (!res.ok) {
          setUser(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (allowedRoles && !allowedRoles.includes(data.user?.role)) {
          setUser(null);
        } else {
          setUser(data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [roleKey]);

  // Heartbeat ping to keep lastActiveAt updated while user is active in app
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetch('/api/auth/session', { credentials: 'include' }).catch(() => {});
    }, 60_000); // every minute
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      const firstRole = allowedRoles?.[0];
      if (firstRole === 'admin') {
        router.push('/admin/login');
      } else if (firstRole === 'team_leader') {
        router.push('/team-leader/login');
      } else if (firstRole === 'sales') {
        router.push('/sales/login');
      } else {
        router.push('/');
      }
    }
  }, [user, loading, allowedRoles, router]);

  return { user, loading };
}