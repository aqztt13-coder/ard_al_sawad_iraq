import { useCallback, useState } from 'react';
import { NumericCoordinates } from '../types/tourism';

export type GeolocationStatus = 'idle' | 'loading' | 'active' | 'error';

export interface UseGeolocationResult {
  status: GeolocationStatus;
  coords: NumericCoordinates | null;
  errorMessage: string | null;
  isNearMeActive: boolean;
  toggleNearMe: () => void;
  clearError: () => void;
}

function getFriendlyArabicGeoError(code?: number): string {
  switch (code) {
    case 1:
      return 'تعذّر الوصول إلى موقعك الجغرافي لأن إذن الموقع مرفوض. يمكنك السماح بالوصول للموقع من إعدادات المتصفح لترتيب المعالم حسب الأقرب إليك.';
    case 2:
      return 'تعذّر تحديد موقعك الحالي حالياً. يرجى التأكد من تفعيل خدمة الموقع (GPS) والمحاولة مجدداً.';
    case 3:
      return 'استغرق تحديد الموقع وقتاً أطول من المعتاد. يرجى المحاولة مرة أخرى.';
    default:
      return 'حدث خطأ غير متوقع أثناء محاولة تحديد موقعك الجغرافي. يرجى المحاولة لاحقاً.';
  }
}

export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<NumericCoordinates | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setStatus((prev) => (prev === 'error' ? 'idle' : prev));
  }, []);

  const toggleNearMe = useCallback(() => {
    if (status === 'active') {
      setStatus('idle');
      setCoords(null);
      setErrorMessage(null);
      return;
    }

    if (status === 'loading') {
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('error');
      setCoords(null);
      setErrorMessage('متصفحك الحالي لا يدعم خدمة تحديد الموقع الجغرافي.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus('active');
        setErrorMessage(null);
      },
      (error) => {
        setCoords(null);
        setStatus('error');
        setErrorMessage(getFriendlyArabicGeoError(error?.code));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, [status]);

  return {
    status,
    coords,
    errorMessage,
    isNearMeActive: status === 'active' && coords !== null,
    toggleNearMe,
    clearError,
  };
}
