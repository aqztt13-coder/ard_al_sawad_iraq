import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  hasTrustedAdminRoleInSession,
  verifyAuthorizedAdminSession,
} from '../utils/adminAuth';

export interface AuthActionResult {
  error: string | null;
  message?: string;
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (lower.includes('email not confirmed')) {
    return 'الحساب غير مفعّل بعد. يُرجى مراجعة بريدك الإلكتروني لتأكيد الحساب ثم تسجيل الدخول.';
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'صيغة البريد الإلكتروني غير صالحة. يُرجى التحقق والمحاولة مجدداً.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'تعذر الاتصال بالخادم. يُرجى التحقق من الاتصال بالإنترنت.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'تم تجاوز عدد المحاولات المسموح بها. يُرجى المحاولة لاحقاً.';
  }
  return 'تعذر تسجيل الدخول. يُرجى التحقق من البيانات والمحاولة مجدداً.';
}

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);

  // Monotonic sequence prevents stale async verification calls from overwriting newer auth state
  const verifySeqRef = useRef<number>(0);
  // Prevents onAuthStateChange('SIGNED_IN') from racing with active signIn() verification
  const isSigningInRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setVerifiedUser(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const pendingTimers: number[] = [];

    const verifyAndCommit = async (candidateSession?: Session | null) => {
      const seq = ++verifySeqRef.current;
      const result = await verifyAuthorizedAdminSession(supabase.auth, {
        candidateSession: candidateSession ?? undefined,
      });

      if (!mounted || seq !== verifySeqRef.current) return;

      if (result.authorized && result.session && result.user) {
        setSession(result.session);
        setVerifiedUser(result.user);
      } else {
        setSession(null);
        setVerifiedUser(null);
      }
      setIsLoading(false);
    };

    void verifyAndCommit();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !nextSession) {
        verifySeqRef.current += 1;
        setSession(null);
        setVerifiedUser(null);
        setIsLoading(false);
        return;
      }

      // Let active signIn() complete its own authoritative verification atomically
      if (isSigningInRef.current) {
        return;
      }

      // Defer async Supabase Auth calls outside the synchronous onAuthStateChange callback
      // to avoid GoTrueClient internal auth lock contention.
      const timerId = window.setTimeout(() => {
        if (!mounted || isSigningInRef.current) return;
        void verifyAndCommit(nextSession);
      }, 0);
      pendingTimers.push(timerId);
    });

    return () => {
      mounted = false;
      pendingTimers.forEach((id) => window.clearTimeout(id));
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured) {
        return {
          error: 'خدمة المصادقة السحابية غير مفعّلة في هذه البيئة حالياً.',
        };
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        return { error: 'يُرجى إدخال البريد الإلكتروني وكلمة المرور.' };
      }

      isSigningInRef.current = true;
      const seq = ++verifySeqRef.current;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) {
          return { error: translateAuthError(error.message) };
        }

        // Strict server-verified RBAC check:
        // - Verifies the access token & live user record directly with Supabase Auth (`getUser`),
        //   preventing client clock-skew false rejections and ensuring the latest `app_metadata`.
        // - Never trusts `user_metadata` and never treats arbitrary authenticated accounts as admin.
        const verification = await verifyAuthorizedAdminSession(supabase.auth, {
          candidateSession: data.session,
          candidateUser: data.user,
          isFreshSignIn: true,
        });

        if (!verification.authorized || !verification.session || !verification.user) {
          if (verification.reason === 'not_admin' || verification.reason === 'session_expired') {
            await supabase.auth.signOut().catch(() => undefined);
          }
          if (seq === verifySeqRef.current) {
            setSession(null);
            setVerifiedUser(null);
          }

          if (verification.reason === 'network_error') {
            return {
              error: 'تعذر الاتصال بالخادم للتحقق من صلاحيات الحساب. يُرجى المحاولة مجدداً.',
            };
          }
          if (verification.reason === 'session_expired') {
            return {
              error: 'تعذر التحقق من صلاحية الجلسة الجديدة. يُرجى إعادة المحاولة.',
            };
          }
          return {
            error: 'هذا الحساب لا يملك صلاحية الوصول إلى لوحة الإدارة.',
          };
        }

        if (seq === verifySeqRef.current) {
          setSession(verification.session);
          setVerifiedUser(verification.user);
          setIsLoading(false);
        }
        return { error: null };
      } catch {
        return { error: 'تعذر الاتصال بخدمة المصادقة. يُرجى المحاولة لاحقاً.' };
      } finally {
        isSigningInRef.current = false;
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    verifySeqRef.current += 1;
    if (!isSupabaseConfigured) {
      setSession(null);
      setVerifiedUser(null);
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signOut();
      setSession(null);
      setVerifiedUser(null);
      if (error) {
        return { error: 'تعذر تسجيل الخروج حالياً.' };
      }
      return { error: null };
    } catch {
      setSession(null);
      setVerifiedUser(null);
      return { error: 'تعذر تسجيل الخروج حالياً.' };
    }
  }, []);

  const isAdmin = Boolean(
    session && verifiedUser && hasTrustedAdminRoleInSession(session, verifiedUser)
  );
  const user: User | null = isAdmin ? verifiedUser : null;

  return {
    session: isAdmin ? session : null,
    user,
    isAdmin,
    isLoading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signOut,
  };
}
