import { useState, useEffect } from 'react';
import { useKioskState } from '@/hooks/useKioskState';
import LoginPage from '@/components/kiosk/LoginPage';
import WelcomeScreen from '@/components/kiosk/WelcomeScreen';
import MainPage from '@/components/kiosk/MainPage';
import SidebarMenu from '@/components/kiosk/SidebarMenu';
import { ImportantMessageOverlay, MessageToast } from '@/components/kiosk/NotificationOverlay';
import BreakModal from '@/components/kiosk/BreakModal';
import KioskUnlockModal from '@/components/kiosk/KioskUnlockModal';
import { MenuSection } from '@/types/kiosk';

export default function Index() {
  const state = useKioskState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);
  const [breakOpen, setBreakOpen] = useState(false);
  const [kioskUnlockOpen, setKioskUnlockOpen] = useState(false);
  const [seenMessages, setSeenMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const latest = state.messages[0];
    if (!latest) return;
    if (latest.type === 'important') return;
    if (!latest.read && !seenMessages.has(latest.id)) {
      setSeenMessages(prev => new Set([...prev, latest.id]));
      setToasts(prev => [...prev.slice(-2), latest.id]);
      setTimeout(() => {
        setToasts(prev => prev.filter(id => id !== latest.id));
      }, 5000);
    }
  }, [state.messages[0]?.id]);

  const handleLogoTap = () => {
    state.handleLogoTap();
    if (state.logoTapCount >= 4) {
      setKioskUnlockOpen(true);
    }
  };

  const handleEndShift = () => {
    const ok = window.confirm('Завершить смену? Все данные будут синхронизированы.');
    if (ok) state.logout();
  };

  const handleToggleTheme = () => {
    state.toggleTheme();
  };

  const activeToasts = toasts
    .map(id => state.messages.find(m => m.id === id))
    .filter(Boolean);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {state.screen === 'login' && (
        <>
          <LoginPage onLogin={state.login} error={state.loginError} loading={state.loginLoading} />
          <a
            href="/dashboard"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <span className="text-base leading-none">🖥</span>
            Панель управления
          </a>
        </>
      )}

      {state.screen === 'welcome' && state.driver && (
        <WelcomeScreen driver={state.driver} onStart={state.startShift} />
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
            onLogoTap={handleLogoTap}
            logoTapCount={state.logoTapCount}
            onBreak={() => setBreakOpen(true)}
            onEndShift={handleEndShift}
            onToggleTheme={handleToggleTheme}
          />

          <SidebarMenu
            isOpen={menuOpen}
            onClose={() => { setMenuOpen(false); setActiveSection(null); }}
            driver={state.driver}
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
          />

          {/* Toast notifications — top right */}
          <div className="fixed top-16 right-4 z-30 flex flex-col gap-2 pointer-events-none">
            {activeToasts.map(msg => msg && (
              <MessageToast
                key={msg.id}
                message={msg}
                onClose={() => {
                  setToasts(prev => prev.filter(id => id !== msg.id));
                  state.markRead(msg.id);
                }}
              />
            ))}
          </div>

          {/* Important full-screen overlay */}
          {state.pendingImportant && !state.pendingImportant.confirmed && (
            <ImportantMessageOverlay
              message={state.pendingImportant}
              onConfirm={() => state.confirmImportant(state.pendingImportant!.id)}
            />
          )}

          <BreakModal isOpen={breakOpen} onClose={() => setBreakOpen(false)} />

          <KioskUnlockModal
            isOpen={kioskUnlockOpen}
            onClose={() => setKioskUnlockOpen(false)}
            onUnlock={() => console.log('Kiosk unlocked')}
          />
        </>
      )}
    </div>
  );
}