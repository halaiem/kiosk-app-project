import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import urls from "../../../../../backend/func2url.json";

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

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
};

interface ServiceRequest {
  id: number;
  request_number: string;
  title: string;
  description: string;
  vehicle_id: number | null;
  vehicle_label: string;
  priority: string;
  status: string;
  category: string;
  source: string;
  target_role: string | null;
  creator_id: number;
  creator_name: string;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  resolved_by_name: string | null;
  resolved_by_position: string | null;
  resolved_by_employee_id: string | null;
  resolution_note: string | null;
  equipment_info: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  closed: number;
  needs_info: number;
  critical: number;
}

interface RoutingRule {
  from_role: string;
  to_role: string;
  is_enabled: boolean;
}

type FilterStatus = "all" | "new" | "in_progress" | "resolved" | "closed" | "needs_info";

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  resolved: "Решено",
  closed: "Закрыто",
  needs_info: "Требует информации",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-500",
  in_progress: "bg-yellow-500/15 text-yellow-600",
  resolved: "bg-green-500/15 text-green-500",
  closed: "bg-zinc-500/15 text-zinc-400",
  needs_info: "bg-purple-500/15 text-purple-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  normal: "Обычный",
  high: "Высокий",
  critical: "Критический",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/15 text-zinc-400",
  medium: "bg-blue-500/15 text-blue-500",
  normal: "bg-blue-500/15 text-blue-500",
  high: "bg-orange-500/15 text-orange-500",
  critical: "bg-red-500/15 text-red-500",
};

type SortField = "request_number" | "title" | "vehicle_label" | "priority" | "status" | "target_role" | "creator_name" | "created_at";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { low: 1, medium: 2, normal: 2, high: 3, critical: 4 };

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

interface ServiceRequestsPanelProps {
  role: string;
  vehicles?: Record<string, unknown>[];
  onReload?: () => void;
  canResolve?: boolean;
  canTakeWork?: boolean;
}

