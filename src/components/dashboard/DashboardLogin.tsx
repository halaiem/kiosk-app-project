import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (id === IRIDA_TOOLS_LOGIN && password === IRIDA_TOOLS_PASSWORD) {
      setShowSecretPopup(true);
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
    setShowSecretPopup(false);
    onIridaToolsLogin();
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
                { id: "D001", pass: "disp123", role: "Диспетчер" },
                { id: "T001", pass: "tech123", role: "Техник" },
                { id: "A001", pass: "admin123", role: "Админ" },
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
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl p-8 w-full max-w-xs mx-4 flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsl(24 88% 49%)' }}>
              <Icon name="KeyRound" className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Секретный код для входа</p>
              <p className="text-4xl font-black tracking-widest text-foreground">{IRIDA_TOOLS_SECRET_CODE}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">Запомните код — он потребуется для открытия Dashboard</p>
            <button
              onClick={handleSecretConfirm}
              className="w-full h-10 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Войти в Irida-Tools
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
