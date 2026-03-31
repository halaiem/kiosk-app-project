import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Toggle } from "./Toggle";

export function SystemSettingsView() {
  const [appName, setAppName] = useState("ИРИДА");
  const [editSystem, setEditSystem] = useState(false);
  const [minPassword, setMinPassword] = useState(8);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [twoFactor, setTwoFactor] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [alertSound, setAlertSound] = useState(true);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Система</h3>
          </div>
          <button
            onClick={() => setEditSystem(!editSystem)}
            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <Icon name={editSystem ? "Check" : "Pencil"} className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Название приложения</label>
            {editSystem ? (
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <p className="text-sm font-medium text-foreground">{appName}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Версия</label>
            <p className="text-sm font-medium text-foreground">2.4.1</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Часовой пояс</label>
            <span className="text-sm font-medium text-foreground">UTC+3 (Москва)</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Язык</label>
            <span className="text-sm font-medium text-foreground">Русский</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Icon name="Shield" className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-foreground">Безопасность</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Мин. длина пароля</label>
            <input type="number" value={minPassword} onChange={(e) => setMinPassword(Number(e.target.value))} min={4} max={32}
              className="h-8 w-16 px-2 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Таймаут сессии (мин)</label>
            <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(Number(e.target.value))} min={5} max={480}
              className="h-8 w-16 px-2 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Двухфакторная аутентификация</label>
            <Toggle value={twoFactor} onChange={setTwoFactor} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Макс. попыток входа</label>
            <input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} min={1} max={20}
              className="h-8 w-16 px-2 rounded-lg border border-border bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Icon name="Bell" className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-foreground">Уведомления</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Email-уведомления</label>
            <Toggle value={emailNotif} onChange={setEmailNotif} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">SMS-алерты</label>
            <Toggle value={smsAlerts} onChange={setSmsAlerts} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Звук уведомлений</label>
            <Toggle value={alertSound} onChange={setAlertSound} />
          </div>
        </div>
      </div>
    </div>
  );
}