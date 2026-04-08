import { useEffect, useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Driver } from '@/types/kiosk';
import { useAppSettings } from '@/context/AppSettingsContext';
import { verifyMrmExitPassword, type MrmAdminInfo } from '@/api/driverApi';

function useSidebarLight() {
  const [isLight, setIsLight] = useState(true);
  useEffect(() => {
    const check = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-background').trim();
      const match = raw.match(/(\d+)\s+([\d.]+)%\s+([\d.]+)%/);
      if (match) setIsLight(parseFloat(match[3]) > 50);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => obs.disconnect();
  }, []);
  return isLight;
}

interface SidebarHeaderProps {
  driver: Driver | null;
  mrmAdmin?: MrmAdminInfo | null;
  onClose: () => void;
}

export default function SidebarHeader({ driver, mrmAdmin, onClose }: SidebarHeaderProps) {
  const sidebarIsLight = useSidebarLight();
  const { settings } = useAppSettings();
  const roleTextClass = sidebarIsLight ? 'text-[#141414]' : 'text-white';
  const roleBadgeClass = sidebarIsLight ? 'bg-black/15 text-[#141414]' : 'bg-white/15 text-white';

  // --- Kiosk exit modal ---
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordChecking, setPasswordChecking] = useState(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    const next = logoTapCount + 1;
    setLogoTapCount(next);

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => setLogoTapCount(0), 3000);

    if (next >= 10) {
      setLogoTapCount(0);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      setPassword('');
      setPasswordError(false);
      setPasswordSuccess(false);
      setShowKioskModal(true);
    }
  };

  const handleKioskExit = async () => {
    if (!password || passwordChecking) return;
    setPasswordChecking(true);
    setPasswordError(false);
    let ok = false;
    if (mrmAdmin) {
      ok = await verifyMrmExitPassword(mrmAdmin.id, password);
    } else {
      ok = password === '1234';
    }
    setPasswordChecking(false);
    if (ok) {
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowKioskModal(false);
        if (document.exitFullscreen) document.exitFullscreen();
        window.dispatchEvent(new CustomEvent('kiosk-exit'));
      }, 800);
    } else {
      setPasswordError(true);
      setPassword('');
      setTimeout(() => setPasswordError(false), 1500);
    }
  };

  return (
    <>
      <div className="p-5 border-b border-sidebar-border bg-gradient-to-br from-primary/20 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleLogoTap}
            className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 active:scale-95 transition-transform select-none"
            style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))' }}
            title={logoTapCount > 0 ? `${10 - logoTapCount} нажатий до служебного меню` : undefined}
          >
            {settings.carrierLogo ? (
              <img src={settings.carrierLogo} alt={settings.carrierName} className="w-8 h-8 object-contain pointer-events-none" />
            ) : (
              <Icon name="Building2" size={24} className="text-white pointer-events-none" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className={`font-bold ${roleTextClass} truncate`}>{settings.carrierName || 'ИРИДА'}</div>
            {settings.carrierDescription ? (
              <div className={`text-[10px] opacity-60 ${roleTextClass} truncate`}>{settings.carrierDescription}</div>
            ) : (
              <div className={`text-xs px-1.5 py-0.5 rounded font-medium inline-block ${roleBadgeClass}`}>
                Система водителя
              </div>
            )}
          </div>
          <button onClick={onClose} className="ml-auto w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center ripple">
            <Icon name="X" size={18} className="text-sidebar-foreground" />
          </button>
        </div>

        {driver && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sidebar-accent">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#ffffff]">
              <Icon name="User" size={16} className="text-sidebar-primary" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold truncate ${roleTextClass}`}>{driver.name.split(' ')[0]} {driver.name.split(' ')[1]}</div>
              <div className={`text-[10px] opacity-60 ${roleTextClass}`}>Маршрут №{driver.routeNumber} · {driver.vehicleNumber}</div>
            </div>
            <div className="ml-auto status-dot status-online flex-shrink-0" />
          </div>
        )}
      </div>

      {/* ═══ KIOSK EXIT MODAL ═══ */}
      {showKioskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[320px] p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Icon name="ShieldOff" size={20} className="text-red-500" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">Выход из киоск-режима</div>
                <div className="text-[11px] text-muted-foreground">Введите служебный пароль</div>
              </div>
              <button
                onClick={() => setShowKioskModal(false)}
                className="ml-auto w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Icon name="X" size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Password input */}
            <div className="flex flex-col gap-2">
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-colors ${
                passwordError
                  ? 'border-red-500 bg-red-500/10'
                  : passwordSuccess
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border bg-muted'
              }`}>
                <Icon
                  name={passwordSuccess ? 'CheckCircle' : passwordError ? 'XCircle' : 'Lock'}
                  size={16}
                  className={passwordSuccess ? 'text-green-500' : passwordError ? 'text-red-500' : 'text-muted-foreground'}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleKioskExit()}
                  placeholder="Служебный пароль"
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <Icon name="AlertCircle" size={12} />
                  Неверный пароль. Попробуйте снова.
                </p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Icon name="CheckCircle" size={12} />
                  Пароль принят. Выход...
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowKioskModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleKioskExit}
                disabled={!password || passwordChecking}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {passwordChecking && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}