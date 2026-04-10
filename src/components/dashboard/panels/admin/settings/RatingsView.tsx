import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import urls from '@/api/config';

/* ── API ──────────────────────────────────────────────────────────── */
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

/* ── Types ────────────────────────────────────────────────────────── */
interface RatedEntity {
  id: number;
  full_name: string;
  role: string;
  rating: number;
  rating_count: number;
}

interface RatingDetail {
  id: number;
  rater_name: string;
  rater_role: string;
  rating: number;
  comment?: string;
  created_at: string;
}

type SortField = "full_name" | "role" | "rating" | "rating_count";
type SortDir = "asc" | "desc";
type Tab = "users" | "drivers";
type RoleFilter = "all" | "dispatcher" | "technician" | "mechanic" | "admin" | "driver";

/* ── Constants ────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  admin: "Администратор",
  driver: "Водитель",
};

const ROLE_BADGE: Record<string, string> = {
  dispatcher: "bg-blue-500/15 text-blue-600",
  technician: "bg-purple-500/15 text-purple-600",
  mechanic: "bg-amber-500/15 text-amber-600",
  admin: "bg-red-500/15 text-red-600",
  driver: "bg-green-500/15 text-green-600",
};

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "dispatcher", label: "Диспетчер" },
  { key: "technician", label: "Технолог" },
  { key: "mechanic", label: "Механик" },
  { key: "admin", label: "Админ" },
  { key: "driver", label: "Водитель" },
];

const COLUMNS: { key: SortField; label: string; align: "left" | "right" }[] = [
  { key: "full_name", label: "ФИО", align: "left" },
  { key: "role", label: "Роль", align: "left" },
  { key: "rating", label: "Рейтинг", align: "left" },
  { key: "rating_count", label: "Голосов", align: "right" },
];

/* ── Helpers ──────────────────────────────────────────────────────── */
function formatRating(r: number): string {
  if (!r || isNaN(r)) return "0.00";
  return Number(r).toFixed(2);
}

