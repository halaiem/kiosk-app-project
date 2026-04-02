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

interface AssignmentRow {
  key: string;
  routeId: string;
  routeNumber: string;
  routeName: string;
  driverId: number | null;
  vehicleId: string;
  shiftStart: string;
  shiftEnd: string;
  shiftType: "regular" | "additional";
  notes: string;
  showNotes: boolean;
}

interface DailyAssignmentProps {
  routes: RouteInfo[];
  drivers: DriverInfo[];
  vehicles: VehicleInfo[];
  schedule: ScheduleEntry[];
  onReload?: () => void;
}

interface BatchResultItem {
  label: string;
  ok: boolean;
  error?: string;
}

interface TemplateRow {
  routeId: string;
  routeNumber: string;
  routeName: string;
  driverId: number | null;
  vehicleId: string;
  shiftStart: string;
  shiftEnd: string;
  shiftType: "regular" | "additional";
}

interface Template {
  id: number;
  name: string;
  description: string;
  rows: TemplateRow[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  bus: "Автобус",
  tram: "Трамвай",
  trolleybus: "Троллейбус",
};

const SCHEDULE_STATUS_STYLES: Record<string, string> = {
  planned: "bg-blue-500/15 text-blue-500",
  active: "bg-green-500/15 text-green-500",
  completed: "bg-gray-500/15 text-gray-500",
  cancelled: "bg-red-500/15 text-red-500",
};

const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  planned: "Запланировано",
  active: "Активно",
  completed: "Завершено",
  cancelled: "Отменено",
};

