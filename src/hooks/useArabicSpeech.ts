import { useCallback, useEffect, useRef, useState } from 'react';
import { pickBestArabicVoice } from '../utils/speech';

export interface UseArabicSpeechResult {
  isSupported: boolean;
  isPlaying: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

export function useArabicSpeech(): UseArabicSpeechResult {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isPlaying, setIsPlaying] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);

    const handleBeforeUnload = () => {
      window.speechSynthesis.cancel();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.96;
      utterance.pitch = 1;

      const availableVoices =
        voicesRef.current.length > 0
          ? voicesRef.current
          : window.speechSynthesis.getVoices();
      const selectedVoice = pickBestArabicVoice(availableVoices);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || 'ar-SA';
      }

      utterance.onstart = () => {
        setIsPlaying(true);
      };
      utterance.onend = () => {
        utteranceRef.current = null;
        setIsPlaying(false);
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  return {
    isSupported,
    isPlaying,
    speak,
    stop,
  };
}
