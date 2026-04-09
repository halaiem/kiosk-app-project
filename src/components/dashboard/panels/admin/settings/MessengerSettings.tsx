import { useState, useCallback, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";

type Platform = "tablet" | "dashboard";
type Role = "dispatcher" | "technician" | "mechanic" | "admin" | "driver";
type Radius = "none" | "sm" | "md" | "lg" | "full";
type FontSize = "compact" | "normal" | "large";

interface MessengerStyle {
  chatBg: string;
  myMsgBg: string;
  otherMsgBg: string;
  myMsgText: string;
  otherMsgText: string;
  msgRadius: Radius;
  fontSize: FontSize;
  inputBg: string;
  inputText: string;
  inputBorder: string;
  sendBtnColor: string;
  sendBtnIcon: string;
  headerBg: string;
  headerText: string;
  enabledTypes: string[];
}

type MessengerConfig = Record<Platform, Record<Role, MessengerStyle>>;

const STORAGE_KEY = "messenger_design_settings";

const PLATFORMS: { key: Platform; label: string; icon: string }[] = [
  { key: "tablet", label: "Планшет водителя", icon: "Tablet" },
  { key: "dashboard", label: "Дашборд", icon: "Monitor" },
];

const ROLES: { key: Role; label: string }[] = [
  { key: "dispatcher", label: "Диспетчер" },
  { key: "technician", label: "Технолог" },
  { key: "mechanic", label: "Механик" },
  { key: "admin", label: "Администратор" },
  { key: "driver", label: "Водитель" },
];

const RADIUS_OPTIONS: { key: Radius; label: string; css: string }[] = [
  { key: "none", label: "0", css: "0px" },
  { key: "sm", label: "SM", css: "6px" },
  { key: "md", label: "MD", css: "12px" },
  { key: "lg", label: "LG", css: "20px" },
  { key: "full", label: "Full", css: "9999px" },
];

const FONT_SIZE_OPTIONS: { key: FontSize; label: string }[] = [
  { key: "compact", label: "Компакт" },
  { key: "normal", label: "Обычный" },
  { key: "large", label: "Крупный" },
];

const MESSAGE_TYPE_OPTIONS = [
  { key: "normal", label: "Обычное", icon: "MessageSquare", color: "#3b82f6" },
  { key: "dispatcher", label: "От диспетчера", icon: "Radio", color: "#ec660c" },
  { key: "technician", label: "От техника", icon: "Wrench", color: "#8b5cf6" },
  { key: "admin", label: "От администратора", icon: "ShieldCheck", color: "#6366f1" },
  { key: "important", label: "Важное", icon: "AlertOctagon", color: "#dc2626" },
  { key: "can_error", label: "Ошибка CAN", icon: "AlertTriangle", color: "#f59e0b" },
  { key: "voice", label: "Голосовое", icon: "Mic", color: "#22c55e" },
];

const NOTIF_TYPE_OPTIONS = [
  { key: "info", label: "Информационное", icon: "Info", color: "#3b82f6" },
  { key: "warning", label: "Предупреждение", icon: "AlertTriangle", color: "#f59e0b" },
  { key: "error", label: "Ошибка", icon: "AlertCircle", color: "#ef4444" },
  { key: "success", label: "Успешно", icon: "CheckCircle", color: "#22c55e" },
  { key: "transport", label: "Транспорт", icon: "Bus", color: "#6366f1" },
  { key: "weather", label: "Погода", icon: "CloudRain", color: "#0ea5e9" },
  { key: "emergency", label: "Экстренное", icon: "Siren", color: "#dc2626" },
  { key: "schedule", label: "Расписание", icon: "Clock", color: "#8b5cf6" },
  { key: "road", label: "Дорожное", icon: "Construction", color: "#f97316" },
  { key: "message", label: "Сообщение", icon: "MessageSquare", color: "#14b8a6" },
];

function loadCustomTypesForMessenger(): { key: string; label: string; icon: string; color: string; category: string }[] {
  try {
    const raw = localStorage.getItem("notification_custom_types");
    if (raw) {
      return JSON.parse(raw).map((ct: { key: string; label: string; defaultIcon: string; defaultBg: string; category: string }) => ({
        key: ct.key, label: ct.label, icon: ct.defaultIcon, color: ct.defaultBg, category: ct.category
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

function defaultStyle(): MessengerStyle {
  return {
    chatBg: "#f8fafc",
    myMsgBg: "#3b82f6",
    otherMsgBg: "#f1f5f9",
    myMsgText: "#ffffff",
    otherMsgText: "#1e293b",
    msgRadius: "lg",
    fontSize: "normal",
    inputBg: "#ffffff",
    inputText: "#1e293b",
    inputBorder: "#e2e8f0",
    sendBtnColor: "#3b82f6",
    sendBtnIcon: "#ffffff",
    headerBg: "#3b82f6",
    headerText: "#ffffff",
    enabledTypes: ["normal", "dispatcher", "important"],
  };
}

function buildDefaults(): MessengerConfig {
  const cfg = {} as MessengerConfig;
  for (const p of PLATFORMS) {
    cfg[p.key] = {} as Record<Role, MessengerStyle>;
    for (const r of ROLES) {
      cfg[p.key][r.key] = defaultStyle();
    }
  }
  return cfg;
}

function loadConfig(): MessengerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MessengerConfig>;
      const defaults = buildDefaults();
      for (const p of PLATFORMS) {
        for (const r of ROLES) {
          const src = parsed?.[p.key]?.[r.key];
          if (src) {
            defaults[p.key][r.key] = { ...defaults[p.key][r.key], ...src };
          }
        }
      }
      return defaults;
    }
  } catch {
    /* ignore */
  }
  return buildDefaults();
}

function saveConfig(cfg: MessengerConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

function radiusToCss(r: Radius): string {
  return RADIUS_OPTIONS.find((o) => o.key === r)?.css ?? "12px";
}

function getDesignStyle(typeKey: string): { bg: string; icon: string; iconColor: string } {
  try {
    const raw = localStorage.getItem("notification_design_v2");
    if (raw) {
      const cfg = JSON.parse(raw);
      const style = cfg?.tablet?.messages?.[typeKey] || cfg?.dashboard?.messages?.[typeKey]
        || cfg?.tablet?.notifications?.[typeKey] || cfg?.dashboard?.notifications?.[typeKey];
      if (style) return { bg: style.iconBgColor, icon: style.icon, iconColor: style.iconColor };
    }
  } catch {
    /* ignore */
  }
  const allOpts = [...MESSAGE_TYPE_OPTIONS, ...NOTIF_TYPE_OPTIONS];
  const opt = allOpts.find((o) => o.key === typeKey);
  return {
    bg: (opt?.color || "#3b82f6") + "1a",
    icon: opt?.icon || "MessageSquare",
    iconColor: opt?.color || "#3b82f6",
  };
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hexForPicker =
    value.startsWith("#") && (value.length === 7 || value.length === 4)
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

function RadiusPicker({
  value,
  onChange,
}: {
  value: Radius;
  onChange: (v: Radius) => void;
}) {
  return (
    <div className="flex gap-1">
      {RADIUS_OPTIONS.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`w-9 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${
            value === r.key
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function FontSizePicker({
  value,
  onChange,
}: {
  value: FontSize;
  onChange: (v: FontSize) => void;
}) {
  return (
    <div className="flex gap-1">
      {FONT_SIZE_OPTIONS.map((sz) => (
        <button
          key={sz.key}
          onClick={() => onChange(sz.key)}
          className={`px-3 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${
            value === sz.key
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {sz.label}
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  onReset,
  children,
}: {
  title: string;
  icon: string;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={icon} className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground flex-1">{title}</h4>
        <button
          onClick={onReset}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Сбросить
        </button>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function fontSizeClass(fs: FontSize): string {
  if (fs === "compact") return "text-xs";
  if (fs === "large") return "text-base";
  return "text-sm";
}

function ChatPreview({ style }: { style: MessengerStyle }) {
  const radius = radiusToCss(style.msgRadius);
  const fs = fontSizeClass(style.fontSize);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Eye" className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Предпросмотр</h4>
      </div>
      <div className="p-4">
        <div className="w-full max-w-md mx-auto rounded-xl overflow-hidden border border-border shadow-sm">
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: style.headerBg }}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Icon name="User" size={16} style={{ color: style.headerText }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: style.headerText }}>
                Иванов А.П.
              </p>
              <p className="text-[10px] opacity-70" style={{ color: style.headerText }}>
                В сети
              </p>
            </div>
            <Icon name="MoreVertical" size={16} style={{ color: style.headerText }} />
          </div>

          <div
            className="px-4 py-5 space-y-3 min-h-[180px] flex flex-col justify-end"
            style={{ backgroundColor: style.chatBg }}
          >
            <div className="flex justify-start">
              <div
                className={`max-w-[75%] px-3 py-2 ${fs}`}
                style={{
                  backgroundColor: style.otherMsgBg,
                  color: style.otherMsgText,
                  borderRadius: radius,
                }}
              >
                Добрый день! Как обстановка на маршруте?
                <div className="text-[9px] opacity-50 text-right mt-1">12:30</div>
              </div>
            </div>

            <div className="flex justify-end">
              <div
                className={`max-w-[75%] px-3 py-2 ${fs}`}
                style={{
                  backgroundColor: style.myMsgBg,
                  color: style.myMsgText,
                  borderRadius: radius,
                }}
              >
                Все в порядке, следую по графику
                <div className="text-[9px] opacity-50 text-right mt-1">12:31</div>
              </div>
            </div>

            <div className="flex justify-start">
              <div
                className={`max-w-[75%] px-3 py-2 ${fs}`}
                style={{
                  backgroundColor: style.otherMsgBg,
                  color: style.otherMsgText,
                  borderRadius: radius,
                }}
              >
                Принято. На Садовой ремонт, объезжайте
                <div className="text-[9px] opacity-50 text-right mt-1">12:32</div>
              </div>
            </div>
          </div>

          <div
            className="px-3 py-2.5 flex items-center gap-2"
            style={{
              backgroundColor: style.inputBg,
              borderTop: `1px solid ${style.inputBorder}`,
            }}
          >
            <div
              className="flex-1 px-3 py-1.5 text-xs rounded-lg"
              style={{
                backgroundColor: style.inputBg,
                color: style.inputText,
                border: `1px solid ${style.inputBorder}`,
                borderRadius: radiusToCss(style.msgRadius),
              }}
            >
              <span className="opacity-40">Сообщение...</span>
            </div>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: style.sendBtnColor }}
            >
              <Icon name="Send" size={14} style={{ color: style.sendBtnIcon }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessengerSettings() {
  const [config, setConfig] = useState<MessengerConfig>(loadConfig);
  const [platform, setPlatform] = useState<Platform>("tablet");
  const [role, setRole] = useState<Role>("driver");
  const [saved, setSaved] = useState(false);

  const visibleRoles = useMemo(
    () =>
      platform === "tablet"
        ? ROLES.filter((r) => r.key === "driver")
        : ROLES.filter((r) => r.key !== "driver"),
    [platform],
  );

  // When platform changes, auto-select appropriate role
  useEffect(() => {
    if (platform === "tablet") {
      setRole("driver");
    } else if (role === "driver") {
      setRole("dispatcher");
    }
  }, [platform, role]);

  const customTypes = useMemo(() => loadCustomTypesForMessenger(), []);
  const allMessageTypes = useMemo(
    () => [...MESSAGE_TYPE_OPTIONS, ...customTypes.filter((ct) => ct.category === "messages")],
    [customTypes],
  );
  const allNotifTypes = useMemo(
    () => [...NOTIF_TYPE_OPTIONS, ...customTypes.filter((ct) => ct.category === "notifications")],
    [customTypes],
  );

  const current = config[platform][role];

  const update = useCallback(
    (patch: Partial<MessengerStyle>) => {
      setConfig((prev) => {
        const next: MessengerConfig = {
          ...prev,
          [platform]: {
            ...prev[platform],
            [role]: { ...prev[platform][role], ...patch },
          },
        };
        saveConfig(next);
        return next;
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [platform, role],
  );

  const resetSection = useCallback(
    (fields: (keyof MessengerStyle)[]) => {
      const def = defaultStyle();
      const patch: Partial<MessengerStyle> = {};
      for (const f of fields) {
        (patch as Record<string, unknown>)[f] = def[f];
      }
      update(patch);
    },
    [update],
  );

  const resetAll = useCallback(() => {
    const defaults = buildDefaults();
    setConfig(defaults);
    saveConfig(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const toggleType = useCallback(
    (typeKey: string) => {
      const list = current.enabledTypes.includes(typeKey)
        ? current.enabledTypes.filter((t) => t !== typeKey)
        : [...current.enabledTypes, typeKey];
      update({ enabledTypes: list });
    },
    [current.enabledTypes, update],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">Настройки мессенджера</h3>
          <p className="text-sm text-muted-foreground">
            Внешний вид чата для каждой платформы и роли
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
            onClick={resetAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Сбросить все
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platform === p.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={p.icon} className="w-4 h-4" />
            {p.label}
          </button>
        ))}
      </div>

      {platform === "tablet" ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-xl w-fit">
          <Icon name="User" className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Водитель</span>
        </div>
      ) : (
        <div className="flex gap-1.5 flex-wrap">
          {visibleRoles.map((r) => (
            <button
              key={r.key}
              onClick={() => setRole(r.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                role === r.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <SectionCard
            title="Оформление чата"
            icon="Palette"
            onReset={() =>
              resetSection([
                "chatBg",
                "myMsgBg",
                "otherMsgBg",
                "myMsgText",
                "otherMsgText",
                "msgRadius",
                "fontSize",
              ])
            }
          >
            <ColorRow label="Цвет фона чата" value={current.chatBg} onChange={(v) => update({ chatBg: v })} />
            <ColorRow label="Фон моих сообщений" value={current.myMsgBg} onChange={(v) => update({ myMsgBg: v })} />
            <ColorRow label="Фон чужих сообщений" value={current.otherMsgBg} onChange={(v) => update({ otherMsgBg: v })} />
            <ColorRow label="Текст моих сообщений" value={current.myMsgText} onChange={(v) => update({ myMsgText: v })} />
            <ColorRow label="Текст чужих сообщений" value={current.otherMsgText} onChange={(v) => update({ otherMsgText: v })} />
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Скругление сообщений</label>
              <RadiusPicker value={current.msgRadius} onChange={(v) => update({ msgRadius: v })} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Размер шрифта</label>
              <FontSizePicker value={current.fontSize} onChange={(v) => update({ fontSize: v })} />
            </div>
          </SectionCard>

          <SectionCard
            title="Поле ввода"
            icon="TextCursorInput"
            onReset={() =>
              resetSection([
                "inputBg",
                "inputText",
                "inputBorder",
                "sendBtnColor",
                "sendBtnIcon",
              ])
            }
          >
            <ColorRow label="Цвет фона поля" value={current.inputBg} onChange={(v) => update({ inputBg: v })} />
            <ColorRow label="Цвет текста поля" value={current.inputText} onChange={(v) => update({ inputText: v })} />
            <ColorRow label="Цвет рамки поля" value={current.inputBorder} onChange={(v) => update({ inputBorder: v })} />
            <ColorRow label="Цвет кнопки отправки" value={current.sendBtnColor} onChange={(v) => update({ sendBtnColor: v })} />
            <ColorRow label="Цвет иконки отправки" value={current.sendBtnIcon} onChange={(v) => update({ sendBtnIcon: v })} />
          </SectionCard>

          <SectionCard
            title="Шапка мессенджера"
            icon="PanelTop"
            onReset={() => resetSection(["headerBg", "headerText"])}
          >
            <ColorRow label="Цвет фона шапки" value={current.headerBg} onChange={(v) => update({ headerBg: v })} />
            <ColorRow label="Цвет текста шапки" value={current.headerText} onChange={(v) => update({ headerText: v })} />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Типы сообщений при отправке"
            icon="ListChecks"
            onReset={() => resetSection(["enabledTypes"])}
          >
            <p className="text-[11px] text-muted-foreground -mt-1 mb-1">
              Выберите типы, доступные для роли{" "}
              <span className="font-medium text-foreground">
                {visibleRoles.find((r) => r.key === role)?.label || ROLES.find((r) => r.key === role)?.label}
              </span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Типы сообщений
            </p>
            <div className="space-y-1.5 mb-3">
              {allMessageTypes.map((mt) => {
                const ds = getDesignStyle(mt.key);
                const enabled = current.enabledTypes.includes(mt.key);
                return (
                  <button
                    key={mt.key}
                    onClick={() => toggleType(mt.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      enabled
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/20 opacity-60"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: ds.bg }}
                    >
                      <Icon name={ds.icon} className="w-4 h-4" style={{ color: ds.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{mt.label}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        enabled
                          ? "bg-primary border-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      {enabled && <Icon name="Check" className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Типы уведомлений
            </p>
            <div className="space-y-1.5">
              {allNotifTypes.map((nt) => {
                const ds = getDesignStyle(nt.key);
                const enabled = current.enabledTypes.includes(nt.key);
                return (
                  <button
                    key={nt.key}
                    onClick={() => toggleType(nt.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      enabled
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/20 opacity-60"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: ds.bg }}
                    >
                      <Icon name={ds.icon} className="w-4 h-4" style={{ color: ds.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{nt.label}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        enabled
                          ? "bg-primary border-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      {enabled && <Icon name="Check" className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Быстрые ответы" icon="Zap" onReset={() => { /* no-op */ }}>
            <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
              Шаблоны быстрых ответов и уведомлений для роли{" "}
              <span className="font-medium text-foreground">
                {visibleRoles.find((r) => r.key === role)?.label || ROLES.find((r) => r.key === role)?.label}
              </span>
            </p>

            {/* Message templates block */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/20">
                <Icon name="MessageSquare" className="w-4 h-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Шаблоны сообщений</p>
                  <p className="text-[10px] text-muted-foreground">
                    Быстрые ответы для мессенджера
                  </p>
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("navigate-settings-tab", { detail: "message_templates" }));
                  }}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors"
                >
                  <Icon name="Settings" className="w-3 h-3" />
                  Настроить
                </button>
              </div>

              {/* Notification templates block */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/20">
                <Icon name="Bell" className="w-4 h-4 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Шаблоны уведомлений</p>
                  <p className="text-[10px] text-muted-foreground">
                    Готовые уведомления по типам
                  </p>
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("navigate-settings-tab", { detail: "notif_templates" }));
                  }}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-medium hover:bg-amber-600 transition-colors"
                >
                  <Icon name="Settings" className="w-3 h-3" />
                  Настроить
                </button>
              </div>
            </div>
          </SectionCard>

          <ChatPreview style={current} />
        </div>
      </div>
    </div>
  );
}
