import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { VehicleInfo, DriverInfo, VehicleStatus, DriverStatus } from "@/types/dashboard";
import { formatDate, formatTime, Modal } from "./TechRoutes";
import { createDriver as apiCreateDriver } from "@/api/driverApi";
import { createVehicle as apiCreateVehicle } from "@/api/dashboardApi";

const VEHICLE_TYPE_ICONS: Record<VehicleInfo["type"], string> = {
  tram: "TramFront",
  trolleybus: "Zap",
  bus: "Bus",
};

const VEHICLE_TYPE_LABELS: Record<VehicleInfo["type"], string> = {
  tram: "Трамвай",
  trolleybus: "Троллейбус",
  bus: "Автобус",
};

const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  active: "bg-green-500/15 text-green-500",
  maintenance: "bg-yellow-500/15 text-yellow-600",
  idle: "bg-gray-500/15 text-gray-500",
  offline: "bg-red-500/15 text-red-500",
};

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  active: "Активен",
  maintenance: "ТО",
  idle: "Простой",
  offline: "Офлайн",
};

const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  on_shift: "bg-green-500/15 text-green-500",
  off_shift: "bg-gray-500/15 text-gray-500",
  break: "bg-yellow-500/15 text-yellow-600",
  sick: "bg-red-500/15 text-red-500",
};

const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  on_shift: "На смене",
  off_shift: "Свободен",
  break: "Перерыв",
  sick: "Больничный",
};

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/* ──────────── VehiclesView ──────────── */

interface VehiclesViewProps {
  vehicles: VehicleInfo[];
  onReload?: () => void;
}

export function VehiclesView({ vehicles, onReload }: VehiclesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleInfo["type"]>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fNumber, setFNumber] = useState("");
  const [fType, setFType] = useState<VehicleInfo["type"] | "">("");
  const [fRoute, setFRoute] = useState("");
  const [fMileage, setFMileage] = useState("");
  const [fLastMaint, setFLastMaint] = useState("");
  const [fNextMaint, setFNextMaint] = useState("");
  const [fStatus, setFStatus] = useState<VehicleStatus | "">("");

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
    setFNumber(""); setFType(""); setFRoute(""); setFMileage("");
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
                <input type="text" value={fNumber} onChange={e => setFNumber(e.target.value)} placeholder="ТМ-5001" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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

/* ──────────── DriversView ──────────── */

type SortKey = "name" | "status" | "rating";

interface DriversViewProps {
  drivers: DriverInfo[];
  onReload?: () => void;
}

