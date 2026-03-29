import { useState } from "react";
import Icon from "@/components/ui/icon";

interface DashboardLoginProps {
  onLogin: (id: string, password: string) => boolean;
  error: string;
}

export default function DashboardLogin({ onLogin, error }: DashboardLoginProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(id, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#152d52" }}>
      <div className="w-full max-w-sm mx-4">
        <div className="bg-card text-card-foreground rounded-2xl elevation-3 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Icon name="TramFront" className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              ТрамДиспетч
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Панель управления</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">ID</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Введите ID"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
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
              className="w-full h-10 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Войти
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
    </div>
  );
}
