import { useState, useEffect, useCallback, useRef } from 'react';
import { AppScreen, Driver, Message, TelemetryPoint, ConnectionStatus, ThemeMode } from '@/types/kiosk';

const MOCK_DRIVER: Driver = {
  id: 'DRV-001',
  name: 'Иванов Александр Петрович',
  routeNumber: '5',
  vehicleType: 'tram',
  vehicleNumber: 'ТМ-3407',
  shiftStart: '06:00',
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    type: 'dispatcher',
    text: 'Маршрут №5: на перегоне ул. Ленина — пл. Советская ремонтные работы. Скорость снизить до 15 км/ч.',
    timestamp: new Date(Date.now() - 15 * 60000),
    read: true,
  },
  {
    id: 'm2',
    type: 'normal',
    text: 'Перерыв разрешён на конечной «Депо Северное» с 09:45 до 10:00.',
    timestamp: new Date(Date.now() - 8 * 60000),
    read: false,
  },
  {
    id: 'm3',
    type: 'can_error',
    text: 'CAN: Предупреждение тормозной системы (код 0x2F14). Severity: warning',
    timestamp: new Date(Date.now() - 3 * 60000),
    read: false,
    severity: 'warning',
  },
];

export function useKioskState() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [connection, setConnection] = useState<ConnectionStatus>('online');
  const [theme, setTheme] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(false);
  // Schedule: auto dark from hour X to Y
  const [darkFrom, setDarkFrom] = useState(20);
  const [darkTo, setDarkTo] = useState(6);
  const [isMoving, setIsMoving] = useState(true);
  const [speed, setSpeed] = useState(32);
  const [currentStopIndex, setCurrentStopIndex] = useState(3);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [kioskUnlocked, setKioskUnlocked] = useState(false);
  const [pendingImportant, setPendingImportant] = useState<Message | null>(null);

  // Auto theme by time schedule
  useEffect(() => {
    const updateTheme = () => {
      if (theme === 'auto') {
        const hour = new Date().getHours();
        // darkFrom > darkTo means overnight (e.g. 20:00–06:00)
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

  // Simulate telemetry
  useEffect(() => {
    if (screen !== 'main') return;
    const interval = setInterval(() => {
      setSpeed(prev => Math.max(0, Math.min(60, prev + (Math.random() - 0.5) * 8)));
    }, 3000);
    return () => clearInterval(interval);
  }, [screen]);

  // Simulate incoming messages
  useEffect(() => {
    if (screen !== 'main') return;
    const timer = setTimeout(() => {
      const importantMsg: Message = {
        id: 'm_important_' + Date.now(),
        type: 'important',
        text: '⚠️ ВНИМАНИЕ! На пересечении ул. Садовая / пр. Мира — ДТП. Движение ограничено. Следуйте по объездному маршруту через ул. Комсомольскую.',
        timestamp: new Date(),
        read: false,
        confirmed: false,
      };
      setPendingImportant(importantMsg);
      setMessages(prev => [importantMsg, ...prev]);
    }, 18000);
    return () => clearTimeout(timer);
  }, [screen]);

  const login = useCallback((id: string, _password: string) => {
    if (id.trim()) {
      setDriver(MOCK_DRIVER);
      setScreen('welcome');
    }
  }, []);

  const startShift = useCallback(() => {
    setScreen('main');
    setIsMoving(true);
  }, []);

  const logout = useCallback(() => {
    setDriver(null);
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

  const sendMessage = useCallback((text: string) => {
    const msg: Message = {
      id: 'm_out_' + Date.now(),
      type: 'dispatcher',
      text: `[Водитель]: ${text}`,
      timestamp: new Date(),
      read: true,
    };
    setMessages(prev => [msg, ...prev]);
    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: 'm_reply_' + Date.now(),
        type: 'dispatcher',
        text: 'Принято. Продолжайте движение по графику.',
        timestamp: new Date(),
        read: false,
      };
      setMessages(prev => [reply, ...prev]);
    }, 2500);
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

  // Cycle toggle: light → dark → auto
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
    login,
    startShift,
    logout,
    confirmImportant,
    markRead,
    sendMessage,
    handleLogoTap,
  };
}