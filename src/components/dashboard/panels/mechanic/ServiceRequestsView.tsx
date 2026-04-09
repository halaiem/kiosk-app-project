import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import urls from "../../../../../backend/func2url.json";

const API_URL = urls["service-requests"];
const TOKEN_KEY = "dashboard_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["X-Dashboard-Token"] = t;
  return h;
}

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
  high: "Высокий",
  critical: "Критический",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/15 text-zinc-400",
  medium: "bg-blue-500/15 text-blue-500",
  high: "bg-orange-500/15 text-orange-500",
  critical: "bg-red-500/15 text-red-500",
};

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

interface ServiceRequestsViewProps {
  vehicles?: Record<string, unknown>[];
  onReload?: () => void;
}

export default function ServiceRequestsView({ vehicles = [], onReload }: ServiceRequestsViewProps) {
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
  const [createForm, setCreateForm] = useState({ vehicle_label: "", title: "", description: "", priority: "normal", category: "", equipment_info: "" });

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=requests`, { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
      else if (data.requests) setRequests(data.requests);
    } catch { /* skip */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=stats`, { headers: headers() });
      const data = await res.json();
      if (data) setStats(data);
    } catch { /* skip */ }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRequests(), fetchStats()]);
    setLoading(false);
  }, [fetchRequests, fetchStats]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    let list = [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    return list;
  }, [requests, filter, search]);

  const selected = useMemo(() => requests.find((r) => r.id === selectedId) || null, [requests, selectedId]);

  const handleTakeRequest = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=requests`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ id, status: "in_progress" }),
      });
      await loadAll();
      onReload?.();
    } catch { /* skip */ }
    setSaving(false);
  };

  const handleResolve = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=requests`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ id: selectedId, status: "resolved", ...resolveData }),
      });
      setShowResolveForm(false);
      setResolveData({ resolved_by_name: "", resolved_by_position: "", resolved_by_employee_id: "", resolution_note: "" });
      setSelectedId(null);
      await loadAll();
      onReload?.();
    } catch { /* skip */ }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      const veh = vehicles.find((v: Record<string, unknown>) => v.number === createForm.vehicle_label);
      await fetch(`${API_URL}?action=requests`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          vehicle_id: veh ? (veh as Record<string, unknown>).id : null,
          vehicle_label: createForm.vehicle_label,
          priority: createForm.priority,
          category: createForm.category,
          equipment_info: createForm.equipment_info || null,
          source: "mechanic",
          source_type: "request",
        }),
      });
      setShowCreate(false);
      setCreateForm({ vehicle_label: "", title: "", description: "", priority: "normal", category: "", equipment_info: "" });
      await loadAll();
      onReload?.();
    } catch { /* skip */ }
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
                  <th className="text-left px-4 py-3 font-medium">Номер</th>
                  <th className="text-left px-4 py-3 font-medium">Заголовок</th>
                  <th className="text-left px-4 py-3 font-medium">ТС</th>
                  <th className="text-left px-4 py-3 font-medium">Приоритет</th>
                  <th className="text-left px-4 py-3 font-medium">Статус</th>
                  <th className="text-left px-4 py-3 font-medium">Автор</th>
                  <th className="text-left px-4 py-3 font-medium">Дата</th>
                  <th className="text-left px-4 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
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
                    <td className="px-4 py-3 text-muted-foreground">{r.creator_name || "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(r.created_at)}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {selected.status === "new" && (
                  <button
                    onClick={() => handleTakeRequest(selected.id)}
                    disabled={saving}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Взять в работу
                  </button>
                )}
                {(selected.status === "in_progress" || selected.status === "new") && !showResolveForm && (
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
              <div>
                <label className="text-xs text-muted-foreground">Заголовок *</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Опишите неисправность кратко"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ТС (бортовой номер)</label>
                <select
                  value={createForm.vehicle_label}
                  onChange={(e) => setCreateForm((p) => ({ ...p, vehicle_label: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— не указано —</option>
                  {vehicles.map((v: Record<string, unknown>) => (
                    <option key={String(v.id || v.number)} value={String(v.number)}>
                      {String(v.number)} {v.type ? `(${v.type})` : ""}
                    </option>
                  ))}
                </select>
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
                  placeholder="Подробное описание неисправности..."
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