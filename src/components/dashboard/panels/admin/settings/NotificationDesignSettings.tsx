import { useState, useCallback, useMemo, useEffect } from "react";
import Icon from "@/components/ui/icon";
import IconPickerModal from "./IconPickerModal";

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type Platform = "tablet" | "dashboard";
type Category = "notifications" | "messages";
type ButtonRadius = "none" | "sm" | "md" | "lg" | "full";
type NotifSize = "compact" | "normal" | "large";

interface TypeStyle {
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: ButtonRadius;
  size: NotifSize;
  showActions: boolean;
}

type DesignConfig = Record<Platform, Record<Category, Record<string, TypeStyle>>>;

/* ──────────────────────────────────────────────────────────
   Type definitions (what the user can customize)
   ────────────────────────────────────────────────────────── */

interface TypeDef {
  key: string;
  label: string;
  defaultIcon: string;
  defaultBg: string;
  previewText: string;
}

const NOTIF_TYPES: TypeDef[] = [
  { key: "info", label: "Информационное", defaultIcon: "Info", defaultBg: "#3b82f6", previewText: "Новая информация доступна" },
  { key: "warning", label: "Предупреждение", defaultIcon: "AlertTriangle", defaultBg: "#f59e0b", previewText: "Внимание! Проверьте параметры" },
  { key: "error", label: "Ошибка", defaultIcon: "AlertCircle", defaultBg: "#ef4444", previewText: "Произошла ошибка системы" },
  { key: "success", label: "Успешно", defaultIcon: "CheckCircle", defaultBg: "#22c55e", previewText: "Операция выполнена успешно" },
  { key: "transport", label: "Транспорт", defaultIcon: "Bus", defaultBg: "#6366f1", previewText: "Обновление данных транспорта" },
  { key: "weather", label: "Погода", defaultIcon: "CloudRain", defaultBg: "#0ea5e9", previewText: "Ожидается ухудшение погоды" },
  { key: "emergency", label: "Экстренное", defaultIcon: "Siren", defaultBg: "#dc2626", previewText: "Экстренное уведомление!" },
  { key: "schedule", label: "Расписание", defaultIcon: "Clock", defaultBg: "#8b5cf6", previewText: "Изменение в расписании" },
  { key: "road", label: "Дорожное", defaultIcon: "Construction", defaultBg: "#f97316", previewText: "Дорожные работы впереди" },
  { key: "message", label: "Сообщение", defaultIcon: "MessageSquare", defaultBg: "#14b8a6", previewText: "Новое сообщение" },
];

const MESSAGE_TYPES: TypeDef[] = [
  { key: "normal", label: "Обычное сообщение", defaultIcon: "MessageSquare", defaultBg: "#3b82f6", previewText: "Обратите внимание на расписание" },
  { key: "dispatcher", label: "От диспетчера", defaultIcon: "Radio", defaultBg: "#ec660c", previewText: "Срочно вернитесь в парк! Техническая проверка ТС." },
  { key: "important", label: "Важное (требует подтверждения)", defaultIcon: "AlertOctagon", defaultBg: "#dc2626", previewText: "Объезд! Перекрыта улица Садовая. Подтвердите получение." },
  { key: "can_error", label: "Ошибка CAN-системы", defaultIcon: "AlertTriangle", defaultBg: "#f59e0b", previewText: "Температура двигателя превышена" },
  { key: "voice", label: "Голосовое сообщение", defaultIcon: "Mic", defaultBg: "#22c55e", previewText: "Голосовое сообщение 12с" },
  { key: "technician", label: "От техника", defaultIcon: "Wrench", defaultBg: "#8b5cf6", previewText: "Пройдите технический осмотр в парке до 14:00" },
  { key: "admin", label: "От администратора", defaultIcon: "ShieldCheck", defaultBg: "#6366f1", previewText: "Обновление регламента перевозок. Ознакомьтесь." },
];

function getTypesByCategory(category: Category, customTypes: CustomTypeDef[]): TypeDef[] {
  const builtIn = category === "notifications" ? NOTIF_TYPES : MESSAGE_TYPES;
  const custom = customTypes.filter(ct => ct.category === category);
  return [...builtIn, ...custom];
}

const RADIUS_OPTIONS: { key: ButtonRadius; label: string; css: string }[] = [
  { key: "none", label: "0", css: "0px" },
  { key: "sm", label: "SM", css: "6px" },
  { key: "md", label: "MD", css: "12px" },
  { key: "lg", label: "LG", css: "20px" },
  { key: "full", label: "Full", css: "9999px" },
];

