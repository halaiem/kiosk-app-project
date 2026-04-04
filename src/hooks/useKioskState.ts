import { useState, useEffect, useCallback, useRef } from 'react';
import { AppScreen, Driver, Message, ConnectionStatus, ThemeMode } from '@/types/kiosk';
import { loginByPin, logout as apiLogout, sendHeartbeat, fetchMessages, sendMessage as apiSendMessage, sendBatchMessages, getStoredToken, getStoredDriver } from '@/api/driverApi';
import { addToQueue, getPendingMessages, updateQueueItem, removeFromQueue, clearSentMessages, cacheMessages, getCachedMessages, generateClientId } from '@/lib/offlineQueue';


export function useKioskState() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [driver, setDriver] = useState<Driver | null>(() => getStoredDriver());
  const [messages, setMessages] = useState<Message[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>('online');
  const [theme, setTheme] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(false);
  const [darkFrom, setDarkFrom] = useState(20);
  const [darkTo, setDarkTo] = useState(6);
  const [isMoving, setIsMoving] = useState(true);
  const [speed, setSpeed] = useState(32);
  const [currentStopIndex, setCurrentStopIndex] = useState(3);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [kioskUnlocked, setKioskUnlocked] = useState(false);
  const [pendingImportant, setPendingImportant] = useState<Message | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const lastMessageIdRef = useRef(0);
  const syncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const token = getStoredToken();
    const storedDriver = getStoredDriver();
    if (token && storedDriver) {
      setDriver(storedDriver);
      setScreen('main');
      const cached = getCachedMessages() as Message[];
      if (cached.length > 0) {
        setMessages(cached.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
        const maxId = Math.max(0, ...cached.map(m => {
          const num = parseInt(m.id);
          return isNaN(num) ? 0 : num;
        }));
        lastMessageIdRef.current = maxId;
      }
    }
  }, []);

  useEffect(() => {
    if (theme === 'auto') {
      const updateTheme = () => {
        const hour = new Date().getHours();
        const isNight = darkFrom > darkTo
          ? (hour >= darkFrom || hour < darkTo)
          : (hour >= darkFrom && hour < darkTo);
        setIsDark(isNight);
      };
      updateTheme();
      const interval = setInterval(updateTheme, 60000);
      return () => clearInterval(interval);
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme, darkFrom, darkTo]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    if (screen !== 'main') return;
    const interval = setInterval(() => {
      setSpeed(prev => Math.max(0, Math.min(60, prev + (Math.random() - 0.5) * 8)));
    }, 3000);
    return () => clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'main') return;
    sendHeartbeat(undefined, undefined, speed);
    const interval = setInterval(() => sendHeartbeat(undefined, undefined, speed), 30000);
    return () => clearInterval(interval);
  }, [screen, speed]);

  useEffect(() => {
    const handleOnline = () => {
      setConnection('online');
      syncOfflineQueue();
    };
    const handleOffline = () => setConnection('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setConnection('offline');
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const pending = getPendingMessages();
      if (pending.length === 0) {
        syncingRef.current = false;
        return;
      }

      const batch = pending.map(m => ({
        text: m.text,
        type: m.type,
        clientId: m.clientId,
      }));

      const response = await sendBatchMessages(batch);
      const results = response.results || [];

      for (const result of results) {
        if (result.status === 'sent' || result.status === 'duplicate') {
          updateQueueItem(result.clientId, { status: 'sent', serverId: result.serverId });
          setMessages(prev => prev.map(m =>
            m.clientId === result.clientId
              ? { ...m, id: String(result.serverId), deliveryStatus: 'sent' }
              : m
          ));
        }
      }

      clearSentMessages();
      setPendingCount(0);
    } catch {
      // still offline
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (screen !== 'main') return;
    const poll = async () => {
      try {
        const newMsgs = await fetchMessages(lastMessageIdRef.current);
        setConnection('online');

        if (newMsgs.length > 0) {
          const mapped: Message[] = newMsgs.map((m: { id: number; sender: string; text: string; type: string; isRead: boolean; createdAt: string; clientId?: string; deliveredAt?: string; isVoice?: boolean; voiceDuration?: number }) => {
            const voiceMatch = m.text.match(/🎤\s*Голосовое сообщение\s*\((\d+)с\)/);
            const isVoice = m.isVoice || !!voiceMatch;
            const voiceDuration = m.voiceDuration || (voiceMatch ? parseInt(voiceMatch[1]) : undefined);
            return {
              id: String(m.id),
              type: m.sender === 'dispatcher' ? 'dispatcher' : 'normal',
              text: m.sender === 'driver' ? `[Водитель]: ${m.text}` : m.text,
              timestamp: new Date(m.createdAt),
              read: m.isRead,
              clientId: m.clientId || undefined,
              deliveryStatus: m.sender === 'driver'
                ? ('delivered' as const)
                : (m.deliveredAt ? 'delivered' as const : 'sent' as const),
              isVoice,
              voiceDuration,
            };
          });
          lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;

          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const existingClientIds = new Set(prev.filter(m => m.clientId).map(m => m.clientId));

            const fresh = mapped.filter(m => {
              if (existingIds.has(m.id)) return false;
              if (m.clientId && existingClientIds.has(m.clientId)) {
                return false;
              }
              return true;
            });

            let updated = prev.map(msg => {
              if (msg.clientId) {
                const serverMsg = mapped.find(m => m.clientId === msg.clientId);
                if (serverMsg) {
                  return { ...msg, id: serverMsg.id, deliveryStatus: 'delivered' as const };
                }
              }
              return msg;
            });

            const important = fresh.find(m => m.type === 'important');
            if (important) setPendingImportant(important);

            updated = [...updated, ...fresh];
            cacheMessages(updated);
            return updated;
          });
        }

        await syncOfflineQueue();
      } catch {
        setConnection('offline');
      }
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [screen, syncOfflineQueue]);

  const login = useCallback(async (employeeId: string, pin: string) => {
    setLoginError(null);
    setLoginLoading(true);
    try {
      const data = await loginByPin(employeeId, pin);
      const d: Driver = {
        id: String(data.driver.id),
        name: data.driver.name,
        vehicleType: data.driver.vehicleType,
        vehicleNumber: data.driver.vehicleNumber,
        routeNumber: data.driver.routeNumber,
        shiftStart: data.driver.shiftStart,
      };
      setDriver(d);
      setMessages([]);
      lastMessageIdRef.current = 0;
      setScreen('welcome');
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const startShift = useCallback(() => {
    setScreen('main');
    setIsMoving(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setDriver(null);
    setMessages([]);
    lastMessageIdRef.current = 0;
    setScreen('login');
    setIsMoving(false);
  }, []);

  const confirmImportant = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, confirmed: true, confirmedAt: new Date(), read: true } : m
    ));
    setPendingImportant(null);
  }, []);

  const markRead = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
  }, []);

  const updateTranscription = useCallback((msgId: string, transcription: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, transcription } : m));
  }, []);

  const sendMessage = useCallback(async (text: string, isVoice?: boolean, voiceDuration?: number, audioUrl?: string) => {
    const clientId = generateClientId();
    const isOnline = navigator.onLine;

    const tempMsg: Message = {
      id: 'tmp_' + clientId,
      type: 'dispatcher',
      text: `[Водитель]: ${text}`,
      timestamp: new Date(),
      read: true,
      clientId,
      deliveryStatus: isOnline ? 'sending' : 'pending',
      isVoice,
      voiceDuration,
      audioUrl,
    };
    setMessages(prev => {
      const updated = [...prev, tempMsg];
      cacheMessages(updated);
      return updated;
    });

    if (isOnline) {
      try {
        const result = await apiSendMessage(text, 'normal', clientId);
        setMessages(prev => prev.map(m =>
          m.clientId === clientId
            ? { ...m, id: String(result.id), deliveryStatus: 'sent' }
            : m
        ));
      } catch {
        addToQueue(text, 'normal');
        setMessages(prev => prev.map(m =>
          m.clientId === clientId
            ? { ...m, deliveryStatus: 'pending' }
            : m
        ));
        setPendingCount(p => p + 1);
      }
    } else {
      addToQueue(text, 'normal');
      setPendingCount(p => p + 1);
    }
  }, []);

  const addDispatcherMessage = useCallback((text: string, sender?: string, isVoice?: boolean, voiceDuration?: number) => {
    const msg: Message = {
      id: 'alert_' + Date.now(),
      type: 'dispatcher',
      text: sender ? `[${sender}]: ${text}` : text,
      timestamp: new Date(),
      read: false,
      isVoice,
      voiceDuration,
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const handleLogoTap = useCallback(() => {
    setLogoTapCount(prev => {
      const next = prev + 1;
      if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
      if (next >= 5) {
        setKioskUnlocked(true);
        return 0;
      }
      logoTapTimer.current = setTimeout(() => setLogoTapCount(0), 3000);
      return next;
    });
  }, []);

  const unreadCount = messages.filter(m => !m.read).length;

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  }, []);

  return {
    screen, setScreen,
    driver,
    messages,
    connection,
    theme, setTheme,
    isDark,
    darkFrom, setDarkFrom,
    darkTo, setDarkTo,
    toggleTheme,
    isMoving, setIsMoving,
    speed,
    currentStopIndex, setCurrentStopIndex,
    kioskUnlocked, setKioskUnlocked,
    pendingImportant,
    unreadCount,
    loginError,
    loginLoading,
    login,
    startShift,
    logout,
    confirmImportant,
    markRead,
    sendMessage,
    updateTranscription,
    addDispatcherMessage,
    handleLogoTap,
    logoTapCount,
    pendingCount,
  };
}