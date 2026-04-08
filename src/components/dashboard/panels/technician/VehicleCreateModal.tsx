import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { VehicleInfo, VehicleStatus } from "@/types/dashboard";
import { createVehicle as apiCreateVehicle, fetchVehicles } from "@/api/dashboardApi";
import { TRANSPORT_TYPE_MAP } from "./TechVehiclesView";
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

interface VehicleCreateModalProps {
  onClose: () => void;
  onReload?: () => void;
}

export default function VehicleCreateModal({ onClose, onReload }: VehicleCreateModalProps) {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  const resetForm = useCallback(() => {
    setFNumber(""); setFSelectedVehicleId(""); setBoardPopoverOpen(false);
    setFType(""); setFRoute(""); setFMileage("");
    setFLastMaint(""); setFNextMaint(""); setFStatus(""); setError("");
    onClose();
  }, [onClose]);

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
  }, [fNumber, fType, fRoute, fMileage, fLastMaint, fNextMaint, fStatus, onReload, resetForm]);

  return (
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
                              if (v.type && TRANSPORT_TYPE_MAP[v.type]) {
                                setFType(TRANSPORT_TYPE_MAP[v.type]);
                              }
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
            <label className="block text-xs font-medium text-muted-foreground mb-1">Тип ТС *</label>
            <select value={fType} onChange={e => setFType(e.target.value as VehicleInfo["type"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">— выберите —</option>
              <option value="tram">Трамвай</option>
              <option value="trolleybus">Троллейбус</option>
              <option value="bus">Автобус</option>
              <option value="electrobus">Электробус</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Маршрут</label>
            <input type="text" value={fRoute} onChange={e => setFRoute(e.target.value)} placeholder="5А" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Пробег (км)</label>
            <input type="number" value={fMileage} onChange={e => setFMileage(e.target.value)} min="0" placeholder="0" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Последнее ТО</label>
            <input type="date" value={fLastMaint} onChange={e => setFLastMaint(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Следующее ТО</label>
            <input type="date" value={fNextMaint} onChange={e => setFNextMaint(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
            <select value={fStatus} onChange={e => setFStatus(e.target.value as VehicleStatus)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">— выберите —</option>
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
  );
}
