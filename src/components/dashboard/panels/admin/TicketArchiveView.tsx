import { useState, useEffect, useCallback, useMemo } from "react";
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

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  reviewing: "На рассмотрении",
  in_progress: "В работе",
  needs_clarification: "Требует уточнения",
  approved: "Одобрена",
  rejected: "Отклонена",
  resolved: "Решено",
  closed: "Закрыта",
  cancelled: "Отменена",
  expired: "Просрочена",
  needs_info: "Требует информации",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-500",
  reviewing: "bg-indigo-500/15 text-indigo-500",
  in_progress: "bg-yellow-500/15 text-yellow-600",
  needs_clarification: "bg-purple-500/15 text-purple-500",
  approved: "bg-emerald-500/15 text-emerald-500",
  rejected: "bg-red-500/15 text-red-500",
  resolved: "bg-green-500/15 text-green-500",
  closed: "bg-zinc-500/15 text-zinc-400",
  cancelled: "bg-orange-500/15 text-orange-500",
  expired: "bg-rose-500/15 text-rose-500",
  needs_info: "bg-purple-500/15 text-purple-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  critical: "Критический",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/15 text-zinc-400",
  normal: "bg-blue-500/15 text-blue-500",
  high: "bg-orange-500/15 text-orange-500",
  critical: "bg-red-500/15 text-red-500",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
};

interface ArchivedTicket {
  id: number;
  request_number: string;
  title: string;
  description: string;
  vehicle_label: string;
  priority: string;
  status: string;
  category: string;
  target_role: string | null;
  creator_name: string;
  assigned_to_name: string | null;
  resolved_by_name: string | null;
  resolved_by_position: string | null;
  resolution_note: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  equipment_info: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

export default function TicketArchiveView() {
  const [tickets, setTickets] = useState<ArchivedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchArchive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=requests&archive=true`, { headers: hdrs() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.requests || [];
      setTickets(list.filter((t: ArchivedTicket) => ["closed", "cancelled", "rejected", "resolved", "expired"].includes(t.status)));
    } catch {
      void 0;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  const filtered = useMemo(() => {
    let list = [...tickets];
    if (filterStatus !== "all") list = list.filter((t) => t.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.request_number.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.vehicle_label || "").toLowerCase().includes(q) ||
          (t.creator_name || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return list;
  }, [tickets, filterStatus, search]);

  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) || null, [tickets, selectedId]);

  const exportCsv = useCallback(() => {
    const header = ["#", "Номер", "Заголовок", "ТС", "Приоритет", "Статус", "Автор", "Дата"];
    const rows = [header.join(";")];
    filtered.forEach((t, i) => {
      rows.push(
        [
          String(i + 1),
          t.request_number,
          `"${(t.title || "").replace(/"/g, '""')}"`,
          t.vehicle_label || "",
          PRIORITY_LABELS[t.priority] || t.priority,
          STATUS_LABELS[t.status] || t.status,
          t.creator_name || "",
          formatDate(t.created_at),
        ].join(";")
      );
    });
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket_archive_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const ARCHIVE_STATUSES = [
    { key: "all", label: "Все" },
    { key: "closed", label: "Закрыта" },
    { key: "resolved", label: "Решено" },
    { key: "rejected", label: "Отклонена" },
    { key: "cancelled", label: "Отменена" },
    { key: "expired", label: "Просрочена" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Архив заявок</h2>
        <p className="text-muted-foreground mt-1">Завершённые, отклонённые и отменённые заявки</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ARCHIVE_STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
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
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
          >
            <Icon name="Download" className="w-4 h-4" />
            Экспорт
          </button>
          <button onClick={fetchArchive} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
            <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Архивных заявок не найдено</div>
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
                  <th className="text-left px-4 py-3 font-medium">Кому</th>
                  <th className="text-left px-4 py-3 font-medium">Автор</th>
                  <th className="text-left px-4 py-3 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{t.request_number}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{t.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.vehicle_label || "---"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[t.priority] || ""}`}>
                        {PRIORITY_LABELS[t.priority] || t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[t.status] || ""}`}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.target_role ? ROLE_LABELS[t.target_role] || t.target_role : "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.creator_name || "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(t.created_at)}</td>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Кому:</span><span className="text-foreground">{selected.target_role ? ROLE_LABELS[selected.target_role] || selected.target_role : "---"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Автор:</span><span className="text-foreground">{selected.creator_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Создано:</span><span className="text-foreground">{formatDate(selected.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Обновлено:</span><span className="text-foreground">{formatDate(selected.updated_at)}</span></div>
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
                  {selected.resolved_by_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Решил: {selected.resolved_by_name}{selected.resolved_by_position ? ` (${selected.resolved_by_position})` : ""}
                    </p>
                  )}
                </div>
              )}
              {selected.rejection_reason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Причина отклонения</p>
                  <p className="text-sm text-foreground bg-red-500/10 p-3 rounded-lg">{selected.rejection_reason}</p>
                </div>
              )}
              {selected.cancellation_reason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Причина отмены</p>
                  <p className="text-sm text-foreground bg-orange-500/10 p-3 rounded-lg">{selected.cancellation_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
