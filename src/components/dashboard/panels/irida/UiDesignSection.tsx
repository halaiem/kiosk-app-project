import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { useAppSettings, type BrandColors } from '@/context/AppSettingsContext';

const PRESET_THEMES = [
  { name: 'ИРИДА (по умолчанию)', sidebar: '#ec660c', header: '#ec660c', primary: '#ec660c', text: '#141414', sidebarText: '#141414' },
  { name: 'Синий корпоратив', sidebar: '#1e40af', header: '#1e3a8a', primary: '#3b82f6', text: '#ffffff', sidebarText: '#ffffff' },
  { name: 'Изумрудный', sidebar: '#065f46', header: '#064e3b', primary: '#10b981', text: '#ffffff', sidebarText: '#ffffff' },
  { name: 'Тёмный', sidebar: '#18181b', header: '#09090b', primary: '#6366f1', text: '#ffffff', sidebarText: '#ffffff' },
  { name: 'Фиолетовый', sidebar: '#5b21b6', header: '#4c1d95', primary: '#7c3aed', text: '#ffffff', sidebarText: '#ffffff' },
  { name: 'Красный', sidebar: '#991b1b', header: '#7f1d1d', primary: '#ef4444', text: '#ffffff', sidebarText: '#ffffff' },
];

const GOOGLE_FONTS = [
  { name: 'Golos Text', family: 'Golos Text', url: 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&display=swap' },
  { name: 'Inter', family: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'Roboto', family: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { name: 'Montserrat', family: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { name: 'Nunito', family: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { name: 'PT Sans', family: 'PT Sans', url: 'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap' },
  { name: 'Осьминог (системный)', family: 'system-ui', url: '' },
];

const THEMES = [
  { key: 'light', label: 'Светлая', icon: 'Sun' },
  { key: 'dark', label: 'Тёмная', icon: 'Moon' },
] as const;

const VEHICLE_ICONS = [
  { name: 'Трамвай', icon: 'TramFront', desc: 'Трамваи на маршрутах' },
  { name: 'Троллейбус', icon: 'Bus', desc: 'Троллейбусы и автобусы' },
  { name: 'Электробус', icon: 'Zap', desc: 'Электробусы' },
  { name: 'Маршрутка', icon: 'Truck', desc: 'Маршрутные такси' },
];

export default function UiDesignSection() {
  const { settings, updateSettings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<'theme' | 'colors' | 'fonts' | 'icons'>('theme');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const colors = settings.brandColors;

  const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
    const patch: BrandColors = {
      ...colors,
      sidebarBg: preset.sidebar,
      headerBg: preset.header,
      primaryBtn: preset.primary,
      textColor: preset.text,
      sidebarTextColor: preset.sidebarText,
    };
    updateSettings({ brandColors: patch, brandColorsDashboard: patch });
    flash();
  };

  const updateColor = (key: keyof BrandColors, value: string) => {
    const updated = { ...colors, [key]: value };
    updateSettings({ brandColors: updated, brandColorsDashboard: updated });
  };

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const applyFont = (font: typeof GOOGLE_FONTS[0]) => {
    if (!font.url) {
      updateSettings({ brandFont: null });
    } else {
      updateSettings({ brandFont: { name: font.name, family: font.family, url: font.url } });
    }
    flash();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { updateSettings({ carrierLogo: reader.result as string }); flash(); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">UI-дизайн</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Темы, цвета, шрифты и иконки транспорта</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg">
            <Icon name="CheckCircle" className="w-4 h-4" /> Применено
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'theme', label: 'Тема оформления', icon: 'Palette' },
          { key: 'colors', label: 'Цвета бренда', icon: 'Pipette' },
          { key: 'fonts', label: 'Шрифты', icon: 'Type' },
          { key: 'icons', label: 'Иконки', icon: 'Bus' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <Icon name={t.icon} className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'theme' && (
        <div className="space-y-4">
          {/* Светлая/тёмная */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="SunMoon" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Тема дашборда</h3>
            </div>
            <div className="p-4 flex gap-3">
              {THEMES.map(t => (
                <button key={t.key} onClick={() => { updateSettings({ dashboardTheme: t.key }); flash(); }}
                  className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${settings.dashboardTheme === t.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${t.key === 'dark' ? 'bg-zinc-900' : 'bg-white border border-gray-200'}`}>
                    <Icon name={t.icon} className={`w-6 h-6 ${t.key === 'dark' ? 'text-white' : 'text-amber-500'}`} />
                  </div>
                  <span className={`text-sm font-medium ${settings.dashboardTheme === t.key ? 'text-primary' : 'text-foreground'}`}>{t.label}</span>
                  {settings.dashboardTheme === t.key && <Icon name="CheckCircle" className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Пресеты */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="Sparkles" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Готовые темы</h3>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {PRESET_THEMES.map(preset => (
                <button key={preset.name} onClick={() => applyPreset(preset)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/40 transition-all text-left group">
                  <div className="flex gap-1 shrink-0">
                    <div className="w-5 h-8 rounded-l-md" style={{ backgroundColor: preset.sidebar }} />
                    <div className="w-5 h-8 rounded-r-md" style={{ backgroundColor: preset.primary }} />
                  </div>
                  <span className="text-xs text-foreground font-medium truncate group-hover:text-primary transition-colors">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Логотип перевозчика */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="ImagePlus" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Логотип перевозчика</h3>
            </div>
            <div className="p-5 flex items-center gap-5">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/40 overflow-hidden shrink-0">
                {settings.carrierLogo
                  ? <img src={settings.carrierLogo} alt="logo" className="w-full h-full object-contain" />
                  : <Icon name="Building2" className="w-8 h-8 text-muted-foreground" />}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Отображается в шапке сайдбара и экране приветствия</p>
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Загрузить
                  </button>
                  {settings.carrierLogo && (
                    <button onClick={() => { updateSettings({ carrierLogo: null }); flash(); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                      Удалить
                    </button>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'colors' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="Pipette" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Цвета интерфейса</h3>
            </div>
            <div className="p-5 space-y-4">
              {([
                { key: 'sidebarBg', label: 'Цвет сайдбара' },
                { key: 'headerBg', label: 'Цвет шапки (планшет)' },
                { key: 'primaryBtn', label: 'Основной цвет кнопок' },
                { key: 'sidebarTextColor', label: 'Цвет текста в сайдбаре' },
              ] as { key: keyof BrandColors; label: string }[]).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{colors[key]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: colors[key] }} />
                    <input type="color" value={colors[key]} onChange={e => updateColor(key, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="Eye" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Предпросмотр</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="h-10 flex items-center px-3 gap-2" style={{ backgroundColor: colors.sidebarBg }}>
                  <div className="w-5 h-5 rounded bg-white/20" />
                  <span className="text-xs font-medium" style={{ color: colors.sidebarTextColor }}>Навигация</span>
                </div>
                <div className="p-3 bg-muted/30 space-y-2">
                  <div className="h-8 rounded-lg flex items-center px-3 gap-2" style={{ backgroundColor: colors.primaryBtn }}>
                    <span className="text-xs font-medium text-white">Активный пункт</span>
                  </div>
                  <div className="h-8 rounded-lg bg-background/60 flex items-center px-3">
                    <span className="text-xs text-muted-foreground">Обычный пункт</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 h-9 rounded-xl text-xs font-medium text-white" style={{ backgroundColor: colors.primaryBtn }}>
                  Основная кнопка
                </button>
                <button className="flex-1 h-9 rounded-xl text-xs font-medium bg-muted text-foreground">
                  Вторичная
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fonts' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Type" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Шрифт интерфейса</h3>
            <span className="ml-auto text-xs text-muted-foreground">Активен: {settings.brandFont?.name || 'Golos Text'}</span>
          </div>
          <div className="p-4 space-y-2">
            {GOOGLE_FONTS.map(font => {
              const isActive = settings.brandFont?.family === font.family || (!settings.brandFont && font.name === 'Golos Text');
              return (
                <button key={font.name} onClick={() => applyFont(font)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div>
                    <p className={`text-base font-medium ${isActive ? 'text-primary' : 'text-foreground'}`} style={{ fontFamily: font.family !== 'system-ui' ? font.family : undefined }}>
                      {font.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: font.family !== 'system-ui' ? font.family : undefined }}>
                      Пример текста: Автобус №7 отправляется с остановки
                    </p>
                  </div>
                  {isActive && <Icon name="CheckCircle" className="w-5 h-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'icons' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Bus" className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Иконки транспорта</h3>
          </div>
          <div className="p-5 grid grid-cols-4 gap-4">
            {VEHICLE_ICONS.map(v => (
              <div key={v.name} className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon name={v.icon} className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{v.name}</p>
                <p className="text-xs text-muted-foreground text-center">{v.desc}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
              <Icon name="Info" className="w-3.5 h-3.5 inline mr-1" />
              Иконки транспорта используются на карте диспетчера, в планшете водителя и отчётах техника.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}