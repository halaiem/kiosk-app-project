import { useState, useRef, useMemo } from "react";
import Icon from "@/components/ui/icon";
import {
  useAppSettings,
  CITY_LABELS,
  TRANSPORT_LABELS,
  TRANSPORT_ICONS,
  FEATURE_LABELS,
  FONT_SIZE_LABELS,
  type TransportType,
  type FeatureFlags,
  type BrandColors,
  type FontSize,
  type CustomTransportType,
} from "@/context/AppSettingsContext";
import { Toggle } from "./Toggle";
import { FontSettingsBlock } from "./FontSettingsBlock";
import IconPickerModal from "./IconPickerModal";

/* ── Constants ── */

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: "sidebarBg", label: "Фон сайдбара" },
  { key: "headerBg", label: "Фон шапки" },
  { key: "primaryBtn", label: "Кнопка (активная)" },
  { key: "primaryBtnHover", label: "Кнопка (наведение)" },
  { key: "primaryBtnDisabled", label: "Кнопка (неактивная)" },
  { key: "textColor", label: "Цвет текста" },
  { key: "sidebarTextColor", label: "Текст сайдбара" },
  { key: "widgetBg", label: "Фон виджетов" },
  { key: "widgetBorder", label: "Рамка виджетов" },
  { key: "cardBg", label: "Фон карточек" },
  { key: "accentColor", label: "Акцентный цвет" },
];

const DEFAULT_BRAND_COLORS: BrandColors = {
  sidebarBg: "#ec660c",
  headerBg: "#ec660c",
  primaryBtn: "#ec660c",
  primaryBtnHover: "#d45a0a",
  primaryBtnDisabled: "#f3a96e",
  textColor: "#141414",
  sidebarTextColor: "#141414",
  widgetBg: "#ffffff",
  widgetBorder: "#e5e7eb",
  cardBg: "#ffffff",
  accentColor: "#ec660c",
};

const LOGO_SIZES: { key: "sm" | "md" | "lg"; label: string; px: string }[] = [
  { key: "sm", label: "S", px: "32px" },
  { key: "md", label: "M", px: "48px" },
  { key: "lg", label: "L", px: "64px" },
];

const FONT_SIZE_PX: Record<FontSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

/* ── Sub-components ── */

