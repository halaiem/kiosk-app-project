import { useState } from 'react';
import Icon from '@/components/ui/icon';

const MODULES = [
  { name: 'ИРИДА Core', version: '2.6.0', latest: '2.6.0', status: 'ok', desc: 'Ядро платформы', icon: 'Cpu' },
  { name: 'Dashboard SPA', version: '2.6.0', latest: '2.6.0', status: 'ok', desc: 'Веб-интерфейс дашборда', icon: 'LayoutDashboard' },
  { name: 'Kiosk App', version: '2.5.3', latest: '2.6.0', status: 'update', desc: 'Планшет водителя', icon: 'Tablet' },
  { name: 'Auth Service', version: '1.4.1', latest: '1.4.1', status: 'ok', desc: 'Авторизация и сессии', icon: 'KeyRound' },
  { name: 'Driver API', version: '1.3.0', latest: '1.3.2', status: 'update', desc: 'API управления водителями', icon: 'Users' },
  { name: 'Diagnostics API', version: '1.1.0', latest: '1.1.0', status: 'ok', desc: 'Диагностика транспорта', icon: 'Activity' },
  { name: 'Transcribe Service', version: '1.0.2', latest: '1.0.2', status: 'ok', desc: 'Голосовые сообщения (SpeechKit)', icon: 'Mic' },
  { name: 'PostgreSQL', version: '15.4', latest: '16.2', status: 'update', desc: 'База данных', icon: 'Database' },
];

const DEPLOYS = [
  { module: 'Dashboard SPA', time: '08.04.2026 14:22', commit: '1742dc0', author: 'Irida-Tools', status: 'ok' },
  { module: 'Auth Service', time: '07.04.2026 09:15', commit: 'b146315', author: 'Irida-Tools', status: 'ok' },
  { module: 'Driver API', time: '06.04.2026 17:40', commit: '258d47e', author: 'Irida-Tools', status: 'ok' },
  { module: 'Kiosk App', time: '05.04.2026 11:10', commit: '994b05b', author: 'Irida-Tools', status: 'warning' },
  { module: 'Diagnostics API', time: '03.04.2026 08:00', commit: '83fb63d', author: 'Irida-Tools', status: 'ok' },
];

export default function SoftwareSection() {
  const [activeTab, setActiveTab] = useState<'modules' | 'deploys'>('modules');
  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdate = (name: string) => {
    setUpdating(name);
    setTimeout(() => setUpdating(null), 2000);
  };

  const upToDate = MODULES.filter(m => m.status === 'ok').length;
  const needsUpdate = MODULES.filter(m => m.status === 'update').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Программное обеспечение</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Версии модулей, обновления и история развёртываний</p>
        </div>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: 'Package', label: 'Всего модулей', value: MODULES.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: 'CheckCircle', label: 'Актуальные', value: upToDate, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: 'RefreshCw', label: 'Есть обновления', value: needsUpdate, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: 'GitCommit', label: 'Последний деплой', value: '08.04.2026', color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
              <Icon name={c.icon} className={`w-5 h-5 ${c.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold text-foreground">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {([
          { key: 'modules', label: 'Модули', icon: 'Package' },
          { key: 'deploys', label: 'История деплоев', icon: 'GitCommit' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <Icon name={t.icon} className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'modules' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {MODULES.map(mod => (
              <div key={mod.name} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon name={mod.icon} className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{mod.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${mod.status === 'ok' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {mod.status === 'ok' ? 'Актуально' : 'Обновление'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{mod.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-foreground">v{mod.version}</p>
                  {mod.status === 'update' && (
                    <p className="text-xs text-amber-500">→ v{mod.latest}</p>
                  )}
                </div>
                {mod.status === 'update' && (
                  <button onClick={() => handleUpdate(mod.name)} disabled={updating === mod.name}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors font-medium shrink-0">
                    <Icon name={updating === mod.name ? 'Loader' : 'RefreshCw'} className={`w-3.5 h-3.5 ${updating === mod.name ? 'animate-spin' : ''}`} />
                    {updating === mod.name ? '...' : 'Обновить'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'deploys' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {DEPLOYS.map((d, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{d.module}</p>
                  <p className="text-xs text-muted-foreground">{d.author}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs text-muted-foreground">{d.time}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60">{d.commit}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${d.status === 'ok' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {d.status === 'ok' ? 'Успешно' : 'Предупреждение'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
