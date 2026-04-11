import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  engineer: "Инженер",
  manager: "Управляющий",
};

const FORWARD_ROLES = [
  { key: "dispatcher", label: "Диспетчер" },
  { key: "technician", label: "Технолог" },
  { key: "mechanic", label: "Механик" },
  { key: "admin", label: "Администратор" },
  { key: "engineer", label: "Инженер" },
  { key: "manager", label: "Управляющий" },
];

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

const PRIORITY_ORDER: Record<string, number> = { low: 1, normal: 2, high: 3, critical: 4 };

interface Ticket {
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
  rejection_reason: string | null;
  cancellation_reason: string | null;
  equipment_info: string | null;
  work_started_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: number;
  request_id: number;
  user_id: number;
  user_name: string;
  message: string;
  created_at: string;
  is_mine: boolean;
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

type TabKey = "sent" | "assigned";
type SortField = "request_number" | "title" | "vehicle_label" | "priority" | "status" | "target_role" | "creator_name" | "created_at";
type SortDir = "asc" | "desc";

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

function formatFullDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function calcWorkTime(startedAt: string | null): string {
  if (!startedAt) return "---";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - start);
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} ч ${minutes} мин`;
}

interface TicketsPanelProps {
  role: string;
  vehicles?: Record<string, unknown>[];
  onReload?: () => void;
}

export default function TicketsPanel({ role, vehicles = [], onReload }: TicketsPanelProps) {
  const [tab, setTab] = useState<TabKey>("sent");
  const [requests, setRequests] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, in_progress: 0, resolved: 0, closed: 0, needs_info: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");

  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
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

  const [forwardDropdownId, setForwardDropdownId] = useState<number | null>(null);
  const [forwardModalData, setForwardModalData] = useState<{ id: number; toRole: string } | null>(null);
  const [forwardMessage, setForwardMessage] = useState("");

  const [statusDropdownId, setStatusDropdownId] = useState<number | null>(null);

  const [clarifyModalId, setClarifyModalId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [resolveModalId, setResolveModalId] = useState<number | null>(null);
  const [resolveData, setResolveData] = useState({
    resolved_by_name: "",
    resolved_by_position: "",
    resolved_by_employee_id: "",
    resolution_note: "",
  });

  const [cancelModalId, setCancelModalId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [detailComments, setDetailComments] = useState<Comment[]>([]);
  const [detailCommentText, setDetailCommentText] = useState("");
  const [loadingDetailComments, setLoadingDetailComments] = useState(false);

  const refreshRef = useRef<ReturnType<typeof setInterval>>();

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=requests&tab=${tab}`, { headers: hdrs() });
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
      else if (data.requests) setRequests(data.requests);
    } catch {
      void 0;
    }
  }, [tab]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=stats`, { headers: hdrs() });
      const data = await res.json();
      if (data) setStats(data);
    } catch {
      void 0;
    }
  }, []);

  const fetchRouting = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=routing&from_role=${role}`, { headers: hdrs() });
      const data = await res.json();
      const rules: { from_role: string; to_role: string; is_enabled: boolean }[] = data.routing || [];
      const enabled = rules.filter((r) => r.is_enabled).map((r) => r.to_role);
      setAllowedTargets(enabled);
    } catch {
      void 0;
    }
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
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [loadAll, fetchRequests, fetchStats]);

  const fetchComments = useCallback(async (requestId: number) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_URL}?action=comments&request_id=${requestId}`, { headers: hdrs() });
      const data = await res.json();
      if (Array.isArray(data)) setComments(data);
      else if (data.comments) setComments(data.comments);
      else setComments([]);
    } catch {
      setComments([]);
    }
    setLoadingComments(false);
  }, []);

  const fetchDetailComments = useCallback(async (requestId: number) => {
    setLoadingDetailComments(true);
    try {
      const res = await fetch(`${API_URL}?action=comments&request_id=${requestId}`, { headers: hdrs() });
      const data = await res.json();
      if (Array.isArray(data)) setDetailComments(data);
      else if (data.comments) setDetailComments(data.comments);
      else setDetailComments([]);
    } catch {
      setDetailComments([]);
    }
    setLoadingDetailComments(false);
  }, []);

  const filtered = useMemo(() => {
    let list = [...requests];
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((r) => r.priority === filterPriority);
    if (filterCategory.trim()) {
      const q = filterCategory.toLowerCase();
      list = list.filter((r) => (r.category || "").toLowerCase().includes(q));
    }
    if (filterAuthor.trim()) {
      const q = filterAuthor.toLowerCase();
      list = list.filter((r) => (r.creator_name || "").toLowerCase().includes(q));
    }
    if (filterVehicle.trim()) {
      const q = filterVehicle.toLowerCase();
      list = list.filter((r) => (r.vehicle_label || "").toLowerCase().includes(q));
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      list = list.filter((r) => new Date(r.created_at).getTime() >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo).getTime() + 86400000;
      list = list.filter((r) => new Date(r.created_at).getTime() < to);
    }
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
  }, [requests, filterStatus, filterPriority, filterCategory, filterAuthor, filterVehicle, filterDateFrom, filterDateTo, search, sortField, sortDir]);

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

  const exportExcel = useCallback((rows: Ticket[]) => {
    const header = ["#", "Номер", "Заголовок", "ТС", "Приоритет", "Статус", "Кому", "Автор", "Дата"];
    const exRows = [header.join("\t")];
    rows.forEach((r, i) => {
      exRows.push(
        [
          String(i + 1),
          r.request_number,
          r.title || "",
          r.vehicle_label || "",
          PRIORITY_LABELS[r.priority] || r.priority,
          STATUS_LABELS[r.status] || r.status,
          r.target_role ? ROLE_LABELS[r.target_role] || r.target_role : "",
          r.creator_name || "",
          formatDate(r.created_at),
        ].join("\t")
      );
    });
    const blob = new Blob(["\uFEFF" + exRows.join("\n")], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tickets_${today}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportCsv = useCallback((rows: Ticket[]) => {
    const header = ["#", "Номер", "Заголовок", "ТС", "Приоритет", "Статус", "Кому", "Автор", "Дата"];
    const csvRows = [header.join(";")];
    rows.forEach((r, i) => {
      csvRows.push(
        [
          String(i + 1),
          r.request_number,
          `"${(r.title || "").replace(/"/g, '""')}"`,
          r.vehicle_label || "",
          PRIORITY_LABELS[r.priority] || r.priority,
          STATUS_LABELS[r.status] || r.status,
          r.target_role ? ROLE_LABELS[r.target_role] || r.target_role : "",
          r.creator_name || "",
          formatDate(r.created_at),
        ].join(";")
      );
    });
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tickets_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const updateStatus = async (id: number, status: string, extra?: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=requests`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ id, status, ...extra }),
      });
      await loadAll();
      onReload?.();
    } catch {
      void 0;
    }
    setSaving(false);
  };

  const handleForward = async () => {
    if (!forwardModalData) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=forward`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          request_id: forwardModalData.id,
          to_role: forwardModalData.toRole,
          message: forwardMessage,
        }),
      });
      setForwardModalData(null);
      setForwardMessage("");
      await loadAll();
      onReload?.();
    } catch {
      void 0;
    }
    setSaving(false);
  };

  const handleSendComment = async (requestId: number, isDetail?: boolean) => {
    const text = isDetail ? detailCommentText : commentText;
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=comments`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ request_id: requestId, message: text }),
      });
      if (isDetail) {
        setDetailCommentText("");
        await fetchDetailComments(requestId);
      } else {
        setCommentText("");
        await fetchComments(requestId);
      }
    } catch {
      void 0;
    }
    setSaving(false);
  };

  const handleClarify = async () => {
    if (!clarifyModalId) return;
    await handleSendComment(clarifyModalId, false);
    await updateStatus(clarifyModalId, "needs_clarification");
    setClarifyModalId(null);
    setCommentText("");
    setComments([]);
  };

  const handleReject = async () => {
    if (!rejectModalId || !rejectReason.trim()) return;
    await updateStatus(rejectModalId, "rejected", { rejection_reason: rejectReason });
    setRejectModalId(null);
    setRejectReason("");
  };

  const handleResolve = async () => {
    if (!resolveModalId) return;
    await updateStatus(resolveModalId, "resolved", resolveData);
    setResolveModalId(null);
    setResolveData({ resolved_by_name: "", resolved_by_position: "", resolved_by_employee_id: "", resolution_note: "" });
  };

  const handleCancel = async () => {
    if (!cancelModalId || !cancelReason.trim()) return;
    await updateStatus(cancelModalId, "cancelled", { cancellation_reason: cancelReason });
    setCancelModalId(null);
    setCancelReason("");
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
    } catch {
      void 0;
    }
    setSaving(false);
  };

  const handlePrint = (ticket: Ticket) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Заявка ${ticket.request_number}</title>
<style>
body{font-family:Arial,sans-serif;margin:40px;color:#111}
table{width:100%;border-collapse:collapse;margin:20px 0}
td,th{border:1px solid #333;padding:8px 12px;text-align:left;font-size:13px}
th{background:#f0f0f0;font-weight:600}
h1{font-size:18px;margin-bottom:5px}
.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:15px}
.stamp{width:200px;height:80px;border:1px dashed #999;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px}
.sig{margin-top:40px;display:flex;gap:40px;font-size:13px}
.sig-line{border-bottom:1px solid #333;min-width:150px;display:inline-block}
@media print{body{margin:20px}}
</style></head><body>
<div class="header"><div class="stamp">М.П.</div><h1>ЗАЯВКА НА ОБСЛУЖИВАНИЕ</h1><p style="font-size:13px;color:#555">от ${formatFullDate(ticket.created_at)}</p></div>
<table>
<tr><th style="width:180px">Номер заявки</th><td>${ticket.request_number}</td></tr>
<tr><th>Дата создания</th><td>${formatFullDate(ticket.created_at)}</td></tr>
<tr><th>Заголовок</th><td>${ticket.title || "---"}</td></tr>
<tr><th>Транспортное средство</th><td>${ticket.vehicle_label || "---"}</td></tr>
<tr><th>Приоритет</th><td>${PRIORITY_LABELS[ticket.priority] || ticket.priority}</td></tr>
<tr><th>Статус</th><td>${STATUS_LABELS[ticket.status] || ticket.status}</td></tr>
<tr><th>Категория</th><td>${ticket.category || "---"}</td></tr>
<tr><th>Оборудование</th><td>${ticket.equipment_info || "---"}</td></tr>
<tr><th>Автор</th><td>${ticket.creator_name || "---"}</td></tr>
<tr><th>Назначено</th><td>${ticket.assigned_to_name || "---"}</td></tr>
<tr><th>Кому</th><td>${ticket.target_role ? ROLE_LABELS[ticket.target_role] || ticket.target_role : "---"}</td></tr>
</table>
<h3 style="font-size:14px;margin-top:20px">Описание</h3>
<div style="border:1px solid #333;padding:12px;min-height:60px;font-size:13px">${ticket.description || "---"}</div>
${ticket.resolution_note ? `<h3 style="font-size:14px;margin-top:20px">Решение</h3><div style="border:1px solid #333;padding:12px;font-size:13px">${ticket.resolution_note}</div>` : ""}
<div class="sig">
<div>Подпись <span class="sig-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div>Дата <span class="sig-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div>ФИО <span class="sig-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div>Должность <span class="sig-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const openDetail = (id: number) => {
    setSelectedId(id);
    fetchDetailComments(id);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetailComments([]);
    setDetailCommentText("");
  };

  const resolveTicket = requests.find((r) => r.id === resolveModalId) || null;

  const STAT_CARDS = [
    { label: "Новые", value: stats.new, icon: "Plus", color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "В работе", value: stats.in_progress, icon: "Wrench", color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { label: "Решено", value: stats.resolved, icon: "CheckCircle2", color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Критические", value: stats.critical, icon: "AlertTriangle", color: "text-red-500", bg: "bg-red-500/10" },
  ];

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const selectCls = "w-full px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const filterInputCls = "px-2.5 py-1.5 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Управление заявками</h2>
        <p className="text-muted-foreground mt-1">Единая система управления заявками</p>
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

      <div className="flex items-center gap-2">
        <button
          onClick={() => { setTab("sent"); setSelectedIds(new Set()); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "sent" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon name="Send" className="w-4 h-4" />
            Мои заявки
          </span>
        </button>
        <button
          onClick={() => { setTab("assigned"); setSelectedIds(new Set()); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "assigned" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon name="ClipboardList" className="w-4 h-4" />
            Исполняю
          </span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
              title={selectedIds.size > 0 ? `Экспорт выбранных (${selectedIds.size})` : "Экспорт"}
            >
              <Icon name="Download" className="w-4 h-4" />
              Экспорт
              <Icon name="ChevronDown" className="w-3.5 h-3.5" />
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px]"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  onClick={() => {
                    exportExcel(selectedIds.size > 0 ? filtered.filter((r) => selectedIds.has(r.id)) : filtered);
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Icon name="FileSpreadsheet" className="w-4 h-4 text-green-600" />
                  Excel
                </button>
                <button
                  onClick={() => {
                    exportCsv(selectedIds.size > 0 ? filtered.filter((r) => selectedIds.has(r.id)) : filtered);
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Icon name="FileText" className="w-4 h-4 text-blue-500" />
                  CSV
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Создать заявку
          </button>
          <button onClick={loadAll} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
            <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={filterInputCls + " w-full"}>
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Приоритет</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={filterInputCls + " w-full"}>
              <option value="all">Все</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
            <input value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} placeholder="Категория..." className={filterInputCls + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Автор</label>
            <input value={filterAuthor} onChange={(e) => setFilterAuthor(e.target.value)} placeholder="Автор..." className={filterInputCls + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ТС</label>
            <input value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} placeholder="Номер ТС..." className={filterInputCls + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Дата от</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={filterInputCls + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Дата до</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={filterInputCls + " w-full"} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по номеру, заголовку, ТС, автору..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {(filterStatus !== "all" || filterPriority !== "all" || filterCategory || filterAuthor || filterVehicle || filterDateFrom || filterDateTo || search) && (
            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterPriority("all");
                setFilterCategory("");
                setFilterAuthor("");
                setFilterVehicle("");
                setFilterDateFrom("");
                setFilterDateTo("");
                setSearch("");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Сбросить
            </button>
          )}
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
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                      }}
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
                  <th className="text-left px-4 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openDetail(r.id)}
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
                    <td className="px-4 py-3 text-muted-foreground">{r.target_role ? ROLE_LABELS[r.target_role] || r.target_role : "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.creator_name || "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setForwardDropdownId(forwardDropdownId === r.id ? null : r.id);
                              setStatusDropdownId(null);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            Переслать
                          </button>
                          {forwardDropdownId === r.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[160px]">
                              {FORWARD_ROLES.map((fr) => (
                                <button
                                  key={fr.key}
                                  onClick={() => {
                                    setForwardDropdownId(null);
                                    setForwardModalData({ id: r.id, toRole: fr.key });
                                    setForwardMessage("");
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                  {fr.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusDropdownId(statusDropdownId === r.id ? null : r.id);
                              setForwardDropdownId(null);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1"
                          >
                            Статус
                            <Icon name="ChevronDown" className="w-3 h-3" />
                          </button>
                          {statusDropdownId === r.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[200px]">
                              <button
                                onClick={() => { setStatusDropdownId(null); updateStatus(r.id, "reviewing"); }}
                                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                На рассмотрении
                              </button>
                              <button
                                onClick={() => { setStatusDropdownId(null); updateStatus(r.id, "in_progress"); }}
                                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                В работу
                              </button>
                              <button
                                onClick={() => {
                                  setStatusDropdownId(null);
                                  setClarifyModalId(r.id);
                                  setCommentText("");
                                  fetchComments(r.id);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                Требует уточнения
                              </button>
                              <button
                                onClick={() => { setStatusDropdownId(null); updateStatus(r.id, "approved"); }}
                                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                Одобрена
                              </button>
                              <button
                                onClick={() => {
                                  setStatusDropdownId(null);
                                  setRejectModalId(r.id);
                                  setRejectReason("");
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-muted transition-colors"
                              >
                                Отклонена
                              </button>
                              <button
                                onClick={() => {
                                  setStatusDropdownId(null);
                                  setResolveModalId(r.id);
                                  setResolveData({ resolved_by_name: "", resolved_by_position: "", resolved_by_employee_id: "", resolution_note: "" });
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-muted transition-colors"
                              >
                                Решено
                              </button>
                              {tab === "sent" && (
                                <button
                                  onClick={() => { setStatusDropdownId(null); updateStatus(r.id, "closed"); }}
                                  className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:bg-muted transition-colors"
                                >
                                  Закрыта
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setStatusDropdownId(null);
                                  setCancelModalId(r.id);
                                  setCancelReason("");
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:bg-muted transition-colors"
                              >
                                Отменена
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(r);
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Печать"
                        >
                          <Icon name="Printer" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-foreground">Выбрано {selectedIds.size}</span>
          <button
            onClick={() => exportCsv(filtered.filter((r) => selectedIds.has(r.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Icon name="Download" className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={() => exportExcel(filtered.filter((r) => selectedIds.has(r.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-600/90 transition-colors"
          >
            <Icon name="FileSpreadsheet" className="w-3.5 h-3.5" />
            Excel
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeDetail}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
                <p className="text-xs text-muted-foreground font-mono">{selected.request_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(selected)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Печать"
                >
                  <Icon name="Printer" className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={closeDetail} className="p-1 rounded hover:bg-muted">
                  <Icon name="X" className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.status] || ""}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[selected.priority] || ""}`}>
                  {PRIORITY_LABELS[selected.priority] || selected.priority}
                </span>
                {selected.work_started_at && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-600">
                    Время в работе: {calcWorkTime(selected.work_started_at)}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ТС:</span>
                  <span className="text-foreground">{selected.vehicle_label || "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Категория:</span>
                  <span className="text-foreground">{selected.category || "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Источник:</span>
                  <span className="text-foreground">{selected.source || "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Кому:</span>
                  <span className="text-foreground">{selected.target_role ? ROLE_LABELS[selected.target_role] || selected.target_role : "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Автор:</span>
                  <span className="text-foreground">{selected.creator_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Создано:</span>
                  <span className="text-foreground">{formatFullDate(selected.created_at)}</span>
                </div>
                {selected.assigned_to_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Назначено:</span>
                    <span className="text-foreground">{selected.assigned_to_name}</span>
                  </div>
                )}
                {selected.equipment_info && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Оборудование:</span>
                    <span className="text-foreground">{selected.equipment_info}</span>
                  </div>
                )}
                {selected.work_started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Начало работы:</span>
                    <span className="text-foreground">{formatFullDate(selected.work_started_at)}</span>
                  </div>
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
                      Решил: {selected.resolved_by_name}
                      {selected.resolved_by_position ? ` (${selected.resolved_by_position})` : ""}
                      {selected.resolved_by_employee_id ? ` Таб.# ${selected.resolved_by_employee_id}` : ""}
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

              <div className="flex gap-2 pt-2 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() => setForwardDropdownId(forwardDropdownId === selected.id ? null : selected.id)}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Переслать
                  </button>
                  {forwardDropdownId === selected.id && (
                    <div className="absolute left-0 bottom-full mb-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[160px]">
                      {FORWARD_ROLES.map((fr) => (
                        <button
                          key={fr.key}
                          onClick={() => {
                            setForwardDropdownId(null);
                            setForwardModalData({ id: selected.id, toRole: fr.key });
                            setForwardMessage("");
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          {fr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => updateStatus(selected.id, "reviewing")}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-600/90 transition-colors disabled:opacity-50"
                >
                  На рассмотрении
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "in_progress")}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-600/90 transition-colors disabled:opacity-50"
                >
                  В работу
                </button>
                <button
                  onClick={() => {
                    setClarifyModalId(selected.id);
                    setCommentText("");
                    fetchComments(selected.id);
                    closeDetail();
                  }}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-600/90 transition-colors"
                >
                  Уточнение
                </button>
                <button
                  onClick={() => {
                    setResolveModalId(selected.id);
                    setResolveData({ resolved_by_name: "", resolved_by_position: "", resolved_by_employee_id: "", resolution_note: "" });
                    closeDetail();
                  }}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-600/90 transition-colors"
                >
                  Решено
                </button>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Комментарии</p>
                {loadingDetailComments ? (
                  <p className="text-xs text-muted-foreground">Загрузка...</p>
                ) : detailComments.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-3">Нет комментариев</p>
                ) : (
                  <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
                    {detailComments.map((c) => (
                      <div key={c.id} className={`flex ${c.is_mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${c.is_mine ? "bg-primary/15 text-foreground" : "bg-muted text-foreground"}`}>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">
                            {c.user_name} <span className="font-normal">{formatDate(c.created_at)}</span>
                          </p>
                          <p>{c.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={detailCommentText}
                    onChange={(e) => setDetailCommentText(e.target.value)}
                    placeholder="Написать комментарий..."
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment(selected.id, true);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSendComment(selected.id, true)}
                    disabled={saving || !detailCommentText.trim()}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Icon name="Send" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {forwardModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setForwardModalData(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                Переадресация: {ROLE_LABELS[forwardModalData.toRole] || forwardModalData.toRole}
              </h3>
              <button onClick={() => setForwardModalData(null)} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Сообщение при переадресации</label>
                <textarea
                  value={forwardMessage}
                  onChange={(e) => setForwardMessage(e.target.value)}
                  rows={4}
                  placeholder="Укажите причину или инструкции..."
                  className={inputCls + " mt-1 resize-none"}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleForward}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Отправка..." : "Отправить"}
                </button>
                <button
                  onClick={() => setForwardModalData(null)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {clarifyModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setClarifyModalId(null); setComments([]); setCommentText(""); }}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Требует уточнения</h3>
              <button onClick={() => { setClarifyModalId(null); setComments([]); setCommentText(""); }} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Диалог</p>
                {loadingComments ? (
                  <p className="text-xs text-muted-foreground">Загрузка...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-2">Нет сообщений</p>
                ) : (
                  <div className="space-y-2 mb-3 max-h-[250px] overflow-y-auto">
                    {comments.map((c) => (
                      <div key={c.id} className={`flex ${c.is_mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${c.is_mine ? "bg-primary/15 text-foreground" : "bg-muted text-foreground"}`}>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">
                            {c.user_name} <span className="font-normal">{formatDate(c.created_at)}</span>
                          </p>
                          <p>{c.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Сообщение</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  placeholder="Введите сообщение..."
                  className={inputCls + " mt-1 resize-none"}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClarify}
                  disabled={saving || !commentText.trim()}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-600/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Отправка..." : "Отправить"}
                </button>
                <button
                  onClick={() => { setClarifyModalId(null); setComments([]); setCommentText(""); }}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRejectModalId(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Отклонение заявки</h3>
              <button onClick={() => setRejectModalId(null)} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Причина отклонения</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder="Укажите причину отклонения..."
                  className={inputCls + " mt-1 resize-none"}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={saving || !rejectReason.trim()}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-600/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Сохранение..." : "Отклонить"}
                </button>
                <button
                  onClick={() => setRejectModalId(null)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resolveModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setResolveModalId(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Решение заявки</h3>
              <button onClick={() => setResolveModalId(null)} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {resolveTicket?.work_started_at && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                  <Icon name="Clock" className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600">Время в работе: {calcWorkTime(resolveTicket.work_started_at)}</span>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">ФИО исполнителя</label>
                <input
                  value={resolveData.resolved_by_name}
                  onChange={(e) => setResolveData((d) => ({ ...d, resolved_by_name: e.target.value }))}
                  className={inputCls + " mt-1"}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Должность</label>
                <input
                  value={resolveData.resolved_by_position}
                  onChange={(e) => setResolveData((d) => ({ ...d, resolved_by_position: e.target.value }))}
                  className={inputCls + " mt-1"}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Табельный номер</label>
                <input
                  value={resolveData.resolved_by_employee_id}
                  onChange={(e) => setResolveData((d) => ({ ...d, resolved_by_employee_id: e.target.value }))}
                  className={inputCls + " mt-1"}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Описание решения</label>
                <textarea
                  value={resolveData.resolution_note}
                  onChange={(e) => setResolveData((d) => ({ ...d, resolution_note: e.target.value }))}
                  rows={3}
                  placeholder="Опишите выполненные работы..."
                  className={inputCls + " mt-1 resize-none"}
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
                  onClick={() => setResolveModalId(null)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCancelModalId(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Отмена заявки</h3>
              <button onClick={() => setCancelModalId(null)} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Причина отмены</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  placeholder="Укажите причину отмены..."
                  className={inputCls + " mt-1 resize-none"}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving || !cancelReason.trim()}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-600/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Сохранение..." : "Отменить заявку"}
                </button>
                <button
                  onClick={() => setCancelModalId(null)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Назад
                </button>
              </div>
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
                    className={selectCls + " mt-1"}
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
                  className={selectCls + " mt-1"}
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
                  className={inputCls + " mt-1"}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Приоритет</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                    className={selectCls + " mt-1"}
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
                    className={inputCls + " mt-1"}
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
                  className={inputCls + " mt-1 resize-none"}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Оборудование / узел</label>
                <input
                  value={createForm.equipment_info}
                  onChange={(e) => setCreateForm((p) => ({ ...p, equipment_info: e.target.value }))}
                  placeholder="Конкретный узел или деталь"
                  className={inputCls + " mt-1"}
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