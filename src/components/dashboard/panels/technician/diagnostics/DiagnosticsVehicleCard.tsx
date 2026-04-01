import Icon from "@/components/ui/icon";
import type { TechDiagnosticReport, DiagnosticCheck } from "@/types/dashboard";

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

interface DiagnosticsVehicleCardProps {
  report: TechDiagnosticReport;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function DiagnosticsVehicleCard({
  report,
  isExpanded,
  onToggle,
}: DiagnosticsVehicleCardProps) {
  const okCount = report.totalChecks - report.criticalCount - report.warningCount;

  return (
    <div
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
        onClick={onToggle}
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
}
