import { useEffect, useRef, useCallback } from 'react';

export default function useVisibilityPolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
) {
  const savedCb = useRef(callback);
  savedCb.current = callback;

  const tick = useCallback(() => {
    if (!document.hidden) savedCb.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    tick();
    const iv = setInterval(tick, intervalMs);
    const onVisible = () => { if (!document.hidden) savedCb.current(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled, tick]);
}
