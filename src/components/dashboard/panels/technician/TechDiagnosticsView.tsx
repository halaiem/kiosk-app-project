import { useState, useMemo, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { TechDiagnosticReport, DiagnosticCheck } from "@/types/dashboard";
import { fetchTechReports } from "@/api/diagnosticsApi";

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  engine: "Двигатель",
  brakes: "Тормозная система",
  electrical: "Электрооборудование",
  transmission: "Трансмиссия",
  tires: "Шины и колёса",
  body: "Кузов",
  cooling: "Система охлаждения",
  emission: "Выхлопная система",
  steering: "Рулевое управление",
  general: "Общее",
};

const CATEGORY_ICONS: Record<string, string> = {
  engine: "Engine",
  brakes: "Disc",
  electrical: "Zap",
  transmission: "Cog",
  tires: "Circle",
  body: "Car",
  cooling: "Thermometer",
  emission: "Wind",
  steering: "Compass",
  general: "Wrench",
};

const SEVERITY_BADGE: Record<string, { bg: string; text: string }> = {
  ok: { bg: "bg-green-500/10", text: "text-green-500" },
  info: { bg: "bg-blue-500/10", text: "text-blue-500" },
  warning: { bg: "bg-yellow-500/10", text: "text-yellow-500" },
  critical: { bg: "bg-red-500/10", text: "text-red-500" },
};

