import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import {
  useAppSettings,
  CITY_LABELS,
  TRANSPORT_LABELS,
  FEATURE_LABELS,
  type TransportType,
  type FeatureFlags,
  type BrandColors,
} from "@/context/AppSettingsContext";
import { Toggle } from "./Toggle";
import { FontSettingsBlock } from "./FontSettingsBlock";

function FeaturesBlock({
  title,
  features,
  onChange,
}: {
  title: string;
  features: FeatureFlags;
  onChange: (patch: Partial<FeatureFlags>) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Sliders" className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {(Object.keys(features) as (keyof FeatureFlags)[]).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">{FEATURE_LABELS[key]}</label>
            <Toggle value={features[key]} onChange={(v) => onChange({ [key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InterfaceSettingsView() {
  const { settings, updateSettings, updateFeatures, resetSettings } = useAppSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSettings({ carrierLogo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-foreground">Настройки интерфейса</h2>
        <div className="flex gap-2">
          <button
            onClick={resetSettings}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Сбросить
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Icon name={saved ? "Check" : "Save"} className="w-3.5 h-3.5" />
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Логотип и перевозчик */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Building2" className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">Перевозчик</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Название перевозчика</label>
              <input
                type="text"
                value={settings.carrierName}
                onChange={(e) => updateSettings({ carrierName: e.target.value })}
                placeholder="Например: ГУП «Горэлектротранс»"
                className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Логотип</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/40 overflow-hidden shrink-0">
                  {settings.carrierLogo ? (
                    <img src={settings.carrierLogo} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <Icon name="ImagePlus" className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Загрузить
                  </button>
                  {settings.carrierLogo && (
                    <button
                      onClick={() => updateSettings({ carrierLogo: null })}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Описание</label>
              <textarea
                value={settings.carrierDescription}
                onChange={(e) => updateSettings({ carrierDescription: e.target.value })}
                placeholder="Краткое описание компании-перевозчика"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </div>

        {/* Город и тип транспорта */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="MapPin" className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">Город и транспорт</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Город</label>
              <select
                value={settings.city}
                onChange={(e) => updateSettings({ city: e.target.value as typeof settings.city })}
                className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.keys(CITY_LABELS) as (keyof typeof CITY_LABELS)[]).map((key) => (
                  <option key={key} value={key}>{CITY_LABELS[key]}</option>
                ))}
              </select>
            </div>
            {settings.city === 'custom' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Название города</label>
                <input
                  type="text"
                  value={settings.customCityName}
                  onChange={(e) => updateSettings({ customCityName: e.target.value })}
                  placeholder="Введите название города"
                  className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Вид транспорта</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSettings({ transportTypes: Object.keys(TRANSPORT_LABELS) as TransportType[] })}
                  className={`col-span-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    settings.transportTypes?.length === Object.keys(TRANSPORT_LABELS).length
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  Все виды транспорта
                </button>
                {(Object.keys(TRANSPORT_LABELS) as TransportType[]).map((key) => {
                  const selected = settings.transportTypes?.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const current = settings.transportTypes ?? [];
                        const next = selected
                          ? current.filter((t) => t !== key)
                          : [...current, key];
                        updateSettings({ transportTypes: next.length ? next : [key] });
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {TRANSPORT_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Цвета бренда */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Palette" className="w-4 h-4 text-pink-500" />
            <h3 className="text-sm font-semibold text-foreground">Цвета бренда</h3>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {(
                [
                  { key: 'sidebarBg' as keyof BrandColors, label: 'Фон сайдбара' },
                  { key: 'headerBg' as keyof BrandColors, label: 'Фон шапки' },
                  { key: 'primaryBtn' as keyof BrandColors, label: 'Основная кнопка' },
                  { key: 'textColor' as keyof BrandColors, label: 'Цвет текста (основной)' },
                  { key: 'sidebarTextColor' as keyof BrandColors, label: 'Цвет текста сайдбара' },
                ] as { key: keyof BrandColors; label: string }[]
              ).map(({ key, label }) => {
                const colors = settings.brandColors ?? { sidebarBg: '#ec660c', headerBg: '#ec660c', primaryBtn: '#ec660c', textColor: '#141414', sidebarTextColor: '#141414' };
                return (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg border border-border"
                        style={{ background: colors[key] }}
                      />
                      <input
                        type="text"
                        value={colors[key]}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateSettings({ brandColors: { ...colors, [key]: val } });
                        }}
                        className="w-20 h-7 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        maxLength={7}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => updateSettings({ brandColors: { sidebarBg: '#ec660c', headerBg: '#ec660c', primaryBtn: '#ec660c', textColor: '#141414', sidebarTextColor: '#141414' } })}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Сбросить к значениям по умолчанию
            </button>
          </div>
        </div>

        {/* Шрифт */}
        <FontSettingsBlock />

        {/* Превью логотипа */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Eye" className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-foreground">Превью</h3>
          </div>
          <div className="p-5 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
              {settings.carrierLogo ? (
                <img src={settings.carrierLogo} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <Icon name={settings.transportType === 'tram' ? 'TramFront' : 'Bus'} className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{settings.carrierName || 'Название перевозчика'}</p>
              <p className="text-xs text-muted-foreground">
                {settings.city === 'custom' ? settings.customCityName : CITY_LABELS[settings.city]} · {TRANSPORT_LABELS[settings.transportType]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Функции по ролям */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="ToggleLeft" className="w-4 h-4 text-primary" />
          Функции для каждого экрана
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <FeaturesBlock
            title="Планшет водителя"
            features={settings.featuresTablet}
            onChange={(patch) => updateFeatures('tablet', patch)}
          />
          <FeaturesBlock
            title="Диспетчер"
            features={settings.featuresDispatcher}
            onChange={(patch) => updateFeatures('dispatcher', patch)}
          />
          <FeaturesBlock
            title="Технолог"
            features={settings.featuresTechnician}
            onChange={(patch) => updateFeatures('technician', patch)}
          />
        </div>
      </div>
    </div>
  );
}