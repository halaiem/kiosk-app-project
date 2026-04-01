import { useState, useMemo, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { TechDiagnosticReport, DiagnosticCheck } from "@/types/dashboard";
import { fetchTechReports } from "@/api/diagnosticsApi";

import DiagnosticsSummaryCards from "./diagnostics/DiagnosticsSummaryCards";
import DiagnosticsToolbar from "./diagnostics/DiagnosticsToolbar";
import DiagnosticsVehicleCard from "./diagnostics/DiagnosticsVehicleCard";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

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
      <DiagnosticsSummaryCards statCards={statCards} />

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <DiagnosticsToolbar
        search={search}
        onSearchChange={setSearch}
        rawData={rawData}
        onReload={handleReload}
      />

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
          filtered.map((report) => (
            <DiagnosticsVehicleCard
              key={report.vehicleNumber}
              report={report}
              isExpanded={expandedVehicle === report.vehicleNumber}
              onToggle={() => toggleExpand(report.vehicleNumber)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default TechDiagnosticsView;
