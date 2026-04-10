import { useState, useRef, useMemo, useEffect, useCallback } from "react";
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
  type AppSettings,
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
  collapsed: initialCollapsed,
}: {
  title: string;
  iconName: string;
  features: FeatureFlags;
  onChange: (patch: Partial<FeatureFlags>) => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!initialCollapsed);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon name={iconName} className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground flex-1">{title}</span>
        <span className="text-[10px] text-muted-foreground">
          {Object.values(features).filter(Boolean).length}/{Object.values(features).length}
        </span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2.5 border-t border-border pt-3">
          {(Object.keys(features) as (keyof FeatureFlags)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">{FEATURE_LABELS[key]}</label>
              <Toggle value={features[key]} onChange={(v) => onChange({ [key]: v })} />
            </div>
          ))}
        </div>
      )}
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
      <FeaturesSection
        settings={settings}
        updateFeatures={updateFeatures}
      />
    </div>
  );
}

/* ── Section 9: Features Section ── */

type FeatureTab = "dashboard" | "tablet";

interface SectionItem {
  tab: string;
  icon: string;
  label: string;
}

interface CustomRoleDef {
  key: string;
  label: string;
  icon: string;
}

const DASHBOARD_SECTIONS: Record<string, SectionItem[]> = {
  dispatcher: [
    { tab: "overview", icon: "LayoutDashboard", label: "Обзор" },
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "dash_messages", icon: "MessagesSquare", label: "Мессенджер" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "alerts", icon: "AlertTriangle", label: "Тревоги" },
    { tab: "vehicle_issues", icon: "Truck", label: "Проблемы ТС" },
  ],
  technician: [
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "routes", icon: "Route", label: "Маршруты" },
    { tab: "documents", icon: "FileText", label: "Документы" },
    { tab: "vehicles", icon: "Bus", label: "Транспорт" },
    { tab: "drivers", icon: "Users", label: "Водители" },
    { tab: "schedule", icon: "Calendar", label: "Расписание" },
    { tab: "daily_assignment", icon: "ClipboardList", label: "Наряд на день" },
    { tab: "diagnostics", icon: "Activity", label: "Диагностика" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Сообщения" },
  ],
  admin: [
    { tab: "users", icon: "Users", label: "Пользователи" },
    { tab: "admin_vehicles", icon: "Truck", label: "Транспортные средства" },
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "settings", icon: "Settings", label: "Настройки" },
    { tab: "servers", icon: "Server", label: "Серверы" },
    { tab: "logs", icon: "ScrollText", label: "Логи" },
    { tab: "diagnostic_apis", icon: "Plug", label: "API диагностики" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Сообщения" },
  ],
  mechanic: [
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "auto_diagnostics", icon: "Activity", label: "Диагностика" },
    { tab: "service_log", icon: "BookOpen", label: "Журнал" },
    { tab: "ts_docs", icon: "FolderOpen", label: "Документация ТС" },
    { tab: "email", icon: "Mail", label: "Email" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Мессенджер" },
  ],
};

const TABLET_SCREENS: SectionItem[] = [
  { tab: "profile", icon: "User", label: "Профиль" },
  { tab: "notifications", icon: "Bell", label: "Уведомления" },
  { tab: "settings", icon: "Settings", label: "Настройки" },
  { tab: "archive", icon: "Archive", label: "Архив" },
  { tab: "support", icon: "Headphones", label: "Поддержка" },
];

const TABLET_WIDGETS: SectionItem[] = [
  { tab: "map", icon: "Map", label: "Карта маршрута" },
  { tab: "stops", icon: "MapPin", label: "Остановки" },
  { tab: "messenger", icon: "MessageSquare", label: "Мессенджер" },
  { tab: "interval", icon: "Clock", label: "Интервал" },
  { tab: "vehicle_status", icon: "Activity", label: "Статус ТС" },
  { tab: "weather", icon: "CloudRain", label: "Погода" },
];

const ROLE_META: Record<string, { label: string; icon: string }> = {
  dispatcher: { label: "Диспетчер", icon: "Radio" },
  technician: { label: "Техник", icon: "Wrench" },
  admin: { label: "Администратор", icon: "ShieldCheck" },
  mechanic: { label: "Механик", icon: "Settings" },
};

