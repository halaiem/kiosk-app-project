import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import urls from "@/api/config";

const API_URL = urls["service-requests"];
const PUSH_API = urls["push-notifications"];
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

  interface NotifConfig {
    smtp: { configured: boolean; host: string; port: string; user: string; pass_set: boolean; pass_masked: string; from: string; connection_ok?: boolean; connection_error?: string };
    vapid: { configured: boolean; public_key: string; private_key_set: boolean; private_key_masked: string; email: string };
    stats: { total_push_subscriptions: number };
  }
  const [notifConfig, setNotifConfig] = useState<NotifConfig | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [testSmtpEmail, setTestSmtpEmail] = useState("");
  const [testSmtpLoading, setTestSmtpLoading] = useState(false);
  const [testSmtpResult, setTestSmtpResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushResult, setTestPushResult] = useState<{ ok: boolean; sent?: number; error?: string } | null>(null);

  const [notifEvents, setNotifEvents] = useState({
    on_new_request:         { email: true,  push: true,  label: "Новая заявка назначена исполнителю",      icon: "FilePlus" },
    on_status_change:       { email: true,  push: true,  label: "Смена статуса заявки",                   icon: "RefreshCw" },
    on_comment:             { email: true,  push: true,  label: "Новый комментарий / уточнение",          icon: "MessageSquare" },
    on_forward:             { email: true,  push: true,  label: "Переадресация заявки",                   icon: "Forward" },
    on_approved:            { email: true,  push: true,  label: "Заявка одобрена",                        icon: "CheckCircle2" },
    on_rejected:            { email: true,  push: true,  label: "Заявка отклонена (с причиной)",          icon: "XCircle" },
    on_resolved:            { email: true,  push: true,  label: "Заявка решена",                          icon: "BadgeCheck" },
    on_closed:              { email: false, push: false, label: "Заявка закрыта автором",                 icon: "Archive" },
    on_cancelled:           { email: true,  push: true,  label: "Заявка отменена (с причиной)",           icon: "Ban" },
    on_deadline_warning:    { email: true,  push: true,  label: "Предупреждение о приближении дедлайна",  icon: "Clock" },
    on_needs_clarification: { email: true,  push: true,  label: "Требуется уточнение",                   icon: "HelpCircle" },
  });
  const [savingNotifEvents, setSavingNotifEvents] = useState(false);

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
      if (s.notif_events) {
        try {
          const parsed = typeof s.notif_events === "string" ? JSON.parse(s.notif_events) : s.notif_events;
          setNotifEvents((prev) => {
            const next = { ...prev };
            for (const k of Object.keys(prev) as (keyof typeof prev)[]) {
              if (parsed[k]) next[k] = { ...next[k], ...parsed[k] };
            }
            return next;
          });
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

  const fetchNotifConfig = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch(`${PUSH_API}?action=admin-config`, { headers: hdrs() });
      const data = await res.json();
      setNotifConfig(data);
    } catch { void 0; }
    setNotifLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchRouting(), fetchNotifConfig()]);
      setLoading(false);
    };
    load();
  }, [fetchSettings, fetchRouting, fetchNotifConfig]);

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

  const handleSaveNotifEvents = async () => {
    setSavingNotifEvents(true);
    const payload: Record<string, { email: boolean; push: boolean }> = {};
    for (const [k, v] of Object.entries(notifEvents)) {
      payload[k] = { email: v.email, push: v.push };
    }
    await saveSetting("notif_events", payload);
    setSavingNotifEvents(false);
  };

  const handleTestSmtp = async () => {
    if (!testSmtpEmail.trim()) return;
    setTestSmtpLoading(true);
    setTestSmtpResult(null);
    try {
      const res = await fetch(`${PUSH_API}?action=admin-config`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ type: "test_smtp", to_email: testSmtpEmail.trim() }),
      });
      const data = await res.json();
      setTestSmtpResult(data);
      if (data.ok) showToast("Письмо отправлено", "success");
      else showToast(data.error || "Ошибка отправки", "error");
    } catch {
      setTestSmtpResult({ ok: false, error: "Ошибка сети" });
    }
    setTestSmtpLoading(false);
  };

  const handleTestPushBroadcast = async () => {
    setTestPushLoading(true);
    setTestPushResult(null);
    try {
      const res = await fetch(`${PUSH_API}?action=admin-config`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ type: "test_push_broadcast" }),
      });
      const data = await res.json();
      setTestPushResult(data);
      if (data.ok) showToast(`Push отправлен: ${data.sent} устройств`, "success");
      else showToast(data.error || "Ошибка", "error");
    } catch {
      setTestPushResult({ ok: false, error: "Ошибка сети" });
    }
    setTestPushLoading(false);
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

      {/* ── БЛОК УВЕДОМЛЕНИЙ ────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Icon name="BellRing" className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Push-уведомления и Email</h3>
              <p className="text-xs text-muted-foreground">Автоматические уведомления при смене статуса заявок</p>
            </div>
          </div>
          <button onClick={fetchNotifConfig} disabled={notifLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <Icon name="RefreshCw" className={`w-3.5 h-3.5 ${notifLoading ? "animate-spin" : ""}`} />
            Обновить
          </button>
        </div>

        {notifLoading && !notifConfig && (
          <div className="text-center py-6 text-muted-foreground text-sm">Загрузка конфигурации...</div>
        )}

        {notifConfig && (
          <div className="space-y-5">
            {/* SMTP секция */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <Icon name="Mail" className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-foreground">Email (SMTP)</span>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${notifConfig.smtp.configured && notifConfig.smtp.connection_ok ? "bg-green-500/15 text-green-500" : notifConfig.smtp.configured ? "bg-yellow-500/15 text-yellow-600" : "bg-zinc-500/15 text-zinc-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${notifConfig.smtp.configured && notifConfig.smtp.connection_ok ? "bg-green-500" : notifConfig.smtp.configured ? "bg-yellow-500" : "bg-zinc-400"}`} />
                  {notifConfig.smtp.configured && notifConfig.smtp.connection_ok ? "Подключено" : notifConfig.smtp.configured ? "Ошибка подключения" : "Не настроен"}
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">SMTP сервер (SMTP_HOST)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Icon name="Server" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono text-foreground">{notifConfig.smtp.host || <span className="text-muted-foreground italic">не задан</span>}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Порт (SMTP_PORT)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <span className="text-sm font-mono text-foreground">{notifConfig.smtp.port || "587"}</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Логин (SMTP_USER)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Icon name="User" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono text-foreground">{notifConfig.smtp.user || <span className="text-muted-foreground italic">не задан</span>}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Пароль (SMTP_PASS)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Icon name="KeyRound" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono text-foreground">{notifConfig.smtp.pass_set ? notifConfig.smtp.pass_masked : <span className="text-muted-foreground italic">не задан</span>}</span>
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-xs text-muted-foreground mb-1">Адрес отправителя (SMTP_FROM)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Icon name="AtSign" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono text-foreground">{notifConfig.smtp.from || <span className="text-muted-foreground italic">не задан</span>}</span>
                    </div>
                  </div>
                </div>

                {notifConfig.smtp.connection_error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Icon name="AlertCircle" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-red-500">{notifConfig.smtp.connection_error}</span>
                  </div>
                )}

                {!notifConfig.smtp.configured && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/8 border border-blue-500/20">
                    <Icon name="Info" className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-400 space-y-1">
                      <p className="font-medium text-blue-300">Как настроить SMTP:</p>
                      <p>1. Перейдите в <span className="font-mono bg-blue-500/15 px-1 rounded">Ядро → Секреты</span></p>
                      <p>2. Добавьте секреты: <span className="font-mono bg-blue-500/15 px-1 rounded">SMTP_HOST</span>, <span className="font-mono bg-blue-500/15 px-1 rounded">SMTP_USER</span>, <span className="font-mono bg-blue-500/15 px-1 rounded">SMTP_PASS</span>, <span className="font-mono bg-blue-500/15 px-1 rounded">SMTP_PORT</span> (587), <span className="font-mono bg-blue-500/15 px-1 rounded">SMTP_FROM</span></p>
                      <p>Пример для Яндекс: host = <span className="font-mono bg-blue-500/15 px-1 rounded">smtp.yandex.ru</span>, port = <span className="font-mono bg-blue-500/15 px-1 rounded">587</span>, пароль приложения из настроек почты</p>
                    </div>
                  </div>
                )}

                {notifConfig.smtp.configured && (
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="email"
                      value={testSmtpEmail}
                      onChange={e => setTestSmtpEmail(e.target.value)}
                      placeholder="Тест: введите email для проверки..."
                      className="flex-1 h-8 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      onKeyDown={e => { if (e.key === "Enter") handleTestSmtp(); }}
                    />
                    <button
                      onClick={handleTestSmtp}
                      disabled={testSmtpLoading || !testSmtpEmail.trim()}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      <Icon name="Send" className="w-3.5 h-3.5" />
                      {testSmtpLoading ? "Отправляю..." : "Тест"}
                    </button>
                  </div>
                )}

                {testSmtpResult && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${testSmtpResult.ok ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                    <Icon name={testSmtpResult.ok ? "CheckCircle2" : "XCircle"} className="w-3.5 h-3.5 shrink-0" />
                    {testSmtpResult.ok ? testSmtpResult.message : testSmtpResult.error}
                  </div>
                )}
              </div>
            </div>

            {/* VAPID / Web Push секция */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <Icon name="Smartphone" className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-foreground">Web Push (браузер)</span>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${notifConfig.vapid.configured ? "bg-green-500/15 text-green-500" : "bg-zinc-500/15 text-zinc-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${notifConfig.vapid.configured ? "bg-green-500" : "bg-zinc-400"}`} />
                  {notifConfig.vapid.configured ? "Настроен" : "Не настроен"}
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Публичный ключ (VAPID_PUBLIC_KEY)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border overflow-hidden">
                      <Icon name="Key" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-foreground truncate">{notifConfig.vapid.public_key || <span className="text-muted-foreground italic">не задан</span>}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Приватный ключ (VAPID_PRIVATE_KEY)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Icon name="KeyRound" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono text-foreground">{notifConfig.vapid.private_key_set ? notifConfig.vapid.private_key_masked : <span className="text-muted-foreground italic">не задан</span>}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email (VAPID_EMAIL)</p>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <Icon name="AtSign" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono text-foreground">{notifConfig.vapid.email || <span className="text-muted-foreground italic">не задан</span>}</span>
                    </div>
                  </div>
                </div>

                {!notifConfig.vapid.configured && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-purple-500/8 border border-purple-500/20">
                    <Icon name="Info" className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-300 space-y-1">
                      <p className="font-medium">Как сгенерировать VAPID-ключи:</p>
                      <p>1. Установите Node.js и выполните: <span className="font-mono bg-purple-500/15 px-1 rounded">npx web-push generate-vapid-keys</span></p>
                      <p>2. Скопируйт�� Public Key → секрет <span className="font-mono bg-purple-500/15 px-1 rounded">VAPID_PUBLIC_KEY</span></p>
                      <p>3. Скопируйте Private Key → секрет <span className="font-mono bg-purple-500/15 px-1 rounded">VAPID_PRIVATE_KEY</span></p>
                      <p>4. Добавьте секрет <span className="font-mono bg-purple-500/15 px-1 rounded">VAPID_EMAIL</span> = <span className="font-mono bg-purple-500/15 px-1 rounded">mailto:admin@ваш-домен.ru</span></p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="Users" className="w-4 h-4" />
                    <span>Активных подписок: <span className="font-semibold text-foreground">{notifConfig.stats.total_push_subscriptions}</span></span>
                  </div>
                  {notifConfig.vapid.configured && (
                    <button
                      onClick={handleTestPushBroadcast}
                      disabled={testPushLoading || notifConfig.stats.total_push_subscriptions === 0}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
                    >
                      <Icon name="Send" className="w-3.5 h-3.5" />
                      {testPushLoading ? "Отправляю..." : "Тест всем"}
                    </button>
                  )}
                </div>

                {testPushResult && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${testPushResult.ok ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                    <Icon name={testPushResult.ok ? "CheckCircle2" : "XCircle"} className="w-3.5 h-3.5 shrink-0" />
                    {testPushResult.ok ? `Отправлено на ${testPushResult.sent} устройств` : testPushResult.error}
                  </div>
                )}
              </div>
            </div>

            {/* ── СОБЫТИЯ ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <Icon name="ListChecks" className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-semibold text-foreground">Какие события отправлять</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                  <span className="w-16 text-center">Email</span>
                  <span className="w-16 text-center">Push</span>
                </div>
              </div>

              <div className="divide-y divide-border">
                {(Object.entries(notifEvents) as [keyof typeof notifEvents, typeof notifEvents[keyof typeof notifEvents]][]).map(([key, ev]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon name={ev.icon} className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-foreground truncate">{ev.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {/* Email toggle */}
                      <div className="w-16 flex justify-center">
                        <button
                          role="switch"
                          aria-checked={ev.email}
                          onClick={() => setNotifEvents(prev => ({ ...prev, [key]: { ...prev[key], email: !prev[key].email } }))}
                          className={`relative w-9 h-5 rounded-full transition-colors ${ev.email ? "bg-blue-500" : "bg-muted-foreground/30"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ev.email ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                      {/* Push toggle */}
                      <div className="w-16 flex justify-center">
                        <button
                          role="switch"
                          aria-checked={ev.push}
                          onClick={() => setNotifEvents(prev => ({ ...prev, [key]: { ...prev[key], push: !prev[key].push } }))}
                          className={`relative w-9 h-5 rounded-full transition-colors ${ev.push ? "bg-purple-500" : "bg-muted-foreground/30"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ev.push ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-border bg-muted/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/80 inline-block" />Email</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500/80 inline-block" />Push</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNotifEvents(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, email: true, push: true }])) as typeof prev)}
                    className="h-7 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Все
                  </button>
                  <button
                    onClick={() => setNotifEvents(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, email: false, push: false }])) as typeof prev)}
                    className="h-7 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ничего
                  </button>
                  <button
                    onClick={handleSaveNotifEvents}
                    disabled={savingNotifEvents}
                    className="flex items-center gap-1.5 h-7 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Icon name="Save" className="w-3.5 h-3.5" />
                    {savingNotifEvents ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>

            {/* Как это работает */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border">
              <Icon name="Zap" className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Как работают автоматические уведомления:</p>
                <p>При каждом изменении статуса заявки система автоматически отправляет уведомление автору заявки и исполнителю — по email и/или push (в зависимости от настроек каждого пользователя). Пользователи управляют своими подписками через кнопку «Уведомления» в боковом меню дашборда.</p>
              </div>
            </div>
          </div>
        )}
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