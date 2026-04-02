import { useState, useMemo, useCallback, useEffect } from "react";
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
import AssignmentToolbar from "./AssignmentToolbar";
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
      <AssignmentToolbar
        date={date}
        setDate={setDate}
        existingForDate={existingForDate}
        filledRowsCount={filledRows.length}
        saving={saving}
        handleSubmit={handleSubmit}
        clearAll={clearAll}
        onPrintForm={() => {
          setPrintSource("form");
          setPrintOpen(true);
        }}
        setRows={setRows}
        setResults={() => setResults(null)}
        schedule={schedule}
        routes={routes}
        templates={templates}
        templatesLoading={templatesLoading}
        templatesPanelOpen={templatesPanelOpen}
        setTemplatesPanelOpen={setTemplatesPanelOpen}
        saveTemplateOpen={saveTemplateOpen}
        setSaveTemplateOpen={setSaveTemplateOpen}
        setTplOverwriteId={setTplOverwriteId}
        setTplName={setTplName}
        setTplDesc={setTplDesc}
        setTplError={setTplError}
        handleLoadTemplate={handleLoadTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
        openOverwrite={openOverwrite}
      />

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