export default function ServiceRequestsPanel({
  role,
  vehicles = [],
  onReload,
  canResolve,
  canTakeWork,
}: ServiceRequestsPanelProps) {
  const resolveEnabled = canResolve ?? role === "mechanic";
  const takeWorkEnabled = canTakeWork ?? role === "mechanic";

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, in_progress: 0, resolved: 0, closed: 0, needs_info: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveData, setResolveData] = useState({ resolved_by_name: "", resolved_by_position: "", resolved_by_employee_id: "", resolution_note: "" });
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [allowedTargets, setAllowedTargets] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    target_role: "",
    vehicle_label: "",
    title: "",
    description: "",
    priority: "normal",
    category: "",
    equipment_info: "",
  });
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const refreshRef = useRef<ReturnType<typeof setInterval>>();

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=requests`, { headers: hdrs() });
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
      else if (data.requests) setRequests(data.requests);
    } catch { void 0; }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=stats`, { headers: hdrs() });
      const data = await res.json();
      if (data) setStats(data);
    } catch { void 0; }
  }, []);

  const fetchRouting = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=routing&from_role=${role}`, { headers: hdrs() });
      const data = await res.json();
      const rules: RoutingRule[] = data.routing || [];
      const enabled = rules.filter((r) => r.is_enabled).map((r) => r.to_role);
      setAllowedTargets(enabled);
    } catch { void 0; }
  }, [role]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRequests(), fetchStats(), fetchRouting()]);
    setLoading(false);
  }, [fetchRequests, fetchStats, fetchRouting]);

  useEffect(() => {
    loadAll();
    refreshRef.current = setInterval(() => {
      fetchRequests();
      fetchStats();
    }, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [loadAll, fetchRequests, fetchStats]);

  const filtered = useMemo(() => {
    let list = [...requests];
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.request_number.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.vehicle_label || "").toLowerCase().includes(q) ||
          (r.creator_name || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "priority") {
        cmp = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0);
      } else {
        const aVal = (a[sortField] ?? "").toString().toLowerCase();
        const bVal = (b[sortField] ?? "").toString().toLowerCase();
        cmp = aVal.localeCompare(bVal);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [requests, filter, search, sortField, sortDir]);

  const selected = useMemo(() => requests.find((r) => r.id === selectedId) || null, [requests, selectedId]);

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(field === "created_at" ? "desc" : "asc");
      return field;
    });
  }, []);

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someVisibleSelected = filtered.some((r) => selectedIds.has(r.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const r of filtered) next.delete(r.id);
      } else {
        for (const r of filtered) next.add(r.id);
      }
      return next;
    });
  }, [filtered, allVisibleSelected]);

  const toggleSelectRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exportCsv = useCallback((rows: ServiceRequest[]) => {
    const header = ["№", "Номер", "Заголовок", "ТС", "Приоритет", "Статус", "Кому", "Автор", "Дата"];
    const csvRows = [header.join(";")];
    rows.forEach((r, i) => {
      csvRows.push([
        String(i + 1),
        r.request_number,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        r.vehicle_label || "",
        PRIORITY_LABELS[r.priority] || r.priority,
        STATUS_LABELS[r.status] || r.status,
        r.target_role ? (ROLE_LABELS[r.target_role] || r.target_role) : "",
        r.creator_name || "",
        formatDate(r.created_at),
      ].join(";"));
    });
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `service_requests_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(() => {
    if (selectedIds.size > 0) {
      exportCsv(filtered.filter((r) => selectedIds.has(r.id)));
    } else {
      exportCsv(filtered);
    }
  }, [filtered, selectedIds, exportCsv]);

  const handleTakeRequest = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=requests`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ id, status: "in_progress" }),
      });
      await loadAll();
      onReload?.();
    } catch { void 0; }
    setSaving(false);
  };

  const handleResolve = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=requests`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ id: selectedId, status: "resolved", ...resolveData }),
      });
      setShowResolveForm(false);
      setResolveData({ resolved_by_name: "", resolved_by_position: "", resolved_by_employee_id: "", resolution_note: "" });
      setSelectedId(null);
      await loadAll();
      onReload?.();
    } catch { void 0; }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      const veh = vehicles.find((v: Record<string, unknown>) => v.number === createForm.vehicle_label);
      await fetch(`${API_URL}?action=requests`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          vehicle_id: veh ? veh.id : null,
          vehicle_label: createForm.vehicle_label,
          priority: createForm.priority,
          category: createForm.category,
          equipment_info: createForm.equipment_info || null,
          target_role: createForm.target_role || null,
          source: role,
          source_type: "request",
        }),
      });
      setShowCreate(false);
      setCreateForm({ target_role: "", vehicle_label: "", title: "", description: "", priority: "normal", category: "", equipment_info: "" });
      await loadAll();
      onReload?.();
    } catch { void 0; }
    setSaving(false);
  };

  const FILTER_TABS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "new", label: "Новые" },
    { key: "in_progress", label: "В работе" },
    { key: "resolved", label: "Решено" },
    { key: "closed", label: "Закрыто" },
    { key: "needs_info", label: "Требует информации" },
  ];

  const STAT_CARDS = [
    { label: "Новые", value: stats.new, icon: "Plus", color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "В работе", value: stats.in_progress, icon: "Wrench", color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { label: "Решено", value: stats.resolved, icon: "CheckCircle2", color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Критические", value: stats.critical, icon: "AlertTriangle", color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Заявки на обслуживание</h2>
          <p className="text-muted-foreground mt-1">Управление заявками и сервисными запросами</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Создать заявку
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
              <Icon name={c.icon} className={`w-5 h-5 ${c.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === t.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
            title={selectedIds.size > 0 ? `Экспорт выбранных (${selectedIds.size})` : "Экспорт CSV"}
          >
            <Icon name="Download" className="w-4 h-4" />
            CSV
          </button>
          <button onClick={loadAll} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
            <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Заявки не найдены</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </th>
                  {([
                    { field: "request_number" as SortField, label: "Номер" },
                    { field: "title" as SortField, label: "Заголовок" },
                    { field: "vehicle_label" as SortField, label: "ТС" },
                    { field: "priority" as SortField, label: "Приоритет" },
                    { field: "status" as SortField, label: "Статус" },
                    { field: "target_role" as SortField, label: "Кому" },
                    { field: "creator_name" as SortField, label: "Автор" },
                    { field: "created_at" as SortField, label: "Дата" },
                  ]).map((col) => (
                    <th
                      key={col.field}
                      className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => toggleSort(col.field)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortField === col.field ? (
                          <Icon name={sortDir === "asc" ? "ChevronUp" : "ChevronDown"} className="w-3.5 h-3.5" />
                        ) : (
                          <Icon name="ChevronsUpDown" className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </span>
                    </th>
                  ))}
                  {takeWorkEnabled && <th className="text-left px-4 py-3 font-medium">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors ${selectedIds.has(r.id) ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelectRow(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.request_number}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{r.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.vehicle_label || "---"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[r.priority] || ""}`}>
                        {PRIORITY_LABELS[r.priority] || r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || ""}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.target_role ? (ROLE_LABELS[r.target_role] || r.target_role) : "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.creator_name || "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(r.created_at)}</td>
                    {takeWorkEnabled && (
                      <td className="px-4 py-3">
                        {r.status === "new" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTakeRequest(r.id); }}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            Взять в работу
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-foreground">
            Выбрано {selectedIds.size}
          </span>
          <button
            onClick={() => exportCsv(filtered.filter((r) => selectedIds.has(r.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Icon name="Download" className="w-3.5 h-3.5" />
            Экспорт выбранных
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Сбросить
          </button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setSelectedId(null); setShowResolveForm(false); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
                <p className="text-xs text-muted-foreground font-mono">{selected.request_number}</p>
              </div>
              <button onClick={() => { setSelectedId(null); setShowResolveForm(false); }} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.status] || ""}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[selected.priority] || ""}`}>
                  {PRIORITY_LABELS[selected.priority] || selected.priority}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">ТС:</span><span className="text-foreground">{selected.vehicle_label || "---"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Категория:</span><span className="text-foreground">{selected.category || "---"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Источник:</span><span className="text-foreground">{selected.source || "---"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Кому:</span><span className="text-foreground">{selected.target_role ? (ROLE_LABELS[selected.target_role] || selected.target_role) : "---"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Автор:</span><span className="text-foreground">{selected.creator_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Создано:</span><span className="text-foreground">{formatDate(selected.created_at)}</span></div>
                {selected.assigned_to_name && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Назначено:</span><span className="text-foreground">{selected.assigned_to_name}</span></div>
                )}
                {selected.equipment_info && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Оборудование:</span><span className="text-foreground">{selected.equipment_info}</span></div>
                )}
              </div>
              {selected.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Описание</p>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{selected.description}</p>
                </div>
              )}
              {selected.resolution_note && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Решение</p>
                  <p className="text-sm text-foreground bg-green-500/10 p-3 rounded-lg">{selected.resolution_note}</p>
                  {selected.resolved_by_name && <p className="text-xs text-muted-foreground mt-1">Решил: {selected.resolved_by_name} ({selected.resolved_by_position})</p>}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {takeWorkEnabled && selected.status === "new" && (
                  <button
                    onClick={() => handleTakeRequest(selected.id)}
                    disabled={saving}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Взять в работу
                  </button>
                )}
                {resolveEnabled && (selected.status === "in_progress" || selected.status === "new") && !showResolveForm && (
                  <button
                    onClick={() => setShowResolveForm(true)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-600/90 transition-colors"
                  >
                    Решено
                  </button>
                )}
              </div>

              {showResolveForm && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm font-medium text-foreground">Форма решения</p>
                  <div>
                    <label className="text-xs text-muted-foreground">ФИО исполнителя</label>
                    <input
                      value={resolveData.resolved_by_name}
                      onChange={(e) => setResolveData((d) => ({ ...d, resolved_by_name: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Должность</label>
                    <input
                      value={resolveData.resolved_by_position}
                      onChange={(e) => setResolveData((d) => ({ ...d, resolved_by_position: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Табельный номер</label>
                    <input
                      value={resolveData.resolved_by_employee_id}
                      onChange={(e) => setResolveData((d) => ({ ...d, resolved_by_employee_id: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Описание решения</label>
                    <textarea
                      value={resolveData.resolution_note}
                      onChange={(e) => setResolveData((d) => ({ ...d, resolution_note: e.target.value }))}
                      rows={3}
                      className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResolve}
                      disabled={saving || !resolveData.resolved_by_name || !resolveData.resolution_note}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-600/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Сохранение..." : "Подтвердить решение"}
                    </button>
                    <button
                      onClick={() => setShowResolveForm(false)}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Новая заявка</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {allowedTargets.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground">Кому</label>
                  <select
                    value={createForm.target_role}
                    onChange={(e) => setCreateForm((p) => ({ ...p, target_role: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- выберите получателя --</option>
                    {allowedTargets.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">ТС (бортовой номер)</label>
                <select
                  value={createForm.vehicle_label}
                  onChange={(e) => setCreateForm((p) => ({ ...p, vehicle_label: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- не указано --</option>
                  {vehicles.map((v: Record<string, unknown>) => (
                    <option key={String(v.id || v.number)} value={String(v.number)}>
                      {String(v.number)} {v.type ? `(${v.type})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Заголовок *</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Краткое описание"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Приоритет</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                    <option value="critical">Критический</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Категория</label>
                  <input
                    value={createForm.category}
                    onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Тормоза, двигатель..."
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Описание</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Подробное описание..."
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Оборудование / узел</label>
                <input
                  value={createForm.equipment_info}
                  onChange={(e) => setCreateForm((p) => ({ ...p, equipment_info: e.target.value }))}
                  placeholder="Конкретный узел или деталь"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !createForm.title.trim()}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Создание..." : "Создать заявку"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}