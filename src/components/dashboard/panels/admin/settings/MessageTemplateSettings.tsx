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
}

function emptyEditor(scope: Scope): EditorState {
  return {
    title: "",
    content: "",
    target_role: "dispatcher",
    target_scope: scope,
    category: "",
    icon: "MessageSquare",
    sort_order: 0,
    is_active: true,
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

  const openCreate = () => setEditor(emptyEditor(scope));

  const openEdit = (t: Template) => {
    setEditor({
      id: t.id,
      title: t.title,
      content: t.content,
      target_role: t.target_role,
      target_scope: (t.target_scope as Scope) || scope,
      category: t.category || "",
      icon: t.icon || "MessageSquare",
      sort_order: t.sort_order || 0,
      is_active: t.is_active !== false,
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
                        {t.category}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Категория
                  </label>
                  <input
                    type="text"
                    value={editor.category}
                    onChange={(e) =>
                      setEditor({ ...editor, category: e.target.value })
                    }
                    placeholder="Общие"
                    className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
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