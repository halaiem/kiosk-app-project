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
  type BrandFont,
} from "@/context/AppSettingsContext";

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
  >
    <div
      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
        value ? "translate-x-[22px]" : "translate-x-0.5"
      }`}
    />
  </button>
);

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

const GOOGLE_FONTS: BrandFont[] = [
  { name: 'Golos Text (по умолчанию)', family: 'Golos Text', url: 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&display=swap' },
  { name: 'Roboto', family: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { name: 'Inter', family: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'Montserrat', family: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { name: 'Nunito', family: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { name: 'PT Sans', family: 'PT Sans', url: 'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap' },
];

function FontSettingsBlock() {
  const { settings, updateSettings } = useAppSettings();
  const fontFileRef = useRef<HTMLInputElement>(null);

  const handleFontFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const family = file.name.replace(/\.[^.]+$/, '').replace(/\s+/g, '');
      updateSettings({ brandFont: { name: file.name.replace(/\.[^.]+$/, ''), family, url: reader.result as string } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden col-span-2">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Type" className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-semibold text-foreground">Шрифт интерфейса</h3>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Выбрать из встроенных</p>
          <div className="grid grid-cols-3 gap-2">
            {GOOGLE_FONTS.map((f) => (
              <button
                key={f.family}
                onClick={() => updateSettings({ brandFont: f })}
                className={`px-3 py-2 rounded-xl border text-xs text-left transition-all ${
                  settings.brandFont?.family === f.family
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
                style={{ fontFamily: f.family }}
              >
                {f.name}
              </button>
            ))}
            <button
              onClick={() => updateSettings({ brandFont: null })}
              className={`px-3 py-2 rounded-xl border text-xs text-left transition-all ${
                !settings.brandFont ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              Системный (по умолчанию)
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">Загрузить свой шрифт <span className="opacity-60">(.ttf, .otf, .woff, .woff2)</span></p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fontFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              <Icon name="Upload" className="w-3.5 h-3.5" />
              Загрузить файл
            </button>
            {settings.brandFont?.url?.startsWith('data:') && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <Icon name="Check" className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-600 font-medium">{settings.brandFont.name}</span>
                <button onClick={() => updateSettings({ brandFont: null })} className="text-muted-foreground hover:text-foreground ml-1">
                  <Icon name="X" className="w-3 h-3" />
                </button>
              </div>
            )}
            <input ref={fontFileRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontFile} />
          </div>
        </div>

        {settings.brandFont && (
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Превью — {settings.brandFont.name}</p>
            <p className="text-xl font-bold text-foreground leading-tight" style={{ fontFamily: settings.brandFont.family }}>
              Диспетчерская система
            </p>
            <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: settings.brandFont.family }}>
              Transport Dashboard · Привет! Hello! 1234567890
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InterfaceSettingsView() {
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
                {(Object.keys(TRANSPORT_LABELS) as TransportType[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => updateSettings({ transportType: key })}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      settings.transportType === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {TRANSPORT_LABELS[key]}
                  </button>
                ))}
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

export function SettingsView() {
  const [settingsTab, setSettingsTab] = useState<'system' | 'interface'>('interface');
  const [appName, setAppName] = useState("ТрамДиспетч");
  const [editSystem, setEditSystem] = useState(false);
  const [minPassword, setMinPassword] = useState(8);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [twoFactor, setTwoFactor] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [alertSound, setAlertSound] = useState(true);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { key: 'interface', label: 'Настройки интерфейса', icon: 'Palette' },
          { key: 'system', label: 'Система и безопасность', icon: 'Shield' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setSettingsTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              settingsTab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {settingsTab === 'interface' && <InterfaceSettingsView />}

      {settingsTab === 'system' && (
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
      )}
    </div>
  );
}
