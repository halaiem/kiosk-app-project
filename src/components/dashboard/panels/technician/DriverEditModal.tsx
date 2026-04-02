import { useState, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type {
  VehicleInfo,
  DriverInfo,
  DriverLifecycleStatus,
} from "@/types/dashboard";
import { formatTime } from "./TechRoutes";
import { updateDriver as apiUpdateDriver } from "@/api/dashboardApi";
import { generatePin } from "./TechVDConstants";

interface DriverEditModalProps {
  driver: DriverInfo;
  onClose: () => void;
  onReload?: () => void;
}

export default function DriverEditModal({
  driver,
  onClose,
  onReload,
}: DriverEditModalProps) {
  const [eName, setEName] = useState(driver.name);
  const [ePin, setEPin] = useState(driver.pin || "");
  const [eOriginalPin] = useState(driver.pin || "");
  const [ePhone, setEPhone] = useState(driver.phone || "");
  const [eVehicleType, setEVehicleType] = useState<VehicleInfo["type"] | "">(
    (driver.vehicleType as VehicleInfo["type"]) || ""
  );
  const [eVehicleNumber, setEVehicleNumber] = useState(driver.vehicleNumber || "");
  const [eRoute, setERoute] = useState(driver.routeNumber || "");
  const [eShiftStart, setEShiftStart] = useState(
    driver.shiftStart ? formatTime(driver.shiftStart) : "08:00"
  );
  const [eDriverStatus, setEDriverStatus] =
    useState<DriverLifecycleStatus>(driver.driverStatus || "active");
  const [eStatusNote, setEStatusNote] = useState(driver.statusNote || "");
  const [eRating, setERating] = useState(driver.rating?.toFixed(1) || "4.5");
  const [eTechPassword, setETechPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const pinChanged = ePin.trim() !== eOriginalPin;

  const handleEdit = useCallback(async () => {
    if (!eName.trim()) {
      setEditError("ФИО обязательно");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const payload: Record<string, unknown> = {
        id: driver.id,
        fullName: eName.trim(),
        phone: ePhone.trim() || null,
        vehicleType: eVehicleType || "tram",
        vehicleNumber: eVehicleNumber.trim(),
        routeNumber: eRoute.trim(),
        shiftStart: eShiftStart,
        driverStatus: eDriverStatus,
        statusNote: eStatusNote.trim(),
        rating: parseFloat(eRating) || 4.5,
      };
      if (pinChanged) {
        payload.pin = ePin.trim();
        payload.techPassword = eTechPassword;
      }
      await apiUpdateDriver(payload);
      onClose();
      onReload?.();
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "Ошибка сохранения"
      );
    } finally {
      setEditSaving(false);
    }
  }, [
    driver.id,
    eName,
    ePin,
    eOriginalPin,
    ePhone,
    eVehicleType,
    eVehicleNumber,
    eRoute,
    eShiftStart,
    eDriverStatus,
    eStatusNote,
    eRating,
    eTechPassword,
    pinChanged,
    onClose,
    onReload,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        key={driver.id}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">
            Редактирование водителя
          </h3>
          <button
            onClick={onClose}
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
              value={eName}
              onChange={(e) => setEName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Телефон
            </label>
            <input
              type="text"
              value={ePhone}
              onChange={(e) => setEPhone(e.target.value)}
              placeholder="+7 (9XX) XXX-XX-XX"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Тип ТС
            </label>
            <select
              value={eVehicleType}
              onChange={(e) =>
                setEVehicleType(e.target.value as VehicleInfo["type"])
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
              value={eVehicleNumber}
              onChange={(e) => setEVehicleNumber(e.target.value)}
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
              value={eRoute}
              onChange={(e) => setERoute(e.target.value)}
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
              value={eShiftStart}
              onChange={(e) => setEShiftStart(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Рейтинг
            </label>
            <input
              type="number"
              value={eRating}
              onChange={(e) => setERating(e.target.value)}
              min="0"
              max="5"
              step="0.1"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Статус водителя
            </label>
            <select
              value={eDriverStatus}
              onChange={(e) =>
                setEDriverStatus(
                  e.target.value as DriverLifecycleStatus
                )
              }
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">Активен</option>
              <option value="vacation">Отпуск</option>
              <option value="sick_leave">Больничный</option>
              <option value="fired">Уволен</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Примечание к статусу
            </label>
            <textarea
              value={eStatusNote}
              onChange={(e) => setEStatusNote(e.target.value)}
              rows={2}
              placeholder="Причина изменения статуса..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              PIN для входа в планшет
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 px-3 rounded-lg border border-primary/40 bg-primary/5 flex items-center gap-3">
                <Icon
                  name="KeyRound"
                  className="w-4 h-4 text-primary flex-shrink-0"
                />
                <input
                  type="text"
                  value={ePin}
                  onChange={(e) =>
                    setEPin(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder="1234"
                  className="flex-1 bg-transparent font-mono text-xl font-bold tracking-[0.4em] text-foreground focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setEPin(generatePin())}
                className="h-10 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors"
              >
                <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                Новый
              </button>
            </div>
            {pinChanged && (
              <p className="text-[10px] text-amber-600 mt-1">
                PIN изменён — для сохранения введите пароль техника
              </p>
            )}
          </div>

          {pinChanged && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Пароль техника (для смены PIN)
              </label>
              <input
                type="password"
                value={eTechPassword}
                onChange={(e) => setETechPassword(e.target.value)}
                placeholder="Введите ваш пароль..."
                className="w-full h-9 px-3 rounded-lg border border-amber-500/40 bg-amber-500/5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          )}
        </div>
        {editError && (
          <p className="text-xs text-destructive mt-3">{editError}</p>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleEdit}
            disabled={
              editSaving ||
              !eName.trim() ||
              (pinChanged && !eTechPassword.trim())
            }
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {editSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}