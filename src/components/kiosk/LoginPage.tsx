import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAppSettings } from '@/context/AppSettingsContext';

interface Props {
  onLogin: (employeeId: string, pin: string) => void;
  error?: string | null;
  loading?: boolean;
}

export default function LoginPage({ onLogin, error, loading }: Props) {
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  const { settings } = useAppSettings();

  const handleSubmit = () => {
    if (!employeeId.trim()) { setLocalError('Введите табельный номер'); return; }
    if (!pin.trim()) { setLocalError('Введите PIN-код'); return; }
    setLocalError('');
    onLogin(employeeId.trim(), pin.trim());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const displayError = localError || error;

  return (
    <div className="flex h-full w-full kiosk-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)'}}
        />
      </div>

      <div className="relative z-10 flex w-full h-full landscape:flex-row portrait:flex-col">

        {/* Логотипы — landscape: левая колонка 40% | portrait: верхние 42%, строго по центру */}
        <div className="landscape:w-[40%] portrait:h-[42%] flex flex-col items-center justify-center gap-8 px-8">

          {settings.carrierLogo && (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="w-40 h-40 portrait:w-[152px] portrait:h-[152px] rounded-3xl elevation-3 flex items-center justify-center overflow-hidden bg-white/10">
                  <img src={settings.carrierLogo} alt={settings.carrierName} className="w-32 h-32 portrait:w-[120px] portrait:h-[120px] object-contain" />
                </div>
                <span className="text-2xl portrait:text-xl font-bold text-foreground tracking-tight text-center">{settings.carrierName}</span>
              </div>
              <div className="w-20 h-px bg-foreground/20" />
            </>
          )}

          <div className="flex flex-col items-center gap-4">
            <div className="w-40 h-40 portrait:w-[152px] portrait:h-[152px] rounded-3xl elevation-3 flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))' }}>
              <img src="https://cdn.poehali.dev/files/99eade92-26ae-4d2a-87f8-343f497fc065.png" alt="ИРИДА" className="w-28 h-28 portrait:w-[112px] portrait:h-[112px] object-contain" />
            </div>
            <div className="text-center portrait:mt-[10%]">
              <div className="text-2xl portrait:text-[4.5rem] font-bold text-foreground tracking-tight">ИРИДА</div>
              <div className="text-base portrait:text-sm text-muted-foreground mt-1">Мобильные рабочие места</div>
            </div>
          </div>
        </div>

        {/* Разделитель portrait */}
        <div className="portrait:block hidden w-full h-px bg-border/30" />

        {/* Форма — landscape: правая колонка 60% | portrait: остаток, форма смещена вверх на 25% */}
        <div className="relative z-10 landscape:w-[60%] portrait:flex-1 flex flex-col items-center portrait:justify-center portrait:pb-[25%] justify-center px-14 portrait:px-10 portrait:pt-4">
          <div className="w-full max-w-xl portrait:max-w-[90%]">
            <div className="kiosk-surface rounded-2xl elevation-3 p-10 portrait:p-7">
              <h2 className="text-3xl portrait:text-2xl font-semibold text-foreground mb-6 portrait:mb-5 flex items-center gap-3">
                <Icon name="LogIn" size={28} className="text-primary" />
                Авторизация водителя
              </h2>

              <div className="space-y-5 portrait:space-y-4">
                <div>
                  <label className="text-base font-medium text-muted-foreground mb-2.5 block">Табельный номер</label>
                  <div className="relative">
                    <Icon name="IdCard" size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Например: 0001"
                      className="w-full pl-12 pr-5 py-4 portrait:py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-xl portrait:text-lg transition-all"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-base font-medium text-muted-foreground mb-2.5 block">PIN-код</label>
                  <div className="relative">
                    <Icon name="Lock" size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="••••"
                      className="w-full pl-12 pr-5 py-4 portrait:py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-xl portrait:text-lg transition-all"
                    />
                  </div>
                </div>

                {displayError && (
                  <div className="flex items-center gap-2.5 p-4 rounded-xl bg-destructive/10 text-destructive text-base animate-shake">
                    <Icon name="AlertCircle" size={20} />
                    {displayError}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-5 portrait:py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-2xl portrait:text-xl flex items-center justify-center gap-3 elevation-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-1 ripple"
                >
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <Icon name="LogIn" size={24} />
                      Войти в систему
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 portrait:mt-4 pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <span>v2.4.1 · Android 10+</span>
                <span className="flex items-center gap-1.5">
                  <div className="status-dot status-online" />
                  Сервер доступен
                </span>
              </div>
            </div>

            <p className="text-center text-base text-muted-foreground mt-4 portrait:mt-3">
              При проблемах со входом обратитесь к диспетчеру
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}