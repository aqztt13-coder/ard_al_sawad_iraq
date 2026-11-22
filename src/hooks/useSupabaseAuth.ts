import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthActionResult {
  error: string | null;
  requiresEmailConfirmation?: boolean;
  message?: string;
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateAuthError(message: string, mode: 'signin' | 'signup'): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (lower.includes('email not confirmed')) {
    return 'الحساب غير مفعّل بعد. يُرجى مراجعة بريدك الإلكتروني لتأكيد الحساب ثم تسجيل الدخول.';
  }
  if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('user_already_exists')) {
    return 'هذا البريد الإلكتروني مسجّل مسبقاً. يمكنك الانتقال إلى تبويب «تسجيل الدخول».';
  }
  if (lower.includes('password') && (lower.includes('short') || lower.includes('weak') || lower.includes('least'))) {
    return 'كلمة المرور ضعيفة أو قصيرة جداً. يُرجى اختيار كلمة مرور من 6 أحرف على الأقل.';
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'صيغة البريد الإلكتروني غير صالحة. يُرجى التحقق والمحاولة مجدداً.';
  }
  if (lower.includes('signups not allowed') || lower.includes('signup_disabled')) {
    return 'إنشاء الحسابات الجديدة غير متاح حالياً.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'تعذر الاتصال بالخادم. يُرجى التحقق من الاتصال بالإنترنت.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'تم تجاوز عدد المحاولات المسموح بها. يُرجى المحاولة لاحقاً.';
  }
  return mode === 'signup'
    ? 'تعذر إنشاء الحساب حالياً. يُرجى التحقق من البيانات والمحاولة مجدداً.'
    : 'تعذر تسجيل الدخول. يُرجى التحقق من البيانات والمحاولة مجدداً.';
}

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
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
      setSession(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
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
          return { error: translateAuthError(error.message, 'signin') };
        }
        setSession(data.session ?? null);
        return { error: null };
      } catch {
        return { error: 'تعذر الاتصال بخدمة المصادقة. يُرجى المحاولة لاحقاً.' };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        return { error: 'يُرجى إدخال البريد الإلكتروني وكلمة المرور.' };
      }
      if (!SIMPLE_EMAIL_REGEX.test(trimmedEmail)) {
        return { error: 'صيغة البريد الإلكتروني غير صالحة.' };
      }
      if (password.length < 6) {
        return { error: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (error) {
          return { error: translateAuthError(error.message, 'signup') };
        }
        if (data.session) {
          setSession(data.session);
          return {
            error: null,
            requiresEmailConfirmation: false,
            message: 'تم إنشاء الحساب وتسجيل الدخول بنجاح.',
          };
        }
        return {
          error: null,
          requiresEmailConfirmation: true,
          message:
            'تم إنشاء الحساب بنجاح! يُرجى مراجعة بريدك الإلكتروني لتأكيد الحساب ثم تسجيل الدخول.',
        };
      } catch {
        return { error: 'تعذر الاتصال بخدمة المصادقة. يُرجى المحاولة لاحقاً.' };
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: 'تعذر تسجيل الخروج حالياً.' };
      }
      setSession(null);
      return { error: null };
    } catch {
      return { error: 'تعذر تسجيل الخروج حالياً.' };
    }
  }, []);

  const user: User | null = session?.user ?? null;
  const isAdmin = Boolean(user);

  return {
    session,
    user,
    isAdmin,
    isLoading,
    signIn,
    signUp,
    signOut,
  };
}
