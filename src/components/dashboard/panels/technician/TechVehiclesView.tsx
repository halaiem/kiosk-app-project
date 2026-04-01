import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { VehicleInfo, VehicleStatus } from "@/types/dashboard";
import { formatDate } from "./TechRoutes";
import { createVehicle as apiCreateVehicle, fetchVehicles } from "@/api/dashboardApi";
import {
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  VEHICLE_STATUS_STYLES,
  VEHICLE_STATUS_LABELS,
} from "./TechVDConstants";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AdminVehicleOption {
  id: string;
  number: string;
  boardNumber?: string;
  vinNumber?: string;
  type?: string;
  mileage?: number;
}

interface VehiclesViewProps {
  vehicles: VehicleInfo[];
  onReload?: () => void;
}

const TRANSPORT_TYPE_MAP: Record<string, VehicleInfo["type"]> = {
  tram: "tram",
  trolleybus: "trolleybus",
  bus: "bus",
  minibus: "bus",
};

export function VehiclesView({ vehicles, onReload }: VehiclesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleInfo["type"]>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fNumber, setFNumber] = useState("");
  const [fSelectedVehicleId, setFSelectedVehicleId] = useState("");
  const [boardPopoverOpen, setBoardPopoverOpen] = useState(false);
  const [adminVehicles, setAdminVehicles] = useState<AdminVehicleOption[]>([]);
  const [adminVehiclesLoading, setAdminVehiclesLoading] = useState(false);
  const [fType, setFType] = useState<VehicleInfo["type"] | "">("");
  const [fRoute, setFRoute] = useState("");
  const [fMileage, setFMileage] = useState("");
  const [fLastMaint, setFLastMaint] = useState("");
  const [fNextMaint, setFNextMaint] = useState("");
  const [fStatus, setFStatus] = useState<VehicleStatus | "">("");

  // Load admin vehicles when form opens
  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    setAdminVehiclesLoading(true);
    fetchVehicles()
      .then((data: unknown) => {
        if (cancelled) return;
        const list = data as AdminVehicleOption[];
        setAdminVehicles(
          list.map((v) => ({
            id: v.id,
            number: v.number,
            boardNumber: v.boardNumber,
            vinNumber: v.vinNumber,
            type: v.type,
            mileage: v.mileage,
          }))
        );
      })
      .catch((e) => console.error("Load admin vehicles:", e))
      .finally(() => { if (!cancelled) setAdminVehiclesLoading(false); });
    return () => { cancelled = true; };
  }, [showForm]);

  const isOverdue = (date: Date) => new Date(date).getTime() < Date.now();

  const filteredVehicles = useMemo(() => {
    let list = vehicles;
    if (typeFilter !== "all") list = list.filter((v) => v.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.number.includes(q) || v.routeNumber.includes(q) || v.driverName.toLowerCase().includes(q));
    }
    return list;
  }, [vehicles, search, typeFilter]);

  const resetForm = () => {
    setFNumber(""); setFSelectedVehicleId(""); setBoardPopoverOpen(false);
    setFType(""); setFRoute(""); setFMileage("");
    setFLastMaint(""); setFNextMaint(""); setFStatus(""); setError("");
    setShowForm(false);
  };

  const handleCreate = useCallback(async () => {
    if (!fNumber.trim() || !fType) { setError("Заполните бортовой номер и тип"); return; }
    setSaving(true); setError("");
    try {
      await apiCreateVehicle({
        number: fNumber.trim(),
        label: fNumber.trim(),
        type: fType,
        status: fStatus || "active",
        mileage: Number(fMileage) || 0,
        lastMaintenance: fLastMaint || undefined,
        nextMaintenance: fNextMaint || undefined,
        routeNumber: fRoute.trim() || undefined,
      });
      resetForm();
      onReload?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  }, [fNumber, fType, fRoute, fMileage, fLastMaint, fNextMaint, fStatus, onReload]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground flex-1">Транспортные средства</h2>
        {(["all", "tram", "trolleybus", "bus"] as const).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t === "all" ? "Все" : t === "tram" ? "Трамваи" : t === "trolleybus" ? "Тролл." : "Автобусы"}
          </button>
        ))}
        <div className="relative">
          <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Борт, маршрут..." className="h-9 pl-8 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40" />
        </div>
        <ReportButton filename="vehicles" data={vehicles} />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Icon name="Plus" className="w-4 h-4" />
          Добавить ТС
        </button>
      </div>

      <div className="grid grid-cols-2 desktop:grid-cols-3 gap-4">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-16 bg-card border border-border rounded-2xl">
            <div className="text-center">
              <Icon name="Bus" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Нет транспорта</p>
            </div>
          </div>
        ) : (
          filteredVehicles.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon name={VEHICLE_TYPE_ICONS[v.type]} className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">#{v.number}</p>
                    <p className="text-[11px] text-muted-foreground">{VEHICLE_TYPE_LABELS[v.type]}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_STATUS_STYLES[v.status]}`}>
                  {VEHICLE_STATUS_LABELS[v.status]}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Icon name="Route" className="w-3 h-3" />Маршрут</span>
                  <span className="text-foreground font-medium">{v.routeNumber || "---"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Icon name="User" className="w-3 h-3" />Водитель</span>
                  <span className="text-foreground font-medium truncate ml-2 max-w-[120px]">{v.driverName || "---"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Icon name="Gauge" className="w-3 h-3" />Пробег</span>
                  <span className="text-foreground font-medium">{v.mileage.toLocaleString()} км</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Icon name="Wrench" className="w-3 h-3" />Последнее ТО</span>
                  <span className="text-foreground font-medium">{formatDate(v.lastMaintenance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Icon name="CalendarClock" className="w-3 h-3" />Следующее ТО</span>
                  <span className={`font-medium ${isOverdue(v.nextMaintenance) ? "text-red-500" : "text-foreground"}`}>
                    {formatDate(v.nextMaintenance)}
                    {isOverdue(v.nextMaintenance) && <Icon name="AlertTriangle" className="w-3 h-3 inline ml-1 text-red-500" />}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Новое транспортное средство</h3>
              <button onClick={resetForm} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Бортовой номер *</label>
                <Popover open={boardPopoverOpen} onOpenChange={setBoardPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <span className={fNumber ? "text-foreground truncate" : "text-muted-foreground"}>
                        {fNumber || (adminVehiclesLoading ? "Загрузка..." : "Выберите ТС")}
                      </span>
                      <Icon name="ChevronsUpDown" className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Поиск по бортовому номеру..." />
                      <CommandList>
                        <CommandEmpty>Ничего не найдено</CommandEmpty>
                        <CommandGroup>
                          {adminVehicles.map((v) => {
                            const boardLabel = v.boardNumber || v.number;
                            return (
                              <CommandItem
                                key={v.id}
                                value={`${boardLabel} ${v.vinNumber ?? ""}`}
                                onSelect={() => {
                                  setFNumber(boardLabel);
                                  setFSelectedVehicleId(v.id);
                                  // Auto-fill type from admin vehicle
                                  if (v.type && TRANSPORT_TYPE_MAP[v.type]) {
                                    setFType(TRANSPORT_TYPE_MAP[v.type]);
                                  }
                                  // Auto-fill mileage if available
                                  if (v.mileage) {
                                    setFMileage(String(v.mileage));
                                  }
                                  setBoardPopoverOpen(false);
                                }}
                                className="flex items-center justify-between"
                              >
                                <span className="truncate">{boardLabel}</span>
                                {fSelectedVehicleId === v.id && (
                                  <Icon name="Check" className="w-4 h-4 text-primary shrink-0 ml-2" />
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Тип *</label>
                <select value={fType} onChange={e => setFType(e.target.value as VehicleInfo["type"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="tram">Трамвай</option>
                  <option value="trolleybus">Троллейбус</option>
                  <option value="bus">Автобус</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Маршрут</label>
                <input type="text" value={fRoute} onChange={e => setFRoute(e.target.value)} placeholder="5" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Пробег км</label>
                <input type="number" value={fMileage} onChange={e => setFMileage(e.target.value)} placeholder="0" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Дата посл. ТО</label>
                <input type="date" value={fLastMaint} onChange={e => setFLastMaint(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Дата след. ТО</label>
                <input type="date" value={fNextMaint} onChange={e => setFNextMaint(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value as VehicleStatus)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— активен —</option>
                  <option value="active">Активен</option>
                  <option value="maintenance">ТО</option>
                  <option value="idle">Простой</option>
                  <option value="offline">Офлайн</option>
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-destructive mt-3">{error}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Создаю..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}