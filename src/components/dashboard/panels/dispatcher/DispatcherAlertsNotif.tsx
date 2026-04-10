import { useState, useMemo, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
import type { Notification, Alert, AlertLevel, UserRole } from "@/types/dashboard";

// ── Shared constants ──────────────────────────────────────────────────────────
export function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days}д назад`;
}

export const ALERT_TYPE_ICONS: Record<Alert["type"], string> = {
  sos: "Siren",
  breakdown: "Wrench",
  delay: "Clock",
  deviation: "MapPinOff",
  speeding: "Gauge",
};

export const ALERT_TYPE_LABELS: Record<Alert["type"], string> = {
  sos: "SOS",
  breakdown: "Поломка",
  delay: "Задержка",
  deviation: "Отклонение",
  speeding: "Превышение",
};

export const LEVEL_COLORS: Record<AlertLevel, string> = {
  info: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  warning: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
};

export const LEVEL_BORDER: Record<AlertLevel, string> = {
  info: "border-l-blue-500",
  warning: "border-l-yellow-500",
  critical: "border-l-red-500",
};

export const LEVEL_ICONS: Record<AlertLevel, { name: string; color: string }> = {
  info: { name: "Info", color: "text-blue-500" },
  warning: { name: "AlertTriangle", color: "text-yellow-500" },
  critical: { name: "AlertOctagon", color: "text-red-500" },
};

// ── Notifications View ────────────────────────────────────────────────────────
type NotifFilter = "all" | "unread" | "info" | "warning" | "critical";

interface TypeStyleConfig {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  bgColor: string;
  textColor: string;
}

interface CustomTypeDef {
  key: string;
  label: string;
  defaultIcon: string;
  defaultBg: string;
  previewText: string;
  category: string;
}

const NOTIF_LEVEL_STYLES: Record<string, { icon: string; bg: string; text: string }> = {
  info: { icon: "Info", bg: "bg-blue-500/15", text: "text-blue-500" },
  warning: { icon: "AlertTriangle", bg: "bg-amber-500/15", text: "text-amber-500" },
  critical: { icon: "AlertOctagon", bg: "bg-red-500/15", text: "text-red-500" },
};

const NOTIF_LEVEL_LABELS: Record<AlertLevel, string> = {
  info: "Инфо",
  warning: "Предупреждение",
  critical: "Критическое",
};

const FORWARD_ROLES: { key: UserRole; label: string; icon: string }[] = [
  { key: "technician", label: "Технолог", icon: "Wrench" },
  { key: "mechanic", label: "Механик", icon: "Settings" },
  { key: "admin", label: "Администратор", icon: "ShieldCheck" },
];

function formatTimestamp(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (isToday) return `${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mo}.${yyyy} ${hh}:${mm}`;
}

function exportNotifToCsv(items: Notification[], filename: string) {
  const headers = ["ID", "Заголовок", "Описание", "Время", "Уровень", "Статус"];
  const rows = items.map((n) => [
    n.id,
    n.title,
    n.body,
    new Date(n.timestamp).toLocaleString("ru-RU"),
    n.level === "info" ? "Инфо" : n.level === "warning" ? "Предупреждение" : "Критическое",
    n.read ? "Прочитано" : "Новое",
  ]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateDispatcherDemoNotifications(): Notification[] {
  const levels: AlertLevel[] = ["info", "warning", "critical"];
  const titles = [
    "Водитель опоздал на смену",
    "Задержка на маршруте №15",
    "Отклонение от расписания рейса",
    "Смена водителя на маршруте №7",
    "Перегруз пассажиров ТС №3312",
    "Не выходит на связь водитель",
    "Авария на маршруте М12",
    "Изменение расписания маршрута №22",
    "Дорожные работы: объезд маршрута №3",
    "Плановое обновление расписания",
  ];
  const bodies = [
    "Водитель Иванов А.П. не прибыл на линию к 06:00. Задержка составляет 35 минут. Необходимо назначить замену.",
    "ТС №4521 на маршруте №15 отстает от графика на 18 минут. Причина: пробка на ул. Ленина.",
    "Рейс 08:30 маршрута №9 выполнен с отклонением от расписания +12 минут. Пассажиропоток повышенный.",
    "Водитель Петров С.В. заменён на Сидорова К.Н. на маршруте №7 с 14:00. Причина: больничный.",
    "ТС №3312 зафиксировало превышение нормы загрузки на 15%. Маршрут №11, остановка «Центральная».",
    "Водитель Козлов Д.Р. (ТС №2250, маршрут №5) не выходит на связь более 20 минут. Последняя точка: ул. Гагарина.",
    "ДТП с участием ТС №1107 на маршруте М12. Пострадавших нет. Требуется эвакуация и замена борта.",
    "С 01.04 маршрут №22 переходит на летнее расписание. Интервал движения сокращён до 8 минут.",
    "Дорожные работы на пр. Мира с 10.04 по 15.04. Маршрут №3 временно изменён. Водители оповещены.",
    "Утверждено новое расписание на май. Затронуты маршруты №1, №5, №12, №18. Требуется ознакомление.",
  ];
  const roles: (UserRole | "all")[] = ["dispatcher", "all", "technician", "mechanic", "admin"];
  const result: Notification[] = [];
  for (let i = 0; i < 25; i++) {
    const level = levels[i % levels.length];
    const titleIdx = i % titles.length;
    const now = Date.now();
    const offset = i * 1800000 + Math.floor(Math.random() * 600000);
    result.push({
      id: `demo-disp-notif-${String(i + 1).padStart(3, "0")}`,
      title: titles[titleIdx],
      body: bodies[titleIdx],
      timestamp: new Date(now - offset),
      read: i % 3 === 0,
      level,
      targetRole: roles[i % roles.length],
    });
  }
  return result;
}

function loadDesignConfig(): Record<string, TypeStyleConfig> | null {
  try {
    const raw = localStorage.getItem("notification_design_v2");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const dashNotif = parsed?.dashboard?.notifications;
    if (!dashNotif || typeof dashNotif !== "object") return null;
    const mapped: Record<string, TypeStyleConfig> = {};
    for (const [key, val] of Object.entries(dashNotif)) {
      const v = val as Record<string, string>;
      mapped[key] = {
        icon: v.icon || "Bell",
        iconColor: v.iconColor || "#6b7280",
        iconBgColor: v.iconBgColor || "#6b728022",
        bgColor: v.bgColor || "#6b72801a",
        textColor: v.textColor || "#0f172a",
      };
    }
    return mapped;
  } catch {
    return null;
  }
}

function loadCustomTypes(): CustomTypeDef[] {
  try {
    const raw = localStorage.getItem("notification_custom_types");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function NotificationsView({
  notifications,
  onMarkNotificationRead,
}: {
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
}) {
  const data = useMemo(
    () => (notifications.length > 0 ? notifications : generateDispatcherDemoNotifications()),
    [notifications]
  );

  const [filter, setFilter] = useState<NotifFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forwardDropdownId, setForwardDropdownId] = useState<string | null>(null);
  const [batchForwardOpen, setBatchForwardOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [designConfig, setDesignConfig] = useState<Record<string, TypeStyleConfig> | null>(null);
  const [customTypes, setCustomTypes] = useState<CustomTypeDef[]>([]);

  useEffect(() => {
    setDesignConfig(loadDesignConfig());
    setCustomTypes(loadCustomTypes());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    let list = data;
    if (filter === "unread") list = list.filter((n) => !n.read);
    else if (filter === "info") list = list.filter((n) => n.level === "info");
    else if (filter === "warning") list = list.filter((n) => n.level === "warning");
    else if (filter === "critical") list = list.filter((n) => n.level === "critical");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filter, search]);

  const tableRows = useMemo(() => {
    return filtered.map((n) => ({
      ...n,
      _ts: new Date(n.timestamp).getTime(),
      _levelSort: n.level === "critical" ? 0 : n.level === "warning" ? 1 : 2,
      _statusSort: n.read ? 1 : 0,
    }));
  }, [filtered]);

  const { sort, toggle, sorted } = useTableSort(
    tableRows as unknown as Record<string, unknown>[]
  );

  const sortedRows = useMemo(() => {
    if (sort.key) return sorted as unknown as typeof tableRows;
    return [...tableRows].sort((a, b) => b._ts - a._ts);
  }, [sort.key, sorted, tableRows]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(
    () => sortedRows.slice(safePage * perPage, safePage * perPage + perPage),
    [sortedRows, safePage, perPage]
  );

  const stats = useMemo(() => {
    const total = data.length;
    const unread = data.filter((n) => !n.read).length;
    const critical = data.filter((n) => n.level === "critical").length;
    const info = data.filter((n) => n.level === "info").length;
    return { total, unread, critical, info };
  }, [data]);

  const allPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((r) => selected.has(r.id));

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedRows.forEach((r) => next.delete(r.id));
      } else {
        paginatedRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [allPageSelected, paginatedRows]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchRead = useCallback(() => {
    selected.forEach((id) => onMarkNotificationRead(id));
    setToast(`Прочитано: ${selected.size}`);
    setSelected(new Set());
  }, [selected, onMarkNotificationRead]);

  const handleForward = useCallback(
    (role: UserRole, ids?: string[]) => {
      const targets = ids || Array.from(selected);
      const roleLabel = FORWARD_ROLES.find((r) => r.key === role)?.label || role;
      setToast(`Переслано: ${roleLabel} (${targets.length} шт.)`);
      setForwardDropdownId(null);
      setBatchForwardOpen(false);
      if (!ids) setSelected(new Set());
    },
    [selected]
  );

  const handleExport = useCallback(
    (mode: "selected" | "all") => {
      const items = mode === "selected" ? data.filter((n) => selected.has(n.id)) : data;
      const dateStr = new Date().toISOString().split("T")[0];
      exportNotifToCsv(items, `notifications_${dateStr}.csv`);
      setExportDropdownOpen(false);
    },
    [data, selected]
  );

  const getTypeStyle = useCallback(
    (level: AlertLevel): { icon: string; color: string; bg: string } => {
      if (designConfig && designConfig[level]) {
        const dc = designConfig[level];
        return { icon: dc.icon, color: dc.iconColor, bg: dc.iconBgColor };
      }
      const ls = NOTIF_LEVEL_STYLES[level];
      return { icon: ls.icon, color: "", bg: ls.bg };
    },
    [designConfig]
  );

  const filterPills: { key: NotifFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "unread", label: "Непрочитанные" },
    { key: "info", label: "Инфо" },
    { key: "warning", label: "Предупреждение" },
    { key: "critical", label: "Критическое" },
  ];

  const customNotifTypes = customTypes.filter((ct) => ct.category === "notifications");

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="Bell" className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Всего уведомлений</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15">
            <Icon name="BellDot" className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{stats.unread}</p>
            <p className="text-xs text-muted-foreground">Непрочитанных</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15">
            <Icon name="AlertOctagon" className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">Критических</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
            <Icon name="Info" className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-500">{stats.info}</p>
            <p className="text-xs text-muted-foreground">Информационных</p>
          </div>
        </div>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {filterPills.map((fp) => (
            <button
              key={fp.key}
              onClick={() => {
                setFilter(fp.key);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === fp.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {fp.label}
            </button>
          ))}
          {customNotifTypes.map((ct) => (
            <button
              key={ct.key}
              onClick={() => {
                setFilter("all");
                setSearch(ct.label);
                setPage(0);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {ct.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Icon
            name="Search"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Поиск..."
            className="h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52"
          />
        </div>
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            Выбрано: {selected.size}
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="relative">
            <button
              onClick={() => setBatchForwardOpen((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Icon name="Forward" className="w-3.5 h-3.5" />
              Переслать
            </button>
            {batchForwardOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 rounded-xl border border-border bg-popover shadow-lg py-1 min-w-[180px]">
                {FORWARD_ROLES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => handleForward(r.key)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name={r.icon} className="w-4 h-4 text-muted-foreground" />
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleBatchRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            <Icon name="Eye" className="w-3.5 h-3.5" />
            Прочитано
          </button>
          <button
            onClick={() => handleExport("selected")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            <Icon name="Download" className="w-3.5 h-3.5" />
            Экспорт выбранных
          </button>
        </div>
      )}

      {/* Export dropdown */}
      <div className="flex items-center gap-2 justify-end">
        <div className="relative">
          <button
            onClick={() => setExportDropdownOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Icon name="FileDown" className="w-4 h-4" />
            Экспорт
            <Icon name="ChevronDown" className="w-3.5 h-3.5 ml-1" />
          </button>
          {exportDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 z-50 rounded-xl border border-border bg-popover shadow-lg py-1 min-w-[160px]">
              <button
                onClick={() => handleExport("all")}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
              >
                <Icon name="FileSpreadsheet" className="w-4 h-4 text-muted-foreground" />
                CSV (все)
              </button>
              <button
                onClick={() => handleExport("selected")}
                disabled={selected.size === 0}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                <Icon name="FileCheck" className="w-4 h-4 text-muted-foreground" />
                CSV (выбранные)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-primary rounded"
                  />
                </th>
                <th className="py-2.5 px-2 w-8">#</th>
                <SortableTh
                  label="Тип"
                  sortKey="_levelSort"
                  sort={sort}
                  onToggle={toggle}
                  className="px-3"
                />
                <SortableTh
                  label="Заголовок"
                  sortKey="title"
                  sort={sort}
                  onToggle={toggle}
                  className="px-3"
                />
                <th className="py-2.5 px-3 font-medium hidden md:table-cell">Описание</th>
                <SortableTh
                  label="Время"
                  sortKey="_ts"
                  sort={sort}
                  onToggle={toggle}
                  className="px-3"
                />
                <SortableTh
                  label="Уровень"
                  sortKey="_levelSort"
                  sort={sort}
                  onToggle={toggle}
                  className="px-3"
                />
                <SortableTh
                  label="Статус"
                  sortKey="_statusSort"
                  sort={sort}
                  onToggle={toggle}
                  className="px-3"
                />
                <th className="py-2.5 px-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Icon name="InboxIcon" className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Нет уведомлений</p>
                  </td>
                </tr>
              )}
              {paginatedRows.map((row, idx) => {
                const isSelected = selected.has(row.id);
                const isExpanded = expandedId === row.id;
                const typeStyle = getTypeStyle(row.level);
                const rowNum = safePage * perPage + idx + 1;
                const ls = NOTIF_LEVEL_STYLES[row.level];

                return (
                  <NotifTableRow
                    key={row.id}
                    row={row}
                    rowNum={rowNum}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    typeStyle={typeStyle}
                    ls={ls}
                    forwardDropdownId={forwardDropdownId}
                    onToggleSelect={() => toggleSelect(row.id)}
                    onToggleExpand={() =>
                      setExpandedId((prev) => (prev === row.id ? null : row.id))
                    }
                    onMarkRead={() => {
                      onMarkNotificationRead(row.id);
                      setToast("Отмечено прочитанным");
                    }}
                    onOpenForward={() =>
                      setForwardDropdownId((prev) => (prev === row.id ? null : row.id))
                    }
                    onForward={(role) => handleForward(role, [row.id])}
                    onCloseForward={() => setForwardDropdownId(null)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {sortedRows.length > 10 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">На странице:</span>
            {[10, 20, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setPerPage(v);
                  setPage(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  perPage === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            Показано {safePage * perPage + 1}-
            {Math.min((safePage + 1) * perPage, sortedRows.length)} из {sortedRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
            >
              <Icon name="ChevronLeft" className="w-4 h-4" />
              Назад
            </button>
            <span className="px-3 py-1.5 text-sm text-muted-foreground">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
            >
              Далее
              <Icon name="ChevronRight" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-3 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <Icon name="CheckCircle" className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Alerts View ───────────────────────────────────────────────────────────────
type AlertFilter = "all" | "unresolved" | "resolved";

export function AlertsView({
  alerts,
  onResolveAlert,
  userName,
}: {
  alerts: Alert[];
  onResolveAlert: (id: string, resolverName: string) => void;
  userName: string;
}) {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === "unresolved") list = list.filter((a) => !a.resolved);
    else if (filter === "resolved") list = list.filter((a) => a.resolved);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.driverName.toLowerCase().includes(q) || a.vehicleNumber.includes(q) || a.routeNumber.includes(q) || a.message.toLowerCase().includes(q));
    }
    return list;
  }, [alerts, filter, search]);

  const filterButtons: { key: AlertFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "unresolved", label: "Активные" },
    { key: "resolved", label: "Решённые" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {alerts.filter((a) => !a.resolved).length} активных
          </span>
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Борт, водитель..." className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
          </div>
          <ReportButton filename="alerts" data={alerts} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Icon name="ShieldCheck" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Нет тревог</p>
            </div>
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`px-5 py-3.5 border-b border-border flex items-center gap-4 transition-colors ${
                !alert.resolved
                  ? `border-l-[3px] ${LEVEL_BORDER[alert.level]}`
                  : "border-l-[3px] border-l-green-500/40 opacity-70"
              }`}
            >
              <div className="shrink-0">
                {alert.resolved ? (
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Icon name="CheckCircle" className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      alert.level === "critical"
                        ? "bg-red-500/10"
                        : alert.level === "warning"
                          ? "bg-yellow-500/10"
                          : "bg-blue-500/10"
                    }`}
                  >
                    <Icon
                      name={ALERT_TYPE_ICONS[alert.type]}
                      className={`w-4 h-4 ${LEVEL_ICONS[alert.level].color}`}
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${LEVEL_COLORS[alert.level]}`}
                  >
                    {alert.level === "critical"
                      ? "КРИТ"
                      : alert.level === "warning"
                        ? "ВНИМАНИЕ"
                        : "ИНФО"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {ALERT_TYPE_LABELS[alert.type]}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {alert.driverName}
                  <span className="text-muted-foreground font-normal">
                    {" "}#{alert.vehicleNumber} / М{alert.routeNumber}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {alert.message}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {formatTimeAgo(alert.timestamp)}
                </p>
                {alert.resolved ? (
                  <p className="text-[10px] text-green-500">
                    {alert.resolvedBy} {alert.resolvedAt && `/ ${formatTimeAgo(alert.resolvedAt)}`}
                  </p>
                ) : (
                  <button
                    onClick={() => onResolveAlert(alert.id, userName)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Решить
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Notification Table Row ───────────────────────────────────────────────────
interface NotifTableRowProps {
  row: Notification & { _ts: number; _levelSort: number; _statusSort: number };
  rowNum: number;
  isSelected: boolean;
  isExpanded: boolean;
  typeStyle: { icon: string; color: string; bg: string };
  ls: { icon: string; bg: string; text: string };
  forwardDropdownId: string | null;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onMarkRead: () => void;
  onOpenForward: () => void;
  onForward: (role: UserRole) => void;
  onCloseForward: () => void;
}

function NotifTableRow({
  row,
  rowNum,
  isSelected,
  isExpanded,
  typeStyle,
  ls,
  forwardDropdownId,
  onToggleSelect,
  onToggleExpand,
  onMarkRead,
  onOpenForward,
  onForward,
  onCloseForward,
}: NotifTableRowProps) {
  const showForwardDropdown = forwardDropdownId === row.id;

  return (
    <>
      <tr
        className={`hover:bg-muted/30 transition-colors border-b border-border ${
          isSelected ? "bg-primary/5" : ""
        }`}
      >
        <td className="py-2.5 px-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 accent-primary rounded"
          />
        </td>
        <td className="py-2.5 px-2 text-xs text-muted-foreground">{rowNum}</td>
        <td className="py-2.5 px-3">
          <div
            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${ls.bg}`}
            style={
              typeStyle.color
                ? { backgroundColor: typeStyle.bg, color: typeStyle.color }
                : undefined
            }
          >
            <Icon
              name={typeStyle.icon}
              className={`w-4 h-4 ${typeStyle.color ? "" : ls.text}`}
              style={typeStyle.color ? { color: typeStyle.color } : undefined}
            />
          </div>
        </td>
        <td className="py-2.5 px-3 max-w-[200px]">
          <span
            className={`block truncate ${
              !row.read ? "font-semibold text-foreground" : "text-foreground/80"
            }`}
          >
            {row.title}
          </span>
        </td>
        <td className="py-2.5 px-3 max-w-[260px] hidden md:table-cell">
          <span className="block truncate text-muted-foreground text-xs">{row.body}</span>
        </td>
        <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
          {formatTimestamp(row.timestamp)}
        </td>
        <td className="py-2.5 px-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              row.level === "critical"
                ? "bg-red-500/15 text-red-500"
                : row.level === "warning"
                ? "bg-amber-500/15 text-amber-500"
                : "bg-blue-500/15 text-blue-500"
            }`}
          >
            {NOTIF_LEVEL_LABELS[row.level]}
          </span>
        </td>
        <td className="py-2.5 px-3">
          {row.read ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-500/15 text-green-500">
              Прочитано
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Новое
            </span>
          )}
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={onOpenForward}
                title="Переслать"
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Icon name="Forward" className="w-4 h-4" />
              </button>
              {showForwardDropdown && (
                <div className="absolute top-full right-0 mt-1 z-50 rounded-xl border border-border bg-popover shadow-lg py-1 min-w-[170px]">
                  {FORWARD_ROLES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => {
                        onForward(r.key);
                        onCloseForward();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                    >
                      <Icon name={r.icon} className="w-4 h-4 text-muted-foreground" />
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!row.read && (
              <button
                onClick={onMarkRead}
                title="Прочитано"
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Icon name="Eye" className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onToggleExpand}
              title={isExpanded ? "Свернуть" : "Развернуть"}
              className={`p-1.5 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <Icon name="ChevronDown" className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-border">
          <td colSpan={9} className="px-6 py-4 bg-muted/20">
            <div className="space-y-3">
              <p className="text-sm text-foreground leading-relaxed">{row.body}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">
                  Переслать:
                </span>
                {FORWARD_ROLES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => onForward(r.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name={r.icon} className="w-3.5 h-3.5 text-muted-foreground" />
                    {r.label}
                  </button>
                ))}
                <div className="h-4 w-px bg-border" />
                <button
                  onClick={() => {
                    console.log("Create ticket from notification:", row.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Icon name="TicketPlus" className="w-3.5 h-3.5" />
                  Создать заявку
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}