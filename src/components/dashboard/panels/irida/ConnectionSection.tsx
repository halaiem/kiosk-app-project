import { useState } from 'react';
import Icon from '@/components/ui/icon';

const ENDPOINTS = [
  { name: 'Dashboard Auth', url: 'https://functions.poehali.dev/eed2e524', method: 'POST', status: 'online', latency: 42, desc: 'Авторизация пользователей' },
  { name: 'Dashboard Data', url: 'https://functions.poehali.dev/9b521dba', method: 'GET', status: 'online', latency: 67, desc: 'Данные дашборда' },
  { name: 'Driver API', url: 'https://functions.poehali.dev/1357aa6d', method: 'GET/POST', status: 'online', latency: 55, desc: 'Управление водителями' },
  { name: 'Driver Messages', url: 'https://functions.poehali.dev/29b782fe', method: 'WS/POST', status: 'online', latency: 38, desc: 'Мессенджер водителей' },
  { name: 'Vehicle Diagnostics', url: 'https://functions.poehali.dev/4ed5fdd8', method: 'GET', status: 'online', latency: 91, desc: 'Диагностика транспорта' },
  { name: 'Irida Files', url: 'https://functions.poehali.dev/9a4d89c3', method: 'GET/POST', status: 'online', latency: 33, desc: 'Файлы терминала' },
  { name: 'Irida Database', url: 'https://functions.poehali.dev/22cfaab8', method: 'GET/POST', status: 'online', latency: 29, desc: 'Менеджер базы данных' },
  { name: 'Transcribe Service', url: 'https://functions.poehali.dev/be33a4e1', method: 'POST', status: 'warning', latency: 1240, desc: 'Транскрибация голоса' },
];

const NET_PARAMS = [
  { label: 'Протокол', value: 'HTTPS / TLS 1.3' },
  { label: 'CDN', value: 'cdn.poehali.dev' },
  { label: 'Регион', value: 'ru-central1 (Москва)' },
  { label: 'Таймаут запросов', value: '30 сек' },
  { label: 'CORS', value: 'Включён (*)' },
  { label: 'Auth header', value: 'X-Authorization' },
];

export default function ConnectionSection() {
  const [pinging, setPinging] = useState<string | null>(null);
  const [pinged, setPinged] = useState<Set<string>>(new Set());

  const handlePing = (name: string) => {
    setPinging(name);
    setTimeout(() => {
      setPinging(null);
      setPinged(prev => new Set([...prev, name]));
      setTimeout(() => setPinged(prev => { const n = new Set(prev); n.delete(name); return n; }), 2000);
    }, 800);
  };

  const online = ENDPOINTS.filter(e => e.status === 'online').length;
  const avgLatency = Math.round(ENDPOINTS.reduce((s, e) => s + e.latency, 0) / ENDPOINTS.length);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Подключения</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Статус API-эндпоинтов и сетевые параметры</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: 'Wifi', label: 'API-эндпоинтов', value: ENDPOINTS.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: 'CheckCircle', label: 'Онлайн', value: online, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: 'AlertTriangle', label: 'С предупреждением', value: ENDPOINTS.length - online, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: 'Timer', label: 'Средняя задержка', value: `${avgLatency} мс`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
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

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Globe" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">API-эндпоинты</h3>
          </div>
          <div className="divide-y divide-border">
            {ENDPOINTS.map(ep => (
              <div key={ep.name} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ep.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'} ${ep.status === 'online' ? 'animate-pulse' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ep.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{ep.desc}</p>
                </div>
                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">{ep.method}</span>
                <span className={`text-xs font-mono shrink-0 ${ep.latency > 200 ? 'text-amber-500' : 'text-emerald-500'}`}>{ep.latency} мс</span>
                <button onClick={() => handlePing(ep.name)} disabled={pinging === ep.name}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-primary/10 hover:text-primary transition-colors shrink-0">
                  <Icon name={pinging === ep.name ? 'Loader' : pinged.has(ep.name) ? 'Check' : 'Zap'}
                    className={`w-3.5 h-3.5 ${pinging === ep.name ? 'animate-spin text-primary' : pinged.has(ep.name) ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Settings" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Сетевые параметры</h3>
          </div>
          <div className="divide-y divide-border">
            {NET_PARAMS.map(p => (
              <div key={p.label} className="px-5 py-3">
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{p.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
