import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { IssueReport } from "@/types/dashboard";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${mins}`;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Критическая",
  warning: "Предупреждение",
  info: "Информация",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
  warning: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  info: "bg-blue-500/15 text-blue-500 border-blue-500/30",
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-l-red-500",
  warning: "border-l-yellow-500",
  info: "border-l-blue-500",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  seen_dispatcher: "Просмотрена",
  seen_technician: "Тех. просмотрена",
  in_progress: "В работе",
  resolved: "Решена",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-red-500/15 text-red-500",
  seen_dispatcher: "bg-blue-500/15 text-blue-500",
  seen_technician: "bg-purple-500/15 text-purple-500",
  in_progress: "bg-yellow-500/15 text-yellow-600",
  resolved: "bg-green-500/15 text-green-500",
};

// ── Filter type ──────────────────────────────────────────────────────────────

type IssueFilter = "all" | "new" | "in_progress" | "resolved";

// ── Component ────────────────────────────────────────────────────────────────

export function VehicleIssuesView({
  issues,
  onResolve,
}: {
  issues: IssueReport[];
  onResolve: (id: string, notes?: string) => void;
}) {
  const [filter, setFilter] = useState<IssueFilter>("all");
  const [search, setSearch] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const filtered = useMemo(() => {
    let list = [...issues].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filter === "new")
      list = list.filter(
        (i) =>
          i.reportStatus === "new" ||
          i.reportStatus === "seen_dispatcher" ||
          i.reportStatus === "seen_technician"
      );
    else if (filter === "in_progress")
      list = list.filter((i) => i.reportStatus === "in_progress");
    else if (filter === "resolved")
      list = list.filter((i) => i.reportStatus === "resolved");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.driverName ?? "").toLowerCase().includes(q) ||
          (i.vehicleNumber ?? "").toLowerCase().includes(q) ||
          (i.routeNumber ?? "").toLowerCase().includes(q) ||
          (i.message ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [issues, filter, search]);

  const countNew = issues.filter(
    (i) =>
      i.reportStatus === "new" ||
      i.reportStatus === "seen_dispatcher" ||
      i.reportStatus === "seen_technician"
  ).length;
  const countInProgress = issues.filter(
    (i) => i.reportStatus === "in_progress"
  ).length;
  const countResolved = issues.filter(
    (i) => i.reportStatus === "resolved"
  ).length;

  const filterButtons: { key: IssueFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "new", label: "Новые" },
    { key: "in_progress", label: "В работе" },
    { key: "resolved", label: "Решённые" },
  ];

  const handleResolve = (id: string) => {
    onResolve(id, resolutionNotes.trim() || undefined);
    setResolvingId(null);
    setResolutionNotes("");
  };

  const statCards = [
    {
      icon: "ClipboardList",
      value: issues.length,
      label: "Всего обращений",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: "AlertCircle",
      value: countNew,
      label: "Новых / нерешённых",
      color: countNew > 0 ? "text-red-500" : "text-muted-foreground",
      bg: countNew > 0 ? "bg-red-500/10" : "bg-muted/40",
    },
    {
      icon: "Clock",
      value: countInProgress,
      label: "В работе",
      color: countInProgress > 0 ? "text-yellow-500" : "text-muted-foreground",
      bg: countInProgress > 0 ? "bg-yellow-500/10" : "bg-muted/40",
    },
    {
      icon: "CheckCircle",
      value: countResolved,
      label: "Решённых",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4"
          >
            <div
              className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}
            >
              <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Issue list ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        {/* Toolbar */}
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
              {countNew} активных
            </span>
            <div className="relative">
              <Icon
                name="Search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Борт, водитель..."
                className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36"
              />
            </div>
            <ReportButton filename="vehicle_issues" data={issues} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Icon
                  name="ShieldCheck"
                  className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2"
                />
                <p className="text-sm text-muted-foreground">
                  Нет обращений
                </p>
              </div>
            </div>
          ) : (
            filtered.map((issue) => {
              const isResolved = issue.reportStatus === "resolved";
              const isResolving = resolvingId === issue.id;
              const sevBorder =
                SEVERITY_BORDER[issue.severity] ?? "border-l-blue-500";
              const sevColor =
                SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.info;
              const statusColor =
                STATUS_COLORS[issue.reportStatus] ?? STATUS_COLORS.new;

              return (
                <div key={issue.id}>
                  <div
                    className={`px-5 py-3.5 border-b border-border flex items-center gap-4 transition-colors ${
                      isResolved
                        ? "border-l-[3px] border-l-green-500/40 opacity-70"
                        : `border-l-[3px] ${sevBorder}`
                    }`}
                  >
                    {/* Icon */}
                    <div className="shrink-0">
                      {isResolved ? (
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Icon
                            name="CheckCircle"
                            className="w-4 h-4 text-green-500"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            issue.severity === "critical"
                              ? "bg-red-500/10"
                              : issue.severity === "warning"
                                ? "bg-yellow-500/10"
                                : "bg-blue-500/10"
                          }`}
                        >
                          <Icon
                            name={
                              issue.severity === "critical"
                                ? "AlertOctagon"
                                : issue.severity === "warning"
                                  ? "AlertTriangle"
                                  : "Info"
                            }
                            className={`w-4 h-4 ${
                              issue.severity === "critical"
                                ? "text-red-500"
                                : issue.severity === "warning"
                                  ? "text-yellow-500"
                                  : "text-blue-500"
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sevColor}`}
                        >
                          {SEVERITY_LABELS[issue.severity] ?? issue.severity}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColor}`}
                        >
                          {STATUS_LABELS[issue.reportStatus] ??
                            issue.reportStatus}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {issue.driverName || "Водитель"}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          {issue.vehicleNumber
                            ? `#${issue.vehicleNumber}`
                            : ""}
                          {issue.routeNumber
                            ? ` / М${issue.routeNumber}`
                            : ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {issue.message}
                      </p>
                      {isResolved && issue.resolutionNotes && (
                        <p className="text-[10px] text-green-600 mt-1 truncate">
                          <Icon
                            name="MessageSquare"
                            className="w-3 h-3 inline-block mr-1 -mt-0.5"
                          />
                          {issue.resolutionNotes}
                        </p>
                      )}
                    </div>

                    {/* Right side: time + action */}
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {formatDateTime(issue.createdAt)}
                      </p>
                      {isResolved ? (
                        <p className="text-[10px] text-green-500">
                          {issue.resolvedByName ?? "Решено"}
                          {issue.resolvedAt &&
                            ` / ${formatDateTime(issue.resolvedAt)}`}
                        </p>
                      ) : (
                        <button
                          onClick={() => {
                            setResolvingId(
                              isResolving ? null : issue.id
                            );
                            setResolutionNotes("");
                          }}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Решить
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline resolution form */}
                  {isResolving && (
                    <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
                      <div className="relative flex-1">
                        <Icon
                          name="MessageSquare"
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
                        />
                        <input
                          value={resolutionNotes}
                          onChange={(e) =>
                            setResolutionNotes(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleResolve(issue.id);
                            if (e.key === "Escape") {
                              setResolvingId(null);
                              setResolutionNotes("");
                            }
                          }}
                          placeholder="Примечание к решению (необязательно)..."
                          className="h-9 w-full pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => handleResolve(issue.id)}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-1.5"
                      >
                        <Icon name="Check" className="w-3.5 h-3.5" />
                        Подтвердить
                      </button>
                      <button
                        onClick={() => {
                          setResolvingId(null);
                          setResolutionNotes("");
                        }}
                        className="px-3 py-2 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleIssuesView;
