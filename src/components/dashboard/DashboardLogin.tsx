import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const IRIDA_TOOLS_LOGIN = 'tp-tds';
const IRIDA_TOOLS_PASSWORD = 'Irida2026';
const IRIDA_TOOLS_SECRET_CODE = '16022017';

interface DashboardLoginProps {
  onLogin: (id: string, password: string) => Promise<boolean>;
  onIridaToolsLogin: () => void;
  error: string;
}

export default function DashboardLogin({ onLogin, onIridaToolsLogin, error }: DashboardLoginProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSecretPopup, setShowSecretPopup] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [secretError, setSecretError] = useState(false);
  const [secretShake, setSecretShake] = useState(false);
  const [secretAttempts, setSecretAttempts] = useState(0);
  const [secretBlocked, setSecretBlocked] = useState(false);
  const [blockCountdown, setBlockCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_ATTEMPTS = 3;
  const BLOCK_SECONDS = 30;

  useEffect(() => {
    if (secretBlocked) {
      setBlockCountdown(BLOCK_SECONDS);
      countdownRef.current = setInterval(() => {
        setBlockCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setSecretBlocked(false);
            setSecretAttempts(0);
            setSecretError(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [secretBlocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (id === IRIDA_TOOLS_LOGIN && password === IRIDA_TOOLS_PASSWORD) {
      setShowSecretPopup(true);
      setSecretInput('');
      setSecretError(false);
      setSecretAttempts(0);
      setSecretBlocked(false);
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(id, password);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSecretConfirm = () => {
    if (secretBlocked) return;
    if (secretInput === IRIDA_TOOLS_SECRET_CODE) {
      sessionStorage.setItem('irida_tools_auth', '1');
      setShowSecretPopup(false);
      setSecretInput('');
      setSecretError(false);
      setSecretAttempts(0);
      onIridaToolsLogin();
    } else {
      const next = secretAttempts + 1;
      setSecretAttempts(next);
      setSecretError(true);
      setSecretShake(true);
      setSecretInput('');
      setTimeout(() => setSecretShake(false), 500);
      if (next >= MAX_ATTEMPTS) {
        setSecretBlocked(true);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#152d52" }}>
      <div className="w-full max-w-sm mx-4">
        <div className="bg-card text-card-foreground rounded-2xl elevation-3 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 overflow-hidden"
              style={{ backgroundColor: 'hsl(24 88% 49%)' }}>
              <img src="https://cdn.poehali.dev/files/99eade92-26ae-4d2a-87f8-343f497fc065.png" alt="ИРИДА" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              ИРИДА
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Панель управления</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Логин</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Введите логин"
                disabled={submitting}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                disabled={submitting}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <Icon name="AlertCircle" className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {submitting ? 'Вход...' : 'Авторизация'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-2">Демо-доступ</p>
            <div className="space-y-1">
              {[
                { id: "DSP01", pass: "disp123", role: "Диспетчер" },
                { id: "TCH01", pass: "tech123", role: "Технолог" },
                { id: "ADM01", pass: "admin123", role: "Админ" },
                { id: "PRS01", pass: "prs123", role: "Механик" },
              ].map((cred) => (
                <div key={cred.id} className="flex items-center justify-between text-xs text-muted-foreground/70 px-2">
                  <span className="font-mono">{cred.id} / {cred.pass}</span>
                  <span>{cred.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showSecretPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="bg-card text-card-foreground rounded-2xl shadow-2xl p-8 w-full max-w-xs mx-4 flex flex-col items-center gap-5"
            style={secretShake ? { animation: 'shake 0.4s ease' } : undefined}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsl(24 88% 49%)' }}>
              <Icon name="ShieldCheck" className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground mb-1">Двойная проверка</h2>
              <p className="text-sm text-muted-foreground">Введите секретный код для входа в Irida-Tools</p>
            </div>
            {secretBlocked ? (
              <>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-destructive/10">
                  <Icon name="Ban" className="w-7 h-7 text-destructive" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-destructive">Доступ заблокирован</p>
                  <p className="text-xs text-muted-foreground mt-1">Превышено количество попыток ввода кода</p>
                </div>
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Повторная попытка через</span>
                    <span className="font-bold text-destructive tabular-nums">{blockCountdown} сек</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive rounded-full transition-all duration-1000"
                      style={{ width: `${(blockCountdown / BLOCK_SECONDS) * 100}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-full">
                  <input
                    type="password"
                    value={secretInput}
                    onChange={(e) => { setSecretInput(e.target.value); setSecretError(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSecretConfirm()}
                    placeholder="••••••••"
                    autoFocus
                    className={`w-full h-12 px-4 rounded-lg border text-center text-xl font-mono tracking-[0.4em] bg-background text-foreground focus:outline-none focus:ring-2 transition-colors ${secretError ? 'border-destructive ring-destructive/30 bg-destructive/5' : 'border-border focus:ring-ring'}`}
                  />
                  <div className="flex items-center justify-between mt-1.5 px-0.5">
                    {secretError ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <Icon name="AlertCircle" className="w-3 h-3" />
                        Неверный код
                      </p>
                    ) : <span />}
                    <p className="text-xs text-muted-foreground">
                      Попыток: <span className={`font-semibold ${secretAttempts >= 2 ? 'text-destructive' : 'text-foreground'}`}>{MAX_ATTEMPTS - secretAttempts}</span> из {MAX_ATTEMPTS}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { setShowSecretPopup(false); setSecretInput(''); setSecretError(false); setSecretAttempts(0); }}
                    className="flex-1 h-10 bg-secondary text-secondary-foreground font-medium text-sm rounded-lg hover:bg-secondary/80 transition-all border border-border"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSecretConfirm}
                    disabled={!secretInput}
                    className="flex-1 h-10 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    Подтвердить
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}