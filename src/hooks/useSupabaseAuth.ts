import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { isAuthorizedAdminSession } from '../utils/adminAuth';

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
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const current = data.session ?? null;
        setSession(isAuthorizedAdminSession(current) ? current : null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(isAuthorizedAdminSession(nextSession) ? nextSession : null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
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

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) {
          return { error: translateAuthError(error.message) };
        }

        // Strict RBAC check: never treat an arbitrary authenticated account as an admin.
        // Only users with trusted server-controlled `app_metadata` / custom JWT admin claims pass.
        if (!isAuthorizedAdminSession(data.session)) {
          await supabase.auth.signOut().catch(() => undefined);
          setSession(null);
          return {
            error: 'هذا الحساب لا يملك صلاحية الوصول إلى لوحة الإدارة.',
          };
        }

        setSession(data.session);
        return { error: null };
      } catch {
        return { error: 'تعذر الاتصال بخدمة المصادقة. يُرجى المحاولة لاحقاً.' };
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      setSession(null);
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signOut();
      setSession(null);
      if (error) {
        return { error: 'تعذر تسجيل الخروج حالياً.' };
      }
      return { error: null };
    } catch {
      setSession(null);
      return { error: 'تعذر تسجيل الخروج حالياً.' };
    }
  }, []);

  const isAdmin = isAuthorizedAdminSession(session);
  const user: User | null = isAdmin ? (session?.user ?? null) : null;

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