export function DriversView({ drivers, onReload }: DriversViewProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [showForm, setShowForm] = useState(false);
  const [detailDriver, setDetailDriver] = useState<DriverInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPin, setCreatedPin] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fPin, setFPin] = useState(() => generatePin());
  const [fPhone, setFPhone] = useState("");
  const [fVehicleType, setFVehicleType] = useState<VehicleInfo["type"] | "">("");
  const [fVehicleNumber, setFVehicleNumber] = useState("");
  const [fRoute, setFRoute] = useState("");
  const [fShiftStart, setFShiftStart] = useState("08:00");

  const filtered = useMemo(() => {
    let list = [...drivers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.tabNumber.toLowerCase().includes(q) ||
        d.vehicleNumber.toLowerCase().includes(q)
      );
    }
    const statusOrder: Record<DriverStatus, number> = { on_shift: 0, break: 1, off_shift: 2, sick: 3 };
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ru");
      if (sortBy === "status") return statusOrder[a.status] - statusOrder[b.status];
      return b.rating - a.rating;
    });
    return list;
  }, [drivers, search, sortBy]);

  const resetForm = () => {
    setFName(""); setFPin(generatePin()); setFPhone("");
    setFVehicleType(""); setFVehicleNumber(""); setFRoute("");
    setFShiftStart("08:00"); setError(""); setShowForm(false); setCreatedPin(null);
  };

  const handleCreate = useCallback(async () => {
    if (!fName.trim() || !fPin.trim()) { setError("Заполните ФИО и PIN"); return; }
    setSaving(true); setError("");
    try {
      await apiCreateDriver({
        fullName: fName.trim(),
        pin: fPin.trim(),
        vehicleType: fVehicleType || "tram",
        vehicleNumber: fVehicleNumber.trim(),
        routeNumber: fRoute.trim(),
        shiftStart: fShiftStart,
        phone: fPhone.trim() || undefined,
      });
      setCreatedPin(fPin);
      onReload?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  }, [fName, fPin, fPhone, fVehicleType, fVehicleNumber, fRoute, fShiftStart, onReload]);

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "name", label: "Имя" },
    { key: "status", label: "Статус" },
    { key: "rating", label: "Рейтинг" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, табельному..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground mr-1">Сортировка:</span>
          {sortButtons.map((s) => (
            <button key={s.key} onClick={() => setSortBy(s.key)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${sortBy === s.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <ReportButton filename="drivers" data={drivers} />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
          <Icon name="UserPlus" className="w-4 h-4" />
          Добавить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">Таб. номер</th>
              <th className="text-left px-3 py-2.5 font-medium">ФИО</th>
              <th className="text-left px-3 py-2.5 font-medium">Статус</th>
              <th className="text-left px-3 py-2.5 font-medium">ТС</th>
              <th className="text-left px-3 py-2.5 font-medium">Маршрут</th>
              <th className="text-left px-3 py-2.5 font-medium">Смена</th>
              <th className="text-left px-3 py-2.5 font-medium">PIN</th>
              <th className="text-left px-3 py-2.5 font-medium">Телефон</th>
              <th className="text-left px-3 py-2.5 font-medium">Рейтинг</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-muted-foreground">
                  <Icon name="UserX" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Не найдено</p>
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{d.tabNumber}</td>
                  <td className="px-3 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${DRIVER_STATUS_STYLES[d.status]}`}>
                      {DRIVER_STATUS_LABELS[d.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{d.vehicleNumber || "---"}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{d.routeNumber || "---"}</td>
                  <td className="px-3 py-3 text-xs">
                    <span className="text-muted-foreground">{d.shiftStart ? `↑ ${formatTime(d.shiftStart)}` : "---"}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-widest text-foreground">••••</span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs font-mono">{d.phone || "---"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Icon key={i} name="Star" className={`w-3.5 h-3.5 ${i < Math.round(d.rating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-[11px] text-muted-foreground ml-1">{d.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => setDetailDriver(d)} className="text-[11px] px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                      <Icon name="Eye" className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Детальная карточка водителя */}
      {detailDriver && (
        <Modal title={`Водитель — ${detailDriver.name}`} onClose={() => setDetailDriver(null)}>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Таб. номер", value: detailDriver.tabNumber },
                { label: "Статус", value: DRIVER_STATUS_LABELS[detailDriver.status], colored: DRIVER_STATUS_STYLES[detailDriver.status] },
                { label: "Бортовой номер", value: detailDriver.vehicleNumber || "—" },
                { label: "Маршрут", value: detailDriver.routeNumber ? `№${detailDriver.routeNumber}` : "—" },
                { label: "Начало смены", value: detailDriver.shiftStart ? formatTime(detailDriver.shiftStart) : "—" },
                { label: "Телефон", value: detailDriver.phone || "—" },
                { label: "Рейтинг", value: `${detailDriver.rating.toFixed(1)} / 5.0` },
              ].map(({ label, value, colored }) => (
                <div key={label} className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                  {colored ? (
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${colored}`}>{value}</span>
                  ) : (
                    <span className="font-medium text-foreground">{value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-1 font-semibold">PIN для входа в планшет</p>
              <p className="text-xs text-muted-foreground">PIN хранится в зашифрованном виде. Передайте водителю PIN при создании или сбросьте через техника.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Форма создания водителя */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !createdPin && resetForm()}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            {createdPin ? (
              <>
                <div className="flex flex-col items-center text-center gap-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                    <Icon name="UserCheck" className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Водитель создан!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Передайте PIN водителю для авторизации на планшете</p>
                  </div>
                  <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-[10px] text-primary uppercase tracking-wide mb-2 font-semibold">PIN-код для входа</p>
                    <p className="font-mono text-4xl font-bold tracking-[0.5em] text-foreground select-all">{createdPin}</p>
                  </div>
                  <button onClick={resetForm} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    Готово
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-foreground">Новый водитель</h3>
                  <button onClick={resetForm} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                    <Icon name="X" className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">ФИО полностью *</label>
                    <input type="text" value={fName} onChange={e => setFName(e.target.value)} placeholder="Оссама Иванов Петрович" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Телефон</label>
                    <input type="text" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+7 (9XX) XXX-XX-XX" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Тип ТС</label>
                    <select value={fVehicleType} onChange={e => setFVehicleType(e.target.value as VehicleInfo["type"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">— выберите —</option>
                      <option value="tram">Трамвай</option>
                      <option value="trolleybus">Троллейбус</option>
                      <option value="bus">Автобус</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Бортовой номер</label>
                    <input type="text" value={fVehicleNumber} onChange={e => setFVehicleNumber(e.target.value)} placeholder="ТМ-3450" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Маршрут</label>
                    <input type="text" value={fRoute} onChange={e => setFRoute(e.target.value)} placeholder="5" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Начало смены</label>
                    <input type="time" value={fShiftStart} onChange={e => setFShiftStart(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">PIN для входа в планшет *</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-10 px-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center gap-3">
                        <Icon name="KeyRound" className="w-4 h-4 text-primary flex-shrink-0" />
                        <input
                          type="text"
                          value={fPin}
                          onChange={e => setFPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="1234"
                          className="flex-1 bg-transparent font-mono text-xl font-bold tracking-[0.4em] text-foreground focus:outline-none"
                        />
                      </div>
                      <button type="button" onClick={() => setFPin(generatePin())} className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors">
                        <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                        Новый
                      </button>
                      <button type="button" onClick={() => navigator.clipboard.writeText(fPin)} className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors">
                        <Icon name="Copy" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Водитель вводит этот PIN при авторизации на планшете</p>
                  </div>
                </div>
                {error && <p className="text-xs text-destructive mt-3">{error}</p>}
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
                  <button onClick={handleCreate} disabled={saving || !fName.trim() || !fPin.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {saving ? "Создаю..." : "Создать водителя"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}