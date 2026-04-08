import { useState } from 'react';
import Icon from '@/components/ui/icon';

const EQUIPMENT = [
  { id: 'eq-01', name: 'Планшет Lenovo Tab M10', type: 'tablet', count: 48, active: 42, location: 'Автопарк №1', status: 'ok', model: 'Lenovo TB-X605F', os: 'Android 11', lastSync: '08.04.2026 14:10' },
  { id: 'eq-02', name: 'Планшет Samsung Tab A8', type: 'tablet', count: 15, active: 14, location: 'Автопарк №2', status: 'ok', model: 'Samsung SM-X200', os: 'Android 13', lastSync: '08.04.2026 13:55' },
  { id: 'eq-03', name: 'GPS-трекер Teltonika', type: 'gps', count: 63, active: 58, location: 'Все автопарки', status: 'warning', model: 'FMB920', os: 'Firmware 03.27', lastSync: '08.04.2026 14:05' },
  { id: 'eq-04', name: 'Роутер 4G MikroTik', type: 'network', count: 12, active: 12, location: 'Диспетчерские', status: 'ok', model: 'hAP ax²', os: 'RouterOS 7.13', lastSync: '08.04.2026 12:00' },
  { id: 'eq-05', name: 'Валидатор ISBC', type: 'validator', count: 124, active: 119, location: 'Транспорт', status: 'ok', model: 'ISBC R-100', os: 'FW 2.1.4', lastSync: '08.04.2026 11:30' },
  { id: 'eq-06', name: 'Монитор диспетчера', type: 'monitor', count: 8, active: 8, location: 'ЦДС', status: 'ok', model: 'Dell P2422H', os: '—', lastSync: '—' },
];

const TYPE_ICONS: Record<string, string> = {
  tablet: 'Tablet', gps: 'MapPin', network: 'Wifi', validator: 'CreditCard', monitor: 'Monitor',
};
const TYPE_LABELS: Record<string, string> = {
  tablet: 'Планшет', gps: 'GPS-трекер', network: 'Сеть', validator: 'Валидатор', monitor: 'Монитор',
};

export default function EquipmentSection() {
  const [filter, setFilter] = useState<string>('all');

  const types = ['all', ...Array.from(new Set(EQUIPMENT.map(e => e.type)))];
  const filtered = filter === 'all' ? EQUIPMENT : EQUIPMENT.filter(e => e.type === filter);
  const total = EQUIPMENT.reduce((s, e) => s + e.count, 0);
  const active = EQUIPMENT.reduce((s, e) => s + e.active, 0);
  const warnings = EQUIPMENT.filter(e => e.status === 'warning').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Оборудование</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Учёт устройств, статус и синхронизация</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: 'Cpu', label: 'Всего устройств', value: total, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: 'CheckCircle', label: 'Активных', value: active, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: 'AlertTriangle', label: 'С предупреждением', value: warnings, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: 'Tag', label: 'Типов устройств', value: types.length - 1, color: 'text-purple-500', bg: 'bg-purple-500/10' },
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

      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {t !== 'all' && <Icon name={TYPE_ICONS[t] || 'Box'} className="w-3.5 h-3.5" />}
            {t === 'all' ? 'Все' : TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.map(eq => (
            <div key={eq.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Icon name={TYPE_ICONS[eq.type] || 'Box'} className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{eq.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${eq.status === 'ok' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {eq.status === 'ok' ? 'Норма' : 'Внимание'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{eq.model} · {eq.location}</p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-sm font-bold text-foreground">{eq.active}<span className="text-xs text-muted-foreground font-normal">/{eq.count}</span></p>
                <p className="text-[10px] text-muted-foreground">активных</p>
              </div>
              <div className="text-right shrink-0 hidden lg:block">
                <p className="text-xs text-muted-foreground">Синхр.</p>
                <p className="text-xs text-foreground">{eq.lastSync}</p>
              </div>
              <div className="w-16 shrink-0">
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${eq.active / eq.count > 0.9 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${(eq.active / eq.count) * 100}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{Math.round((eq.active / eq.count) * 100)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
