import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import IconPickerModal from "./IconPickerModal";
import urls from "../../../../../../backend/func2url.json";

const API_URL = (urls as Record<string, string>)["dashboard-messages"];
const TOKEN_KEY = "dashboard_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["X-Dashboard-Token"] = t;
  return h;
}

const CATEGORIES = [
  { key: "transport", label: "Транспорт" },
  { key: "weather", label: "Погода" },
  { key: "road", label: "Дорога" },
  { key: "gibdd", label: "ГИБДД" },
  { key: "schedule", label: "Расписание" },
  { key: "emergency", label: "Экстренное" },
  { key: "info", label: "Информация" },
  { key: "general", label: "Общее" },
];

const CATEGORY_BADGE: Record<string, string> = {
  transport: "bg-blue-500/15 text-blue-600",
  weather: "bg-sky-500/15 text-sky-600",
  road: "bg-orange-500/15 text-orange-600",
  gibdd: "bg-red-500/15 text-red-600",
  schedule: "bg-purple-500/15 text-purple-600",
  emergency: "bg-rose-500/15 text-rose-600",
  info: "bg-cyan-500/15 text-cyan-600",
  general: "bg-muted text-muted-foreground",
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

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

function getNotifDesignStyle(typeKey: string): { bg: string; icon: string; iconColor: string } {
  try {
    const raw = localStorage.getItem("notification_design_v2");
    if (!raw) {
      const opt = NOTIF_TYPE_OPTIONS.find((o) => o.key === typeKey);
      return { bg: (opt?.color || "#3b82f6") + "1a", icon: opt?.icon || "Info", iconColor: opt?.color || "#3b82f6" };
    }
    const cfg = JSON.parse(raw);
    const style = cfg?.tablet?.notifications?.[typeKey] || cfg?.dashboard?.notifications?.[typeKey];
    if (style) return { bg: style.iconBgColor, icon: style.icon, iconColor: style.iconColor };
  } catch {
    // ignore
  }
  const opt = NOTIF_TYPE_OPTIONS.find((o) => o.key === typeKey);
  return { bg: (opt?.color || "#3b82f6") + "1a", icon: opt?.icon || "Info", iconColor: opt?.color || "#3b82f6" };
}

const ROLE_OPTIONS = [
  { key: "dispatcher", label: "Диспетчер" },
  { key: "technician", label: "Технолог" },
  { key: "mechanic", label: "Механик" },
  { key: "admin", label: "Администратор" },
  { key: "driver", label: "Водитель" },
];

const ICON_CHOICES = [
  "Bus",
  "Train",
  "Truck",
  "Car",
  "CloudRain",
  "CloudSnow",
  "Sun",
  "Wind",
  "Thermometer",
  "Construction",
  "AlertTriangle",
  "Shield",
  "Clock",
  "MapPin",
  "Route",
  "Siren",
  "Zap",
  "Fuel",
  "Wrench",
  "Radio",
];

const PRIORITY_OPTIONS: { key: Priority; label: string; color: string }[] = [
  { key: "low", label: "Низкий", color: "bg-muted text-muted-foreground" },
  { key: "normal", label: "Обычный", color: "bg-blue-500/15 text-blue-600" },
  { key: "high", label: "Высокий", color: "bg-amber-500/15 text-amber-600" },
  { key: "critical", label: "Критический", color: "bg-red-500/15 text-red-600" },
];

type Priority = "low" | "normal" | "high" | "critical";

interface NotifTemplate {
  id: number;
  title: string;
  content: string;
  category: string;
  icon: string;
  target_roles: string[];
  geo_city?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_radius_km?: number | null;
  priority: Priority;
  is_active?: boolean;
  notification_type?: string;
}

interface EditorState {
  id?: number;
  title: string;
  content: string;
  category: string;
  icon: string;
  target_roles: string[];
  geo_city: string;
  geo_lat: string;
  geo_lng: string;
  geo_radius_km: string;
  priority: Priority;
  is_active: boolean;
  notification_type: string;
}

function emptyEditor(): EditorState {
  return {
    title: "",
    content: "",
    category: "general",
    icon: "Bus",
    target_roles: ["driver"],
    geo_city: "",
    geo_lat: "",
    geo_lng: "",
    geo_radius_km: "",
    priority: "normal",
    is_active: true,
    notification_type: "info",
  };
}

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.key, r.label])
);

