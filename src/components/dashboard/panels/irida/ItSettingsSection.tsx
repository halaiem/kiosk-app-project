import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAppSettings, FEATURE_LABELS, type FeatureFlags } from '@/context/AppSettingsContext';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function FeaturesCard({ title, icon, features, onChange }: {
  title: string; icon: string; features: FeatureFlags;
  onChange: (patch: Partial<FeatureFlags>) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={icon} className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {Object.values(features).filter(Boolean).length}/{Object.values(features).length} активно
        </span>
      </div>
      <div className="p-4 space-y-3">
        {(Object.entries(features) as [keyof FeatureFlags, boolean][]).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{FEATURE_LABELS[key]}</p>
            </div>
            <Toggle value={val} onChange={v => onChange({ [key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLES = [
  { key: 'admin', label: 'Администратор', icon: 'ShieldCheck', color: 'text-red-500', bg: 'bg-red-500/10', desc: 'Полный доступ ко всем функциям системы' },
  { key: 'dispatcher', label: 'Диспетчер', icon: 'Radio', color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Мониторинг транспорта, сообщения, уведомления' },
  { key: 'technician', label: 'Техник', icon: 'Wrench', color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Управление транспортом, водителями, нарядами' },
  { key: 'irida_tools', label: 'Irida-Tools', icon: 'KeyRound', color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Настройка и администрирование всей системы' },
];

const SYSTEM_PARAMS = [
  { label: 'Версия ИРИДА', value: 'v2.6.0', icon: 'Tag' },
  { label: 'Последнее обновление', value: '08.04.2026', icon: 'Calendar' },
  { label: 'Лицензия', value: 'Enterprise', icon: 'BadgeCheck' },
  { label: 'База данных', value: 'PostgreSQL 15', icon: 'Database' },
  { label: 'Среда', value: 'Production', icon: 'Server' },
  { label: 'Регион развёртывания', value: 'ru-central1', icon: 'Globe' },
];

export default function ItSettingsSection() {
  const { settings, updateFeatures, resetSettings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<'roles' | 'features' | 'system'>('features');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleReset = () => {
    resetSettings();
    setResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Настройки системы</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Роли, функциональность ролей и системные параметры</p>
        </div>
        <div className="flex gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <Icon name="CheckCircle" className="w-4 h-4" /> Сброшено
            </div>
          )}
          <button
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 transition-colors font-medium"
          >
            <Icon name="RotateCcw" className="w-4 h-4" />
            Сбросить настройки
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'features', label: 'Функции по ролям', icon: 'Sliders' },
          { key: 'roles', label: 'Роли', icon: 'Users' },
          { key: 'system', label: 'Система', icon: 'Server' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <Icon name={t.icon} className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'features' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FeaturesCard title="Планшет водителя" icon="Tablet" features={settings.featuresTablet}
            onChange={p => updateFeatures('tablet', p)} />
          <FeaturesCard title="Диспетчер" icon="Radio" features={settings.featuresDispatcher}
            onChange={p => updateFeatures('dispatcher', p)} />
          <FeaturesCard title="Техник" icon="Wrench" features={settings.featuresTechnician}
            onChange={p => updateFeatures('technician', p)} />
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-2 gap-4">
          {ROLES.map(role => (
            <div key={role.key} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${role.bg}`}>
                <Icon name={role.icon} className={`w-6 h-6 ${role.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{role.label}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">Активна</span>
                </div>
                <p className="text-xs text-muted-foreground">{role.desc}</p>
                <div className="mt-3 flex gap-1.5">
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                    {role.key === 'admin' ? 'Полный доступ' :
                     role.key === 'dispatcher' ? '5 разделов' :
                     role.key === 'technician' ? '7 разделов' : '10 разделов'}
                  </span>
                  {role.key === 'irida_tools' && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600">Двухфакторная защита</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'system' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="Info" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Параметры системы</h3>
            </div>
            <div className="divide-y divide-border">
              {SYSTEM_PARAMS.map(p => (
                <div key={p.label} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name={p.icon} className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{p.label}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="AlertTriangle" className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Сброс настроек</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">Сброс вернёт все настройки интерфейса к заводским значениям: цвета, шрифт, перевозчик, город, транспорт.</p>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                <Icon name="AlertTriangle" className="w-3.5 h-3.5 inline mr-1" />
                Данные в базе данных не затрагиваются. Сбрасываются только настройки интерфейса.
              </div>
              {!resetConfirm ? (
                <button onClick={() => setResetConfirm(true)}
                  className="w-full h-10 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors">
                  Сбросить все настройки
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Вы уверены?</p>
                  <div className="flex gap-2">
                    <button onClick={handleReset} className="flex-1 h-9 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors">Да, сбросить</button>
                    <button onClick={() => setResetConfirm(false)} className="flex-1 h-9 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">Отмена</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
