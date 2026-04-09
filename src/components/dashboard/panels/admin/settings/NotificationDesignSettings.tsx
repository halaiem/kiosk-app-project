import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import IconPickerModal from "./IconPickerModal";

/* ── Types ── */

type Platform = "dashboard" | "tablet";
type ButtonRadius = "none" | "sm" | "md" | "lg" | "full";
type NotifSize = "compact" | "normal" | "large";

interface TypeStyle {
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: ButtonRadius;
  size: NotifSize;
}

type NotifDesignConfig = Record<Platform, Record<string, TypeStyle>>;

/* ── Constants ── */

const NOTIF_TYPES: {
  key: string;
  label: string;
  defaultIcon: string;
  defaultBg: string;
}[] = [
  { key: "info", label: "Информационное", defaultIcon: "Info", defaultBg: "#3b82f6" },
  { key: "warning", label: "Предупреждение", defaultIcon: "AlertTriangle", defaultBg: "#f59e0b" },
  { key: "error", label: "Ошибка", defaultIcon: "AlertCircle", defaultBg: "#ef4444" },
  { key: "success", label: "Успешно", defaultIcon: "CheckCircle", defaultBg: "#22c55e" },
  { key: "transport", label: "Транспорт", defaultIcon: "Bus", defaultBg: "#6366f1" },
  { key: "weather", label: "Погода", defaultIcon: "CloudRain", defaultBg: "#0ea5e9" },
  { key: "emergency", label: "Экстренное", defaultIcon: "Siren", defaultBg: "#dc2626" },
  { key: "schedule", label: "Расписание", defaultIcon: "Clock", defaultBg: "#8b5cf6" },
  { key: "road", label: "Дорожное", defaultIcon: "Construction", defaultBg: "#f97316" },
  { key: "message", label: "Сообщение", defaultIcon: "MessageSquare", defaultBg: "#14b8a6" },
];

const RADIUS_OPTIONS: { key: ButtonRadius; label: string; css: string }[] = [
  { key: "none", label: "0", css: "0px" },
  { key: "sm", label: "SM", css: "4px" },
  { key: "md", label: "MD", css: "8px" },
  { key: "lg", label: "LG", css: "12px" },
  { key: "full", label: "Full", css: "9999px" },
];

const SIZE_OPTIONS: { key: NotifSize; label: string }[] = [
  { key: "compact", label: "Компакт" },
  { key: "normal", label: "Обычный" },
  { key: "large", label: "Крупный" },
];

const STORAGE_KEY = "notification_design";

/* ── Helpers ── */

function defaultStyleForType(nt: (typeof NOTIF_TYPES)[number]): TypeStyle {
  return {
    bgColor: nt.defaultBg + "1a",
    textColor: nt.defaultBg,
    borderColor: nt.defaultBg + "33",
    icon: nt.defaultIcon,
    buttonColor: nt.defaultBg,
    buttonTextColor: "#ffffff",
    buttonRadius: "md",
    size: "normal",
  };
}

function buildDefaults(): NotifDesignConfig {
  const platform: Record<string, TypeStyle> = {};
  for (const nt of NOTIF_TYPES) {
    platform[nt.key] = defaultStyleForType(nt);
  }
  return {
    dashboard: { ...platform },
    tablet: JSON.parse(JSON.stringify(platform)) as Record<string, TypeStyle>,
  };
}

function loadConfig(): NotifDesignConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NotifDesignConfig>;
      const defaults = buildDefaults();
      for (const p of ["dashboard", "tablet"] as Platform[]) {
        if (parsed[p]) {
          for (const nt of NOTIF_TYPES) {
            if (parsed[p]![nt.key]) {
              defaults[p][nt.key] = { ...defaults[p][nt.key], ...parsed[p]![nt.key] };
            }
          }
        }
      }
      return defaults;
    }
  } catch {
    // ignore
  }
  return buildDefaults();
}

function saveConfig(config: NotifDesignConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function radiusToCss(r: ButtonRadius): string {
  return RADIUS_OPTIONS.find((o) => o.key === r)?.css ?? "8px";
}

/* ── Color picker row ── */

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Normalize hex for the native color picker (needs 7-char hex)
  const hexForPicker = value.startsWith("#") && (value.length === 7 || value.length === 4)
    ? value.slice(0, 7)
    : "#888888";

  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-6 h-6 cursor-pointer">
          <div
            className="w-6 h-6 rounded-lg border border-border"
            style={{ background: value }}
          />
          <input
            type="color"
            value={hexForPicker}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 h-7 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={9}
        />
      </div>
    </div>
  );
}