const SEVERITY_LABELS: Record<string, string> = {
  ok: "Норма",
  info: "Инфо",
  warning: "Внимание",
  critical: "Критично",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${mins}`;
}

interface RawReport {
  id: string;
  checkCode: string;
  checkName: string;
  category: string;
  severity: string;
  status: string;
  shortDescription: string;
  fullDescription: string;
  rawData: unknown;
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  vehicleNumber: string;
  driverName: string;
  routeNumber: string;
  apiName: string | null;
  apiType: string | null;
}

function groupByVehicle(rows: RawReport[]): TechDiagnosticReport[] {
  const map = new Map<string, TechDiagnosticReport>();

  for (const r of rows) {
    const key = r.vehicleNumber || "unknown";
    let report = map.get(key);

    if (!report) {
      report = {
        vehicleId: key,
        vehicleNumber: r.vehicleNumber || "---",
        vehicleType: "",
        driverName: r.driverName || "",
        routeNumber: r.routeNumber || "",
        totalChecks: 0,
        criticalCount: 0,
        warningCount: 0,
        lastCheckAt: r.detectedAt,
        checks: [],
      };
      map.set(key, report);
    }

    const check: DiagnosticCheck = {
      id: r.id,
      checkCode: r.checkCode,
      checkName: r.checkName,
      category: r.category as DiagnosticCheck["category"],
      severity: r.severity as DiagnosticCheck["severity"],
      shortDescription: r.shortDescription,
      fullDescription: r.fullDescription,
      detectedAt: r.detectedAt,
    };

    report.checks.push(check);
    report.totalChecks++;
    if (r.severity === "critical") report.criticalCount++;
    if (r.severity === "warning") report.warningCount++;

    if (r.detectedAt && (!report.lastCheckAt || new Date(r.detectedAt) > new Date(report.lastCheckAt))) {
      report.lastCheckAt = r.detectedAt;
    }

    if (r.driverName && !report.driverName) report.driverName = r.driverName;
    if (r.routeNumber && !report.routeNumber) report.routeNumber = r.routeNumber;
  }

  return [...map.values()].sort((a, b) => {
    if (a.criticalCount !== b.criticalCount) return b.criticalCount - a.criticalCount;
    if (a.warningCount !== b.warningCount) return b.warningCount - a.warningCount;
    return b.totalChecks - a.totalChecks;
  });
}

function downloadVehicleReport(report: TechDiagnosticReport) {
  const lines: string[] = [];
  lines.push("ОТЧЁТ О ДИАГНОСТИКЕ ТРАНСПОРТНОГО СРЕДСТВА");
  lines.push("═══════════════════════════════════════════");
  lines.push(`Борт: ${report.vehicleNumber}`);
  lines.push(`Тип: ${report.vehicleType || "—"}`);
  lines.push(`Водитель: ${report.driverName || "—"}`);
  lines.push(`Маршрут: ${report.routeNumber || "—"}`);
  lines.push(`Дата: ${new Date().toLocaleDateString("ru-RU")}`);
  lines.push("");
  lines.push(`Всего проверок: ${report.totalChecks}`);
  lines.push(`Критических: ${report.criticalCount}`);
  lines.push(`Предупреждений: ${report.warningCount}`);
  lines.push("");

  const byCategory: Record<string, DiagnosticCheck[]> = {};
  for (const c of report.checks) {
    const cat = c.category || "general";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(c);
  }

  for (const [cat, checks] of Object.entries(byCategory)) {
    lines.push(`── ${CATEGORY_LABELS[cat] || cat} ──`);
    for (const c of checks) {
      lines.push(`  [${c.severity.toUpperCase()}] ${c.checkName}`);
      lines.push(`    Код: ${c.checkCode}`);
      if (c.shortDescription) lines.push(`    ${c.shortDescription}`);
      if (c.fullDescription) lines.push(`    Подробно: ${c.fullDescription}`);
      lines.push("");
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diagnostics_${report.vehicleNumber}_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────

export function TechDiagnosticsView({ onReload }: { onReload?: () => void }) {
  const [rawData, setRawData] = useState<RawReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchTechReports();
      setRawData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reports = useMemo(() => groupByVehicle(rawData), [rawData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.vehicleNumber.toLowerCase().includes(q) ||
        (r.driverName ?? "").toLowerCase().includes(q) ||
        (r.routeNumber ?? "").toLowerCase().includes(q)
    );
  }, [reports, search]);

  const totalChecks = reports.reduce((s, r) => s + r.totalChecks, 0);
  const totalCritical = reports.reduce((s, r) => s + r.criticalCount, 0);
  const totalWarnings = reports.reduce((s, r) => s + r.warningCount, 0);

  const statCards = [
    {
      icon: "Truck",
      value: reports.length,
      label: "ТС с диагностикой",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: "AlertOctagon",
      value: totalCritical,
      label: "Критических",
      color: totalCritical > 0 ? "text-red-500" : "text-muted-foreground",
      bg: totalCritical > 0 ? "bg-red-500/10" : "bg-muted/40",
    },
    {
      icon: "AlertTriangle",
      value: totalWarnings,
      label: "Предупреждений",
      color: totalWarnings > 0 ? "text-yellow-500" : "text-muted-foreground",
      bg: totalWarnings > 0 ? "bg-yellow-500/10" : "bg-muted/40",
    },
    {
      icon: "ClipboardCheck",
      value: totalChecks,
      label: "Всего проверок",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  const handleReload = () => {
    loadData();
    onReload?.();
  };

  const toggleExpand = (vehicleNum: string) => {
    setExpandedVehicle((prev) => (prev === vehicleNum ? null : vehicleNum));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Icon name="AlertCircle" className="w-10 h-10 text-red-500/50 mx-auto mb-2" />
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={handleReload}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4"
          >
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <Icon name={card.icon} className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground flex-1">Диагностика транспортных средств</h2>
        <div className="relative">
          <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Борт, водитель..."
            className="h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40"
          />
        </div>
        <ReportButton filename="diagnostics" data={rawData} />
        <button
          onClick={handleReload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
        >
          <Icon name="RefreshCw" className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* ── Vehicle cards ──────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 bg-card border border-border rounded-2xl">
            <div className="text-center">
              <Icon name="Activity" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Нет диагностических данных</p>
            </div>
          </div>
        ) : (
          filtered.map((report) => {
            const isExpanded = expandedVehicle === report.vehicleNumber;
            const okCount = report.totalChecks - report.criticalCount - report.warningCount;

            return (
              <div
                key={report.vehicleNumber}
                className={`bg-card border rounded-2xl overflow-hidden transition-colors ${
                  report.criticalCount > 0
                    ? "border-red-500/40"
                    : report.warningCount > 0
                      ? "border-yellow-500/30"
                      : "border-border"
                }`}
              >
                {/* Vehicle header row */}
                <button
                  onClick={() => toggleExpand(report.vehicleNumber)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                >
                  {/* Vehicle icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    report.criticalCount > 0
                      ? "bg-red-500/10"
                      : report.warningCount > 0
                        ? "bg-yellow-500/10"
                        : "bg-green-500/10"
                  }`}>
                    <Icon
                      name="Truck"
                      className={`w-5 h-5 ${
                        report.criticalCount > 0
                          ? "text-red-500"
                          : report.warningCount > 0
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}
                    />
                  </div>

                  {/* Vehicle info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-base font-bold text-foreground">#{report.vehicleNumber}</p>
                      {report.vehicleType && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {report.vehicleType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {report.driverName || "Водитель не назначен"}
                      {report.routeNumber ? ` / М${report.routeNumber}` : ""}
                    </p>
                  </div>

                  {/* Severity badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {report.criticalCount > 0 && (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-500">
                        {report.criticalCount} крит.
                      </span>
                    )}
                    {report.warningCount > 0 && (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-500">
                        {report.warningCount} пред.
                      </span>
                    )}
                    {okCount > 0 && (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-green-500/10 text-green-500">
                        {okCount} ок
                      </span>
                    )}
                  </div>

                  {/* Last check + chevron */}
                  <div className="shrink-0 text-right">
                    {report.lastCheckAt && (
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        {formatDateTime(report.lastCheckAt)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {report.totalChecks} проверок
                    </p>
                  </div>

                  <Icon
                    name={isExpanded ? "ChevronUp" : "ChevronDown"}
                    className="w-4 h-4 text-muted-foreground shrink-0"
                  />
                </button>

                {/* Expanded checks */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Actions bar */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-muted/20 border-b border-border">
                      <span className="text-xs font-medium text-muted-foreground flex-1">
                        Детальный отчёт — {report.totalChecks} проверок
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadVehicleReport(report);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                      >
                        <Icon name="FileText" className="w-3.5 h-3.5" />
                        Скачать отчёт
                      </button>
                    </div>

                    {/* Checks grouped by category */}
                    <div className="divide-y divide-border">
                      {Object.entries(groupChecksByCategory(report.checks)).map(([cat, checks]) => (
                        <div key={cat}>
                          {/* Category header */}
                          <div className="flex items-center gap-2 px-5 py-2.5 bg-muted/30">
                            <Icon
                              name={CATEGORY_ICONS[cat] || "Wrench"}
                              className="w-3.5 h-3.5 text-muted-foreground"
                            />
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({checks.length})
                            </span>
                          </div>

                          {/* Individual checks */}
                          {checks.map((check) => {
                            const badge = SEVERITY_BADGE[check.severity] ?? SEVERITY_BADGE.info;
                            return (
                              <div
                                key={check.id}
                                className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
                              >
                                {/* Severity dot */}
                                <div className={`w-7 h-7 rounded-lg ${badge.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    check.severity === "critical"
                                      ? "bg-red-500"
                                      : check.severity === "warning"
                                        ? "bg-yellow-500"
                                        : check.severity === "ok"
                                          ? "bg-green-500"
                                          : "bg-blue-500"
                                  }`} />
                                </div>

                                {/* Check info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-medium text-foreground">
                                      {check.checkName}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                      {SEVERITY_LABELS[check.severity] || check.severity}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {check.shortDescription}
                                  </p>
                                  {check.fullDescription && check.fullDescription !== check.shortDescription && (
                                    <p className="text-[11px] text-muted-foreground/70 mt-1 leading-relaxed">
                                      {check.fullDescription}
                                    </p>
                                  )}
                                </div>

                                {/* Code + time */}
                                <div className="shrink-0 text-right">
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {check.checkCode}
                                  </p>
                                  {check.detectedAt && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {formatDateTime(check.detectedAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────

function groupChecksByCategory(checks: DiagnosticCheck[]): Record<string, DiagnosticCheck[]> {
  const result: Record<string, DiagnosticCheck[]> = {};

  // Sort: critical first, then warning, then rest
  const sorted = [...checks].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2, ok: 3 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });

  for (const check of sorted) {
    const cat = check.category || "general";
    if (!result[cat]) result[cat] = [];
    result[cat].push(check);
  }

  return result;
}

export default TechDiagnosticsView;