const SIZE_OPTIONS: { key: NotifSize; label: string }[] = [
  { key: "compact", label: "Компакт" },
  { key: "normal", label: "Обычный" },
  { key: "large", label: "Крупный" },
];

const STORAGE_KEY = "notification_design_v2";
const CUSTOM_TYPES_KEY = "notification_custom_types";

interface CustomTypeDef {
  key: string;
  label: string;
  defaultIcon: string;
  defaultBg: string;
  previewText: string;
  category: Category;
}

function loadCustomTypes(): CustomTypeDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TYPES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveCustomTypes(types: CustomTypeDef[]) {
  try {
    localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(types));
  } catch {
    // ignore
  }
}

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */

function defaultStyleForType(def: TypeDef): TypeStyle {
  return {
    bgColor: def.defaultBg + "1a",
    textColor: "#0f172a",
    borderColor: def.defaultBg + "55",
    icon: def.defaultIcon,
    iconColor: def.defaultBg,
    iconBgColor: def.defaultBg + "22",
    buttonColor: def.defaultBg,
    buttonTextColor: "#ffffff",
    buttonRadius: "lg",
    size: "normal",
    showActions: true,
  };
}

function buildDefaults(customTypes: CustomTypeDef[] = []): DesignConfig {
  const allNotif = [...NOTIF_TYPES, ...customTypes.filter(ct => ct.category === "notifications")];
  const allMsg = [...MESSAGE_TYPES, ...customTypes.filter(ct => ct.category === "messages")];
  const makeCategory = (types: TypeDef[]): Record<string, TypeStyle> => {
    const obj: Record<string, TypeStyle> = {};
    for (const t of types) obj[t.key] = defaultStyleForType(t);
    return obj;
  };
  return {
    tablet: { notifications: makeCategory(allNotif), messages: makeCategory(allMsg) },
    dashboard: { notifications: makeCategory(allNotif), messages: makeCategory(allMsg) },
  };
}

function loadConfig(customTypes: CustomTypeDef[] = []): DesignConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DesignConfig>;
      const defaults = buildDefaults(customTypes);
      for (const p of ["tablet", "dashboard"] as Platform[]) {
        for (const c of ["notifications", "messages"] as Category[]) {
          const types = getTypesByCategory(c, customTypes);
          if (parsed?.[p]?.[c]) {
            for (const t of types) {
              const src = parsed[p]?.[c]?.[t.key];
              if (src) {
                defaults[p][c][t.key] = { ...defaults[p][c][t.key], ...src };
              }
            }
            // Also load any custom type styles that were saved
            for (const key of Object.keys(parsed[p]![c]!)) {
              if (!defaults[p][c][key]) {
                defaults[p][c][key] = { ...defaultStyleForType({ key, label: key, defaultIcon: "Circle", defaultBg: "#6b7280", previewText: "" }), ...parsed[p]![c]![key] };
              }
            }
          }
        }
      }
      return defaults;
    }
  } catch {
    // ignore
  }
  return buildDefaults(customTypes);
}

