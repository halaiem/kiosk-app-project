import { useEffect, useRef } from 'react';
import type { DispatchMessage } from '@/types/dashboard';

const ORIGINAL_TITLE = document.title;
const BADGE_TITLE_PREFIX = '💬 ';

function createBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // браузер заблокировал AudioContext
  }
}

export function useNewMessageNotifier(messages: DispatchMessage[]) {
  const seenIds = useRef<Set<string>>(new Set());
  const blinkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBlinking = useRef(false);

  const startBlink = (count: number) => {
    if (isBlinking.current) return;
    isBlinking.current = true;
    let toggle = true;
    blinkInterval.current = setInterval(() => {
      document.title = toggle
        ? `${BADGE_TITLE_PREFIX}${count} новых сообщений`
        : ORIGINAL_TITLE;
      toggle = !toggle;
    }, 1200);
  };

  const stopBlink = () => {
    if (blinkInterval.current) {
      clearInterval(blinkInterval.current);
      blinkInterval.current = null;
    }
    isBlinking.current = false;
    document.title = ORIGINAL_TITLE;
  };

  useEffect(() => {
    const incoming = messages.filter(m => m.direction === 'incoming');
    const newOnes = incoming.filter(m => !seenIds.current.has(m.id));

    if (newOnes.length > 0) {
      newOnes.forEach(m => seenIds.current.add(m.id));
      createBeep();
    }

    const unreadCount = messages.filter(m => m.direction === 'incoming' && !m.read).length;

    if (unreadCount > 0) {
      startBlink(unreadCount);
    } else {
      stopBlink();
    }
  }, [messages]);

  useEffect(() => {
    // Инициализируем seenIds начальным набором сообщений (без звука)
    messages.filter(m => m.direction === 'incoming').forEach(m => seenIds.current.add(m.id));
    return () => stopBlink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
