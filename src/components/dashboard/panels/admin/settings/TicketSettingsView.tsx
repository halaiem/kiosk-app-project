import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import urls from "@/api/config";

const API_URL = urls["service-requests"];
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

const ROLES = ["dispatcher", "technician", "mechanic", "admin"] as const;

const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  admin: "Администратор",
};

const PRIORITY_KEYS = ["low", "normal", "high", "critical"] as const;

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  critical: "Критический",
};

const ACCESS_PERMS = ["can_create", "can_resolve", "can_forward", "can_close"] as const;

const PERM_LABELS: Record<string, string> = {
  can_create: "Создание",
  can_resolve: "Решение",
  can_forward: "Пересылка",
  can_close: "Закрытие",
};

interface RoutingRule {
  from_role: string;
  to_role: string;
  is_enabled: boolean;
}

interface Toast {
  id: number;
  text: string;
  type: "success" | "error";
}

let toastCounter = 0;

export default function TicketSettingsView() {
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [prefixes, setPrefixes] = useState<Record<string, string>>({
    dispatcher: "ДИС",
    technician: "ТЕХ",
    mechanic: "МЕХ",
    admin: "АДМ",
  });
  const [savingPrefixes, setSavingPrefixes] = useState(false);

  const [ticketTypes, setTicketTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState("");
  const [savingTypes, setSavingTypes] = useState(false);

  const [ticketCategories, setTicketCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [savingCategories, setSavingCategories] = useState(false);

  const [processingTime, setProcessingTime] = useState<Record<string, number>>({
    low: 72,
    normal: 48,
    high: 24,
    critical: 4,
  });
  const [savingProcessingTime, setSavingProcessingTime] = useState(false);

  const [priorityColors, setPriorityColors] = useState<Record<string, string>>({
    low: "#71717a",
    normal: "#3b82f6",
    high: "#f97316",
    critical: "#ef4444",
  });
  const [savingColors, setSavingColors] = useState(false);

  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [savingRouting, setSavingRouting] = useState<string | null>(null);

  const [ticketAccess, setTicketAccess] = useState<Record<string, Record<string, boolean>>>({
    dispatcher: { can_create: true, can_resolve: false, can_forward: true, can_close: false },
    technician: { can_create: true, can_resolve: false, can_forward: true, can_close: false },
    mechanic: { can_create: true, can_resolve: true, can_forward: true, can_close: false },
    admin: { can_create: true, can_resolve: true, can_forward: true, can_close: true },
  });
  const [savingAccess, setSavingAccess] = useState(false);

  const [printTemplate, setPrintTemplate] = useState({
    company_name: "",
    company_logo_url: "",
    header_text: "",
    footer_text: "",
  });
  const [savingPrint, setSavingPrint] = useState(false);

  const showToast = useCallback((text: string, type: "success" | "error") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=settings`, { headers: hdrs() });
      const data = await res.json();
      const s = data.settings || {};
      if (s.number_prefixes) {
        try {
          const parsed = typeof s.number_prefixes === "string" ? JSON.parse(s.number_prefixes) : s.number_prefixes;
          setPrefixes((prev) => ({ ...prev, ...parsed }));
        } catch { void 0; }
      }
      if (s.ticket_types) {
        try {
          const parsed = typeof s.ticket_types === "string" ? JSON.parse(s.ticket_types) : s.ticket_types;
          if (Array.isArray(parsed)) setTicketTypes(parsed);
        } catch { void 0; }
      }
      if (s.ticket_categories) {
        try {
          const parsed = typeof s.ticket_categories === "string" ? JSON.parse(s.ticket_categories) : s.ticket_categories;
          if (Array.isArray(parsed)) setTicketCategories(parsed);
        } catch { void 0; }
      }
      if (s.processing_time) {
        try {
          const parsed = typeof s.processing_time === "string" ? JSON.parse(s.processing_time) : s.processing_time;
          setProcessingTime((prev) => ({ ...prev, ...parsed }));
        } catch { void 0; }
      }
      if (s.priority_colors) {
        try {
          const parsed = typeof s.priority_colors === "string" ? JSON.parse(s.priority_colors) : s.priority_colors;
          setPriorityColors((prev) => ({ ...prev, ...parsed }));
        } catch { void 0; }
      }
      if (s.ticket_access) {
        try {
          const parsed = typeof s.ticket_access === "string" ? JSON.parse(s.ticket_access) : s.ticket_access;
          setTicketAccess((prev) => {
            const next = { ...prev };
            for (const r of ROLES) {
              if (parsed[r]) next[r] = { ...next[r], ...parsed[r] };
            }
            return next;
          });
        } catch { void 0; }
      }
      if (s.print_template) {
        try {
          const parsed = typeof s.print_template === "string" ? JSON.parse(s.print_template) : s.print_template;
          setPrintTemplate((prev) => ({ ...prev, ...parsed }));
        } catch { void 0; }
      }
    } catch {
      showToast("Ошибка загрузки настроек", "error");
    }
  }, [showToast]);

  const fetchRouting = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=routing`, { headers: hdrs() });
      const data = await res.json();
      setRoutingRules(data.routing || []);
    } catch { void 0; }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchRouting()]);
      setLoading(false);
    };
    load();
  }, [fetchSettings, fetchRouting]);

  const saveSetting = async (key: string, value: unknown): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}?action=settings`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ key, value: typeof value === "string" ? value : JSON.stringify(value) }),
      });
      if (!res.ok) throw new Error();
      showToast("Сохранено", "success");
      return true;
    } catch {
      showToast("Ошибка сохранения", "error");
      return false;
    }
  };

  const handleSavePrefixes = async () => {
    setSavingPrefixes(true);
    await saveSetting("number_prefixes", prefixes);
    setSavingPrefixes(false);
  };

  const handleAddType = () => {
    const val = newType.trim();
    if (!val || ticketTypes.includes(val)) return;
    setTicketTypes((prev) => [...prev, val]);
    setNewType("");
  };

  const handleRemoveType = (idx: number) => {
    setTicketTypes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTypes = async () => {
    setSavingTypes(true);
    await saveSetting("ticket_types", ticketTypes);
    setSavingTypes(false);
  };

  const handleAddCategory = () => {
    const val = newCategory.trim();
    if (!val || ticketCategories.includes(val)) return;
    setTicketCategories((prev) => [...prev, val]);
    setNewCategory("");
  };

  const handleRemoveCategory = (idx: number) => {
    setTicketCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveCategories = async () => {
    setSavingCategories(true);
    await saveSetting("ticket_categories", ticketCategories);
    setSavingCategories(false);
  };

  const handleSaveProcessingTime = async () => {
    setSavingProcessingTime(true);
    await saveSetting("processing_time", processingTime);
    setSavingProcessingTime(false);
  };

  const handleSaveColors = async () => {
    setSavingColors(true);
    await saveSetting("priority_colors", priorityColors);
    setSavingColors(false);
  };

  const getRoutingRule = (from: string, to: string): boolean => {
    const rule = routingRules.find((r) => r.from_role === from && r.to_role === to);
    return rule ? rule.is_enabled : false;
  };

  const handleToggleRouting = async (from: string, to: string) => {
    const current = getRoutingRule(from, to);
    const newValue = !current;
    const key = `${from}-${to}`;
    setSavingRouting(key);
    try {
      const res = await fetch(`${API_URL}?action=routing`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ from_role: from, to_role: to, is_enabled: newValue }),
      });
      if (!res.ok) throw new Error();
      setRoutingRules((prev) => {
        const idx = prev.findIndex((r) => r.from_role === from && r.to_role === to);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], is_enabled: newValue };
          return updated;
        }
        return [...prev, { from_role: from, to_role: to, is_enabled: newValue }];
      });
      showToast("Сохранено", "success");
    } catch {
      showToast("Ошибка сохранения", "error");
    }
    setSavingRouting(null);
  };

  const handleToggleAccess = (r: string, perm: string) => {
    setTicketAccess((prev) => ({
      ...prev,
      [r]: { ...prev[r], [perm]: !prev[r]?.[perm] },
    }));
  };

  const handleSaveAccess = async () => {
    setSavingAccess(true);
    await saveSetting("ticket_access", ticketAccess);
    setSavingAccess(false);
  };

  const handleSavePrint = async () => {
    setSavingPrint(true);
    await saveSetting("print_template", printTemplate);
    setSavingPrint(false);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const btnSaveCls = "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50";
  const cardCls = "bg-card border border-border rounded-2xl p-6 space-y-4";

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Настройки заявок</h2>
          <p className="text-muted-foreground mt-1">Конфигурация системы управления заявками</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Настройки заявок</h2>
        <p className="text-muted-foreground mt-1">Конфигурация системы управления заявками</p>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Icon name="Hash" className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Нумерация заявок</h3>
            <p className="text-xs text-muted-foreground">Префиксы номеров заявок по ролям</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ROLES.map((r) => (
            <div key={r}>
              <label className="text-xs text-muted-foreground mb-1 block">{ROLE_LABELS[r]}</label>
              <input
                value={prefixes[r] || ""}
                onChange={(e) => setPrefixes((prev) => ({ ...prev, [r]: e.target.value }))}
                className={inputCls}
                placeholder="XXX"
              />
              <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                {prefixes[r] || "XXX"}-00001
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={handleSavePrefixes} disabled={savingPrefixes} className={btnSaveCls}>
            <Icon name="Save" className="w-4 h-4" />
            {savingPrefixes ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Icon name="Tag" className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Типы заявок</h3>
            <p className="text-xs text-muted-foreground">Доступные типы при создании заявки</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ticketTypes.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium">
              {t}
              <button onClick={() => handleRemoveType(i)} className="hover:text-red-400 transition-colors">
                <Icon name="X" className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {ticketTypes.length === 0 && (
            <span className="text-sm text-muted-foreground">Нет типов</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="Новый тип..."
            className={inputCls + " max-w-xs"}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddType(); }}
          />
          <button
            onClick={handleAddType}
            disabled={!newType.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Icon name="Plus" className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveTypes} disabled={savingTypes} className={btnSaveCls}>
            <Icon name="Save" className="w-4 h-4" />
            {savingTypes ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Icon name="FolderOpen" className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Категории заявок</h3>
            <p className="text-xs text-muted-foreground">Категории для классификации заявок</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ticketCategories.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 text-sm font-medium">
              {c}
              <button onClick={() => handleRemoveCategory(i)} className="hover:text-red-400 transition-colors">
                <Icon name="X" className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {ticketCategories.length === 0 && (
            <span className="text-sm text-muted-foreground">Нет категорий</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Новая категория..."
            className={inputCls + " max-w-xs"}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCategory.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Icon name="Plus" className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveCategories} disabled={savingCategories} className={btnSaveCls}>
            <Icon name="Save" className="w-4 h-4" />
            {savingCategories ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Icon name="Clock" className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Время обработки (дедлайн)</h3>
            <p className="text-xs text-muted-foreground">Максимальное время обработки заявки по приоритетам (в часах)</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRIORITY_KEYS.map((p) => (
            <div key={p}>
              <label className="text-xs text-muted-foreground mb-1 block">{PRIORITY_LABELS[p]}</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={processingTime[p] || 0}
                  onChange={(e) => setProcessingTime((prev) => ({ ...prev, [p]: parseInt(e.target.value) || 0 }))}
                  className={inputCls}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ч</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveProcessingTime} disabled={savingProcessingTime} className={btnSaveCls}>
            <Icon name="Save" className="w-4 h-4" />
            {savingProcessingTime ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Icon name="Palette" className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Цвета приоритетов</h3>
            <p className="text-xs text-muted-foreground">Цветовая кодировка уровней приоритета</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRIORITY_KEYS.map((p) => (
            <div key={p}>
              <label className="text-xs text-muted-foreground mb-1 block">{PRIORITY_LABELS[p]}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={priorityColors[p] || "#000000"}
                  onChange={(e) => setPriorityColors((prev) => ({ ...prev, [p]: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                />
                <div className="flex-1">
                  <input
                    value={priorityColors[p] || ""}
                    onChange={(e) => setPriorityColors((prev) => ({ ...prev, [p]: e.target.value }))}
                    className={inputCls + " font-mono text-xs"}
                  />
                </div>
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: priorityColors[p] || "#000" }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveColors} disabled={savingColors} className={btnSaveCls}>
            <Icon name="Save" className="w-4 h-4" />
            {savingColors ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Icon name="Route" className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Маршрутизация заявок</h3>
            <p className="text-xs text-muted-foreground">Кто может отправлять заявки кому</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Отправитель \ Получатель
                </th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center px-4 py-3 font-medium text-muted-foreground">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((fromRole) => (
                <tr key={fromRole} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{ROLE_LABELS[fromRole]}</td>
                  {ROLES.map((toRole) => {
                    const isDiag = fromRole === toRole;
                    const isEnabled = getRoutingRule(fromRole, toRole);
                    const key = `${fromRole}-${toRole}`;
                    const isSaving = savingRouting === key;
                    return (
                      <td key={toRole} className="px-4 py-3 text-center">
                        {isDiag ? (
                          <span className="inline-flex w-10 h-6 rounded-full bg-muted/50 items-center justify-center">
                            <Icon name="Minus" className="w-3 h-3 text-muted-foreground/50" />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleRouting(fromRole, toRole)}
                            disabled={!!isSaving}
                            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                              isEnabled ? "bg-green-500" : "bg-muted"
                            } ${isSaving ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnabled ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Icon name="Info" className="w-3 h-3" />
          Включенный переключатель означает, что роль-отправитель может создавать заявки для роли-получателя
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Icon name="Shield" className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Доступ к заявкам</h3>
            <p className="text-xs text-muted-foreground">Разрешения по ролям</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Роль</th>
                {ACCESS_PERMS.map((perm) => (
                  <th key={perm} className="text-center px-4 py-3 font-medium text-muted-foreground">
                    {PERM_LABELS[perm]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{ROLE_LABELS[r]}</td>
                  {ACCESS_PERMS.map((perm) => (
                    <td key={perm} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!ticketAccess[r]?.[perm]}
                        onChange={() => handleToggleAccess(r, perm)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveAccess} disabled={savingAccess} className={btnSaveCls}>
            <Icon name="Save" className="w-4 h-4" />
            {savingAccess ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Icon name="Printer" className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Форма для печати</h3>
            <p className="text-xs text-muted-foreground">Настройка шаблона печатной формы заявки</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Название организации</label>
            <input
              value={printTemplate.company_name}
              onChange={(e) => setPrintTemplate((prev) => ({ ...prev, company_name: e.target.value }))}
              placeholder="ООО Транспортная компания"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL логотипа</label>
            <input
              value={printTemplate.company_logo_url}
              onChange={(e) => setPrintTemplate((prev) => ({ ...prev, company_logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1">Рекомендуемый размер: 200x60px, PNG/SVG</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Текст заголовка</label>
          <input
            value={printTemplate.header_text}
            onChange={(e) => setPrintTemplate((prev) => ({ ...prev, header_text: e.target.value }))}
            placeholder="ЗАЯВКА НА ОБСЛУЖИВАНИЕ ТРАНСПОРТНОГО СРЕДСТВА"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Текст подвала</label>
          <input
            value={printTemplate.footer_text}
            onChange={(e) => setPrintTemplate((prev) => ({ ...prev, footer_text: e.target.value }))}
            placeholder="Документ сформирован автоматически"
            className={inputCls}
          />
        </div>
        <div className="flex justify-end">
          <button onClick={handleSavePrint} disabled={savingPrint} className={btnSaveCls}>
            <Icon name="Save" className="w-4 h-4" />
            {savingPrint ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Icon name="BarChart3" className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Статистика</h3>
            <p className="text-xs text-muted-foreground">Аналитика по заявкам</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
          <Icon name="Info" className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Статистика проблем по категориям, моделям ТС, маршрутам и оборудованию доступна в разделе
            <span className="font-medium text-foreground"> Архив заявок</span>.
          </p>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-right-5 duration-200 ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <Icon name={t.type === "success" ? "Check" : "AlertCircle"} className="w-4 h-4" />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
