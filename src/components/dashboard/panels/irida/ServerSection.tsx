import { useState } from 'react';
import Icon from '@/components/ui/icon';

const SERVERS = [
  { id: 'srv-01', name: 'ИРИДА-PROD-01', role: 'Основной', status: 'online', cpu: 34, memory: 61, disk: 42, uptime: '47д 3ч', region: 'ru-central1-a', ip: '10.0.1.10', os: 'Ubuntu 22.04 LTS' },
  { id: 'srv-02', name: 'ИРИДА-PROD-02', role: 'Резервный', status: 'online', cpu: 12, memory: 38, disk: 38, uptime: '47д 3ч', region: 'ru-central1-b', ip: '10.0.1.11', os: 'Ubuntu 22.04 LTS' },
  { id: 'srv-db', name: 'ИРИДА-DB-01', role: 'База данных', status: 'online', cpu: 22, memory: 74, disk: 67, uptime: '47д 3ч', region: 'ru-central1-a', ip: '10.0.1.20', os: 'Ubuntu 22.04 LTS' },
  { id: 'srv-fn', name: 'ИРИДА-FN-01', role: 'Cloud Functions', status: 'online', cpu: 8, memory: 29, disk: 18, uptime: '47д 3ч', region: 'ru-central1-a', ip: 'serverless', os: 'Managed Runtime' },
  { id: 'srv-cdn', name: 'CDN Edge', role: 'Статика / CDN', status: 'warning', cpu: 51, memory: 82, disk: 55, uptime: '12д 7ч', region: 'edge', ip: 'cdn.poehali.dev', os: 'Edge Runtime' },
];

function Bar({ value, warn }: { value: number; warn?: boolean }) {
  const color = warn || value > 80 ? 'bg-red-500' : value > 60 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-mono w-8 text-right ${value > 80 ? 'text-red-500' : value > 60 ? 'text-amber-500' : 'text-muted-foreground'}`}>{value}%</span>
    </div>
  );
}

export default function ServerSection() {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedServer = SERVERS.find(s => s.id === selected);
  const online = SERVERS.filter(s => s.status === 'online').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Серверы</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Мониторинг инфраструктуры и ресурсов</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: 'Server', label: 'Всего серверов', value: SERVERS.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: 'CheckCircle', label: 'Онлайн', value: online, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: 'AlertTriangle', label: 'Предупреждений', value: SERVERS.length - online, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: 'Clock', label: 'Макс. аптайм', value: '47д 3ч', color: 'text-purple-500', bg: 'bg-purple-500/10' },
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

      <div className={`grid gap-4 ${selected ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {SERVERS.map(srv => (
              <button key={srv.id} onClick={() => setSelected(selected === srv.id ? null : srv.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left ${selected === srv.id ? 'bg-primary/5' : ''}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${srv.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{srv.name}</p>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{srv.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{srv.region} · {srv.ip}</p>
                </div>
                <div className="w-32 space-y-1 shrink-0">
                  <Bar value={srv.cpu} />
                  <Bar value={srv.memory} />
                  <Bar value={srv.disk} />
                </div>
                <Icon name="ChevronRight" className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${selected === srv.id ? 'rotate-90' : ''}`} />
              </button>
            ))}
          </div>
        </div>

        {selectedServer && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="Server" className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">{selectedServer.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Роль', value: selectedServer.role, icon: 'Tag' },
                { label: 'ОС', value: selectedServer.os, icon: 'HardDrive' },
                { label: 'IP / Хост', value: selectedServer.ip, icon: 'Globe' },
                { label: 'Регион', value: selectedServer.region, icon: 'MapPin' },
                { label: 'Аптайм', value: selectedServer.uptime, icon: 'Clock' },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon name={p.icon} className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                    <p className="text-sm font-medium text-foreground">{p.value}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ресурсы</p>
                {[
                  { label: 'CPU', value: selectedServer.cpu },
                  { label: 'RAM', value: selectedServer.memory },
                  { label: 'Диск', value: selectedServer.disk },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{r.label}</span><span>{r.value}%</span>
                    </div>
                    <Bar value={r.value} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