type FeatureRoleKey = "tablet" | "dispatcher" | "technician" | "admin" | "mechanic";

const ROLE_FEATURE_KEY: Record<string, FeatureRoleKey> = {
  dispatcher: "dispatcher",
  technician: "technician",
  admin: "admin",
  mechanic: "mechanic",
};

const SETTINGS_FEATURE_KEY: Record<string, keyof AppSettings> = {
  dispatcher: "featuresDispatcher",
  technician: "featuresTechnician",
  admin: "featuresAdmin",
  mechanic: "featuresMechanic",
};

const DEFAULT_CUSTOM_FEATURES: FeatureFlags = {
  showMap: false,
  showSpeed: false,
  showRoute: false,
  showMessenger: false,
  showBreak: false,
  showTelemetry: false,
  showServiceRequests: false,
  showSchedule: false,
  showDocuments: false,
  showDiagnostics: false,
  showVehicles: false,
  showDrivers: false,
  showRatings: false,
  showNotifications: false,
};

function loadCustomSections(role: string): SectionItem[] {
  try {
    const raw = localStorage.getItem(`custom_sections_${role}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCustomSections(role: string, items: SectionItem[]) {
  localStorage.setItem(`custom_sections_${role}`, JSON.stringify(items));
}

function loadCustomRoles(): CustomRoleDef[] {
  try {
    const raw = localStorage.getItem("custom_roles");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadCustomRoleFeatures(roleKey: string): FeatureFlags {
  try {
    const raw = localStorage.getItem(`features_custom_${roleKey}`);
    if (!raw) return { ...DEFAULT_CUSTOM_FEATURES };
    return { ...DEFAULT_CUSTOM_FEATURES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CUSTOM_FEATURES };
  }
}

function saveCustomRoleFeatures(roleKey: string, flags: FeatureFlags) {
  localStorage.setItem(`features_custom_${roleKey}`, JSON.stringify(flags));
}

function getAllUniqueSections(): SectionItem[] {
  const seen = new Set<string>();
  const result: SectionItem[] = [];
  const all = [
    ...Object.values(DASHBOARD_SECTIONS).flat(),
    ...TABLET_SCREENS,
    ...TABLET_WIDGETS,
  ];
  for (const s of all) {
    const key = `${s.tab}::${s.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }
  return result;
}

function SectionList({
  items,
  onHide,
  onRemove,
  onMove,
  targetRoles,
  hiddenTabs,
}: {
  items: SectionItem[];
  onHide?: (tab: string) => void;
  onRemove?: (tab: string) => void;
  onMove?: (item: SectionItem, targetRole: string) => void;
  targetRoles?: { key: string; label: string }[];
  hiddenTabs?: Set<string>;
}) {
  const [moveOpenTab, setMoveOpenTab] = useState<string | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);

  const openMove = (tab: string) => {
    const el = btnRefs.current[tab];
    if (el) {
      const r = el.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setMoveOpenTab(tab);
  };

  useEffect(() => {
    if (!moveOpenTab) return;
    const close = () => setMoveOpenTab(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moveOpenTab]);

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isHidden = hiddenTabs?.has(item.tab);
        return (
          <div
            key={item.tab}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isHidden ? "opacity-40 bg-muted/10 border-border/30" : "bg-muted/30 border-border/50"}`}
          >
            <Icon name={item.icon} className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={`text-xs flex-1 ${isHidden ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{item.tab}</span>
            {onHide && (
              <button
                onClick={() => onHide(item.tab)}
                title={isHidden ? "Показать" : "Скрыть"}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name={isHidden ? "Eye" : "EyeOff"} className="w-3 h-3" />
              </button>
            )}
            {onMove && targetRoles && targetRoles.length > 0 && (
              <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                <button
                  ref={(el) => { btnRefs.current[item.tab] = el; }}
                  onClick={() => moveOpenTab === item.tab ? setMoveOpenTab(null) : openMove(item.tab)}
                  title="Переместить"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="MoveRight" className="w-3 h-3" />
                </button>
                {moveOpenTab === item.tab && dropPos && (
                  <div
                    className="fixed z-[9999] rounded-xl border border-border bg-popover shadow-xl py-1 min-w-[180px]"
                    style={{ top: dropPos.top, left: dropPos.left }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Переместить в:</div>
                    {targetRoles.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => { onMove(item, r.key); setMoveOpenTab(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-popover-foreground hover:bg-muted transition-colors"
                      >
                        <Icon name={ROLE_META[r.key]?.icon || "User"} className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onRemove && (
              <button
                onClick={() => onRemove(item.tab)}
                title="Удалить"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Icon name="X" className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddSectionDropdown({
  currentTabs,
  onAdd,
}: {
  currentTabs: Set<string>;
  onAdd: (item: SectionItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);

  const available = useMemo(() => {
    return getAllUniqueSections().filter((s) => !currentTabs.has(s.tab));
  }, [currentTabs]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((p) => !p);
  };

  if (available.length === 0) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground opacity-50"
      >
        <Icon name="Plus" className="w-3.5 h-3.5" />
        Все разделы добавлены
      </button>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-foreground hover:bg-muted transition-colors"
      >
        <Icon name="Plus" className="w-3.5 h-3.5" />
        Добавить раздел или виджет
      </button>
      {open && dropPos && (
        <div
          className="fixed z-[9999] rounded-xl border border-border bg-popover shadow-xl py-1 min-w-[240px] max-h-64 overflow-y-auto"
          style={{ top: dropPos.top, left: dropPos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {available.map((s) => (
            <button
              key={s.tab}
              onClick={() => { onAdd(s); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
            >
              <Icon name={s.icon} className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-left">{s.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{s.tab}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}



function RoleCard({
  roleKey,
  roleLabel,
  roleIcon,
  builtInSections,
  features,
  onFeaturesChange,
  customSections,
  onAddCustomSection,
  onRemoveCustomSection,
  onMoveSection,
  allRoleKeys,
}: {
  roleKey: string;
  roleLabel: string;
  roleIcon: string;
  builtInSections: SectionItem[];
  features: FeatureFlags;
  onFeaturesChange: (patch: Partial<FeatureFlags>) => void;
  customSections: SectionItem[];
  onAddCustomSection: (item: SectionItem) => void;
  onRemoveCustomSection: (tab: string) => void;
  onMoveSection: (section: SectionItem, targetRole: string) => void;
  allRoleKeys: { key: string; label: string }[];
}) {
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`hidden_sections_${roleKey}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const toggleHidden = useCallback((tab: string) => {
    setHiddenTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      localStorage.setItem(`hidden_sections_${roleKey}`, JSON.stringify([...next]));
      return next;
    });
  }, [roleKey]);

  const allSections = [...builtInSections, ...customSections];
  const currentTabs = useMemo(() => new Set(allSections.map((s) => s.tab)), [allSections]);
  const targetRoles = allRoleKeys.filter((r) => r.key !== roleKey);
  const enabledCount = Object.values(features).filter(Boolean).length;
  const totalCount = Object.values(features).length;

  return (
    <div className="bg-card border border-border rounded-2xl">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={roleIcon} className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{roleLabel}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {enabledCount}/{totalCount}
        </span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="PanelLeft" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Разделы sidebar</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{allSections.length}</span>
          </div>
          <SectionList
            items={builtInSections}
            onHide={toggleHidden}
            onMove={onMoveSection}
            targetRoles={targetRoles}
            hiddenTabs={hiddenTabs}
          />
          {customSections.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Добавленные</span>
              <SectionList
                items={customSections}
                onHide={toggleHidden}
                onRemove={onRemoveCustomSection}
                onMove={onMoveSection}
                targetRoles={targetRoles}
                hiddenTabs={hiddenTabs}
              />
            </div>
          )}
        </div>

        <FeaturesBlock
          title="Флаги функций"
          iconName="ToggleLeft"
          features={features}
          onChange={onFeaturesChange}
          collapsed
        />

        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
          <AddSectionDropdown currentTabs={currentTabs} onAdd={onAddCustomSection} />
        </div>
      </div>
    </div>
  );
}

function TabletCard({
  features,
  onFeaturesChange,
  customSections,
  onAddCustomSection,
  onRemoveCustomSection,
}: {
  features: FeatureFlags;
  onFeaturesChange: (patch: Partial<FeatureFlags>) => void;
  customSections: SectionItem[];
  onAddCustomSection: (item: SectionItem) => void;
  onRemoveCustomSection: (tab: string) => void;
}) {
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("hidden_sections_tablet");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const toggleHidden = useCallback((tab: string) => {
    setHiddenTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      localStorage.setItem("hidden_sections_tablet", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const allItems = [...TABLET_SCREENS, ...TABLET_WIDGETS, ...customSections];
  const currentTabs = useMemo(() => new Set(allItems.map((s) => s.tab)), [allItems]);
  const enabledCount = Object.values(features).filter(Boolean).length;
  const totalCount = Object.values(features).length;

  return (
    <div className="bg-card border border-border rounded-2xl">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Tablet" className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Планшет водителя</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {enabledCount}/{totalCount}
        </span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="Monitor" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Экраны планшета</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{TABLET_SCREENS.length}</span>
          </div>
          <SectionList items={TABLET_SCREENS} onHide={toggleHidden} hiddenTabs={hiddenTabs} />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="LayoutGrid" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Виджеты планшета</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{TABLET_WIDGETS.length}</span>
          </div>
          <SectionList items={TABLET_WIDGETS} onHide={toggleHidden} hiddenTabs={hiddenTabs} />
        </div>

        {customSections.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon name="Puzzle" className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Добавленные</span>
            </div>
            <SectionList
              items={customSections}
              onHide={toggleHidden}
              onRemove={onRemoveCustomSection}
              hiddenTabs={hiddenTabs}
            />
          </div>
        )}

        <FeaturesBlock
          title="Флаги функций"
          iconName="ToggleLeft"
          features={features}
          onChange={onFeaturesChange}
          collapsed
        />

        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
          <AddSectionDropdown currentTabs={currentTabs} onAdd={onAddCustomSection} />
        </div>
      </div>
    </div>
  );
}

function FeaturesSection({
  settings,
  updateFeatures,
}: {
  settings: AppSettings;
  updateFeatures: (role: FeatureRoleKey, patch: Partial<FeatureFlags>) => void;
}) {
  const [activeTab, setActiveTab] = useState<FeatureTab>("dashboard");
  const [customSectionsMap, setCustomSectionsMap] = useState<Record<string, SectionItem[]>>({});
  const [customRoles, setCustomRoles] = useState<CustomRoleDef[]>([]);
  const [customRoleFeatures, setCustomRoleFeatures] = useState<Record<string, FeatureFlags>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const roles = ["dispatcher", "technician", "admin", "mechanic", "tablet"];
    const map: Record<string, SectionItem[]> = {};
    for (const r of roles) {
      map[r] = loadCustomSections(r);
    }
    setCustomSectionsMap(map);
    const cr = loadCustomRoles();
    setCustomRoles(cr);
    const crFeats: Record<string, FeatureFlags> = {};
    for (const c of cr) {
      crFeats[c.key] = loadCustomRoleFeatures(c.key);
      if (!map[c.key]) map[c.key] = loadCustomSections(c.key);
    }
    setCustomRoleFeatures(crFeats);
    setCustomSectionsMap({ ...map });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAddCustomSection = useCallback((role: string, item: SectionItem) => {
    setCustomSectionsMap((prev) => {
      const next = { ...prev, [role]: [...(prev[role] || []), item] };
      saveCustomSections(role, next[role]);
      return next;
    });
    setToast(`Раздел "${item.label}" добавлен`);
  }, []);

  const handleRemoveCustomSection = useCallback((role: string, tab: string) => {
    setCustomSectionsMap((prev) => {
      const next = { ...prev, [role]: (prev[role] || []).filter((s) => s.tab !== tab) };
      saveCustomSections(role, next[role]);
      return next;
    });
  }, []);

  const handleMoveSection = useCallback((sourceRole: string, section: SectionItem, targetRole: string) => {
    setCustomSectionsMap((prev) => {
      const next = { ...prev };
      next[sourceRole] = (next[sourceRole] || []).filter((s) => s.tab !== section.tab);
      next[targetRole] = [...(next[targetRole] || []), section];
      saveCustomSections(sourceRole, next[sourceRole]);
      saveCustomSections(targetRole, next[targetRole]);
      return next;
    });
    const targetLabel = ROLE_META[targetRole]?.label || targetRole;
    setToast(`"${section.label}" перемещён в ${targetLabel}`);
  }, []);

  const handleCustomRoleFeatureChange = useCallback((roleKey: string, patch: Partial<FeatureFlags>) => {
    setCustomRoleFeatures((prev) => {
      const current = prev[roleKey] || { ...DEFAULT_CUSTOM_FEATURES };
      const updated = { ...current, ...patch };
      saveCustomRoleFeatures(roleKey, updated);
      return { ...prev, [roleKey]: updated };
    });
  }, []);

  const builtInRoleKeys = ["dispatcher", "technician", "admin", "mechanic"];
  const allRoleEntries = [
    ...builtInRoleKeys.map((k) => ({ key: k, label: ROLE_META[k].label })),
    ...customRoles.map((c) => ({ key: c.key, label: c.label })),
  ];

  const tabs: { key: FeatureTab; label: string; icon: string }[] = [
    { key: "dashboard", label: "Дашборд", icon: "Monitor" },
    { key: "tablet", label: "Планшет", icon: "Tablet" },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Icon name="ToggleLeft" className="w-4 h-4 text-primary" />
        Функции для каждого экрана
      </h3>

      <div className="flex items-center gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {builtInRoleKeys.map((roleKey) => {
              const meta = ROLE_META[roleKey];
              const featureKey = SETTINGS_FEATURE_KEY[roleKey];
              const features = settings[featureKey] as FeatureFlags;
              const frk = ROLE_FEATURE_KEY[roleKey];
              return (
                <RoleCard
                  key={roleKey}
                  roleKey={roleKey}
                  roleLabel={meta.label}
                  roleIcon={meta.icon}
                  builtInSections={DASHBOARD_SECTIONS[roleKey] || []}
                  features={features}
                  onFeaturesChange={(patch) => updateFeatures(frk, patch)}
                  customSections={customSectionsMap[roleKey] || []}
                  onAddCustomSection={(item) => handleAddCustomSection(roleKey, item)}
                  onRemoveCustomSection={(tab) => handleRemoveCustomSection(roleKey, tab)}
                  onMoveSection={(section, target) => handleMoveSection(roleKey, section, target)}
                  allRoleKeys={allRoleEntries}
                />
              );
            })}
          </div>

          {customRoles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="UserPlus" className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Пользовательские роли</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {customRoles.map((cr) => (
                  <RoleCard
                    key={cr.key}
                    roleKey={cr.key}
                    roleLabel={cr.label}
                    roleIcon={cr.icon || "User"}
                    builtInSections={[]}
                    features={customRoleFeatures[cr.key] || { ...DEFAULT_CUSTOM_FEATURES }}
                    onFeaturesChange={(patch) => handleCustomRoleFeatureChange(cr.key, patch)}
                    customSections={customSectionsMap[cr.key] || []}
                    onAddCustomSection={(item) => handleAddCustomSection(cr.key, item)}
                    onRemoveCustomSection={(tab) => handleRemoveCustomSection(cr.key, tab)}
                    onMoveSection={(section, target) => handleMoveSection(cr.key, section, target)}
                    allRoleKeys={allRoleEntries}
                  />
                ))}
              </div>
            </div>
          )}

          {customRoles.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-4 flex items-center gap-3">
              <Icon name="UserPlus" className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">Пользовательские роли</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Новые роли, добавленные в разделе Пользователи, автоматически появятся здесь
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tablet" && (
        <div className="grid grid-cols-2 gap-4">
          <TabletCard
            features={settings.featuresTablet}
            onFeaturesChange={(patch) => updateFeatures("tablet", patch)}
            customSections={customSectionsMap["tablet"] || []}
            onAddCustomSection={(item) => handleAddCustomSection("tablet", item)}
            onRemoveCustomSection={(tab) => handleRemoveCustomSection("tablet", tab)}
          />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-3 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <Icon name="CheckCircle" className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

export default InterfaceSettingsView;