function formatDate(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ── Stars component ─────────────────────────────────────────────── */
function Stars({ value }: { value: number }) {
  const rounded = Math.round(value || 0);
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="Star"
          className={`w-3.5 h-3.5 ${
            n <= rounded
              ? "text-amber-500 fill-amber-500"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

/* ── Mini Stars for details ──────────────────────────────────────── */
function MiniStars({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="Star"
          className={`w-3 h-3 ${
            n <= value
              ? "text-amber-500 fill-amber-500"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ════════════════════════════════════════════════════════════════════ */
export default function RatingsView() {
  /* ── Data state ─────────────────────────────────────────────────── */
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<RatedEntity[]>([]);
  const [drivers, setDrivers] = useState<RatedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── Table state ────────────────────────────────────────────────── */
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortField, setSortField] = useState<SortField>("rating");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  /* ── Expand / details state ─────────────────────────────────────── */
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, RatingDetail[] | "loading" | "error">>({});

  /* ── Load data ──────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}?action=ratings&scope=all`, {
        headers: hdrs(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users || []);
      setDrivers(data.drivers || []);
    } catch {
      setError("Ошибка загрузки рейтингов");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Reset selections when switching tabs */
  useEffect(() => {
    setSelected(new Set());
    setExpandedId(null);
    setSearch("");
    setRoleFilter("all");
    setSortField("rating");
    setSortDir("desc");
  }, [tab]);

  /* ── Sort handler ───────────────────────────────────────────────── */
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir(field === "full_name" || field === "role" ? "asc" : "desc");
      }
    },
    [sortField]
  );

  /* ── Filtered + sorted list ─────────────────────────────────────── */
  const rawList = tab === "users" ? users : drivers;

  const processed = useMemo(() => {
    let list = [...rawList];

    // Role filter
    if (roleFilter !== "all") {
      list = list.filter((e) => e.role === roleFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.full_name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "full_name":
          cmp = (a.full_name || "").localeCompare(b.full_name || "", "ru");
          break;
        case "role":
          cmp = (ROLE_LABELS[a.role] || a.role).localeCompare(
            ROLE_LABELS[b.role] || b.role,
            "ru"
          );
          break;
        case "rating":
          cmp = (a.rating || 0) - (b.rating || 0);
          break;
        case "rating_count":
          cmp = (a.rating_count || 0) - (b.rating_count || 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [rawList, roleFilter, search, sortField, sortDir]);

  /* ── Selection helpers ──────────────────────────────────────────── */
  const allVisibleIds = useMemo(
    () => new Set(processed.map((e) => e.id)),
    [processed]
  );

  const allSelected =
    processed.length > 0 && processed.every((e) => selected.has(e.id));

  const someSelected =
    !allSelected && processed.some((e) => selected.has(e.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allVisibleIds));
    }
  }, [allSelected, allVisibleIds]);

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedCount = useMemo(
    () => processed.filter((e) => selected.has(e.id)).length,
    [processed, selected]
  );

  /* ── Expand / fetch details ─────────────────────────────────────── */
  const toggleExpand = useCallback(
    async (entity: RatedEntity) => {
      if (expandedId === entity.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(entity.id);

      // Already loaded?
      if (details[entity.id] && details[entity.id] !== "error") return;

      // Fetch
      setDetails((prev) => ({ ...prev, [entity.id]: "loading" }));
      try {
        const paramKey = tab === "drivers" ? "driver_id" : "user_id";
        const res = await fetch(
          `${API_URL}?action=rating_details&${paramKey}=${entity.id}`,
          { headers: hdrs() }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDetails((prev) => ({
          ...prev,
          [entity.id]: data.details || data.ratings || [],
        }));
      } catch {
        setDetails((prev) => ({ ...prev, [entity.id]: "error" }));
      }
    },
    [expandedId, details, tab]
  );

  /* ── CSV export ─────────────────────────────────────────────────── */
  const handleExport = useCallback(() => {
    const exportList =
      selectedCount > 0
        ? processed.filter((e) => selected.has(e.id))
        : processed;

    const header = ["№", "ФИО", "Роль", "Рейтинг", "Количество голосов"];
    const rows = exportList.map((e, i) => [
      String(i + 1),
      `"${(e.full_name || "").replace(/"/g, '""')}"`,
      `"${ROLE_LABELS[e.role] || e.role}"`,
      formatRating(e.rating),
      String(e.rating_count || 0),
    ]);

    const csvContent = [header.join(";"), ...rows.map((r) => r.join(";"))].join(
      "\n"
    );
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ratings_export_${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [processed, selected, selectedCount]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">Рейтинги</h3>
          <p className="text-sm text-muted-foreground">
            Сводка оценок сотрудников и водителей
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            title={
              selectedCount > 0
                ? `Экспорт ${selectedCount} выбранных`
                : "Экспорт всех"
            }
          >
            <Icon name="Download" className="w-4 h-4" />
            Экспорт
            {selectedCount > 0 && (
              <span className="text-[10px] opacity-80 ml-0.5">
                ({selectedCount})
              </span>
            )}
          </button>
          <button
            onClick={load}
            className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
            title="Обновить"
          >
            <Icon
              name="RefreshCw"
              className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "users"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Users" className="w-4 h-4" />
          Сотрудники
          <span className="text-[10px] opacity-70">({users.length})</span>
        </button>
        <button
          onClick={() => setTab("drivers")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "drivers"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Bus" className="w-4 h-4" />
          Водители
          <span className="text-[10px] opacity-70">({drivers.length})</span>
        </button>
      </div>

      {/* Search + Role filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ФИО..."
            className="w-full h-9 pl-9 pr-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex gap-1 p-0.5 bg-muted/50 border border-border rounded-lg">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf.key}
              onClick={() => setRoleFilter(rf.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                roleFilter === rf.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {rf.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {processed.length} из {rawList.length}
        </span>
      </div>

      {error && (
        <div className="text-xs text-red-500 flex items-center gap-1">
          <Icon name="AlertCircle" className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Загрузка...
          </div>
        ) : processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Icon name="UserX" className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">
              {rawList.length === 0
                ? "Нет данных"
                : "Нет результатов по фильтру"}
            </p>
            {(search || roleFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                }}
                className="text-xs text-primary mt-2 hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {/* Checkbox */}
                  <th className="w-10 px-4 py-3">
                    <button
                      onClick={toggleAll}
                      className="w-4 h-4 rounded border border-border flex items-center justify-center transition-colors hover:border-primary"
                      style={{
                        backgroundColor: allSelected
                          ? "hsl(var(--primary))"
                          : someSelected
                            ? "hsl(var(--primary) / 0.3)"
                            : undefined,
                        borderColor:
                          allSelected || someSelected
                            ? "hsl(var(--primary))"
                            : undefined,
                      }}
                    >
                      {allSelected && (
                        <Icon
                          name="Check"
                          className="w-3 h-3 text-primary-foreground"
                        />
                      )}
                      {someSelected && !allSelected && (
                        <Icon
                          name="Minus"
                          className="w-3 h-3 text-primary-foreground"
                        />
                      )}
                    </button>
                  </th>

                  {/* Rank # */}
                  <th className="w-12 px-2 py-3 text-left font-medium text-muted-foreground text-xs">
                    #
                  </th>

                  {/* Sortable columns */}
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-4 py-3 font-medium text-muted-foreground text-xs cursor-pointer select-none hover:text-foreground transition-colors ${
                        col.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortField === col.key ? (
                          <Icon
                            name={
                              sortDir === "asc" ? "ChevronUp" : "ChevronDown"
                            }
                            className="w-3.5 h-3.5 text-primary"
                          />
                        ) : (
                          <Icon
                            name="ChevronsUpDown"
                            className="w-3.5 h-3.5 opacity-30"
                          />
                        )}
                      </span>
                    </th>
                  ))}

                  {/* Actions */}
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {processed.map((e, idx) => {
                  const isSelected = selected.has(e.id);
                  const isExpanded = expandedId === e.id;
                  const entityDetails = details[e.id];

                  return (
                    <TableRow
                      key={e.id}
                      entity={e}
                      rank={idx + 1}
                      isSelected={isSelected}
                      isExpanded={isExpanded}
                      entityDetails={entityDetails}
                      onToggleSelect={() => toggleOne(e.id)}
                      onToggleExpand={() => toggleExpand(e)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selection info bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl text-sm">
          <Icon name="CheckSquare" className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium">
            Выбрано: {selectedCount}
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 ml-auto px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon name="Download" className="w-3.5 h-3.5" />
            Экспорт выбранных
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/70 transition-colors"
          >
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  TABLE ROW (extracted for clarity)
 * ════════════════════════════════════════════════════════════════════ */
interface TableRowProps {
  entity: RatedEntity;
  rank: number;
  isSelected: boolean;
  isExpanded: boolean;
  entityDetails: RatingDetail[] | "loading" | "error" | undefined;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}

function TableRow({
  entity: e,
  rank,
  isSelected,
  isExpanded,
  entityDetails,
  onToggleSelect,
  onToggleExpand,
}: TableRowProps) {
  return (
    <>
      <tr
        className={`border-b border-border/50 transition-colors ${
          isSelected
            ? "bg-primary/[0.03]"
            : "hover:bg-muted/40"
        }`}
      >
        {/* Checkbox */}
        <td className="w-10 px-4 py-3">
          <button
            onClick={onToggleSelect}
            className="w-4 h-4 rounded border border-border flex items-center justify-center transition-colors hover:border-primary"
            style={{
              backgroundColor: isSelected
                ? "hsl(var(--primary))"
                : undefined,
              borderColor: isSelected
                ? "hsl(var(--primary))"
                : undefined,
            }}
          >
            {isSelected && (
              <Icon
                name="Check"
                className="w-3 h-3 text-primary-foreground"
              />
            )}
          </button>
        </td>

        {/* Rank */}
        <td className="w-12 px-2 py-3">
          <span className="text-xs text-muted-foreground tabular-nums font-medium">
            {rank}
          </span>
        </td>

        {/* Name + avatar */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {(e.full_name || "?").charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground">
              {e.full_name}
            </span>
          </div>
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              ROLE_BADGE[e.role] || "bg-muted text-muted-foreground"
            }`}
          >
            {ROLE_LABELS[e.role] || e.role}
          </span>
        </td>

        {/* Rating */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Stars value={e.rating || 0} />
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {formatRating(e.rating)}
            </span>
          </div>
        </td>

        {/* Rating count */}
        <td className="px-4 py-3 text-right text-sm text-muted-foreground tabular-nums">
          {e.rating_count || 0}
        </td>

        {/* Expand action */}
        <td className="w-12 px-4 py-3">
          <button
            onClick={onToggleExpand}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isExpanded
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title="Детали оценок"
          >
            <Icon
              name={isExpanded ? "ChevronUp" : "ChevronDown"}
              className="w-4 h-4"
            />
          </button>
        </td>
      </tr>

      {/* Expanded details row */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-muted/20 border-b border-border/50">
            <DetailsPanel details={entityDetails} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  DETAILS PANEL (expanded sub-row)
 * ════════════════════════════════════════════════════════════════════ */
function DetailsPanel({
  details,
}: {
  details: RatingDetail[] | "loading" | "error" | undefined;
}) {
  if (details === "loading" || details === undefined) {
    return (
      <div className="px-8 py-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="Loader2" className="w-4 h-4 animate-spin" />
        Загрузка деталей...
      </div>
    );
  }

  if (details === "error") {
    return (
      <div className="px-8 py-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="AlertCircle" className="w-4 h-4 text-red-400" />
        Детали недоступны
      </div>
    );
  }

  if (details.length === 0) {
    return (
      <div className="px-8 py-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="Inbox" className="w-4 h-4 opacity-40" />
        Нет отдельных оценок
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="ListChecks" className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">
          История оценок
        </span>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {details.length}
        </span>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                Оценивший
              </th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                Роль
              </th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                Оценка
              </th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                Комментарий
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                Дата
              </th>
            </tr>
          </thead>
          <tbody>
            {details.map((d) => (
              <tr
                key={d.id}
                className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                      {(d.rater_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-foreground font-medium">
                      {d.rater_name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      ROLE_BADGE[d.rater_role] ||
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ROLE_LABELS[d.rater_role] || d.rater_role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <MiniStars value={d.rating} />
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                  {d.comment || (
                    <span className="opacity-40 italic">--</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatDate(d.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}