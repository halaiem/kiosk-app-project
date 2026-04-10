import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { createDriver as apiCreateDriver } from "@/api/driverApi";
import { generatePin } from "./TechVDConstants";

const VEHICLE_TYPE_OPTIONS = [
  { value: "bus", label: "Автобус" },
  { value: "tram", label: "Трамвай" },
  { value: "trolleybus", label: "Троллейбус" },
  { value: "minibus", label: "Маршрутка" },
  { value: "metro", label: "Метро" },
];

interface DriverCreateModalProps {
  onClose: () => void;
  onReload?: () => void;
}

export default function DriverCreateModal({
  onClose,
  onReload,
}: DriverCreateModalProps) {
  const [fName, setFName] = useState("");
  const [fTabNumber, setFTabNumber] = useState("");
  const [fPin, setFPin] = useState(() => generatePin());
  const [fPhone, setFPhone] = useState("");
  const [fVehicleType, setFVehicleType] = useState("bus");
  const [fDriverStatus, setFDriverStatus] = useState<"active" | "fired">("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string>("");

  const inputCls = "w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

  const buildPayload = () => ({
    fullName: fName.trim(),
    pin: fPin.trim(),
    tabNumber: fTabNumber.trim() || undefined,
    vehicleType: fVehicleType,
    vehicleNumber: "",
    routeNumber: "",
    shiftStart: "08:00",
    phone: fPhone.trim() || undefined,
    driverStatus: fDriverStatus,
  });

  const resetFields = () => {
    setFName("");
    setFTabNumber("");
    setFPin(generatePin());
    setFPhone("");
    setFVehicleType("bus");
    setFDriverStatus("active");
    setError("");
  };

  const resetForm = () => {
    resetFields();
    setCreatedPin(null);
    setCreatedName("");
    onClose();
  };

  const handleCreate = useCallback(async () => {
    if (!fName.trim() || !fPin.trim()) {
      setError("Заполните ФИО и PIN");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiCreateDriver(buildPayload() as Parameters<typeof apiCreateDriver>[0]);
      setCreatedPin(fPin);
      setCreatedName(fName.trim());
      onReload?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fName, fTabNumber, fPin, fPhone, fVehicleType, fDriverStatus, onReload]);

  const handleCreateAndNew = useCallback(async () => {
    if (!fName.trim() || !fPin.trim()) {
      setError("Заполните ФИО и PIN");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiCreateDriver(buildPayload() as Parameters<typeof apiCreateDriver>[0]);
      onReload?.();
      resetFields();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fName, fTabNumber, fPin, fPhone, fVehicleType, fDriverStatus, onReload]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !createdPin && resetForm()}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {createdPin ? (
          <>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Icon name="UserCheck" className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">Водитель создан</span>
            </div>
            <div className="px-5 py-5 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-medium text-foreground">{createdName}</span> добавлен.<br />
                Передайте PIN водителю для входа на планшете.
              </p>
              <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-[10px] text-primary uppercase tracking-wide mb-2 font-semibold">PIN-код</p>
                <p className="font-mono text-4xl font-bold tracking-[0.5em] text-foreground select-all">{createdPin}</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-end">
              <button onClick={resetForm}
                className="h-8 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                Готово
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <Icon name="UserPlus" className="w-4 h-4 text-cyan-500" />
                </div>
                <span className="text-sm font-semibold text-foreground">Новый водитель</span>
              </div>
              <button onClick={resetForm} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">ФИО полностью *</label>
                  <input type="text" value={fName} onChange={(e) => setFName(e.target.value)}
                    placeholder="Иванов Иван Иванович" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Таб. номер</label>
                  <input type="text" value={fTabNumber} onChange={(e) => setFTabNumber(e.target.value)}
                    placeholder="0001" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Телефон</label>
                  <input type="text" value={fPhone} onChange={(e) => setFPhone(e.target.value)}
                    placeholder="+7 (9XX) XXX-XX-XX" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Тип транспорта</label>
                  <select value={fVehicleType} onChange={(e) => setFVehicleType(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {VEHICLE_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                  <div className="flex items-center gap-2 h-9">
                    <button type="button" onClick={() => setFDriverStatus("active")}
                      className={`flex-1 h-9 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${fDriverStatus === "active" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${fDriverStatus === "active" ? "bg-green-500" : "bg-muted-foreground"}`} />
                      Активен
                    </button>
                    <button type="button" onClick={() => setFDriverStatus("fired")}
                      className={`flex-1 h-9 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${fDriverStatus === "fired" ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${fDriverStatus === "fired" ? "bg-red-500" : "bg-muted-foreground"}`} />
                      Неактивен
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">PIN для входа в планшет *</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-10 px-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center gap-3">
                    <Icon name="KeyRound" className="w-4 h-4 text-primary flex-shrink-0" />
                    <input type="text" value={fPin}
                      onChange={(e) => setFPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="1234"
                      className="flex-1 bg-transparent font-mono text-xl font-bold tracking-[0.4em] text-foreground focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => setFPin(generatePin())}
                    className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors">
                    <Icon name="RefreshCw" className="w-3.5 h-3.5" />Новый
                  </button>
                  <button type="button" onClick={() => navigator.clipboard.writeText(fPin)}
                    className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors">
                    <Icon name="Copy" className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Водитель вводит этот PIN при авторизации на планшете</p>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={handleCreate} disabled={saving || !fName.trim() || !fPin.trim()}
                    className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                    {saving ? "Создаю..." : "Создать"}
                  </button>
                  <button onClick={handleCreateAndNew} disabled={saving || !fName.trim() || !fPin.trim()}
                    className="flex-1 h-9 rounded-lg border border-border bg-muted text-muted-foreground text-xs font-medium hover:text-foreground disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                    <Icon name="CopyPlus" className="w-3.5 h-3.5" />
                    Новый и копи
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-end">
              <button onClick={resetForm}
                className="h-8 px-4 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors">
                Отмена
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}