function saveConfig(config: DesignConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function radiusToCss(r: ButtonRadius): string {
  return RADIUS_OPTIONS.find((o) => o.key === r)?.css ?? "12px";
}

/* ──────────────────────────────────────────────────────────
   Reusable: color row
   ────────────────────────────────────────────────────────── */

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
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

/* ──────────────────────────────────────────────────────────
   PREVIEW — Tablet Message Toast (mirrors MessageToast layout)
   ────────────────────────────────────────────────────────── */

function previewAlert() {
  alert("Это предпросмотр");
}

function TabletMessageToastPreview({
  style,
  typeKey,
  text,
}: {
  style: TypeStyle;
  typeKey: string;
  text: string;
}) {
  const isVoice = typeKey === "voice";
  const radius = radiusToCss(style.buttonRadius);

  const sizeMap: Record<NotifSize, { wrap: string; pad: string; iconBox: string; iconSize: number; titleClass: string; textClass: string; btnClass: string; outerRadius: string }> = {
    compact: { wrap: "gap-3", pad: "p-4", iconBox: "w-12 h-12", iconSize: 22, titleClass: "text-xs", textClass: "text-sm", btnClass: "h-10 text-sm", outerRadius: "1rem" },
    normal: { wrap: "gap-4", pad: "p-6", iconBox: "w-16 h-16", iconSize: 30, titleClass: "text-sm", textClass: "text-lg", btnClass: "h-14 text-base", outerRadius: "1.25rem" },
    large: { wrap: "gap-5", pad: "p-8", iconBox: "w-20 h-20", iconSize: 38, titleClass: "text-base", textClass: "text-2xl", btnClass: "h-16 text-lg", outerRadius: "1.5rem" },
  };
  const s = sizeMap[style.size];

  const label = isVoice
    ? "Голосовое сообщение"
    : typeKey === "dispatcher"
      ? "Диспетчер"
      : typeKey === "can_error"
        ? "CAN-система"
        : "Уведомление";

  return (
    <div
      className={`flex flex-col ${s.wrap} ${s.pad} border-2 w-full pointer-events-auto`}
      style={{
        background: style.bgColor,
        borderColor: style.borderColor,
        color: style.textColor,
        borderRadius: s.outerRadius,
      }}
    >
      <div className="flex items-start gap-4">
        {typeKey === "dispatcher" ? (
          <div
            className={`relative ${s.iconBox} rounded-full flex items-center justify-center flex-shrink-0`}
            style={{ backgroundColor: style.iconBgColor }}
          >
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-40"
              style={{ backgroundColor: style.iconBgColor }}
            />
            <Icon name={style.icon} size={s.iconSize} className="relative z-10" style={{ color: style.iconColor }} />
          </div>
        ) : (
          <div
            className={`${s.iconBox} rounded-2xl flex items-center justify-center flex-shrink-0`}
            style={{ backgroundColor: style.iconBgColor }}
          >
            <Icon name={style.icon} size={s.iconSize} style={{ color: style.iconColor }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            className={`${s.titleClass} font-bold uppercase mb-1 opacity-70`}
            style={{ color: style.textColor }}
          >
            {label}
          </div>
          {isVoice ? (
            <div className="flex items-center gap-3">
              <button
                onClick={previewAlert}
                className="w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all"
                style={{ backgroundColor: style.buttonColor }}
              >
                <Icon name="Play" size={20} style={{ color: style.buttonTextColor }} />
              </button>
              <div>
                <span className={`${s.textClass} font-semibold tabular-nums`} style={{ color: style.textColor }}>
                  12 сек
                </span>
                <p className="text-xs opacity-70 mt-0.5" style={{ color: style.textColor }}>
                  Нажмите ▶ для воспроизведения
                </p>
              </div>
            </div>
          ) : (
            <p className={`${s.textClass} font-semibold leading-snug`} style={{ color: style.textColor }}>
              {text}
            </p>
          )}
        </div>
      </div>

      {style.showActions && (
        <div className="flex gap-3 w-full">
          {isVoice ? (
            <>
              <button
                onClick={previewAlert}
                className={`flex-1 ${s.btnClass} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
                style={{
                  backgroundColor: style.buttonColor,
                  color: style.buttonTextColor,
                  borderRadius: radius,
                }}
              >
                Прослушать
              </button>
              <button
                onClick={previewAlert}
                className={`flex-1 ${s.btnClass} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
                style={{
                  backgroundColor: style.buttonColor,
                  color: style.buttonTextColor,
                  borderRadius: radius,
                  filter: "brightness(0.85)",
                }}
              >
                Принято
              </button>
            </>
          ) : typeKey === "can_error" ? (
            <button
              onClick={previewAlert}
              className={`flex-1 ${s.btnClass} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
              style={{
                backgroundColor: style.buttonColor,
                color: style.buttonTextColor,
                borderRadius: radius,
              }}
            >
              Принято
            </button>
          ) : (
            <>
              <button
                onClick={previewAlert}
                className={`flex-[2] ${s.btnClass} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
                style={{
                  backgroundColor: style.buttonColor,
                  color: style.buttonTextColor,
                  borderRadius: radius,
                }}
              >
                Принято
              </button>
              <button
                onClick={previewAlert}
                className={`flex-[1] ${s.btnClass} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
                style={{
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  borderRadius: radius,
                }}
              >
                Да
              </button>
              <button
                onClick={previewAlert}
                className={`flex-[1] ${s.btnClass} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
                style={{
                  backgroundColor: "#f43f5e",
                  color: "#ffffff",
                  borderRadius: radius,
                }}
              >
                Нет
              </button>
              <button
                onClick={previewAlert}
                className={`flex-[2] ${s.btnClass} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
                style={{
                  backgroundColor: style.buttonColor,
                  color: style.buttonTextColor,
                  borderRadius: radius,
                  filter: "brightness(0.85)",
                }}
              >
                Ответить
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   PREVIEW — Tablet Important Overlay (mirrors ImportantMessageOverlay)
   ────────────────────────────────────────────────────────── */

function TabletImportantPreview({
  style,
  text,
}: {
  style: TypeStyle;
  text: string;
}) {
  const radius = radiusToCss(style.buttonRadius);

  const sizeMap: Record<NotifSize, { headerPad: string; bodyPad: string; iconBox: string; iconSize: number; title: string; subtitle: string; body: string; btn: string; outerRadius: string }> = {
    compact: { headerPad: "p-4", bodyPad: "p-4", iconBox: "w-14 h-14", iconSize: 28, title: "text-xs", subtitle: "text-base", body: "text-sm", btn: "py-3 text-base", outerRadius: "1rem" },
    normal: { headerPad: "p-6", bodyPad: "p-6", iconBox: "w-16 h-16", iconSize: 34, title: "text-sm", subtitle: "text-xl", body: "text-lg", btn: "py-5 text-xl", outerRadius: "1.25rem" },
    large: { headerPad: "p-8", bodyPad: "p-8", iconBox: "w-20 h-20", iconSize: 40, title: "text-base", subtitle: "text-2xl", body: "text-xl", btn: "py-6 text-2xl", outerRadius: "1.5rem" },
  };
  const s = sizeMap[style.size];

  return (
    <div className="w-full">
      <div
        className={`${s.headerPad} flex items-center gap-4`}
        style={{
          background: style.buttonColor,
          borderTopLeftRadius: s.outerRadius,
          borderTopRightRadius: s.outerRadius,
        }}
      >
        <div
          className={`${s.iconBox} rounded-2xl flex items-center justify-center flex-shrink-0`}
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <Icon name={style.icon} size={s.iconSize} style={{ color: style.buttonTextColor }} />
        </div>
        <div>
          <div
            className={`${s.title} font-medium uppercase tracking-wide opacity-80`}
            style={{ color: style.buttonTextColor }}
          >
            ⚠ ВАЖНОЕ СООБЩЕНИЕ
          </div>
          <div className={`${s.subtitle} font-bold`} style={{ color: style.buttonTextColor }}>
            Требует подтверждения
          </div>
        </div>
        <div
          className="ml-auto text-3xl font-mono tabular-nums opacity-70"
          style={{ color: style.buttonTextColor }}
        >
          3с
        </div>
      </div>

      <div
        className={s.bodyPad}
        style={{
          background: style.bgColor,
          borderBottomLeftRadius: s.outerRadius,
          borderBottomRightRadius: s.outerRadius,
          borderLeft: `2px solid ${style.borderColor}`,
          borderRight: `2px solid ${style.borderColor}`,
          borderBottom: `2px solid ${style.borderColor}`,
        }}
      >
        <p className={`${s.body} leading-relaxed mb-4`} style={{ color: style.textColor }}>
          {text}
        </p>

        <div className="flex items-center justify-between text-xs mb-4 opacity-70" style={{ color: style.textColor }}>
          <span>12:34</span>
          <span className="flex items-center gap-1">
            <Icon name="Clock" size={14} />
            Время реакции фиксируется
          </span>
        </div>

        {style.showActions && (
          <div className="flex gap-3">
            <button
              onClick={previewAlert}
              className={`flex-[2] ${s.btn} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
              style={{
                backgroundColor: style.buttonColor,
                color: style.buttonTextColor,
                borderRadius: radius,
              }}
            >
              Принял
            </button>
            <button
              onClick={previewAlert}
              className={`flex-[1] ${s.btn} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                borderRadius: radius,
              }}
            >
              Да
            </button>
            <button
              onClick={previewAlert}
              className={`flex-[1] ${s.btn} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
              style={{
                backgroundColor: "#f43f5e",
                color: "#ffffff",
                borderRadius: radius,
              }}
            >
              Нет
            </button>
            <button
              onClick={previewAlert}
              className={`flex-[2] ${s.btn} font-bold flex items-center justify-center active:scale-[0.98] transition-all`}
              style={{
                backgroundColor: style.buttonColor,
                color: style.buttonTextColor,
                borderRadius: radius,
                filter: "brightness(0.85)",
              }}
            >
              Ответить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   PREVIEW — Dashboard toast / chat bubble
   ────────────────────────────────────────────────────────── */

function DashboardNotifPreview({
  style,
  def,
  text,
  typeKey,
}: {
  style: TypeStyle;
  def: TypeDef;
  text: string;
  typeKey?: string;
}) {
  const isVoice = typeKey === "voice";
  const radius = radiusToCss(style.buttonRadius);
  const sizeMap: Record<NotifSize, { pad: string; iconBox: string; iconSize: number; title: string; body: string; btn: string }> = {
    compact: { pad: "p-3", iconBox: "w-8 h-8", iconSize: 14, title: "text-xs font-semibold", body: "text-[11px]", btn: "px-3 py-1 text-[11px]" },
    normal: { pad: "p-4", iconBox: "w-10 h-10", iconSize: 18, title: "text-sm font-semibold", body: "text-xs", btn: "px-4 py-1.5 text-xs" },
    large: { pad: "p-5", iconBox: "w-12 h-12", iconSize: 22, title: "text-base font-bold", body: "text-sm", btn: "px-5 py-2 text-sm" },
  };
  const s = sizeMap[style.size];

  return (
    <div
      className={`${s.pad} border rounded-xl shadow-sm w-full max-w-md flex items-start gap-3`}
      style={{
        background: style.bgColor,
        borderColor: style.borderColor,
        color: style.textColor,
      }}
    >
      <div
        className={`${s.iconBox} rounded-lg flex items-center justify-center shrink-0`}
        style={{ backgroundColor: style.iconBgColor }}
      >
        <Icon name={style.icon} size={s.iconSize} style={{ color: style.iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={s.title} style={{ color: style.textColor }}>
          {def.label}
        </p>
        {isVoice ? (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={previewAlert}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: style.buttonColor }}
            >
              <Icon name="Play" size={14} style={{ color: style.buttonTextColor }} />
            </button>
            <span className={`${s.body} font-semibold tabular-nums`} style={{ color: style.textColor }}>
              12 сек
            </span>
          </div>
        ) : (
          <p className={`${s.body} mt-0.5 opacity-80`} style={{ color: style.textColor }}>
            {text}
          </p>
        )}
        {style.showActions && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={previewAlert}
              className={`${s.btn} font-medium`}
              style={{
                backgroundColor: style.buttonColor,
                color: style.buttonTextColor,
                borderRadius: radius,
              }}
            >
              {isVoice ? "Прослушать" : "Принято"}
            </button>
            <button
              onClick={previewAlert}
              className={`${s.btn} font-medium`}
              style={{
                backgroundColor: "transparent",
                color: style.textColor,
                borderRadius: radius,
                border: `1px solid ${style.borderColor}`,
              }}
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardChatBubblePreview({
  style,
  def,
  text,
  typeKey,
}: {
  style: TypeStyle;
  def: TypeDef;
  text: string;
  typeKey?: string;
}) {
  const isVoice = typeKey === "voice";
  const radius = radiusToCss(style.buttonRadius);
  const sizeMap: Record<NotifSize, { pad: string; iconBox: string; iconSize: number; title: string; body: string; btn: string }> = {
    compact: { pad: "p-3", iconBox: "w-7 h-7", iconSize: 14, title: "text-[11px] font-semibold", body: "text-xs", btn: "px-2.5 py-1 text-[11px]" },
    normal: { pad: "p-4", iconBox: "w-9 h-9", iconSize: 16, title: "text-xs font-semibold", body: "text-sm", btn: "px-3 py-1.5 text-xs" },
    large: { pad: "p-5", iconBox: "w-11 h-11", iconSize: 20, title: "text-sm font-bold", body: "text-base", btn: "px-4 py-2 text-sm" },
  };
  const s = sizeMap[style.size];

  return (
    <div
      className={`${s.pad} border rounded-2xl w-full max-w-md`}
      style={{
        background: style.bgColor,
        borderColor: style.borderColor,
        color: style.textColor,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`${s.iconBox} rounded-lg flex items-center justify-center shrink-0`}
          style={{ backgroundColor: style.iconBgColor }}
        >
          <Icon name={style.icon} size={s.iconSize} style={{ color: style.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={s.title} style={{ color: style.textColor }}>
              {def.label}
            </p>
            <span className="text-[10px] opacity-60" style={{ color: style.textColor }}>
              12:34
            </span>
          </div>
          {isVoice ? (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={previewAlert}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: style.buttonColor }}
              >
                <Icon name="Play" size={14} style={{ color: style.buttonTextColor }} />
              </button>
              <span className={`${s.body} font-semibold tabular-nums`} style={{ color: style.textColor }}>
                0:12
              </span>
            </div>
          ) : (
            <p className={`${s.body} mt-1 leading-snug`} style={{ color: style.textColor }}>
              {text}
            </p>
          )}
          {style.showActions && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={previewAlert}
                className={`${s.btn} font-medium`}
                style={{
                  backgroundColor: style.buttonColor,
                  color: style.buttonTextColor,
                  borderRadius: radius,
                }}
              >
                {isVoice ? "Прослушать" : "Ответить"}
              </button>
              <button
                onClick={previewAlert}
                className={`${s.btn} font-medium`}
                style={{
                  backgroundColor: "transparent",
                  color: style.textColor,
                  borderRadius: radius,
                  border: `1px solid ${style.borderColor}`,
                }}
              >
                Отметить прочитанным
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────── */

export default function NotificationDesignSettings() {
  const [customTypes, setCustomTypes] = useState<CustomTypeDef[]>(loadCustomTypes);
  const [config, setConfig] = useState<DesignConfig>(() => loadConfig(customTypes));
  const [platform, setPlatform] = useState<Platform>("tablet");
  const [category, setCategory] = useState<Category>("notifications");
  const [selectedType, setSelectedType] = useState<string>(NOTIF_TYPES[0].key);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerContext, setIconPickerContext] = useState<"style" | "newType">("style");
  const [saved, setSaved] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newType, setNewType] = useState<{label: string; icon: string; color: string; previewText: string}>({
    label: "", icon: "Star", color: "#6b7280", previewText: ""
  });

  // When category changes, make sure selectedType exists in that category
  useEffect(() => {
    const list = getTypesByCategory(category, customTypes);
    if (!list.some((t) => t.key === selectedType)) {
      setSelectedType(list[0].key);
    }
  }, [category, selectedType, customTypes]);

  const currentTypes = useMemo(
    () => getTypesByCategory(category, customTypes),
    [category, customTypes]
  );
  const selectedMeta = useMemo(
    () => currentTypes.find((t) => t.key === selectedType) ?? currentTypes[0],
    [currentTypes, selectedType],
  );
  const currentStyle: TypeStyle =
    config[platform][category][selectedMeta.key] ?? defaultStyleForType(selectedMeta);

  const updateStyle = useCallback(
    (patch: Partial<TypeStyle>) => {
      setConfig((prev) => {
        const next: DesignConfig = {
          ...prev,
          [platform]: {
            ...prev[platform],
            [category]: {
              ...prev[platform][category],
              [selectedMeta.key]: { ...prev[platform][category][selectedMeta.key], ...patch },
            },
          },
        };
        saveConfig(next);
        return next;
      });
    },
    [platform, category, selectedMeta.key],
  );

  const resetType = useCallback(() => {
    const style = defaultStyleForType(selectedMeta);
    setConfig((prev) => {
      const next: DesignConfig = {
        ...prev,
        [platform]: {
          ...prev[platform],
          [category]: { ...prev[platform][category], [selectedMeta.key]: style },
        },
      };
      saveConfig(next);
      return next;
    });
  }, [platform, category, selectedMeta]);

  const resetAll = useCallback(() => {
    const defaults = buildDefaults(customTypes);
    setConfig(defaults);
    saveConfig(defaults);
  }, [customTypes]);

  const handleCreateCustomType = useCallback(() => {
    if (!newType.label.trim()) return;
    const key = "custom_" + newType.label.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "_") + "_" + Date.now();
    const ct: CustomTypeDef = {
      key,
      label: newType.label.trim(),
      defaultIcon: newType.icon,
      defaultBg: newType.color,
      previewText: newType.previewText || newType.label,
      category,
    };
    const updated = [...customTypes, ct];
    setCustomTypes(updated);
    saveCustomTypes(updated);
    // Add default style for new type in config
    const style = defaultStyleForType(ct);
    setConfig(prev => {
      const next = { ...prev };
      for (const p of ["tablet", "dashboard"] as Platform[]) {
        next[p] = { ...next[p], [category]: { ...next[p][category], [key]: style } };
      }
      saveConfig(next);
      return next;
    });
    setSelectedType(key);
    setShowCreateModal(false);
    setNewType({ label: "", icon: "Star", color: "#6b7280", previewText: "" });
  }, [newType, category, customTypes]);

  const handleDeleteCustomType = useCallback((key: string) => {
    const updated = customTypes.filter(ct => ct.key !== key);
    setCustomTypes(updated);
    saveCustomTypes(updated);
    // Remove from config
    setConfig(prev => {
      const next = { ...prev };
      for (const p of ["tablet", "dashboard"] as Platform[]) {
        for (const c of ["notifications", "messages"] as Category[]) {
          const catObj = { ...next[p][c] };
          delete catObj[key];
          next[p] = { ...next[p], [c]: catObj };
        }
      }
      saveConfig(next);
      return next;
    });
    if (selectedType === key) {
      const types = getTypesByCategory(category, updated);
      setSelectedType(types[0]?.key || "");
    }
  }, [customTypes, category, selectedType]);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── Preview renderer ── */
  const renderPreview = () => {
    if (platform === "tablet") {
      if (category === "messages") {
        if (selectedMeta.key === "important") {
          return <TabletImportantPreview style={currentStyle} text={selectedMeta.previewText} />;
        }
        return (
          <TabletMessageToastPreview
            style={currentStyle}
            typeKey={selectedMeta.key}
            text={selectedMeta.previewText}
          />
        );
      }
      // tablet notifications — use the message toast layout as it matches the tablet style
      return (
        <TabletMessageToastPreview
          style={currentStyle}
          typeKey="normal"
          text={selectedMeta.previewText}
        />
      );
    }
    // dashboard
    if (category === "messages") {
      return (
        <DashboardChatBubblePreview
          style={currentStyle}
          def={selectedMeta}
          text={selectedMeta.previewText}
          typeKey={selectedMeta.key}
        />
      );
    }
    return (
      <DashboardNotifPreview
        style={currentStyle}
        def={selectedMeta}
        text={selectedMeta.previewText}
        typeKey={selectedMeta.key}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Дизайн уведомлений и сообщений
          </h3>
          <p className="text-sm text-muted-foreground">
            Настройте внешний вид уведомлений и сообщений для планшета и дашборда
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
            Сбросить всё
          </button>
        </div>
      </div>

      {/* Platform tabs (outer) */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(
          [
            { key: "tablet" as Platform, label: "Планшет водителя", icon: "Tablet" },
            { key: "dashboard" as Platform, label: "Дашборд", icon: "Monitor" },
          ] as const
        ).map((p) => (
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

      {/* Category tabs (inner) */}
      <div className="flex gap-1 border-b border-border">
        {(
          [
            { key: "notifications" as Category, label: "Уведомления", icon: "Bell" },
            { key: "messages" as Category, label: "Сообщения", icon: "MessageCircle" },
          ] as const
        ).map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors ${
              category === c.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={c.icon} className="w-4 h-4" />
            {c.label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 min-h-[600px]">
        {/* ── Left: type list ── */}
        <div className="w-[280px] shrink-0 bg-card border border-border rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
            <Icon
              name={category === "notifications" ? "Bell" : "MessageCircle"}
              className="w-4 h-4 text-primary"
            />
            <h4 className="text-sm font-semibold text-foreground">
              {category === "notifications" ? "Типы уведомлений" : "Типы сообщений"}
            </h4>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">
              {currentTypes.length}
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="ml-1 w-6 h-6 rounded-md bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
              title="Создать новый тип"
            >
              <Icon name="Plus" className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {currentTypes.map((t) => {
              const style = config[platform][category][t.key] ?? defaultStyleForType(t);
              const isSelected = selectedType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setSelectedType(t.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-muted/40 border-l-2 border-l-transparent"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: style.iconBgColor }}
                  >
                    <Icon
                      name={style.icon}
                      className="w-4 h-4"
                      style={{ color: style.iconColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.label}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <div
                        className="w-4 h-2 rounded-sm border border-border/40"
                        style={{ backgroundColor: style.bgColor }}
                        title="Фон"
                      />
                      <div
                        className="w-4 h-2 rounded-sm border border-border/40"
                        style={{ backgroundColor: style.iconColor }}
                        title="Иконка"
                      />
                      <div
                        className="w-4 h-2 rounded-sm border border-border/40"
                        style={{ backgroundColor: style.buttonColor }}
                        title="Кнопка"
                      />
                    </div>
                  </div>
                  {isSelected && (
                    <Icon name="ChevronRight" className="w-4 h-4 text-primary shrink-0" />
                  )}
                  {customTypes.some(ct => ct.key === t.key) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomType(t.key);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Удалить тип"
                    >
                      <Icon name="X" className="w-3 h-3" />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: editor + preview ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Editor */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: currentStyle.iconBgColor }}
              >
                <Icon
                  name={currentStyle.icon}
                  className="w-3.5 h-3.5"
                  style={{ color: currentStyle.iconColor }}
                />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {selectedMeta.label}
              </h4>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {platform === "tablet" ? "Планшет" : "Дашборд"} ·{" "}
                {category === "notifications" ? "Уведомления" : "Сообщения"}
              </span>
              <button
                onClick={() => { resetType(); flash(); }}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Сбросить тип
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Colors column */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Цвета
                </p>
                <ColorRow
                  label="Фон"
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
                    onClick={() => { setIconPickerContext("style"); setIconPickerOpen(true); }}
                    className="flex items-center gap-2 h-7 px-3 rounded-lg border border-border bg-background text-foreground text-xs hover:bg-muted transition-colors"
                  >
                    <Icon name={currentStyle.icon} className="w-4 h-4 text-primary" />
                    <span className="truncate max-w-[80px]">{currentStyle.icon}</span>
                  </button>
                </div>

                <ColorRow
                  label="Цвет иконки"
                  value={currentStyle.iconColor}
                  onChange={(v) => updateStyle({ iconColor: v })}
                />
                <ColorRow
                  label="Фон иконки"
                  value={currentStyle.iconBgColor}
                  onChange={(v) => updateStyle({ iconBgColor: v })}
                />
              </div>

              {/* Button + size column */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Кнопки и размер
                </p>
                <ColorRow
                  label="Цвет кнопки"
                  value={currentStyle.buttonColor}
                  onChange={(v) => updateStyle({ buttonColor: v })}
                />
                <ColorRow
                  label="Цвет текста кнопки"
                  value={currentStyle.buttonTextColor}
                  onChange={(v) => updateStyle({ buttonTextColor: v })}
                />

                {/* Button radius */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Скругление кнопки</label>
                  <div className="flex gap-1">
                    {RADIUS_OPTIONS.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => updateStyle({ buttonRadius: r.key })}
                        className={`w-9 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${
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
                    {SIZE_OPTIONS.map((sz) => (
                      <button
                        key={sz.key}
                        onClick={() => updateStyle({ size: sz.key })}
                        className={`px-3 h-7 flex items-center justify-center rounded text-[10px] font-medium transition-colors ${
                          currentStyle.size === sz.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show actions */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">
                    Показывать кнопки действий
                  </label>
                  <button
                    onClick={() => updateStyle({ showActions: !currentStyle.showActions })}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      currentStyle.showActions ? "bg-primary" : "bg-muted"
                    }`}
                    aria-pressed={currentStyle.showActions}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${
                        currentStyle.showActions ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Icon name="Eye" className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Предпросмотр</h4>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {platform === "tablet" ? "Как на планшете водителя" : "Как на дашборде"}
              </span>
            </div>
            <div
              className={`p-6 flex items-center justify-center min-h-[260px] ${
                platform === "tablet"
                  ? "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
                  : "bg-muted/30"
              }`}
            >
              <div className={platform === "tablet" ? "w-full max-w-2xl" : "w-full flex justify-start"}>
                {renderPreview()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Icon picker modal */}
      <IconPickerModal
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        selected={iconPickerContext === "newType" ? newType.icon : currentStyle.icon}
        onSelect={(name) => {
          if (iconPickerContext === "newType") {
            setNewType(prev => ({ ...prev, icon: name }));
          } else {
            updateStyle({ icon: name });
          }
          setIconPickerOpen(false);
        }}
      />

      {/* Create custom type modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Icon name="Plus" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground flex-1">
                Новый тип {category === "notifications" ? "уведомления" : "сообщения"}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Название</label>
                <input type="text" value={newType.label} onChange={e => setNewType({...newType, label: e.target.value})}
                  placeholder="Например: От бортового компьютера"
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Текст примера</label>
                <input type="text" value={newType.previewText} onChange={e => setNewType({...newType, previewText: e.target.value})}
                  placeholder="Текст для предпросмотра..."
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Иконка</label>
                  <button type="button" onClick={() => { setIconPickerContext("newType"); setIconPickerOpen(true); }}
                    className="w-full flex items-center gap-2 text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground hover:bg-muted transition-colors text-left">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: newType.color + "22" }}>
                      <Icon name={newType.icon} className="w-4 h-4" style={{ color: newType.color }} />
                    </div>
                    <span className="truncate">{newType.icon}</span>
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Цвет</label>
                  <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5">
                    <input type="color" value={newType.color} onChange={e => setNewType({...newType, color: e.target.value})}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
                    <span className="text-sm text-foreground font-mono">{newType.color}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={handleCreateCustomType} disabled={!newType.label.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                <Icon name="Plus" className="w-4 h-4" />
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}