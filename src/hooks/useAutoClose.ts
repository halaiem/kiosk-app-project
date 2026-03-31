import { useEffect, useRef, useCallback } from 'react';

export function useAutoClose(
  isOpen: boolean,
  onClose: () => void,
  timeoutMs = 30000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isOpen) {
      timerRef.current = setTimeout(onClose, timeoutMs);
    }
  }, [isOpen, onClose, timeoutMs]);

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    resetTimer();
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll'];
    const handler = () => resetTimer();
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => document.removeEventListener(e, handler));
    };
  }, [isOpen, resetTimer]);
}
