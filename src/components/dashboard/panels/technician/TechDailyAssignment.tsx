import { useState, useMemo, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { RouteInfo, DriverInfo, VehicleInfo, ScheduleEntry } from "@/types/dashboard";
import {
  createScheduleBatch,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/api/dashboardApi";
import AssignmentPrintForm, { preparePrintRows } from "./AssignmentPrintForm";
import {
  AssignmentRow,
  BatchResultItem,
  TemplateRow,
  Template,
  VEHICLE_TYPE_LABELS,
  nextKey,
} from "./assignment-shared";
import ExistingAssignmentsTable from "./ExistingAssignmentsTable";
import AssignmentFormRows from "./AssignmentFormRows";
import AssignmentResultsPanel from "./AssignmentResultsPanel";

interface DailyAssignmentProps {
  routes: RouteInfo[];
  drivers: DriverInfo[];
  vehicles: VehicleInfo[];
  schedule: ScheduleEntry[];
  onReload?: () => void;
}

export function DailyAssignmentView({
  routes,
  drivers,
  vehicles,
  schedule,
  onReload,
}: DailyAssignmentProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AssignmentRow[]>(() =>
    routes
      .filter((r) => r.isActive)
      .map((r) => ({
        key: nextKey(),
        routeId: r.id,
        routeNumber: r.number,
        routeName: r.name,
        driverId: null,
        vehicleId: "",
        shiftStart: "06:00",
        shiftEnd: "14:00",
        shiftType: "regular" as const,
        notes: "",
        showNotes: false,
      }))
  );
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<BatchResultItem[] | null>(null);
  const [existingExpanded, setExistingExpanded] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesPanelOpen, setTemplatesPanelOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState("");
  const [tplOverwriteId, setTplOverwriteId] = useState<number | null>(null);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await fetchTemplates();
      setTemplates(data.templates ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const rowsToTemplateRows = useCallback(
    (r: AssignmentRow[]): TemplateRow[] =>
      r
        .filter((row) => row.routeId || row.driverId || row.vehicleId)
        .map((row) => ({
          routeId: row.routeId,
          routeNumber: row.routeNumber,
          routeName: row.routeName,
          driverId: row.driverId,
          vehicleId: row.vehicleId,
          shiftStart: row.shiftStart,
          shiftEnd: row.shiftEnd,
          shiftType: row.shiftType,
        })),
    []
  );

  const handleSaveTemplate = useCallback(async () => {
    if (!tplName.trim()) return;
    setTplSaving(true);
    setTplError("");
    try {
      const tplRows = rowsToTemplateRows(rows);
      if (tplRows.length === 0) {
        setTplError("Заполните хотя бы одну строку");
        setTplSaving(false);
        return;
      }
      if (tplOverwriteId) {
        await updateTemplate(tplOverwriteId, {
          name: tplName.trim(),
          description: tplDesc.trim(),
          rows: tplRows,
        });
      } else {
        await createTemplate({
          name: tplName.trim(),
          description: tplDesc.trim(),
          rows: tplRows,
        });
      }
      await loadTemplates();
      setSaveTemplateOpen(false);
      setTplName("");
      setTplDesc("");
      setTplOverwriteId(null);
    } catch (e) {
      setTplError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setTplSaving(false);
    }
  }, [tplName, tplDesc, tplOverwriteId, rows, rowsToTemplateRows, loadTemplates]);

  const handleLoadTemplate = useCallback(
    (tpl: Template) => {
      const newRows: AssignmentRow[] = tpl.rows.map((tr) => ({
        key: nextKey(),
        routeId: tr.routeId ?? "",
        routeNumber: tr.routeNumber ?? "",
        routeName: tr.routeName ?? "",
        driverId: tr.driverId ?? null,
        vehicleId: tr.vehicleId ?? "",
        shiftStart: tr.shiftStart ?? "06:00",
        shiftEnd: tr.shiftEnd ?? "14:00",
        shiftType: tr.shiftType ?? "regular",
        notes: "",
        showNotes: false,
      }));
      setRows(newRows);
      setResults(null);
      setTemplatesPanelOpen(false);
    },
    []
  );

  const handleDeleteTemplate = useCallback(
    async (id: number) => {
      try {
        await deleteTemplate(id);
        await loadTemplates();
      } catch {
        //
      }
    },
    [loadTemplates]
  );

  const openOverwrite = useCallback(
    (tpl: Template) => {
      setTplOverwriteId(tpl.id);
      setTplName(tpl.name);
      setTplDesc(tpl.description);
      setSaveTemplateOpen(true);
      setTemplatesPanelOpen(false);
    },
    []
  );

  const [printOpen, setPrintOpen] = useState(false);
  const [printSource, setPrintSource] = useState<"form" | "existing">("form");
  const printRows = useMemo(
    () => preparePrintRows(rows, drivers, vehicles),
    [rows, drivers, vehicles]
  );

  const existingForDate = useMemo(
    () => schedule.filter((s) => s.date === date),
    [schedule, date]
  );

  const existingNonCancelled = useMemo(
    () => existingForDate.filter((s) => s.status !== "cancelled"),
    [existingForDate]
  );

  const existingPrintRows = useMemo(() => {
    const typeLabels: Record<string, string> = {
      bus: "Автобус",
      tram: "Трамвай",
      trolleybus: "Троллейбус",
    };
    return existingNonCancelled.map((entry) => {
      const vehicle = vehicles.find((v) => v.id === entry.vehicleId);
      return {
        routeNumber: entry.routeNumber,
        routeName: routes.find((r) => r.id === entry.routeId)?.name ?? "",
        driverName: entry.driverName,
        driverTab: drivers.find((d) => Number(d.id) === entry.driverId)?.tabNumber ?? "—",
        vehicleDisplay: vehicle ? `#${vehicle.boardNumber ?? vehicle.number}` : `#${entry.vehicleNumber}`,
        vehicleType: vehicle ? (typeLabels[vehicle.type] ?? vehicle.type) : "—",
        shiftStart: entry.startTime?.includes("T") ? entry.startTime.split("T")[1]?.slice(0, 5) ?? entry.startTime : entry.startTime?.slice(0, 5) ?? "",
        shiftEnd: entry.endTime?.includes("T") ? entry.endTime.split("T")[1]?.slice(0, 5) ?? entry.endTime : entry.endTime?.slice(0, 5) ?? "",
        shiftType: (entry.shiftType as "regular" | "additional") ?? "regular",
        notes: entry.notes ?? "",
      };
    });
  }, [existingNonCancelled, vehicles, routes, drivers]);

  const duplicateExistingToForm = useCallback(() => {
    const newRows: AssignmentRow[] = existingNonCancelled.map((entry) => {
      const route = routes.find((r) => r.id === entry.routeId);
      const extractT = (v: string | undefined) => {
        if (!v) return "";
        if (v.includes("T")) return v.split("T")[1]?.slice(0, 5) ?? "";
        if (v.includes(":")) return v.slice(0, 5);
        return "";
      };
      return {
        key: nextKey(),
        routeId: entry.routeId ?? "",
        routeNumber: entry.routeNumber ?? route?.number ?? "",
        routeName: route?.name ?? "",
        driverId: entry.driverId ?? null,
        vehicleId: entry.vehicleId ?? "",
        shiftStart: extractT(entry.startTime) || "06:00",
        shiftEnd: extractT(entry.endTime) || "14:00",
        shiftType: (entry.shiftType as "regular" | "additional") ?? "regular",
        notes: entry.notes ?? "",
        showNotes: !!(entry.notes),
      };
    });
    setRows(newRows);
    setResults(null);
  }, [existingNonCancelled, routes]);

  const shouldAutoExpand = existingForDate.length > 0 && existingForDate.length <= 5;

  const duplicateEntryToForm = useCallback((entry: ScheduleEntry) => {
    const route = routes.find((r) => r.id === entry.routeId);
    const et = (v: string | undefined) => {
      if (!v) return "";
      if (v.includes("T")) return v.split("T")[1]?.slice(0, 5) ?? "";
      if (v.includes(":")) return v.slice(0, 5);
      return "";
    };
    const newRow: AssignmentRow = {
      key: nextKey(),
      routeId: entry.routeId ?? "",
      routeNumber: entry.routeNumber ?? route?.number ?? "",
      routeName: route?.name ?? "",
      driverId: entry.driverId ?? null,
      vehicleId: entry.vehicleId ?? "",
      shiftStart: et(entry.startTime) || "06:00",
      shiftEnd: et(entry.endTime) || "14:00",
      shiftType: (entry.shiftType as "regular" | "additional") ?? "regular",
      notes: entry.notes ?? "",
      showNotes: !!(entry.notes),
    };
    setRows((prev) => [...prev, newRow]);
    setResults(null);
  }, [routes]);

  const availableDrivers = useMemo(
    () =>
      drivers.filter(
        (d) =>
          d.driverStatus !== "fired" &&
          d.driverStatus !== "vacation" &&
          d.driverStatus !== "sick_leave"
      ),
    [drivers]
  );

  const driverOptions = useMemo(
    () =>
      availableDrivers.map((d) => ({
        id: Number(d.id),
        label: d.name,
        sub: `Таб. ${d.tabNumber}`,
      })),
    [availableDrivers]
  );

  const routeOptions = useMemo(
    () =>
      routes
        .filter((r) => r.isActive)
        .map((r) => ({
          id: r.id,
          label: `М${r.number}`,
          sub: r.name,
        })),
    [routes]
  );

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "active"),
    [vehicles]
  );

  const vehicleOptions = useMemo(
    () =>
      activeVehicles.map((v) => ({
        id: v.id,
        label: `#${v.boardNumber ?? v.number}`,
        sub: VEHICLE_TYPE_LABELS[v.type] ?? v.type,
      })),
    [activeVehicles]
  );

  const filledRows = useMemo(
    () => rows.filter((r) => r.driverId !== null && r.vehicleId),
    [rows]
  );

  const warnings = useMemo(() => {
    const w: string[] = [];

    const driverCounts: Record<number, string[]> = {};
    rows.forEach((r) => {
      if (r.driverId !== null) {
        if (!driverCounts[r.driverId]) driverCounts[r.driverId] = [];
        driverCounts[r.driverId].push(r.routeNumber || r.key);
      }
    });
    Object.entries(driverCounts).forEach(([did, rr]) => {
      if (rr.length > 1) {
        const driver = drivers.find((d) => String(d.id) === did);
        w.push(
          `Водитель ${driver?.name ?? `#${did}`} назначен на несколько маршрутов: ${rr.join(", ")}`
        );
      }
    });

    const vehicleCounts: Record<string, string[]> = {};
    rows.forEach((r) => {
      if (r.vehicleId) {
        if (!vehicleCounts[r.vehicleId]) vehicleCounts[r.vehicleId] = [];
        vehicleCounts[r.vehicleId].push(r.routeNumber || r.key);
      }
    });
    Object.entries(vehicleCounts).forEach(([vid, rr]) => {
      if (rr.length > 1) {
        const vehicle = vehicles.find((v) => v.id === vid);
        w.push(
          `ТС #${vehicle?.boardNumber ?? vehicle?.number ?? vid} назначено на несколько маршрутов: ${rr.join(", ")}`
        );
      }
    });

    const existingDriverIds = new Set(
      existingForDate
        .filter((s) => s.status !== "cancelled")
        .map((s) => s.driverId)
        .filter(Boolean)
    );
    const existingVehicleIds = new Set(
      existingForDate
        .filter((s) => s.status !== "cancelled")
        .map((s) => s.vehicleId)
        .filter(Boolean)
    );

    rows.forEach((r) => {
      if (r.driverId !== null && existingDriverIds.has(r.driverId)) {
        const driver = drivers.find((d) => Number(d.id) === r.driverId);
        w.push(
          `Водитель ${driver?.name ?? `#${r.driverId}`} уже имеет назначение на ${date}`
        );
      }
      if (r.vehicleId && existingVehicleIds.has(r.vehicleId)) {
        const vehicle = vehicles.find((v) => v.id === r.vehicleId);
        w.push(
          `ТС #${vehicle?.boardNumber ?? vehicle?.number ?? r.vehicleId} уже в расписании на ${date}`
        );
      }
    });

    return [...new Set(w)];
  }, [rows, existingForDate, drivers, vehicles, date]);

  const updateRow = useCallback(
    (key: string, patch: Partial<AssignmentRow>) => {
      setRows((prev) =>
        prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
      );
    },
    []
  );

  const removeRow = useCallback((key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }, []);

  const addCustomRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        key: nextKey(),
        routeId: "",
        routeNumber: "",
        routeName: "",
        driverId: null,
        vehicleId: "",
        shiftStart: "06:00",
        shiftEnd: "14:00",
        shiftType: "regular",
        notes: "",
        showNotes: false,
      },
    ]);
  }, []);

  const clearAll = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        driverId: null,
        vehicleId: "",
        shiftStart: "06:00",
        shiftEnd: "14:00",
        shiftType: "regular",
        notes: "",
        showNotes: false,
      }))
    );
    setResults(null);
  }, []);

  const [copyDatePickerOpen, setCopyDatePickerOpen] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });

  const sourceDateEntries = useMemo(
    () =>
      schedule.filter(
        (s) => s.date === copySourceDate && s.status !== "cancelled"
      ),
    [schedule, copySourceDate]
  );

  const datesWithSchedule = useMemo(() => {
    const map: Record<string, number> = {};
    schedule.forEach((s) => {
      if (s.date && s.status !== "cancelled") {
        map[s.date] = (map[s.date] || 0) + 1;
      }
    });
    return map;
  }, [schedule]);

  const extractTime = useCallback((v: string | undefined) => {
    if (!v) return "";
    if (v.includes("T")) return v.split("T")[1]?.slice(0, 5) ?? "";
    if (v.includes(":")) return v.slice(0, 5);
    return "";
  }, []);

  const copyFromDate = useCallback(() => {
    if (sourceDateEntries.length === 0) return;

    const newRows: AssignmentRow[] = sourceDateEntries.map((entry) => {
      const route = routes.find((r) => r.id === entry.routeId);
      return {
        key: nextKey(),
        routeId: entry.routeId ?? "",
        routeNumber: entry.routeNumber ?? route?.number ?? "",
        routeName: route?.name ?? "",
        driverId: entry.driverId ?? null,
        vehicleId: entry.vehicleId ?? "",
        shiftStart: extractTime(entry.startTime) || "06:00",
        shiftEnd: extractTime(entry.endTime) || "14:00",
        shiftType: (entry.shiftType as "regular" | "additional") ?? "regular",
        notes: "",
        showNotes: false,
      };
    });

    setRows(newRows);
    setResults(null);
    setCopyDatePickerOpen(false);
  }, [sourceDateEntries, routes, extractTime]);

  const handleSubmit = useCallback(async () => {
    if (filledRows.length === 0) return;
    setSaving(true);
    setResults(null);
    try {
      const payload = filledRows.map((r) => ({
        vehicleId: r.vehicleId,
        routeId: r.routeId,
        driverId: r.driverId,
        shiftStart: `${date}T${r.shiftStart}:00`,
        shiftEnd: `${date}T${r.shiftEnd}:00`,
        shiftType: r.shiftType,
        notes: r.notes || undefined,
        label: `Маршрут ${r.routeNumber}`,
      }));
      const resp = await createScheduleBatch(payload);
      const items: BatchResultItem[] = [];
      if (resp.results && Array.isArray(resp.results)) {
        resp.results.forEach((res: { ok?: boolean; error?: string }, idx: number) => {
          items.push({
            label: payload[idx]?.label ?? `#${idx + 1}`,
            ok: res.ok !== false,
            error: res.error,
          });
        });
      } else {
        filledRows.forEach((r) => {
          items.push({ label: `Маршрут ${r.routeNumber}`, ok: true });
        });
      }
      setResults(items);
      onReload?.();
    } catch (e) {
      setResults(
        filledRows.map((r) => ({
          label: `Маршрут ${r.routeNumber}`,
          ok: false,
          error: e instanceof Error ? e.message : "Неизвестная ошибка",
        }))
      );
    } finally {
      setSaving(false);
    }
  }, [filledRows, date, onReload]);

  const getDriverDisplay = useCallback(
    (driverId: number | null) => {
      if (driverId === null) return "";
      const d = drivers.find((dr) => Number(dr.id) === driverId);
      return d ? `${d.name} (${d.tabNumber})` : `#${driverId}`;
    },
    [drivers]
  );

  const getVehicleDisplay = useCallback(
    (vehicleId: string) => {
      if (!vehicleId) return "";
      const v = vehicles.find((vv) => vv.id === vehicleId);
      return v
        ? `#${v.boardNumber ?? v.number} ${VEHICLE_TYPE_LABELS[v.type] ?? ""}`
        : vehicleId;
    },
    [vehicles]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon name="ClipboardList" className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Наряд на день</h2>
            <p className="text-xs text-muted-foreground">
              Массовое назначение водителей и транспорта на маршруты
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setResults(null);
            }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {existingForDate.length > 0 && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-500">
              {existingForDate.length} назн.
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setCopyDatePickerOpen(!copyDatePickerOpen)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
            >
              <Icon name="Copy" className="w-3.5 h-3.5" />
              Копировать из...
            </button>
            {copyDatePickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setCopyDatePickerOpen(false)}
                />
                <div className="absolute z-20 top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-xs font-semibold text-foreground mb-2">
                      Копировать наряд с другой даты
                    </p>
                    <input
                      type="date"
                      value={copySourceDate}
                      onChange={(e) => setCopySourceDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {sourceDateEntries.length > 0 ? (
                    <div className="px-4 pb-3">
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Найдено{" "}
                        <span className="font-bold text-foreground">
                          {sourceDateEntries.length}
                        </span>{" "}
                        назначений
                      </p>
                      <button
                        onClick={copyFromDate}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Icon name="Copy" className="w-3.5 h-3.5" />
                        Копировать в форму
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 pb-3">
                      <p className="text-[11px] text-muted-foreground">
                        Нет назначений на эту дату
                      </p>
                    </div>
                  )}
                  {Object.keys(datesWithSchedule).length > 0 && (
                    <div className="border-t border-border px-4 py-2">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                        Даты с нарядами
                      </p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {Object.entries(datesWithSchedule)
                          .filter(([d]) => d !== date)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .slice(0, 20)
                          .map(([d, cnt]) => (
                            <button
                              key={d}
                              onClick={() => setCopySourceDate(d)}
                              className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                d === copySourceDate
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-border text-muted-foreground hover:border-ring hover:text-foreground"
                              }`}
                            >
                              {d.slice(5)}{" "}
                              <span className="opacity-60">({cnt})</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setTemplatesPanelOpen(!templatesPanelOpen);
                setSaveTemplateOpen(false);
              }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
            >
              <Icon name="BookOpen" className="w-3.5 h-3.5" />
              Шаблоны
              {templates.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                  {templates.length}
                </span>
              )}
            </button>
            {templatesPanelOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setTemplatesPanelOpen(false)}
                />
                <div className="absolute z-20 top-full right-0 mt-1 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <p className="text-xs font-semibold text-foreground">
                      Шаблоны нарядов
                    </p>
                    <button
                      onClick={() => {
                        setTplOverwriteId(null);
                        setTplName("");
                        setTplDesc("");
                        setTplError("");
                        setSaveTemplateOpen(true);
                        setTemplatesPanelOpen(false);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Icon name="Plus" className="w-3 h-3" />
                      Сохранить текущий
                    </button>
                  </div>
                  {templatesLoading ? (
                    <div className="px-4 pb-4 flex items-center justify-center gap-2 py-6">
                      <Icon
                        name="Loader2"
                        className="w-4 h-4 animate-spin text-muted-foreground"
                      />
                      <span className="text-xs text-muted-foreground">
                        Загрузка...
                      </span>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="px-4 pb-4 text-center py-6">
                      <Icon
                        name="FileX"
                        className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Нет сохранённых шаблонов
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="px-4 py-2.5 border-t border-border hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {tpl.name}
                              </p>
                              {tpl.description && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {tpl.description}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {tpl.rows.length} строк · {tpl.createdBy}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleLoadTemplate(tpl)}
                                title="Загрузить"
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-primary/10 text-primary transition-colors"
                              >
                                <Icon name="Download" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openOverwrite(tpl)}
                                title="Перезаписать текущими данными"
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                              >
                                <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tpl.id)}
                                title="Удалить"
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-colors"
                              >
                                <Icon name="Trash2" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setPrintSource("form");
              setPrintOpen(true);
            }}
            disabled={filledRows.length === 0}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="Printer" className="w-3.5 h-3.5" />
            Печать
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
          >
            <Icon name="RotateCcw" className="w-3.5 h-3.5" />
            Очистить все
          </button>
          <button
            onClick={handleSubmit}
            disabled={filledRows.length === 0 || saving}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Icon name="Loader2" className="w-4 h-4 animate-spin" />
            ) : (
              <Icon name="Save" className="w-4 h-4" />
            )}
            Сохранить ({filledRows.length})
          </button>
        </div>
      </div>

      <ExistingAssignmentsTable
        date={date}
        existingForDate={existingForDate}
        existingNonCancelled={existingNonCancelled}
        existingExpanded={existingExpanded}
        setExistingExpanded={setExistingExpanded}
        shouldAutoExpand={shouldAutoExpand}
        onDuplicateEntry={duplicateEntryToForm}
        onDuplicateAll={duplicateExistingToForm}
        onPrint={() => {
          setPrintSource("existing");
          setPrintOpen(true);
        }}
        onReload={onReload}
      />

      <AssignmentFormRows
        rows={rows}
        routes={routes}
        routeOptions={routeOptions}
        driverOptions={driverOptions}
        vehicleOptions={vehicleOptions}
        getDriverDisplay={getDriverDisplay}
        getVehicleDisplay={getVehicleDisplay}
        updateRow={updateRow}
        removeRow={removeRow}
        addCustomRow={addCustomRow}
        setRows={setRows}
        setResults={() => setResults(null)}
      />

      <AssignmentResultsPanel
        warnings={warnings}
        filledRows={filledRows}
        results={results}
        saving={saving}
        handleSubmit={handleSubmit}
        setResults={() => setResults(null)}
        saveTemplateOpen={saveTemplateOpen}
        setSaveTemplateOpen={setSaveTemplateOpen}
        tplOverwriteId={tplOverwriteId}
        tplName={tplName}
        setTplName={setTplName}
        tplDesc={tplDesc}
        setTplDesc={setTplDesc}
        tplSaving={tplSaving}
        tplError={tplError}
        handleSaveTemplate={handleSaveTemplate}
        rowsToTemplateRows={rowsToTemplateRows}
        rows={rows}
      />

      <AssignmentPrintForm
        date={date}
        rows={printSource === "existing" ? existingPrintRows : printRows}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />
    </div>
  );
}

export default DailyAssignmentView;
