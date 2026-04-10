import { useState, useRef, useMemo } from "react";
import Icon from "@/components/ui/icon";
import {
  useAppSettings,
  CITY_LABELS,
  TRANSPORT_LABELS,
  TRANSPORT_ICONS,
  type TransportType,
  type CustomTransportType,
} from "@/context/AppSettingsContext";
import IconPickerModal from "./IconPickerModal";

const LOGO_SIZES: { key: "sm" | "md" | "lg"; label: string; px: string }[] = [
  { key: "sm", label: "S", px: "32px" },
  { key: "md", label: "M", px: "48px" },
  { key: "lg", label: "L", px: "64px" },
];

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

export function CarrierSettingsCard() {
  const { settings, updateSettings } = useAppSettings();
  const fileRef = useRef<HTMLInputElement>(null);
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
    <>
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
              placeholder="Надёжность. Безопасность. Комфорт."
              className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Описание</label>
            <input
              type="text"
              value={settings.carrierDescription}
              onChange={(e) => updateSettings({ carrierDescription: e.target.value })}
              placeholder="Городской электротранспорт"
              className="h-9 w-full px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {/* Logo */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Логотип</label>
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: settings.carrierLogoColor }}
              >
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
          {/* City */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Город</label>
            <CitySearchDropdown
              value={settings.city}
              onChange={(city) => updateSettings({ city })}
            />
          </div>
          {/* Transport types */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Виды транспорта</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TRANSPORT_LABELS) as TransportType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    const next = settings.transportTypes.includes(t)
                      ? settings.transportTypes.filter((x) => x !== t)
                      : [...settings.transportTypes, t];
                    updateSettings({ transportTypes: next });
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    settings.transportTypes.includes(t)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <Icon name={TRANSPORT_ICONS[t]} className="w-4 h-4" />
                  {TRANSPORT_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          {/* Custom transport types */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Пользовательские типы</label>
            {(settings.customTransportTypes || []).length > 0 && (
              <div className="space-y-1.5 mb-2">
                {(settings.customTransportTypes || []).map((ct) => (
                  <div key={ct.key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30">
                    <Icon name={ct.icon || "Bus"} className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground flex-1">{ct.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{ct.key}</span>
                    <button
                      onClick={() => removeCustomTransport(ct.key)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Icon name="X" className="w-3 h-3" />
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
    </>
  );
}

export default CarrierSettingsCard;
