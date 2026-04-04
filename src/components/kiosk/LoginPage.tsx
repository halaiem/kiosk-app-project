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
    <div className="flex h-full w-full items-center justify-center kiosk-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)'}}
        />
      </div>

      {/* Горизонтальный layout: логотипы слева + форма справа */}
      <div className="animate-scale-in relative z-10 flex items-center gap-12 mx-6 w-full max-w-6xl">

        {/* Левая колонка — логотипы */}
        <div className="flex flex-col items-center gap-8 flex-shrink-0">
          {/* Логотип перевозчика */}
          {settings.carrierLogo && (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="w-44 h-44 rounded-3xl elevation-3 flex items-center justify-center overflow-hidden bg-white/10">
                  <img src={settings.carrierLogo} alt={settings.carrierName} className="w-36 h-36 object-contain" />
                </div>
                <span className="text-3xl font-bold text-foreground tracking-tight text-center">{settings.carrierName}</span>
              </div>
              <div className="w-24 h-px bg-foreground/20" />
            </>
          )}

          {/* Логотип ИРИДА */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-44 h-44 rounded-3xl elevation-3 flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))' }}>
              <img src="https://cdn.poehali.dev/files/99eade92-26ae-4d2a-87f8-343f497fc065.png" alt="ИРИДА" className="w-32 h-32 object-contain" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground tracking-tight">ИРИДА</div>
              <div className="text-xl text-muted-foreground mt-1">Мобильные рабочие места</div>
            </div>
          </div>
        </div>

        {/* Разделитель вертикальный */}
        <div className="w-px self-stretch bg-foreground/10 flex-shrink-0" />

        {/* Правая колонка — форма авторизации */}
        <div className="flex-1 min-w-0">
          <div className="kiosk-surface rounded-3xl elevation-3 p-10">
            <h2 className="text-4xl font-semibold text-foreground mb-8 flex items-center gap-3">
              <Icon name="LogIn" size={36} className="text-primary" />
              Авторизация водителя
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-xl font-medium text-muted-foreground mb-3 block">Табельный номер</label>
                <div className="relative">
                  <Icon name="IdCard" size={28} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Например: 0001"
                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-2xl transition-all"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="text-xl font-medium text-muted-foreground mb-3 block">PIN-код</label>
                <div className="relative">
                  <Icon name="Lock" size={28} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="••••"
                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-2xl transition-all"
                  />
                </div>
              </div>

              {displayError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive text-xl animate-shake">
                  <Icon name="AlertCircle" size={28} />
                  {displayError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-6 rounded-2xl bg-primary text-primary-foreground font-semibold text-3xl flex items-center justify-center gap-3 elevation-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2 ripple"
              >
                {loading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Проверка...
                  </>
                ) : (
                  <>
                    <Icon name="LogIn" size={30} />
                    Войти в систему
                  </>
                )}
              </button>
            </div>

            <div className="mt-8 pt-5 border-t border-border flex items-center justify-between text-xl text-muted-foreground">
              <span>v2.4.1 · Android 10+</span>
              <span className="flex items-center gap-2">
                <div className="status-dot status-online" />
                Сервер доступен
              </span>
            </div>
          </div>

          <p className="text-center text-xl text-muted-foreground mt-4">
            При проблемах со входом обратитесь к диспетчеру
          </p>
        </div>

      </div>
    </div>
  );
}
