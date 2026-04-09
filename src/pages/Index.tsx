import { useState, useEffect, useCallback, useRef } from 'react';
import { playMessageBeep, playUrgentBeep } from '@/lib/kioskSound';
import { useKioskState } from '@/hooks/useKioskState';
import { useAutoClose } from '@/hooks/useAutoClose';
import LoginPage from '@/components/kiosk/LoginPage';
import WelcomeScreen from '@/components/kiosk/WelcomeScreen';
import MainPage from '@/components/kiosk/MainPage';
import SidebarMenu from '@/components/kiosk/SidebarMenu';
import { ImportantMessageOverlay, MessageToast } from '@/components/kiosk/NotificationOverlay';
import BreakModal from '@/components/kiosk/BreakModal';
import KioskUnlockModal from '@/components/kiosk/KioskUnlockModal';
import DispatcherAlert from '@/components/kiosk/DispatcherAlert';
import { SupportContactModal, SupportEquipmentModal } from '@/components/kiosk/SupportModals';
import SosModal from '@/components/kiosk/SosModal';
import EndShiftModal from '@/components/kiosk/EndShiftModal';
import GoodbyeScreen from '@/components/kiosk/GoodbyeScreen';
import SessionWarningModal from '@/components/kiosk/SessionWarningModal';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import LoginLoadingScreen from '@/components/kiosk/LoginLoadingScreen';
import NewDocsScreen from '@/components/kiosk/NewDocsScreen';
import { SupportModalRequest } from '@/components/kiosk/SidebarSections';
import { MenuSection } from '@/types/kiosk';
import type { Message } from '@/types/kiosk';
import { rateDispatcher } from '@/api/driverApi';

type NotifKind = 'message' | 'important' | 'alert';

interface AlertData {
  id: string;
  icon: string;
  color: string;
  text: string;
  sub: string;
  isVoice?: boolean;
  voiceDuration?: number;
}

interface NotifItem {
  id: string;
  kind: NotifKind;
  message?: Message;
  alert?: AlertData;
}

const DISPATCHER_ALERTS: AlertData[] = [
  { id: 'da1', icon: 'AlertTriangle', color: 'bg-red-600', text: 'Срочно вернитесь в парк! Техническая проверка ТС.', sub: 'Диспетчер Иванова А.П.' },
  { id: 'da2', icon: 'Construction', color: 'bg-orange-500', text: 'Объезд! Перекрыта ул. Садовая — ДТП. Следуйте по ул. Невской.', sub: 'Диспетчер Петров М.С.' },
  { id: 'da3', icon: 'Clock', color: 'bg-blue-600', text: 'Задержитесь на конечной 10 мин — регулировка интервала.', sub: 'Диспетчер Смирнова Е.В.' },
  { id: 'da4', icon: 'UserCheck', color: 'bg-purple-600', text: 'Ревизор на маршруте. Приготовьте путевой лист.', sub: 'Диспетчер Иванова А.П.' },
  { id: 'da5', icon: 'Zap', color: 'bg-yellow-600', text: 'Внимание! Обрыв контактной сети у ост. «Площадь Мира». Остановитесь.', sub: 'Диспетчер Козлов В.Н.' },
  { id: 'da6', icon: 'Mic', color: 'bg-green-600', text: '🎤 Голосовое сообщение (12с)', sub: 'Диспетчер Смирнова Е.В.', isVoice: true, voiceDuration: 12 },
];

const isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1024;

