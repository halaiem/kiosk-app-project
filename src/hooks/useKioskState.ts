import { useState, useEffect, useCallback, useRef } from 'react';
import { AppScreen, Driver, Message, ConnectionStatus, ThemeMode } from '@/types/kiosk';
import { loginByPin, logout as apiLogout, sendHeartbeat, fetchMessages, sendMessage as apiSendMessage, getStoredToken, getStoredDriver } from '@/api/driverApi';


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

  // Restore session on mount
  useEffect(() => {
    const token = getStoredToken();
    const storedDriver = getStoredDriver();
    if (token && storedDriver) {
      setDriver(storedDriver);
      setScreen('main');
    }
  }, []);

  // Auto theme by time schedule
  useEffect(() => {
    const updateTheme = () => {
      if (theme === 'auto') {
        const hour = new Date().getHours();
        const isNight = darkFrom > darkTo
          ? (hour >= darkFrom || hour < darkTo)
          : (hour >= darkFrom && hour < darkTo);
        setIsDark(isNight);
      } else {
        setIsDark(theme === 'dark');
      }
    };
    updateTheme();
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, [theme, darkFrom, darkTo]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Simulate telemetry speed
  useEffect(() => {
    if (screen !== 'main') return;
    const interval = setInterval(() => {
      setSpeed(prev => Math.max(0, Math.min(60, prev + (Math.random() - 0.5) * 8)));
    }, 3000);
    return () => clearInterval(interval);
  }, [screen]);

  // Heartbeat every 30s
  useEffect(() => {
    if (screen !== 'main') return;
    sendHeartbeat(undefined, undefined, speed);
    const interval = setInterval(() => sendHeartbeat(undefined, undefined, speed), 30000);
    return () => clearInterval(interval);
  }, [screen, speed]);

  // Poll messages every 5s
  useEffect(() => {
    if (screen !== 'main') return;
    const poll = async () => {
      try {
        setConnection('online');
        const newMsgs = await fetchMessages(lastMessageIdRef.current);
        if (newMsgs.length > 0) {
          const mapped: Message[] = newMsgs.map((m: {id: number; sender: string; text: string; type: string; isRead: boolean; createdAt: string}) => ({
            id: String(m.id),
            type: m.sender === 'dispatcher' ? 'dispatcher' : 'normal',
            text: m.sender === 'driver' ? `[Водитель]: ${m.text}` : m.text,
            timestamp: new Date(m.createdAt),
            read: m.isRead,
          }));
          lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const fresh = mapped.filter(m => !existingIds.has(m.id));
            const important = fresh.find(m => m.type === 'important');
            if (important) setPendingImportant(important);
            return [...prev, ...fresh];
          });
        }
      } catch {
        setConnection('offline');
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [screen]);

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

  const sendMessage = useCallback(async (text: string) => {
    const tempMsg: Message = {
      id: 'tmp_' + Date.now(),
      type: 'dispatcher',
      text: `[Водитель]: ${text}`,
      timestamp: new Date(),
      read: true,
    };
    setMessages(prev => [...prev, tempMsg]);
    try {
      await apiSendMessage(text);
    } catch {
      // keep optimistic message
    }
  }, []);

  const addDispatcherMessage = useCallback((text: string, sender?: string) => {
    const msg: Message = {
      id: 'alert_' + Date.now(),
      type: 'dispatcher',
      text: sender ? `[${sender}]: ${text}` : text,
      timestamp: new Date(),
      read: false,
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
    addDispatcherMessage,
    handleLogoTap,
    logoTapCount,
  };
}