/* ── Main component ── */

export default function NotificationDesignSettings() {
  const [config, setConfig] = useState<NotifDesignConfig>(loadConfig);
  const [platform, setPlatform] = useState<Platform>("dashboard");
  const [selectedType, setSelectedType] = useState(NOTIF_TYPES[0].key);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentStyle = config[platform][selectedType] ?? defaultStyleForType(
    NOTIF_TYPES.find((t) => t.key === selectedType) ?? NOTIF_TYPES[0],
  );
  const selectedMeta = NOTIF_TYPES.find((t) => t.key === selectedType) ?? NOTIF_TYPES[0];

  const updateStyle = useCallback(
    (patch: Partial<TypeStyle>) => {
      setConfig((prev) => {
        const next: NotifDesignConfig = {
          ...prev,
          [platform]: {
            ...prev[platform],
            [selectedType]: { ...prev[platform][selectedType], ...patch },
          },
        };
        saveConfig(next);
        return next;
      });
    },
    [platform, selectedType],
  );

  const resetType = useCallback(() => {
    const nt = NOTIF_TYPES.find((t) => t.key === selectedType);
    if (!nt) return;
    const style = defaultStyleForType(nt);
    setConfig((prev) => {
      const next: NotifDesignConfig = {
        ...prev,
        [platform]: { ...prev[platform], [selectedType]: style },
      };
      saveConfig(next);
      return next;
    });
  }, [platform, selectedType]);

  const resetAll = useCallback(() => {
    const defaults = buildDefaults();
    setConfig(defaults);
    saveConfig(defaults);
  }, []);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* Size helpers for preview */
  const sizeClasses: Record<NotifSize, { card: string; title: string; text: string; btn: string }> = {
    compact: { card: "p-3", title: "text-xs font-semibold", text: "text-[11px]", btn: "px-3 py-1 text-[11px]" },
    normal: { card: "p-4", title: "text-sm font-semibold", text: "text-xs", btn: "px-4 py-1.5 text-xs" },
    large: { card: "p-5", title: "text-base font-bold", text: "text-sm", btn: "px-5 py-2 text-sm" },
  };
  const sc = sizeClasses[currentStyle.size];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Дизайн уведомлений
          </h3>
          <p className="text-sm text-muted-foreground">
            Настройте внешний вид уведомлений и сообщений для дашборда и планшета
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
              <Icon name="Check" className="w-3.5 h-3.5" />
              Сохранено
            </div>
          )}
          <button
            onClick={() => { resetAll(); flash(); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Сбросить все
          </button>
        </div>
      </div>

      {/* Platform toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(
          [
            { key: "dashboard" as Platform, label: "Дашборд", icon: "Monitor" },
            { key: "tablet" as Platform, label: "Планшет", icon: "Tablet" },
          ] as const
        ).map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              platform === p.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={p.icon} className="w-4 h-4" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 min-h-[500px]">
        {/* ── Left: type list ── */}
        <div className="w-[280px] shrink-0 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
            <Icon name="Bell" className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Типы</h4>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">
              {NOTIF_TYPES.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {NOTIF_TYPES.map((nt) => {
              const style = config[platform][nt.key] ?? defaultStyleForType(nt);
              const isSelected = selectedType === nt.key;
              return (
                <button
                  key={nt.key}
                  onClick={() => setSelectedType(nt.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-muted/40 border-l-2 border-l-transparent"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: style.bgColor }}
                  >
                    <Icon
                      name={style.icon}
                      className="w-4 h-4"
                      style={{ color: style.textColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {nt.label}
                    </p>
                    {/* Color preview bar */}
                    <div className="flex gap-1 mt-1">
                      <div
                        className="w-4 h-2 rounded-sm"
                        style={{ backgroundColor: style.bgColor }}
                        title="Фон"
                      />
                      <div
                        className="w-4 h-2 rounded-sm"
                        style={{ backgroundColor: style.textColor }}
                        title="Текст"
                      />
                      <div
                        className="w-4 h-2 rounded-sm"
                        style={{ backgroundColor: style.buttonColor }}
                        title="Кнопка"
                      />
                    </div>
                  </div>
                  {isSelected && (
                    <Icon name="ChevronRight" className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: editor + preview ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Editor */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex-1">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: currentStyle.bgColor }}
              >
                <Icon
                  name={currentStyle.icon}
                  className="w-3.5 h-3.5"
                  style={{ color: currentStyle.textColor }}
                />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {selectedMeta.label}
              </h4>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {platform === "dashboard" ? "Дашборд" : "Планшет"}
              </span>
              <button
                onClick={() => { resetType(); flash(); }}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Сбросить тип
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
              {/* Colors column */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Цвета уведомления
                </p>
                <ColorRow
                  label="Цвет фона"
                  value={currentStyle.bgColor}
                  onChange={(v) => updateStyle({ bgColor: v })}
                />
                <ColorRow
                  label="Цвет текста"
                  value={currentStyle.textColor}
                  onChange={(v) => updateStyle({ textColor: v })}
                />
                <ColorRow
                  label="Цвет рамки"
                  value={currentStyle.borderColor}
                  onChange={(v) => updateStyle({ borderColor: v })}
                />
                {/* Icon */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Иконка</label>
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(true)}
                    className="flex items-center gap-2 h-7 px-3 rounded-lg border border-border bg-background text-foreground text-xs hover:bg-muted transition-colors"
                  >
                    <Icon name={currentStyle.icon} className="w-4 h-4 text-primary" />
                    <span className="truncate max-w-[80px]">{currentStyle.icon}</span>
                  </button>
                  <IconPickerModal
                    open={iconPickerOpen}
                    onClose={() => setIconPickerOpen(false)}
                    selected={currentStyle.icon}
                    onSelect={(name) => { updateStyle({ icon: name }); setIconPickerOpen(false); }}
                  />
                </div>
              </div>

              {/* Button + size column */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Кнопка и размер
                </p>
                <ColorRow
                  label="Кнопка (фон)"
                  value={currentStyle.buttonColor}
                  onChange={(v) => updateStyle({ buttonColor: v })}
                />
                <ColorRow
                  label="Кнопка (текст)"
                  value={currentStyle.buttonTextColor}
                  onChange={(v) => updateStyle({ buttonTextColor: v })}
                />
                {/* Button radius */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Скругление</label>
                  <div className="flex gap-1">
                    {RADIUS_OPTIONS.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => updateStyle({ buttonRadius: r.key })}
                        className={`w-8 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${
                          currentStyle.buttonRadius === r.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Size */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Размер</label>
                  <div className="flex gap-1">
                    {SIZE_OPTIONS.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => updateStyle({ size: s.key })}
                        className={`px-3 h-7 rounded text-[11px] font-medium transition-colors ${
                          currentStyle.size === s.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="Eye" className="w-4 h-4 text-orange-500" />
              <h4 className="text-sm font-semibold text-foreground">
                Предпросмотр
              </h4>
            </div>
            <div className="p-5">
              <div
                className={`rounded-xl ${sc.card}`}
                style={{
                  backgroundColor: currentStyle.bgColor,
                  border: `1px solid ${currentStyle.borderColor}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: currentStyle.textColor + "1a",
                    }}
                  >
                    <Icon
                      name={currentStyle.icon}
                      className="w-5 h-5"
                      style={{ color: currentStyle.textColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={sc.title}
                      style={{ color: currentStyle.textColor }}
                    >
                      Пример уведомления
                    </p>
                    <p
                      className={`${sc.text} mt-0.5 opacity-80`}
                      style={{ color: currentStyle.textColor }}
                    >
                      Текст уведомления для предпросмотра. Здесь может быть описание
                      события или действия.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        className={`${sc.btn} font-medium transition-opacity hover:opacity-80`}
                        style={{
                          backgroundColor: currentStyle.buttonColor,
                          color: currentStyle.buttonTextColor,
                          borderRadius: radiusToCss(currentStyle.buttonRadius),
                        }}
                      >
                        Подробнее
                      </button>
                      <button
                        type="button"
                        className={`${sc.btn} font-medium transition-opacity hover:opacity-80`}
                        style={{
                          backgroundColor: "transparent",
                          color: currentStyle.textColor,
                          border: `1px solid ${currentStyle.borderColor}`,
                          borderRadius: radiusToCss(currentStyle.buttonRadius),
                        }}
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                {selectedMeta.label} &middot;{" "}
                {platform === "dashboard" ? "Дашборд" : "Планшет"} &middot;{" "}
                {SIZE_OPTIONS.find((s) => s.key === currentStyle.size)?.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