function SearchableSelect({
  value,
  displayValue,
  placeholder,
  options,
  onSelect,
  onClear,
}: {
  value: string | number | null;
  displayValue: string;
  placeholder: string;
  options: { id: string | number; label: string; sub?: string }[];
  onSelect: (id: string | number) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sub && o.sub.toLowerCase().includes(q))
    );
  }, [options, search]);

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center gap-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm">
          <span className="flex-1 truncate">{displayValue}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Icon name="X" className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setSearch("");
          }}
          className="flex items-center gap-2 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:border-ring transition-colors text-left"
        >
          <Icon name="Search" className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{placeholder}</span>
        </button>
      )}
      {open && !value && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  Ничего не найдено
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelect(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex flex-col"
                  >
                    <span className="text-foreground">{opt.label}</span>
                    {opt.sub && (
                      <span className="text-[11px] text-muted-foreground">
                        {opt.sub}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

let rowCounter = 0;
function nextKey() {
  rowCounter += 1;
  return `row-${Date.now()}-${rowCounter}`;
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
        await updateTemplate({
          id: tplOverwriteId,
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
  const printRows = useMemo(
    () => preparePrintRows(rows, drivers, vehicles),
    [rows, drivers, vehicles]
  );

  const existingForDate = useMemo(
    () => schedule.filter((s) => s.date === date),
    [schedule, date]
  );

  const shouldAutoExpand = existingForDate.length > 0 && existingForDate.length <= 5;

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
                      max={date}
                      onChange={(e) => setCopySourceDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {sourceDateEntries.length > 0 ? (
                    <div className="px-4 pb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon
                          name="CheckCircle"
                          className="w-3.5 h-3.5 text-green-500"
                        />
                        <span className="text-xs text-foreground">
                          {sourceDateEntries.length} назначений за{" "}
                          {copySourceDate}
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                        {sourceDateEntries.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-2 text-[11px] text-muted-foreground"
                          >
                            <span className="font-medium text-foreground">
                              М{e.routeNumber}
                            </span>
                            <span className="truncate">{e.driverName}</span>
                            <span className="ml-auto font-mono">
                              {extractTime(e.startTime)}-
                              {extractTime(e.endTime)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={copyFromDate}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Icon name="Copy" className="w-3.5 h-3.5" />
                        Копировать {sourceDateEntries.length} назн.
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon name="Info" className="w-3.5 h-3.5" />
                      Нет назначений на эту дату
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
            onClick={() => setPrintOpen(true)}
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
            Сохранить наряд
          </button>
        </div>
      </div>

      {existingForDate.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setExistingExpanded(!existingExpanded)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Icon
                name="Calendar"
                className="w-4 h-4 text-muted-foreground"
              />
              <span className="text-sm font-medium text-foreground">
                Существующие назначения на {date}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {existingForDate.length}
              </span>
            </div>
            <Icon
              name={existingExpanded || shouldAutoExpand ? "ChevronUp" : "ChevronDown"}
              className="w-4 h-4 text-muted-foreground"
            />
          </button>
          {(existingExpanded || shouldAutoExpand) && (
            <div className="border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-5 py-2 font-medium">
                      Маршрут
                    </th>
                    <th className="text-left px-3 py-2 font-medium">
                      Водитель
                    </th>
                    <th className="text-left px-3 py-2 font-medium">
                      Транспорт
                    </th>
                    <th className="text-left px-3 py-2 font-medium">Время</th>
                    <th className="text-left px-3 py-2 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {existingForDate.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-5 py-2.5 text-foreground font-medium">
                        М{entry.routeNumber}
                      </td>
                      <td className="px-3 py-2.5 text-foreground">
                        {entry.driverName}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        #{entry.vehicleNumber}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-foreground text-xs">
                        {entry.startTime} - {entry.endTime}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${SCHEDULE_STATUS_STYLES[entry.status] ?? ""}`}
                        >
                          {SCHEDULE_STATUS_LABELS[entry.status] ?? entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Icon name="ListChecks" className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Новые назначения
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {rows.length} маршрутов
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-12 flex flex-col items-center gap-2">
            <Icon
              name="ClipboardX"
              className="w-10 h-10 text-muted-foreground/30"
            />
            <p className="text-sm text-muted-foreground">
              Нет строк для назначения
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.key}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-28 pt-1.5">
                    {row.routeNumber ? (
                      <div>
                        <span className="text-sm font-bold text-foreground">
                          М{row.routeNumber}
                        </span>
                        {row.routeName && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {row.routeName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <input
                        value={row.routeNumber}
                        onChange={(e) =>
                          updateRow(row.key, { routeNumber: e.target.value })
                        }
                        placeholder="Маршрут"
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Водитель
                      </label>
                      <SearchableSelect
                        value={row.driverId}
                        displayValue={getDriverDisplay(row.driverId)}
                        placeholder="Выбрать водителя"
                        options={driverOptions}
                        onSelect={(id) =>
                          updateRow(row.key, { driverId: id as number })
                        }
                        onClear={() => updateRow(row.key, { driverId: null })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                        Транспорт
                      </label>
                      <SearchableSelect
                        value={row.vehicleId || null}
                        displayValue={getVehicleDisplay(row.vehicleId)}
                        placeholder="Выбрать ТС"
                        options={vehicleOptions}
                        onSelect={(id) =>
                          updateRow(row.key, { vehicleId: id as string })
                        }
                        onClear={() => updateRow(row.key, { vehicleId: "" })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                          Начало
                        </label>
                        <input
                          type="time"
                          value={row.shiftStart}
                          onChange={(e) =>
                            updateRow(row.key, { shiftStart: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                          Конец
                        </label>
                        <input
                          type="time"
                          value={row.shiftEnd}
                          onChange={(e) =>
                            updateRow(row.key, { shiftEnd: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                          Тип смены
                        </label>
                        <select
                          value={row.shiftType}
                          onChange={(e) =>
                            updateRow(row.key, {
                              shiftType: e.target.value as
                                | "regular"
                                | "additional",
                            })
                          }
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="regular">Обычная</option>
                          <option value="additional">Дополнит.</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(row.key, { showNotes: !row.showNotes })
                        }
                        className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                          row.showNotes
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                        title="Заметки"
                      >
                        <Icon name="StickyNote" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="shrink-0 w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center transition-colors"
                        title="Удалить строку"
                      >
                        <Icon name="X" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {row.showNotes && (
                  <div className="mt-3 pl-0 sm:pl-[7.75rem]">
                    <textarea
                      value={row.notes}
                      onChange={(e) =>
                        updateRow(row.key, { notes: e.target.value })
                      }
                      placeholder="Заметки к назначению..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addCustomRow}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors w-full justify-center"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Добавить строку
        </button>
      </div>

      {(warnings.length > 0 || filledRows.length > 0 || results) && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon
                  name="AlertTriangle"
                  className="w-4 h-4 text-amber-500"
                />
                <span className="text-sm font-medium text-amber-500">
                  Предупреждения
                </span>
              </div>
              <div className="space-y-1">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/5 px-3 py-2 rounded-lg"
                  >
                    <Icon
                      name="AlertCircle"
                      className="w-3.5 h-3.5 shrink-0 mt-0.5"
                    />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!results && filledRows.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Готово к сохранению:{" "}
                <span className="font-bold text-foreground">
                  {filledRows.length}
                </span>{" "}
                назначений
              </span>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="Save" className="w-4 h-4" />
                )}
                Сохранить наряд ({filledRows.length} назначений)
              </button>
            </div>
          )}

          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="FileCheck" className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Результат сохранения
                </span>
              </div>
              <div className="space-y-1.5">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                      r.ok
                        ? "bg-green-500/5 text-green-600"
                        : "bg-red-500/5 text-red-500"
                    }`}
                  >
                    <Icon
                      name={r.ok ? "CheckCircle" : "XCircle"}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="font-medium">{r.label}</span>
                    {r.error && (
                      <span className="text-xs text-red-400 ml-auto">
                        {r.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-muted-foreground">
                  Создано: {results.filter((r) => r.ok).length} из{" "}
                  {results.length}
                </span>
                <button
                  onClick={() => setResults(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Закрыть результаты
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {saveTemplateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSaveTemplateOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">
                {tplOverwriteId ? "Обновить шаблон" : "Сохранить как шаблон"}
              </h3>
              <button
                onClick={() => setSaveTemplateOpen(false)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Название шаблона *
                </label>
                <input
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Будний день, Выходной, Укороченный..."
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Описание
                </label>
                <textarea
                  value={tplDesc}
                  onChange={(e) => setTplDesc(e.target.value)}
                  placeholder="Комментарий к шаблону (необязательно)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Будет сохранено:{" "}
                  <span className="font-medium text-foreground">
                    {rowsToTemplateRows(rows).length}
                  </span>{" "}
                  строк (маршруты, водители, ТС, время смен)
                </p>
              </div>
              {tplError && (
                <p className="text-xs text-red-500">{tplError}</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setSaveTemplateOpen(false)}
                className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!tplName.trim() || tplSaving}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {tplSaving ? (
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="Save" className="w-4 h-4" />
                )}
                {tplOverwriteId ? "Обновить" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
      <AssignmentPrintForm
        date={date}
        rows={printRows}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />
    </div>
  );
}

export default DailyAssignmentView;