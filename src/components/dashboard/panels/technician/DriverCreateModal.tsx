import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type { VehicleInfo } from "@/types/dashboard";
import { createDriver as apiCreateDriver } from "@/api/driverApi";
import { generatePin } from "./TechVDConstants";

interface DriverCreateModalProps {
  onClose: () => void;
  onReload?: () => void;
}

export default function DriverCreateModal({
  onClose,
  onReload,
}: DriverCreateModalProps) {
  const [fName, setFName] = useState("");
  const [fPin, setFPin] = useState(() => generatePin());
  const [fPhone, setFPhone] = useState("");
  const [fVehicleType, setFVehicleType] = useState<VehicleInfo["type"] | "">(
    ""
  );
  const [fVehicleNumber, setFVehicleNumber] = useState("");
  const [fRoute, setFRoute] = useState("");
  const [fShiftStart, setFShiftStart] = useState("08:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPin, setCreatedPin] = useState<string | null>(null);

  const resetForm = () => {
    setFName("");
    setFPin(generatePin());
    setFPhone("");
    setFVehicleType("");
    setFVehicleNumber("");
    setFRoute("");
    setFShiftStart("08:00");
    setError("");
    setCreatedPin(null);
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
  }, [
    fName,
    fPin,
    fPhone,
    fVehicleType,
    fVehicleNumber,
    fRoute,
    fShiftStart,
    onReload,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => !createdPin && resetForm()}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {createdPin ? (
          <>
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <Icon
                  name="UserCheck"
                  className="w-7 h-7 text-green-500"
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Водитель создан!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Передайте PIN водителю для авторизации на планшете
                </p>
              </div>
              <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-[10px] text-primary uppercase tracking-wide mb-2 font-semibold">
                  PIN-код для входа
                </p>
                <p className="font-mono text-4xl font-bold tracking-[0.5em] text-foreground select-all">
                  {createdPin}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Готово
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">
                Новый водитель
              </h3>
              <button
                onClick={resetForm}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <Icon
                  name="X"
                  className="w-4 h-4 text-muted-foreground"
                />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  ФИО полностью *
                </label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="Оссама Иванов Петрович"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Телефон
                </label>
                <input
                  type="text"
                  value={fPhone}
                  onChange={(e) => setFPhone(e.target.value)}
                  placeholder="+7 (9XX) XXX-XX-XX"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Тип ТС
                </label>
                <select
                  value={fVehicleType}
                  onChange={(e) =>
                    setFVehicleType(
                      e.target.value as VehicleInfo["type"]
                    )
                  }
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— выберите —</option>
                  <option value="tram">Трамвай</option>
                  <option value="trolleybus">Троллейбус</option>
                  <option value="bus">Автобус</option>
                  <option value="electrobus">Электробус</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Бортовой номер
                </label>
                <input
                  type="text"
                  value={fVehicleNumber}
                  onChange={(e) => setFVehicleNumber(e.target.value)}
                  placeholder="ТМ-3450"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Маршрут
                </label>
                <input
                  type="text"
                  value={fRoute}
                  onChange={(e) => setFRoute(e.target.value)}
                  placeholder="5"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Начало смены
                </label>
                <input
                  type="time"
                  value={fShiftStart}
                  onChange={(e) => setFShiftStart(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  PIN для входа в планшет *
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-10 px-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center gap-3">
                    <Icon
                      name="KeyRound"
                      className="w-4 h-4 text-primary flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={fPin}
                      onChange={(e) =>
                        setFPin(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6)
                        )
                      }
                      placeholder="1234"
                      className="flex-1 bg-transparent font-mono text-xl font-bold tracking-[0.4em] text-foreground focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFPin(generatePin())}
                    className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                    Новый
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(fPin)}
                    className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Icon name="Copy" className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Водитель вводит этот PIN при авторизации на планшете
                </p>
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-3">{error}</p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !fName.trim() || !fPin.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Создаю..." : "Создать водителя"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}