const ROLE_BADGE: Record<string, string> = {
  dispatcher: "bg-blue-500/15 text-blue-600",
  technician: "bg-purple-500/15 text-purple-600",
  mechanic: "bg-amber-500/15 text-amber-600",
  admin: "bg-red-500/15 text-red-600",
  driver: "bg-green-500/15 text-green-600",
};

export default function NotificationTemplateSettings() {
  const [items, setItems] = useState<NotifTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}?action=notif_templates`, {
        headers: hdrs(),
      });
      const data = await res.json();
      setItems(data.templates || []);
    } catch {
      setError("Ошибка загрузки шаблонов уведомлений");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => setEditor(emptyEditor());

  const openEdit = (t: NotifTemplate) => {
    setEditor({
      id: t.id,
      title: t.title,
      content: t.content,
      category: t.category || "general",
      icon: t.icon || "Bus",
      target_roles: Array.isArray(t.target_roles) ? t.target_roles : [],
      geo_city: t.geo_city || "",
      geo_lat: t.geo_lat != null ? String(t.geo_lat) : "",
      geo_lng: t.geo_lng != null ? String(t.geo_lng) : "",
      geo_radius_km: t.geo_radius_km != null ? String(t.geo_radius_km) : "",
      priority: t.priority || "normal",
      is_active: t.is_active !== false,
      notification_type: t.notification_type || "info",
    });
  };

  const toggleRole = (role: string) => {
    if (!editor) return;
    const next = editor.target_roles.includes(role)
      ? editor.target_roles.filter((r) => r !== role)
      : [...editor.target_roles, role];
    setEditor({ ...editor, target_roles: next });
  };

  const handleSave = async () => {
    if (!editor) return;
    if (!editor.title.trim() || !editor.content.trim()) {
      setError("Заполните заголовок и текст");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const method = editor.id ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        title: editor.title,
        content: editor.content,
        category: editor.category,
        icon: editor.icon,
        target_roles: editor.target_roles,
        geo_city: editor.geo_city || null,
        geo_lat: editor.geo_lat ? Number(editor.geo_lat) : null,
        geo_lng: editor.geo_lng ? Number(editor.geo_lng) : null,
        geo_radius_km: editor.geo_radius_km
          ? Number(editor.geo_radius_km)
          : null,
        priority: editor.priority,
        notification_type: editor.notification_type,
      };
      if (editor.id) {
        body.id = editor.id;
        body.is_active = editor.is_active;
      }
      const res = await fetch(`${API_URL}?action=notif_template`, {
        method,
        headers: hdrs(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setEditor(null);
      await load();
    } catch {
      setError("Ошибка сохранения");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_URL}?action=notif_template&id=${id}`, {
        method: "DELETE",
        headers: hdrs(),
      });
      setConfirmDelete(null);
      await load();
    } catch {
      setError("Ошибка удаления");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Шаблоны уведомлений
          </h3>
          <p className="text-sm text-muted-foreground">
            Категории, целевые роли, геолокация и приоритет
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Добавить шаблон уведомления
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-500 flex items-center gap-1">
          <Icon name="AlertCircle" className="w-3 h-3" />
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Шаблоны уведомлений не найдены
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon
                    name={t.icon || "BellRing"}
                    className="w-5 h-5 text-primary"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {t.title}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        CATEGORY_BADGE[t.category] ||
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {CATEGORY_LABEL[t.category] || t.category}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        PRIORITY_OPTIONS.find((p) => p.key === t.priority)
                          ?.color || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {PRIORITY_OPTIONS.find((p) => p.key === t.priority)
                        ?.label || t.priority}
                    </span>
                    {t.notification_type && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: getNotifDesignStyle(t.notification_type).bg }}
                      >
                        <Icon
                          name={getNotifDesignStyle(t.notification_type).icon}
                          className="w-2.5 h-2.5"
                          style={{ color: getNotifDesignStyle(t.notification_type).iconColor }}
                        />
                        {NOTIF_TYPE_OPTIONS.find((o) => o.key === t.notification_type)?.label || t.notification_type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {t.content}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {(t.target_roles || []).map((r) => (
                      <span
                        key={r}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          ROLE_BADGE[r] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ROLE_LABEL[r] || r}
                      </span>
                    ))}
                    {(t.geo_city ||
                      t.geo_lat != null ||
                      t.geo_radius_km != null) && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                        <Icon name="MapPin" className="w-2.5 h-2.5" />
                        {t.geo_city || "Гео"}
                        {t.geo_radius_km != null
                          ? ` · ${t.geo_radius_km} км`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Редактировать"
                  >
                    <Icon name="Pencil" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(t.id)}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                    title="Удалить"
                  >
                    <Icon name="Trash2" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditor(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center gap-2 sticky top-0 bg-card z-10">
              <Icon name="BellRing" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground flex-1">
                {editor.id
                  ? "Редактировать шаблон уведомления"
                  : "Новый шаблон уведомления"}
              </h3>
              <button
                onClick={() => setEditor(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Заголовок
                </label>
                <input
                  type="text"
                  value={editor.title}
                  onChange={(e) =>
                    setEditor({ ...editor, title: e.target.value })
                  }
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Текст
                </label>
                <textarea
                  value={editor.content}
                  onChange={(e) =>
                    setEditor({ ...editor, content: e.target.value })
                  }
                  rows={4}
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Тип уведомления
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {NOTIF_TYPE_OPTIONS.map((nt) => {
                    const ds = getNotifDesignStyle(nt.key);
                    const active = editor.notification_type === nt.key;
                    return (
                      <button
                        key={nt.key}
                        type="button"
                        onClick={() => setEditor({ ...editor, notification_type: nt.key })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          active
                            ? "ring-2 ring-primary/50 border-primary/50"
                            : "border-border hover:border-primary/30"
                        }`}
                        style={{ backgroundColor: active ? ds.bg : undefined }}
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ backgroundColor: ds.bg }}
                        >
                          <Icon name={ds.icon} className="w-3 h-3" style={{ color: ds.iconColor }} />
                        </div>
                        <span className={active ? "text-foreground" : "text-muted-foreground"}>
                          {nt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Категория
                  </label>
                  <select
                    value={editor.category}
                    onChange={(e) =>
                      setEditor({ ...editor, category: e.target.value })
                    }
                    className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Приоритет
                  </label>
                  <select
                    value={editor.priority}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        priority: e.target.value as Priority,
                      })
                    }
                    className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Иконка
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIconPickerOpen(true)}
                    className="flex items-center gap-2 flex-1 text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name={editor.icon || "Bus"} className="w-4 h-4 text-primary" />
                    </div>
                    <span className="truncate">{editor.icon || "Выбрать иконку"}</span>
                  </button>
                </div>
                <IconPickerModal
                  open={iconPickerOpen}
                  onClose={() => setIconPickerOpen(false)}
                  selected={editor.icon}
                  onSelect={(name) => setEditor({ ...editor, icon: name })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Целевые роли
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const active = editor.target_roles.includes(r.key);
                    return (
                      <button
                        key={r.key}
                        onClick={() => toggleRole(r.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {active && <Icon name="Check" className="w-3 h-3" />}
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border border-border rounded-xl p-3 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Icon name="MapPin" className="w-3.5 h-3.5 text-primary" />
                  Геолокация (опционально)
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    Город
                  </label>
                  <input
                    type="text"
                    value={editor.geo_city}
                    onChange={(e) =>
                      setEditor({ ...editor, geo_city: e.target.value })
                    }
                    placeholder="Москва"
                    className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      Широта
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={editor.geo_lat}
                      onChange={(e) =>
                        setEditor({ ...editor, geo_lat: e.target.value })
                      }
                      placeholder="55.7558"
                      className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      Долгота
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={editor.geo_lng}
                      onChange={(e) =>
                        setEditor({ ...editor, geo_lng: e.target.value })
                      }
                      placeholder="37.6176"
                      className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">
                      Радиус (км)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editor.geo_radius_km}
                      onChange={(e) =>
                        setEditor({ ...editor, geo_radius_km: e.target.value })
                      }
                      placeholder="5"
                      className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              {editor.id && (
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editor.is_active}
                    onChange={(e) =>
                      setEditor({ ...editor, is_active: e.target.checked })
                    }
                    className="w-4 h-4 accent-primary"
                  />
                  Активен
                </label>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card">
              <button
                onClick={() => setEditor(null)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="Save" className="w-4 h-4" />
                )}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon name="AlertTriangle" className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Удалить шаблон уведомления?
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Это действие нельзя отменить.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}