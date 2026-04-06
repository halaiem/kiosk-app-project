import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessionStart } from '@/api/driverApi';

const SESSION_MAX_MS = 10 * 60 * 60 * 1000;
const WARNING_BEFORE_MS = 3 * 60 * 1000;

export function useSessionTimeout(isActive: boolean, onExpire: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const expiredRef = useRef(false);

  const checkSession = useCallback(() => {
    if (!isActive || expiredRef.current) return;
    const start = getSessionStart();
    if (!start) return;

    const elapsed = Date.now() - start;
    const remaining = SESSION_MAX_MS - elapsed;

    if (remaining <= 0) {
      expiredRef.current = true;
      setShowWarning(false);
      onExpire();
      return;
    }

    if (remaining <= WARNING_BEFORE_MS) {
      setShowWarning(true);
      setCountdown(Math.ceil(remaining / 1000));
    }
  }, [isActive, onExpire]);

  useEffect(() => {
    if (!isActive) {
      setShowWarning(false);
      expiredRef.current = false;
      return;
    }

    checkSession();
    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [isActive, checkSession]);

  return { showWarning, countdown };
}

export default useSessionTimeout;
