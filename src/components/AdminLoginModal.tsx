import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AuthActionResult } from '../hooks/useSupabaseAuth';

interface AdminLoginModalProps {
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<AuthActionResult>;
  onSignOut: () => Promise<AuthActionResult>;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  isAdmin,
  onClose,
  onSignIn,
  onSignOut,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setPassword('');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('يُرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setIsSubmitting(true);
    const result = await onSignIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setPassword('');
    onClose();
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    const result = await onSignOut();
    setIsSubmitting(false);
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
      data-testid="admin-login-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B1E]/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#C89B3C]/30 bg-[#F9F6F0] text-[#1A2421] shadow-2xl dark:bg-[#0D1B1E] dark:text-[#F1ECE2]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-l from-[#0F3D3E] via-[#C89B3C] to-[#1B4B72]" />

        <div className="flex items-center justify-between border-b border-[#0F3D3E]/12 px-5 py-4 dark:border-[#C89B3C]/18">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D3E] text-[#E7C87B] dark:bg-[#132529]">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="admin-login-title"
                className="font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6]"
              >
                {isAdmin ? 'حساب المدير' : 'لوحة الإدارة'}
              </h2>
              <p className="text-[11px] text-[#5C6A66] dark:text-[#9AA8A3]">
                دخول مخصص للمشرفين المخوّلين في «أرض السواد»
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة لوحة الإدارة"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#0F3D3E]/15 text-[#1A2421] hover:bg-[#0F3D3E]/8 dark:border-[#C89B3C]/25 dark:text-[#F1ECE2] dark:hover:bg-[#F9F6F0]/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {isAdmin ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#0F3D3E]/15 bg-white/85 p-4 dark:border-[#C89B3C]/20 dark:bg-[#132529]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                  <p className="text-sm font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                    حساب المدير مفعّل حالياً
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
                  تظهر لك الآن أدوات تعديل النصوص وإدارة الصور ومراجعة تعليقات الزوار ونشر
                  التحديثات في جميع أنحاء المنصة.
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="button"
                data-testid="admin-signout-btn"
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-600/30 bg-red-600/10 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-600/18 disabled:opacity-60 dark:border-red-400/30 dark:text-red-300"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                )}
                <span>تسجيل الخروج</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="admin-email-input"
                  className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]"
                >
                  البريد الإلكتروني
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#64736F]"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-email-input"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="min-h-[44px] w-full rounded-xl border border-[#0F3D3E]/18 bg-white pr-10 pl-3.5 text-right text-sm text-[#1A2421] placeholder:text-[#869691] focus:border-[#0F3D3E] focus:outline-none dark:border-[#C89B3C]/24 dark:bg-[#132529] dark:text-[#F1ECE2] dark:focus:border-[#C89B3C]"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]"
                >
                  كلمة المرور
                </label>
                <div className="relative mt-1.5">
                  <Lock
                    className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#64736F]"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-password-input"
                    type="password"
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[44px] w-full rounded-xl border border-[#0F3D3E]/18 bg-white pr-10 pl-3.5 text-right text-sm text-[#1A2421] placeholder:text-[#869691] focus:border-[#0F3D3E] focus:outline-none dark:border-[#C89B3C]/24 dark:bg-[#132529] dark:text-[#F1ECE2] dark:focus:border-[#C89B3C]"
                    required
                  />
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  data-testid="admin-login-error"
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 px-3.5 py-2.5 text-xs leading-relaxed text-red-800 dark:bg-red-950/40 dark:text-red-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                data-testid="admin-login-submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F3D3E] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0] transition-colors hover:bg-[#144F50] disabled:opacity-65 dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>جارٍ التحقق من الصلاحيات...</span>
                  </>
                ) : (
                  <span>تسجيل الدخول</span>
                )}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-[#6B7A76] dark:text-[#869691]">
                التسجيل العام لحسابات الإدارة معطّل أمنياً؛ يتم تفعيل صلاحيات المشرفين
                المخوّلين عبر نظام الإدارة المركزي فقط.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
