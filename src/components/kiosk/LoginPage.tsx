import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface Props {
  onLogin: (employeeId: string, pin: string) => void;
  error?: string | null;
  loading?: boolean;
}

export default function LoginPage({ onLogin, error, loading }: Props) {
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');

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

      <div className="animate-scale-in relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary elevation-3 mb-4">
            <img src="/Znak.svg" alt="ИРИДА" className="w-12 h-12 text-primary-foreground" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">ИРИДА</h1>
          <p className="text-muted-foreground text-sm mt-1">Мобильное рабочее место</p>
        </div>

        <div className="kiosk-surface rounded-2xl elevation-3 p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Icon name="LogIn" size={20} className="text-primary" />
            Авторизация водителя
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Табельный номер</label>
              <div className="relative">
                <Icon name="IdCard" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Например: 0001"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-base transition-all"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">PIN-код</label>
              <div className="relative">
                <Icon name="Lock" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-base transition-all"
                />
              </div>
            </div>

            {displayError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-shake">
                <Icon name="AlertCircle" size={16} />
                {displayError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 elevation-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2 ripple"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Проверка...
                </>
              ) : (
                <>
                  <Icon name="LogIn" size={20} />
                  Войти в систему
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>v2.4.1 · Android 10+</span>
            <span className="flex items-center gap-1">
              <div className="status-dot status-online" />
              Сервер доступен
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          При проблемах со входом обратитесь к диспетчеру
        </p>
      </div>
    </div>
  );
}