export default function Index() {
  const state = useKioskState();
  const [loginLoading, setLoginLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);
  const [kioskUnlockOpen, setKioskUnlockOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [goodbyeScreen, setGoodbyeScreen] = useState(false);
  const [supportModal, setSupportModal] = useState<SupportModalRequest | null>(null);

  const [messengerFullscreen, setMessengerFullscreen] = useState(false);
  const [stopsFullscreen, setStopsFullscreen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [activeVoiceMsgId, setActiveVoiceMsgId] = useState<string | null>(null);

  const [tablet, setTablet] = useState(isTablet);
  useEffect(() => {
    const handler = () => setTablet(isTablet());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleSessionExpire = useCallback(() => {
    setGoodbyeScreen(true);
  }, []);

  const isSessionActive = state.screen === 'main' || state.screen === 'welcome' || state.screen === 'new_docs';
  const { showWarning, countdown } = useSessionTimeout(isSessionActive, handleSessionExpire);

  // Единая очередь уведомлений
  const [queue, setQueue] = useState<NotifItem[]>([]);
  const seenMsgIds = useRef<Set<string>>(new Set());
  const seenImportantIds = useRef<Set<string>>(new Set());
  const shownAlertIds = useRef<Set<string>>(new Set());
  const lastAlertIdRef = useRef<string | null>(null);

  useAutoClose(messengerFullscreen, () => setMessengerFullscreen(false), 30000);
  useAutoClose(stopsFullscreen, () => setStopsFullscreen(false), 30000);
  useAutoClose(mapFullscreen, () => setMapFullscreen(false), 30000);
  useAutoClose(menuOpen, () => { setMenuOpen(false); setActiveSection(null); }, 30000);

  const dismissTop = useCallback(() => {
    setQueue(prev => prev.slice(1));
  }, []);

  const dismissTopAndReply = useCallback(() => {
    setQueue(prev => prev.slice(1));
    setTimeout(() => setMessengerFullscreen(true), 350);
  }, []);

  const dismissTopWithAnswer = useCallback((answer: string, replyTo?: string) => {
    setQueue(prev => prev.slice(1));
    state.sendMessage(answer, undefined, undefined, undefined, replyTo);
  }, [state.sendMessage]);

  const handlePlayVoiceInNotif = useCallback((msgId: string) => {
    setQueue(prev => prev.slice(1));
    setActiveVoiceMsgId(msgId);
    setTimeout(() => {
      setMessengerFullscreen(true);
      setTimeout(() => setActiveVoiceMsgId(null), 4000);
    }, 350);
  }, []);

  const handleForwardNotif = useCallback((msgText: string, msgType: string) => {
    setQueue(prev => prev.slice(1));
    state.sendMessage(`⤵️ Переслано [${msgType}]: ${msgText}`, undefined, undefined, undefined, msgText);
  }, [state.sendMessage]);

  // Обычные сообщения от диспетчера → в очередь
  useEffect(() => {
    const latest = state.messages[0];
    if (!latest) return;
    if (latest.type === 'important') return;
    if (!latest.read && !seenMsgIds.current.has(latest.id)) {
      seenMsgIds.current.add(latest.id);
      playMessageBeep();
      setQueue(prev => [...prev, { id: `msg-${latest.id}`, kind: 'message', message: latest }]);
    }
  }, [state.messages[0]?.id]);

  // Важные сообщения → в очередь
  useEffect(() => {
    const imp = state.pendingImportant;
    if (!imp || imp.confirmed) return;
    if (seenImportantIds.current.has(imp.id)) return;
    seenImportantIds.current.add(imp.id);
    playUrgentBeep();
    setQueue(prev => [...prev, { id: `imp-${imp.id}`, kind: 'important', message: imp }]);
  }, [state.pendingImportant?.id]);

  // Алерты диспетчера (демо) → в очередь
  const triggerRandomAlert = useCallback(() => {
    const unseen = DISPATCHER_ALERTS.filter(a => !shownAlertIds.current.has(a.id));
    const pool = unseen.length > 0 ? unseen : DISPATCHER_ALERTS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    shownAlertIds.current.add(pick.id);
    lastAlertIdRef.current = pick.id;
    state.addDispatcherMessage(pick.text, pick.sub, pick.isVoice, pick.voiceDuration);
    playUrgentBeep();
    setQueue(prev => [...prev, { id: `alert-${pick.id}-${Date.now()}`, kind: pick.isVoice ? 'message' : 'alert', alert: pick, message: pick.isVoice ? { id: `voice-${Date.now()}`, type: 'dispatcher' as const, text: pick.text, timestamp: new Date(), read: false, isVoice: true, voiceDuration: pick.voiceDuration } : undefined }]);
  }, [state.addDispatcherMessage]);

  // ДЕМО ОТКЛЮЧЕНО — для включения раскомментировать блоки ниже
  // Первое уведомление через ~3 мин (планшет) / ~2 мин (десктоп)
  // useEffect(() => {
  //   if (state.screen !== 'main') return;
  //   const tablet = isTablet();
  //   const delay = tablet ? 180000 : 120000 + Math.random() * 30000;
  //   const t = setTimeout(() => triggerRandomAlert(), delay);
  //   return () => clearTimeout(t);
  // }, [state.screen, triggerRandomAlert]);

  // Следующие через ~9 мин (планшет) / ~8 мин (десктоп)
  // useEffect(() => {
  //   if (lastAlertIdRef.current === null) return;
  //   const tablet = isTablet();
  //   const interval = tablet ? 540000 : 480000 + Math.random() * 60000;
  //   const t = setTimeout(() => triggerRandomAlert(), interval);
  //   return () => clearTimeout(t);
  // }, [lastAlertIdRef.current, triggerRandomAlert]);

  const handleLogoTap = () => {
    state.handleLogoTap();
    if (state.logoTapCount >= 4) {
      setKioskUnlockOpen(true);
    }
  };

  const handleEndShift = () => {
    setEndShiftOpen(true);
  };

  const handleEndShiftConfirm = (rating: number) => {
    setEndShiftOpen(false);
    setMenuOpen(false);
    if (rating > 0) rateDispatcher(rating);
    setGoodbyeScreen(true);
  };

  const handleGoodbyeLogout = () => {
    state.logout();
  };

  const handleGoodbyeComplete = () => {
    setGoodbyeScreen(false);
  };

  const top = queue[0] ?? null;
  const stackCount = queue.length;

  const handleLogin = (employeeId: string, pin: string) => {
    state.login(employeeId, pin);
  };

  const handleLoginMrm = (login: string, password: string) => {
    state.loginMrm(login, password);
  };

  // Как только screen переключился на welcome — показываем loading на 3 сек
  useEffect(() => {
    if (state.screen === 'welcome') {
      setLoginLoading(true);
    }
  }, [state.screen]);

  return (
    <div className="h-full w-full overflow-hidden relative">
      {state.screen === 'login' && !loginLoading && (
        <>
          <LoginPage onLogin={handleLogin} onLoginMrm={handleLoginMrm} error={state.loginError} loading={state.loginLoading} />
        </>
      )}

      {loginLoading && (
        <LoginLoadingScreen onDone={() => setLoginLoading(false)} />
      )}

      {state.screen === 'welcome' && state.driver && !loginLoading && (
        <WelcomeScreen driver={state.driver} onStart={() => state.setScreen('new_docs')} />
      )}

      {state.screen === 'new_docs' && state.driver && (
        <NewDocsScreen onDone={state.startShift} />
      )}

      {state.screen === 'main' && state.driver && (
        <>
          <MainPage
            driver={state.driver}
            messages={state.messages}
            speed={state.speed}
            isMoving={state.isMoving}
            currentStopIndex={state.currentStopIndex}
            connection={state.connection}
            unreadCount={state.unreadCount}
            isDark={state.isDark}
            theme={state.theme}
            onOpenMenu={() => setMenuOpen(true)}
            onSendMessage={state.sendMessage}
            onTranscribed={state.updateTranscription}
            onLogoTap={handleLogoTap}
            logoTapCount={state.logoTapCount}
            onBreak={() => setBreakOpen(true)}
            onEndShift={handleEndShift}
            onToggleTheme={state.toggleTheme}
            messengerFullscreen={messengerFullscreen}
            stopsFullscreen={stopsFullscreen}
            mapFullscreen={mapFullscreen}
            onSetMessengerFullscreen={setMessengerFullscreen}
            onSetStopsFullscreen={setStopsFullscreen}
            onSetMapFullscreen={setMapFullscreen}
            pendingCount={state.pendingCount}
            onSos={() => setSosOpen(true)}
            activeVoiceMsgId={activeVoiceMsgId}
          />

          <SidebarMenu
            isOpen={menuOpen}
            onClose={() => { setMenuOpen(false); setActiveSection(null); }}
            driver={state.driver}
            mrmAdmin={state.mrmAdmin}
            unreadCount={state.unreadCount}
            activeSection={activeSection}
            onSection={s => {
              setActiveSection(s);
              if (!menuOpen) setMenuOpen(true);
            }}
            onLogout={handleEndShift}
            logoTapCount={state.logoTapCount}
            onLogoTap={handleLogoTap}
            theme={state.theme}
            isDark={state.isDark}
            darkFrom={state.darkFrom}
            darkTo={state.darkTo}
            onSetTheme={state.setTheme}
            onSetDarkFrom={state.setDarkFrom}
            onSetDarkTo={state.setDarkTo}
            onSendMessage={state.sendMessage}
            onSupportModal={req => setSupportModal(req)}
          />

          {supportModal?.type === 'contact' && (
            <SupportContactModal
              contact={supportModal.contact}
              onClose={() => setSupportModal(null)}
              onSend={text => { state.sendMessage(text); setSupportModal(null); }}
            />
          )}
          {supportModal?.type === 'equipment' && (
            <SupportEquipmentModal
              onClose={() => setSupportModal(null)}
              onSend={text => { state.sendMessage(text); setSupportModal(null); }}
            />
          )}

          {/* Стек уведомлений */}
          {top && (
            <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end px-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', paddingBottom: tablet ? '12vh' : '2rem' }}>

              {/* Счётчик над стопкой */}
              {stackCount > 1 && (
                <div className="mb-3 px-4 py-1.5 rounded-full bg-destructive text-white text-sm font-bold shadow-lg">
                  {stackCount} уведомлений
                </div>
              )}

              <div className="relative w-full max-w-2xl">
                <div className="relative" key={top.id}>
                  {top.kind === 'important' && top.message && (
                    <ImportantMessageOverlay
                      message={top.message}
                      onConfirm={() => { state.confirmImportant(top.message!.id); dismissTopWithAnswer('Принято', top.message!.text); }}
                      onReply={() => { state.confirmImportant(top.message!.id); dismissTopAndReply(); }}
                      onYes={() => { state.confirmImportant(top.message!.id); dismissTopWithAnswer('Да', top.message!.text); }}
                      onNo={() => { state.confirmImportant(top.message!.id); dismissTopWithAnswer('Нет', top.message!.text); }}
                    />
                  )}
                  {top.kind === 'alert' && top.alert && (
                    <DispatcherAlert
                      alert={top.alert}
                      onConfirm={() => { dismissTopWithAnswer('Принято', top.alert!.text); }}
                      onReply={dismissTopAndReply}
                      onYes={() => dismissTopWithAnswer('Да', top.alert!.text)}
                      onNo={() => dismissTopWithAnswer('Нет', top.alert!.text)}
                    />
                  )}
                  {top.kind === 'message' && top.message && (
                    <MessageToast
                      message={top.message}
                      onConfirm={() => { state.markRead(top.message!.id); dismissTopWithAnswer('Принято', top.message!.text); }}
                      onReply={() => { state.markRead(top.message!.id); dismissTopAndReply(); }}
                      onYes={() => { state.markRead(top.message!.id); dismissTopWithAnswer('Да', top.message!.text); }}
                      onNo={() => { state.markRead(top.message!.id); dismissTopWithAnswer('Нет', top.message!.text); }}
                      onPlayVoice={top.message.isVoice ? () => { state.markRead(top.message!.id); handlePlayVoiceInNotif(top.message!.id); } : undefined}
                      onForward={top.message.type === 'can_error' ? () => { state.markRead(top.message!.id); handleForwardNotif(top.message!.text, top.message!.type); } : undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <BreakModal isOpen={breakOpen} onClose={() => setBreakOpen(false)} />

          <SosModal
            isOpen={sosOpen}
            onClose={() => setSosOpen(false)}
            onSend={state.sendMessage}
          />

          <KioskUnlockModal
            isOpen={kioskUnlockOpen}
            onClose={() => setKioskUnlockOpen(false)}
            onUnlock={() => console.log('Kiosk unlocked')}
          />

          {state.driver && (
            <EndShiftModal
              open={endShiftOpen}
              driver={state.driver}
              dispatcherName={state.driver.dispatcherName}
              onClose={() => setEndShiftOpen(false)}
              onConfirm={handleEndShiftConfirm}
            />
          )}
        </>
      )}

      {showWarning && !goodbyeScreen && (
        <SessionWarningModal countdown={countdown} />
      )}

      {goodbyeScreen && (
        <GoodbyeScreen onComplete={handleGoodbyeComplete} onLogout={handleGoodbyeLogout} />
      )}
    </div>
  );
}