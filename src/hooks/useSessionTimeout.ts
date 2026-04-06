import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessionStart } from '@/api/driverApi';

const SESSION_MAX_MS = 10 * 60 * 60 * 1000;
const WARNING_DURATION_MS = 3 * 60 * 1000;

export function useSessionTimeout(isActive: boolean, onExpire: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const expiredRef = useRef(false);
  const warningStartRef = useRef<number | null>(null);

  const checkSession = useCallback(() => {
    if (!isActive || expiredRef.current) return;
    const start = getSessionStart();
    if (!start) return;

    const elapsed = Date.now() - start;

    // Предупреждение началось — считаем обратный отсчёт
    if (warningStartRef.current !== null) {
      const warningElapsed = Date.now() - warningStartRef.current;
      const remaining = WARNING_DURATION_MS - warningElapsed;
      if (remaining <= 0) {
        expiredRef.current = true;
        setShowWarning(false);
        onExpire();
      } else {
        setCountdown(Math.ceil(remaining / 1000));
      }
      return;
    }

    // 10 часов истекли — начинаем 3-минутный отсчёт
    if (elapsed >= SESSION_MAX_MS) {
      warningStartRef.current = Date.now();
      setShowWarning(true);
      setCountdown(WARNING_DURATION_MS / 1000);
    }
  }, [isActive, onExpire]);

  useEffect(() => {
    if (!isActive) {
      setShowWarning(false);
      expiredRef.current = false;
      warningStartRef.current = null;
      return;
    }

    checkSession();
    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [isActive, checkSession]);

  return { showWarning, countdown };
}

export default useSessionTimeout;