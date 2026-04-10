import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import IconPickerModal from "./IconPickerModal";
import urls from '@/api/config';

const API_URL = urls["dashboard-messages"];
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

type Scope = "dashboard" | "tablet";

const ROLE_OPTIONS = [
  { key: "dispatcher", label: "Диспетчер" },
  { key: "technician", label: "Технолог" },
  { key: "mechanic", label: "Механик" },
  { key: "admin", label: "Администратор" },
  { key: "driver", label: "Водитель" },
];

const ROLE_BADGE: Record<string, string> = {
  dispatcher: "bg-blue-500/15 text-blue-600",
  technician: "bg-purple-500/15 text-purple-600",
  mechanic: "bg-amber-500/15 text-amber-600",
  admin: "bg-red-500/15 text-red-600",
  driver: "bg-green-500/15 text-green-600",
};

const ROLE_LABEL: Record<string, string> = {
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  admin: "Администратор",
  driver: "Водитель",
};

const CATEGORIES = [
  { key: "general", label: "Общие" },
  { key: "transport", label: "Транспорт" },
  { key: "schedule", label: "Расписание" },
  { key: "weather", label: "Погода" },
  { key: "road", label: "Дорога" },
  { key: "emergency", label: "Экстренное" },
  { key: "info", label: "Информация" },
  { key: "custom", label: "Другое" },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

const MESSAGE_TYPE_OPTIONS_BUILTIN = [
  { key: "normal", label: "Обычное", icon: "MessageSquare", color: "#3b82f6" },
  { key: "dispatcher", label: "От диспетчера", icon: "Radio", color: "#ec660c" },
  { key: "technician", label: "От техника", icon: "Wrench", color: "#8b5cf6" },
  { key: "admin", label: "От администратора", icon: "ShieldCheck", color: "#6366f1" },
  { key: "important", label: "Важное", icon: "AlertOctagon", color: "#dc2626" },
  { key: "can_error", label: "Ошибка CAN", icon: "AlertTriangle", color: "#f59e0b" },
  { key: "voice", label: "Голосовое", icon: "Mic", color: "#22c55e" },
];

function loadCustomMsgTypes(): { key: string; label: string; icon: string; color: string }[] {
  try {
    const raw = localStorage.getItem("notification_custom_types");
    if (raw) {
      return JSON.parse(raw)
        .filter((ct: { category: string }) => ct.category === "messages")
        .map((ct: { key: string; label: string; defaultIcon: string; defaultBg: string }) => ({
          key: ct.key, label: ct.label, icon: ct.defaultIcon, color: ct.defaultBg,
        }));
    }
  } catch { /* ignore */ }
  return [];
}

const MESSAGE_TYPE_OPTIONS = [...MESSAGE_TYPE_OPTIONS_BUILTIN, ...loadCustomMsgTypes()];

function getDesignStyle(typeKey: string): { bg: string; icon: string; iconColor: string } {
  try {
    const raw = localStorage.getItem("notification_design_v2");
    if (!raw) {
      const opt = MESSAGE_TYPE_OPTIONS.find((o) => o.key === typeKey);
      return { bg: (opt?.color || "#3b82f6") + "1a", icon: opt?.icon || "MessageSquare", iconColor: opt?.color || "#3b82f6" };
    }
    const cfg = JSON.parse(raw);
    const style = cfg?.tablet?.messages?.[typeKey] || cfg?.dashboard?.messages?.[typeKey];
    if (style) return { bg: style.iconBgColor, icon: style.icon, iconColor: style.iconColor };
  } catch {
    // ignore
  }
  const opt = MESSAGE_TYPE_OPTIONS.find((o) => o.key === typeKey);
  return { bg: (opt?.color || "#3b82f6") + "1a", icon: opt?.icon || "MessageSquare", iconColor: opt?.color || "#3b82f6" };
}

interface Template {
  id: number;
  title: string;
  content: string;
  target_role: string;
  target_scope: string;
  category: string;
  icon: string;
  sort_order: number;
  is_active?: boolean;
  message_type?: string;
}

interface EditorState {
  id?: number;
  title: string;
  content: string;
  target_role: string;
  target_scope: Scope;
  category: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  message_type: string;
}

function emptyEditor(scope: Scope): EditorState {
  return {
    title: "",
    content: "",
    target_role: "dispatcher",
    target_scope: scope,
    category: "general",
    icon: "MessageSquare",
    sort_order: 0,
    is_active: true,
    message_type: "normal",
  };
}

export default function MessageTemplateSettings() {
  const [scope, setScope] = useState<Scope>("dashboard");
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}?action=templates&scope=${scope}`, {
        headers: hdrs(),
      });
      const data = await res.json();
      setItems(data.templates || []);
    } catch {
      setError("Ошибка загрузки шаблонов");
    }
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setCustomCategory(false);
    setEditor(emptyEditor(scope));
  };

  const openEdit = (t: Template) => {
    const cat = t.category || "";
    const isKnown = CATEGORIES.some((c) => c.key === cat && c.key !== "custom");
    setCustomCategory(!isKnown && cat !== "");
    setEditor({
      id: t.id,
      title: t.title,
      content: t.content,
      target_role: t.target_role,
      target_scope: (t.target_scope as Scope) || scope,
      category: cat,
      icon: t.icon || "MessageSquare",
      sort_order: t.sort_order || 0,
      is_active: t.is_active !== false,
      message_type: t.message_type || "normal",
    });
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
        target_role: editor.target_role,
        target_scope: editor.target_scope,
        category: editor.category,
        icon: editor.icon,
        sort_order: editor.sort_order,
        message_type: editor.message_type,
      };
      if (editor.id) {
        body.id = editor.id;
        body.is_active = editor.is_active;
      }
      const res = await fetch(`${API_URL}?action=template`, {
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
      await fetch(`${API_URL}?action=template&id=${id}`, {
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
          <h3 className="text-lg font-bold text-foreground">Шаблоны ответов</h3>
          <p className="text-sm text-muted-foreground">
            Быстрые шаблоны сообщений для дашборда и планшета
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Добавить шаблон
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setScope("dashboard")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            scope === "dashboard"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Monitor" className="w-4 h-4" />
          Дашборд
        </button>
        <button
          onClick={() => setScope("tablet")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            scope === "tablet"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Tablet" className="w-4 h-4" />
          Планшет
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
            Шаблоны не найдены
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon
                    name={t.icon || "MessageSquare"}
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
                        ROLE_BADGE[t.target_role] ||
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ROLE_LABEL[t.target_role] || t.target_role}
                    </span>
                    {t.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {CATEGORY_LABEL[t.category] || t.category}
                      </span>
                    )}
                    {t.message_type && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: getDesignStyle(t.message_type).bg }}
                      >
                        <Icon
                          name={getDesignStyle(t.message_type).icon}
                          className="w-2.5 h-2.5"
                          style={{ color: getDesignStyle(t.message_type).iconColor }}
                        />
                        {MESSAGE_TYPE_OPTIONS.find((o) => o.key === t.message_type)?.label || t.message_type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {t.content}
                  </p>
                </div>
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
            className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center gap-2 sticky top-0 bg-card">
              <Icon name="FileText" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground flex-1">
                {editor.id ? "Редактировать шаблон" : "Новый шаблон"}
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
                  Роль
                </label>
                <select
                  value={editor.target_role}
                  onChange={(e) =>
                    setEditor({ ...editor, target_role: e.target.value })
                  }
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

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
                  placeholder="Например: Опоздание на маршрут"
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Текст шаблона
                </label>
                <textarea
                  value={editor.content}
                  onChange={(e) =>
                    setEditor({ ...editor, content: e.target.value })
                  }
                  rows={5}
                  placeholder="Текст сообщения..."
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Тип сообщения
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_TYPE_OPTIONS.map((mt) => {
                    const ds = getDesignStyle(mt.key);
                    const active = editor.message_type === mt.key;
                    return (
                      <button
                        key={mt.key}
                        type="button"
                        onClick={() => setEditor({ ...editor, message_type: mt.key })}
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
                          {mt.label}
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
                    value={
                      customCategory
                        ? "custom"
                        : CATEGORIES.some(
                              (c) =>
                                c.key === editor.category &&
                                c.key !== "custom"
                            )
                          ? editor.category
                          : "general"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setCustomCategory(true);
                        setEditor({ ...editor, category: "" });
                      } else {
                        setCustomCategory(false);
                        setEditor({ ...editor, category: val });
                      }
                    }}
                    className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {customCategory && (
                    <input
                      type="text"
                      value={editor.category}
                      onChange={(e) =>
                        setEditor({ ...editor, category: e.target.value })
                      }
                      placeholder="Введите категорию..."
                      className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 mt-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Порядок
                  </label>
                  <input
                    type="number"
                    value={editor.sort_order}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        sort_order: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
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
                      <Icon name={editor.icon || "MessageSquare"} className="w-4 h-4 text-primary" />
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
                  Область
                </label>
                <select
                  value={editor.target_scope}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      target_scope: e.target.value as Scope,
                    })
                  }
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="dashboard">Дашборд</option>
                  <option value="tablet">Планшет</option>
                </select>
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
                Удалить шаблон?
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