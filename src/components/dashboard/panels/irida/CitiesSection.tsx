import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAppSettings, CITY_LABELS, TRANSPORT_LABELS, TRANSPORT_ICONS, type CityOption, type TransportType } from '@/context/AppSettingsContext';

const CITY_LIST: { key: CityOption; label: string; region: string; population: string }[] = [
  { key: 'moscow',       label: 'Москва',          region: 'Москва',                population: '12.6 млн' },
  { key: 'spb',          label: 'Санкт-Петербург', region: 'Ленинградская обл.',     population: '5.6 млн' },
  { key: 'ekaterinburg', label: 'Екатеринбург',    region: 'Свердловская обл.',      population: '1.5 млн' },
  { key: 'novosibirsk',  label: 'Новосибирск',     region: 'Новосибирская обл.',     population: '1.6 млн' },
  { key: 'kazan',        label: 'Казань',           region: 'Республика Татарстан',  population: '1.3 млн' },
  { key: 'custom',       label: 'Другой город',    region: 'Пользовательский',       population: '—' },
];

export default function CitiesSection() {
  const { settings, updateSettings } = useAppSettings();
  const [editCustom, setEditCustom] = useState(false);
  const [customName, setCustomName] = useState(settings.customCityName);
  const [saved, setSaved] = useState(false);

  const activeCity = settings.city;

  const handleSelectCity = (key: CityOption) => {
    updateSettings({ city: key });
    if (key === 'custom') setEditCustom(true);
  };

  const handleSaveCustom = () => {
    updateSettings({ customCityName: customName });
    setEditCustom(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleTransport = (type: TransportType) => {
    const cur = settings.transportTypes || [];
    const next = cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type];
    if (next.length > 0) updateSettings({ transportTypes: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Города</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Выберите город и виды транспорта для системы ИРИДА</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg">
            <Icon name="CheckCircle" className="w-4 h-4" />
            Сохранено
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Город */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="MapPin" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Выбор города</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Активен: {activeCity === 'custom' ? (settings.customCityName || 'Не задан') : CITY_LABELS[activeCity]}
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {CITY_LIST.map(city => (
              <button
                key={city.key}
                onClick={() => handleSelectCity(city.key)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  activeCity === city.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${activeCity === city.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon name={city.key === 'custom' ? 'Plus' : 'Building2'} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${activeCity === city.key ? 'text-primary' : 'text-foreground'}`}>{city.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{city.region}</p>
                  {city.population !== '—' && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{city.population}</p>
                  )}
                </div>
                {activeCity === city.key && (
                  <Icon name="CheckCircle" className="w-4 h-4 text-primary ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
          {activeCity === 'custom' && (
            <div className="px-4 pb-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <label className="text-xs text-muted-foreground font-medium">Название города</label>
                <div className="flex gap-2">
                  <input
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Например: Нижний Новгород"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleSaveCustom}
                    disabled={!customName.trim()}
                    className="h-9 px-4 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Транспорт */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Bus" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Вид транспорта</h3>
          </div>
          <div className="p-4 space-y-2">
            {(Object.keys(TRANSPORT_LABELS) as TransportType[]).map(type => {
              const isActive = (settings.transportTypes || []).includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleTransport(type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon name={TRANSPORT_ICONS[type]} className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{TRANSPORT_LABELS[type]}</span>
                  {isActive && <Icon name="Check" className="w-4 h-4 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>
          <div className="px-4 pb-4">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                Активных видов: <span className="font-semibold text-foreground">{(settings.transportTypes || []).length}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Влияет на фильтры и отображение транспорта во всех ролях</p>
            </div>
          </div>
        </div>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: 'MapPin', label: 'Текущий город', value: activeCity === 'custom' ? (settings.customCityName || 'Не задан') : CITY_LABELS[activeCity], color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: 'Bus', label: 'Видов транспорта', value: `${(settings.transportTypes || []).length} из ${Object.keys(TRANSPORT_LABELS).length}`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: 'Globe', label: 'Регион', value: CITY_LIST.find(c => c.key === activeCity)?.region || '—', color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
              <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 truncate max-w-[140px]">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