function FeaturesBlock({
  title,
  iconName,
  features,
  onChange,
}: {
  title: string;
  iconName: string;
  features: FeatureFlags;
  onChange: (patch: Partial<FeatureFlags>) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={iconName} className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {Object.values(features).filter(Boolean).length}/{Object.values(features).length}
        </span>
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

function ColorPickerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-6 h-6 cursor-pointer">
          <div className="w-6 h-6 rounded-lg border border-border" style={{ background: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 h-7 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function BrandColorsBlock({
  title,
  iconName,
  colors,
  onUpdate,
  onReset,
}: {
  title: string;
  iconName: string;
  colors: BrandColors;
  onUpdate: (key: keyof BrandColors, val: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={iconName} className="w-4 h-4 text-pink-500" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-3">
        {COLOR_FIELDS.map(({ key, label }) => (
          <ColorPickerRow
            key={key}
            label={label}
            value={colors[key]}
            onChange={(v) => onUpdate(key, v)}
          />
        ))}
        <button
          onClick={onReset}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Сбросить к значениям по умолчанию
        </button>
      </div>
    </div>
  );
}

function MiniPreview({
  title,
  variant,
  colors,
  carrierName,
  carrierLogo,
  slogan,
}: {
  title: string;
  variant: "dashboard" | "tablet";
  colors: BrandColors;
  carrierName: string;
  carrierLogo: string | null;
  slogan: string;
}) {
  const isDashboard = variant === "dashboard";
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={isDashboard ? "Monitor" : "Tablet"} className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {/* Login mock */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
            Авторизация
          </div>
          <div
            className="p-4 flex flex-col items-center gap-2"
            style={{ backgroundColor: colors.cardBg }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: colors.sidebarBg }}
            >
              {carrierLogo ? (
                <img src={carrierLogo} alt="" className="w-full h-full object-contain" />
              ) : (
                <Icon name="Building2" className="w-5 h-5" style={{ color: colors.sidebarTextColor }} />
              )}
            </div>
            <p className="text-[11px] font-bold" style={{ color: colors.textColor }}>
              {carrierName || "ИРИДА"}
            </p>
            {slogan && (
              <p className="text-[9px] opacity-60" style={{ color: colors.textColor }}>
                {slogan}
              </p>
            )}
            <div
              className="w-full h-6 rounded-md mt-1 flex items-center justify-center"
              style={{ backgroundColor: colors.primaryBtn }}
            >
              <span className="text-[9px] font-medium text-white">Войти</span>
            </div>
          </div>
        </div>
        {/* Main layout mock */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
            {isDashboard ? "Рабочий стол" : "Главный экран"}
          </div>
          <div className="flex h-28">
            {/* Sidebar */}
            <div
              className="w-12 shrink-0 flex flex-col items-center gap-1.5 py-2"
              style={{ backgroundColor: colors.sidebarBg }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-6 h-1.5 rounded-full opacity-60"
                  style={{ backgroundColor: colors.sidebarTextColor }}
                />
              ))}
            </div>
            {/* Content */}
            <div className="flex-1 flex flex-col" style={{ backgroundColor: colors.widgetBg }}>
              {/* Header */}
              <div
                className="h-6 shrink-0 flex items-center px-2"
                style={{ backgroundColor: colors.headerBg }}
              >
                <div
                  className="w-12 h-2 rounded-full opacity-60"
                  style={{ backgroundColor: colors.sidebarTextColor }}
                />
              </div>
              {/* Widgets */}
              <div className="flex-1 p-1.5 grid grid-cols-2 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded"
                    style={{
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.widgetBorder}`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CitySearchDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const allCities = useMemo(
    () => Object.entries(CITY_LABELS).map(([key, label]) => ({ key, label })),
    [],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allCities;
    const q = search.trim().toLowerCase();
    return allCities.filter(
      (c) => c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q),
    );
  }, [search, allCities]);

  const selectedLabel = CITY_LABELS[value] || value;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-between"
      >
        <span className="truncate">{selectedLabel}</span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск города..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Не найдено</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.key}
                  onClick={() => {
                    onChange(c.key);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    value === c.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */

export function InterfaceSettingsView() {
  const { settings, updateSettings, updateFeatures, resetSettings } = useAppSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [badgeIconPickerOpen, setBadgeIconPickerOpen] = useState(false);
  const [customTransportIconPickerOpen, setCustomTransportIconPickerOpen] = useState(false);
  const [newCustomTransport, setNewCustomTransport] = useState<CustomTransportType>({ key: "", label: "", icon: "Bus" });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSettings({ carrierLogo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateDashboardColor = (key: keyof BrandColors, val: string) => {
    const updated = { ...settings.brandColorsDashboard, [key]: val };
    updateSettings({ brandColorsDashboard: updated, brandColors: updated });
  };

  const updateTabletColor = (key: keyof BrandColors, val: string) => {
    updateSettings({ brandColorsTablet: { ...settings.brandColorsTablet, [key]: val } });
  };

  const addCustomTransport = () => {
    if (!newCustomTransport.label.trim()) return;
    const key = newCustomTransport.key.trim() || newCustomTransport.label.trim().toLowerCase().replace(/\s+/g, "_");
    const entry: CustomTransportType = { key, label: newCustomTransport.label.trim(), icon: newCustomTransport.icon };
    updateSettings({ customTransportTypes: [...(settings.customTransportTypes || []), entry] });
    setNewCustomTransport({ key: "", label: "", icon: "Bus" });
  };

  const removeCustomTransport = (key: string) => {
    updateSettings({
      customTransportTypes: (settings.customTransportTypes || []).filter((t) => t.key !== key),
    });
  };

  const logoSizePx = LOGO_SIZES.find((s) => s.key === settings.carrierLogoSize)?.px ?? "48px";

  return (
    <div className="space-y-4">
      {/* Header */}
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
            onClick={flash}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Icon name={saved ? "Check" : "Save"} className="w-3.5 h-3.5" />
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ════════ 1. CARRIER ════════ */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="Building2" className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">Перевозчик</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Carrier name */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Название</label>
              <input
                type="text"
                value={settings.carrierName}
                onChange={(e) => updateSettings({ carrierName: e.target.value })}
                placeholder="ГУП Горэлектротранс"
                className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Slogan */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Слоган</label>
              <input
                type="text"
                value={settings.carrierSlogan}
                onChange={(e) => updateSettings({ carrierSlogan: e.target.value })}
                placeholder="Надежный транспорт каждый день"
                className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Описание</label>
              <textarea
                value={settings.carrierDescription}
                onChange={(e) => updateSettings({ carrierDescription: e.target.value })}
                placeholder="Краткое описание компании-перевозчика"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            {/* Carrier text */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Дополнительный текст</label>
              <textarea
                value={settings.carrierText}
                onChange={(e) => updateSettings({ carrierText: e.target.value })}
                placeholder="Информационный текст для экранов"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            {/* Logo upload */}
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
            {/* Logo size */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Размер логотипа</label>
              <div className="flex gap-2">
                {LOGO_SIZES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => updateSettings({ carrierLogoSize: s.key })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-center ${
                      settings.carrierLogoSize === s.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {s.label} ({s.px})
                  </button>
                ))}
              </div>
            </div>
            {/* Logo tint color */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Цвет фона логотипа</label>
              <div className="flex items-center gap-2">
                <div className="relative w-7 h-7 cursor-pointer">
                  <div
                    className="w-7 h-7 rounded-lg border border-border"
                    style={{ background: settings.carrierLogoColor }}
                  />
                  <input
                    type="color"
                    value={settings.carrierLogoColor}
                    onChange={(e) => updateSettings({ carrierLogoColor: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground">{settings.carrierLogoColor}</span>
              </div>
            </div>
            {/* Badge */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Иконка плашки</label>
                <button
                  type="button"
                  onClick={() => setBadgeIconPickerOpen(true)}
                  className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm flex items-center gap-2 hover:bg-muted transition-colors"
                >
                  {settings.carrierBadgeIcon ? (
                    <Icon name={settings.carrierBadgeIcon} className="w-4 h-4 text-primary" />
                  ) : (
                    <Icon name="Plus" className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-xs truncate">{settings.carrierBadgeIcon || "Выбрать"}</span>
                </button>
                <IconPickerModal
                  open={badgeIconPickerOpen}
                  onClose={() => setBadgeIconPickerOpen(false)}
                  selected={settings.carrierBadgeIcon}
                  onSelect={(name) => updateSettings({ carrierBadgeIcon: name })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Текст плашки</label>
                <input
                  type="text"
                  value={settings.carrierBadgeText}
                  onChange={(e) => updateSettings({ carrierBadgeText: e.target.value })}
                  placeholder="Лицензия"
                  className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {/* Sub-lines */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Подстрока 1</label>
                <input
                  type="text"
                  value={settings.carrierSubLine1}
                  onChange={(e) => updateSettings({ carrierSubLine1: e.target.value })}
                  placeholder="ИНН 1234567890"
                  className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Подстрока 2</label>
                <input
                  type="text"
                  value={settings.carrierSubLine2}
                  onChange={(e) => updateSettings({ carrierSubLine2: e.target.value })}
                  placeholder="Тел: +7 (999) 123-45-67"
                  className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {/* Live preview */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">Превью</p>
              <div className="flex items-start gap-3">
                <div
                  className="rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                  style={{
                    width: logoSizePx,
                    height: logoSizePx,
                    backgroundColor: settings.carrierLogoColor,
                  }}
                >
                  {settings.carrierLogo ? (
                    <img src={settings.carrierLogo} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Icon name="Building2" className="w-1/2 h-1/2 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{settings.carrierName || "Название"}</p>
                  {settings.carrierSlogan && (
                    <p className="text-[11px] text-muted-foreground truncate">{settings.carrierSlogan}</p>
                  )}
                  {(settings.carrierBadgeIcon || settings.carrierBadgeText) && (
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {settings.carrierBadgeIcon && (
                        <Icon name={settings.carrierBadgeIcon} className="w-3 h-3" />
                      )}
                      {settings.carrierBadgeText && (
                        <span className="text-[10px] font-medium">{settings.carrierBadgeText}</span>
                      )}
                    </div>
                  )}
                  {settings.carrierSubLine1 && (
                    <p className="text-[10px] text-muted-foreground mt-1">{settings.carrierSubLine1}</p>
                  )}
                  {settings.carrierSubLine2 && (
                    <p className="text-[10px] text-muted-foreground">{settings.carrierSubLine2}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════ 2. CITY + TRANSPORT ════════ */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="MapPin" className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">Город и транспорт</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* City search dropdown */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Город</label>
              <CitySearchDropdown
                value={settings.city}
                onChange={(city) => updateSettings({ city })}
              />
              {settings.city && settings.city !== "custom" && (
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                  <Icon name="MapPin" className="w-3 h-3" />
                  {CITY_LABELS[settings.city] || settings.city}
                </div>
              )}
            </div>
            {settings.city === "custom" && (
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
            {/* Built-in transport types */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Вид транспорта</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TRANSPORT_LABELS) as TransportType[])
                  .filter((k) => k !== "custom")
                  .map((key) => {
                    const selected = settings.transportTypes?.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          const current = settings.transportTypes ?? [];
                          const next = selected ? current.filter((t) => t !== key) : [...current, key];
                          updateSettings({ transportTypes: next.length ? next : [key] });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <Icon name={TRANSPORT_ICONS[key] || "Bus"} className="w-3.5 h-3.5" />
                        {TRANSPORT_LABELS[key]}
                      </button>
                    );
                  })}
              </div>
            </div>
            {/* Custom transport types */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Свои виды транспорта
              </label>
              {(settings.customTransportTypes || []).length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {settings.customTransportTypes.map((ct) => (
                    <div
                      key={ct.key}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30"
                    >
                      <Icon name={ct.icon || "Bus"} className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-foreground flex-1">{ct.label}</span>
                      <button
                        onClick={() => removeCustomTransport(ct.key)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Icon name="X" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newCustomTransport.label}
                    onChange={(e) =>
                      setNewCustomTransport({ ...newCustomTransport, label: e.target.value })
                    }
                    placeholder="Название"
                    className="h-8 w-full px-2 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCustomTransportIconPickerOpen(true)}
                  className="h-8 w-8 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
                  title="Выбрать иконку"
                >
                  <Icon name={newCustomTransport.icon || "Bus"} className="w-4 h-4 text-primary" />
                </button>
                <IconPickerModal
                  open={customTransportIconPickerOpen}
                  onClose={() => setCustomTransportIconPickerOpen(false)}
                  selected={newCustomTransport.icon}
                  onSelect={(name) =>
                    setNewCustomTransport({ ...newCustomTransport, icon: name })
                  }
                />
                <button
                  onClick={addCustomTransport}
                  disabled={!newCustomTransport.label.trim()}
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Icon name="Plus" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ════════ 3. BRAND COLORS DASHBOARD ════════ */}
        <BrandColorsBlock
          title="Цвета дашборда"
          iconName="Monitor"
          colors={settings.brandColorsDashboard}
          onUpdate={updateDashboardColor}
          onReset={() =>
            updateSettings({
              brandColorsDashboard: { ...DEFAULT_BRAND_COLORS },
              brandColors: { ...DEFAULT_BRAND_COLORS },
            })
          }
        />

        {/* ════════ 4. BRAND COLORS TABLET ════════ */}
        <BrandColorsBlock
          title="Цвета планшета"
          iconName="Tablet"
          colors={settings.brandColorsTablet}
          onUpdate={updateTabletColor}
          onReset={() => updateSettings({ brandColorsTablet: { ...DEFAULT_BRAND_COLORS } })}
        />

        {/* ════════ 5. FONT ════════ */}
        <FontSettingsBlock />

        {/* ════════ 6. FONT SIZE ════════ */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon name="ALargeSmall" className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Размер шрифта</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((key) => (
                <button
                  key={key}
                  onClick={() => updateSettings({ fontSize: key })}
                  className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                    settings.fontSize === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="font-bold" style={{ fontSize: `${FONT_SIZE_PX[key]}px` }}>Аа</span>
                  <span className="text-[10px] leading-tight">{FONT_SIZE_LABELS[key]}</span>
                  <span className="text-[9px] opacity-60">{FONT_SIZE_PX[key]}px</span>
                </button>
              ))}
            </div>
            {/* Preview */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Превью текста</p>
              {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((key) => (
                <p
                  key={key}
                  className={`text-foreground ${settings.fontSize === key ? "font-bold" : ""}`}
                  style={{ fontSize: `${FONT_SIZE_PX[key]}px` }}
                >
                  {FONT_SIZE_LABELS[key]} ({FONT_SIZE_PX[key]}px) - Диспетчерская система ИРИДА
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ════════ 7. PREVIEW DASHBOARD ════════ */}
        <MiniPreview
          title="Превью: Дашборд"
          variant="dashboard"
          colors={settings.brandColorsDashboard}
          carrierName={settings.carrierName}
          carrierLogo={settings.carrierLogo}
          slogan={settings.carrierSlogan}
        />

        {/* ════════ 8. PREVIEW TABLET ════════ */}
        <MiniPreview
          title="Превью: Планшет"
          variant="tablet"
          colors={settings.brandColorsTablet}
          carrierName={settings.carrierName}
          carrierLogo={settings.carrierLogo}
          slogan={settings.carrierSlogan}
        />
      </div>

      {/* ════════ 9. FEATURES ════════ */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="ToggleLeft" className="w-4 h-4 text-primary" />
          Функции для каждого экрана
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <FeaturesBlock
            title="Планшет водителя"
            iconName="Tablet"
            features={settings.featuresTablet}
            onChange={(patch) => updateFeatures("tablet", patch)}
          />
          <FeaturesBlock
            title="Диспетчер"
            iconName="Radio"
            features={settings.featuresDispatcher}
            onChange={(patch) => updateFeatures("dispatcher", patch)}
          />
          <FeaturesBlock
            title="Технолог"
            iconName="Wrench"
            features={settings.featuresTechnician}
            onChange={(patch) => updateFeatures("technician", patch)}
          />
          <FeaturesBlock
            title="Администратор"
            iconName="ShieldCheck"
            features={settings.featuresAdmin}
            onChange={(patch) => updateFeatures("admin", patch)}
          />
          <FeaturesBlock
            title="Механик"
            iconName="Settings"
            features={settings.featuresMechanic}
            onChange={(patch) => updateFeatures("mechanic", patch)}
          />
        </div>
      </div>
    </div>
  );
}

export default InterfaceSettingsView;
