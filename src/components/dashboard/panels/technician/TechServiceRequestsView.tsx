import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { VehicleInfo } from "@/types/dashboard";
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
  assigned_to_name: string | null;
  resolved_by_name: string | null;
  resolution_note: string | null;
  equipment_info: string | null;
  created_at: string;
  updated_at: string;
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
};

const CATEGORIES = [
  { value: "maintenance", label: "Обслуживание" },
  { value: "repair", label: "Ремонт" },
  { value: "inspection", label: "Осмотр" },
  { value: "diagnostic", label: "Диагностика" },
  { value: "replacement", label: "Замена" },
  { value: "other", label: "Другое" },
];

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

interface TechServiceRequestsViewProps {
  vehicles?: VehicleInfo[];
  onReload?: () => void;
}

export default function TechServiceRequestsView({ vehicles = [], onReload }: TechServiceRequestsViewProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval>>();

  const [createForm, setCreateForm] = useState({
    target_role: "",
    vehicle_id: "",
    title: "",
    description: "",
    priority: "medium",
    category: "maintenance",
    equipment_info: "",
  });
  const [allowedTargets, setAllowedTargets] = useState<string[]>([]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=requests`, { headers: hdrs() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.requests || [];
      setRequests(list);
    } catch { /* skip */ }
    setLoading(false);
  }, []);

  const fetchRouting = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=routing&from_role=technician`, { headers: hdrs() });
      const data = await res.json();
      const rules: { from_role: string; to_role: string; is_enabled: boolean }[] = data.routing || [];
      setAllowedTargets(rules.filter((r) => r.is_enabled).map((r) => r.to_role));
    } catch { /* skip */ }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchRouting();
    refreshRef.current = setInterval(fetchRequests, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [fetchRequests, fetchRouting]);

  const filtered = useMemo(() => {
    let list = [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.request_number.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.vehicle_label || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, filter, search]);

  const selected = useMemo(() => requests.find((r) => r.id === selectedId) || null, [requests, selectedId]);

  const handleCreate = async () => {
    if (!createForm.title) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=requests`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          vehicle_id: createForm.vehicle_id ? Number(createForm.vehicle_id) : null,
          priority: createForm.priority,
          category: createForm.category,
          equipment_info: createForm.equipment_info || null,
          target_role: createForm.target_role || null,
          source: "technician",
        }),
      });
      setShowCreate(false);
      setCreateForm({ target_role: "", vehicle_id: "", title: "", description: "", priority: "medium", category: "maintenance", equipment_info: "" });
      await fetchRequests();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Заявки на обслуживание</h2>
          <p className="text-muted-foreground mt-1">Создание и отслеживание сервисных заявок</p>
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
        {[
          { label: "Всего", value: requests.length, icon: "ClipboardList", color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Новые", value: requests.filter((r) => r.status === "new").length, icon: "Plus", color: "text-cyan-500", bg: "bg-cyan-500/10" },
          { label: "В работе", value: requests.filter((r) => r.status === "in_progress").length, icon: "Wrench", color: "text-yellow-500", bg: "bg-yellow-500/10" },
          { label: "Решено", value: requests.filter((r) => r.status === "resolved").length, icon: "CheckCircle2", color: "text-green-500", bg: "bg-green-500/10" },
        ].map((c) => (
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
          <button onClick={fetchRequests} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
            <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="Radio" className="w-3 h-3" />
        Автообновление каждые 30 секунд
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
                  <th className="text-left px-4 py-3 font-medium">Дата</th>
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
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedId(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
                <p className="text-xs text-muted-foreground font-mono">{selected.request_number}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-muted">
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
                  {selected.resolved_by_name && <p className="text-xs text-muted-foreground mt-1">Решил: {selected.resolved_by_name}</p>}
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
              <h3 className="text-lg font-bold text-foreground">Создать заявку</h3>
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
                    onChange={(e) => setCreateForm((f) => ({ ...f, target_role: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- выберите получателя --</option>
                    {allowedTargets.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Транспортное средство</label>
                <select
                  value={createForm.vehicle_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, vehicle_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Не указано</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.number} {v.model ? `(${v.model})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Заголовок *</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Описание</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Приоритет</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="critical">Критический</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Категория</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Оборудование</label>
                <input
                  value={createForm.equipment_info}
                  onChange={(e) => setCreateForm((f) => ({ ...f, equipment_info: e.target.value }))}
                  placeholder="Описание оборудования..."
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !createForm.title}
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