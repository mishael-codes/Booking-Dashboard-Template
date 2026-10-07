import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import { mapDatabaseError } from '../lib/errors';

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  currentAal: 'aal1' | 'aal2' | null;
  needsMfaEnrollment: boolean;
  needsMfaVerification: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAal, setCurrentAal] = useState<'aal1' | 'aal2' | null>(null);
  const [needsMfaEnrollment, setNeedsMfaEnrollment] = useState(false);
  const [needsMfaVerification, setNeedsMfaVerification] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (session) {
      idleTimerRef.current = setTimeout(async () => {
        await handleSignOut();
        setAuthError('You have been signed out due to 30 minutes of inactivity.');
      }, IDLE_TIMEOUT_MS);
    }
  }, [session]);

  const handleSignOut = useCallback(async () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    queryClient.clear();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setCurrentAal(null);
    setNeedsMfaEnrollment(false);
    setNeedsMfaVerification(false);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out network errors
    }
  }, [queryClient]);

  // Validates session against anonymous check, public.admins row, and MFA AAL2
  const validateSessionAndRoles = useCallback(
    async (currentSession: Session | null) => {
      if (!currentSession || !currentSession.user) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setCurrentAal(null);
        setNeedsMfaEnrollment(false);
        setNeedsMfaVerification(false);
        setIsLoading(false);
        return;
      }

      const currentUser = currentSession.user;

      // 1. Reject anonymous sign-ins immediately
      if (currentUser.is_anonymous) {
        await handleSignOut();
        setAuthError('You are not authorised.');
        setIsLoading(false);
        return;
      }

      // 2. Route Guard UX check on public.admins (RLS is real enforcement)
      try {
        const { data: adminRow, error: adminErr } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (adminErr || !adminRow) {
          await handleSignOut();
          setAuthError('You are not authorised.');
          setIsLoading(false);
          return;
        }

        setIsAdmin(true);
      } catch {
        await handleSignOut();
        setAuthError('You are not authorised.');
        setIsLoading(false);
        return;
      }

      // 3. MFA Check
      try {
        const { data: aalData, error: aalErr } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalErr) {
          const mapped = mapDatabaseError(aalErr);
          setAuthError(mapped.message);
          setIsLoading(false);
          return;
        }

        const currentLvl = (aalData?.currentLevel as 'aal1' | 'aal2') ?? 'aal1';
        setCurrentAal(currentLvl);

        if (currentLvl === 'aal2') {
          setNeedsMfaEnrollment(false);
          setNeedsMfaVerification(false);
        } else {
          // Check enrolled factors
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified');

          if (verifiedTotp) {
            setNeedsMfaVerification(true);
            setNeedsMfaEnrollment(false);
          } else {
            setNeedsMfaEnrollment(true);
            setNeedsMfaVerification(false);
          }
        }

        setSession(currentSession);
        setUser(currentUser);
      } catch {
        setAuthError('Failed to verify authentication assurance level.');
      } finally {
        setIsLoading(false);
      }
    },
    [handleSignOut]
  );

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.auth.getSession();
    await validateSessionAndRoles(data.session);
  }, [validateSessionAndRoles]);

  // Initial session hydration and multi-tab subscription
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        validateSessionAndRoles(initialSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        handleSignOut();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await validateSessionAndRoles(newSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleSignOut, validateSessionAndRoles]);

  // Inactivity tracking
  useEffect(() => {
    if (!session) return;

    resetIdleTimer();

    const activityEvents = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [session, resetIdleTimer]);

  const enterDemoMode = useCallback(() => {
    const demoUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@bookingbusiness.com',
      app_metadata: {},
      user_metadata: { full_name: 'Lead Administrator' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      is_anonymous: false,
    } as unknown as User;

    const demoSession = {
      access_token: 'demo-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'demo-refresh',
      user: demoUser,
    } as Session;

    setSession(demoSession);
    setUser(demoUser);
    setIsAdmin(true);
    setCurrentAal('aal2');
    setNeedsMfaEnrollment(false);
    setNeedsMfaVerification(false);
    setAuthError(null);
    setIsLoading(false);
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    isLoading,
    isAdmin,
    currentAal,
    needsMfaEnrollment,
    needsMfaVerification,
    authError,
    setAuthError,
    signOut: handleSignOut,
    refreshAuth,
    enterDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
