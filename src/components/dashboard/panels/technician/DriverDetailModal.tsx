import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import type {
  DriverInfo,
  DriverLifecycleStatus,
  ScheduleEntry,
} from "@/types/dashboard";
import { formatTime, Modal } from "./TechRoutes";
import {
  updateDriver as apiUpdateDriver,
  deleteDriver as apiDeleteDriver,
} from "@/api/dashboardApi";
import {
  DRIVER_STATUS_STYLES,
  DRIVER_STATUS_LABELS,
} from "./TechVDConstants";

const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  vacation: "В отпуске",
  sick_leave: "Больничный",
  fired: "Уволен",
};
const LIFECYCLE_STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-500",
  vacation: "bg-yellow-500/15 text-yellow-600",
  sick_leave: "bg-orange-500/15 text-orange-500",
  fired: "bg-red-500/15 text-red-500",
};

interface DriverDetailModalProps {
  driver: DriverInfo;
  schedules?: ScheduleEntry[];
  onClose: () => void;
  onReload?: () => void;
}

export default function DriverDetailModal({
  driver,
  schedules,
  onClose,
  onReload,
}: DriverDetailModalProps) {
  const [confirmAction, setConfirmAction] = useState<{
    status: DriverLifecycleStatus;
    label: string;
  } | null>(null);
  const [confirmNote, setConfirmNote] = useState("");
  const [confirmSaving, setConfirmSaving] = useState(false);

  const driverAssignments = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter(
      (s) =>
        s.driverId === Number(driver.id) &&
        s.status !== "cancelled"
    );
  }, [driver, schedules]);

  const handleStatusChange = useCallback(
    async (newStatus: DriverLifecycleStatus, note: string) => {
      setConfirmSaving(true);
      try {
        if (newStatus === "fired") {
          await apiDeleteDriver(Number(driver.id));
        } else {
          await apiUpdateDriver({
            id: driver.id,
            driverStatus: newStatus,
            statusNote: note,
          });
        }
        setConfirmAction(null);
        setConfirmNote("");
        onClose();
        onReload?.();
      } catch (e) {
        console.error(e);
      } finally {
        setConfirmSaving(false);
      }
    },
    [driver, onClose, onReload]
  );

  if (confirmAction) {
    return (
      <Modal
        title={`${confirmAction.label} — ${driver.name}`}
        onClose={() => {
          setConfirmAction(null);
          setConfirmNote("");
        }}
      >
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                LIFECYCLE_STATUS_STYLES[confirmAction.status]
              }`}
            >
              <Icon
                name={
                  confirmAction.status === "fired"
                    ? "UserX"
                    : confirmAction.status === "vacation"
                    ? "Palmtree"
                    : confirmAction.status === "sick_leave"
                    ? "Thermometer"
                    : "UserCheck"
                }
                className="w-5 h-5"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {confirmAction.status === "fired"
                  ? "Вы уверены, что хотите уволить водителя?"
                  : `Изменить статус на "${LIFECYCLE_STATUS_LABELS[confirmAction.status]}"?`}
              </p>
              {confirmAction.status === "fired" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Все активные назначения будут отменены
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Причина / комментарий
            </label>
            <textarea
              value={confirmNote}
              onChange={(e) => setConfirmNote(e.target.value)}
              rows={2}
              placeholder="Укажите причину..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmAction(null);
                setConfirmNote("");
              }}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() =>
                handleStatusChange(
                  confirmAction.status,
                  confirmNote
                )
              }
              disabled={confirmSaving}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                confirmAction.status === "fired"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {confirmSaving
                ? "Сохранение..."
                : confirmAction.label}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Водитель — ${driver.name}`}
      onClose={onClose}
    >
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Таб. номер", value: driver.tabNumber },
            {
              label: "Статус смены",
              value: DRIVER_STATUS_LABELS[driver.status],
              colored: DRIVER_STATUS_STYLES[driver.status],
            },
            {
              label: "Телефон",
              value: driver.phone || "—",
            },
            {
              label: "Рейтинг",
              value: `${driver.rating.toFixed(1)} / 5.0`,
            },
          ].map(({ label, value, colored }) => (
            <div key={label} className="bg-muted/40 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                {label}
              </p>
              {colored ? (
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded ${colored}`}
                >
                  {value}
                </span>
              ) : (
                <span className="font-medium text-foreground">{value}</span>
              )}
            </div>
          ))}
        </div>

        <div className="bg-muted/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Статус водителя
            </p>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                LIFECYCLE_STATUS_STYLES[
                  driver.driverStatus || "active"
                ] || LIFECYCLE_STATUS_STYLES.active
              }`}
            >
              {LIFECYCLE_STATUS_LABELS[driver.driverStatus || "active"] ||
                "Активен"}
            </span>
          </div>
          {driver.statusNote && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Примечание:</span>{" "}
              {driver.statusNote}
            </p>
          )}
          {driver.statusChangedAt && (
            <p className="text-[10px] text-muted-foreground">
              Изменено:{" "}
              {new Date(driver.statusChangedAt).toLocaleString("ru")}
            </p>
          )}
          {(driver.driverStatus || "active") !== "fired" && (
            <div className="flex items-center gap-2 pt-1">
              {(driver.driverStatus || "active") !== "vacation" && (
                <button
                  onClick={() =>
                    setConfirmAction({
                      status: "vacation",
                      label: "Отпуск",
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 transition-colors"
                >
                  Отпуск
                </button>
              )}
              {(driver.driverStatus || "active") !== "sick_leave" && (
                <button
                  onClick={() =>
                    setConfirmAction({
                      status: "sick_leave",
                      label: "Больничный",
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/15 text-orange-500 hover:bg-orange-500/25 transition-colors"
                >
                  Больничный
                </button>
              )}
              {(driver.driverStatus || "active") !== "active" && (
                <button
                  onClick={() =>
                    setConfirmAction({
                      status: "active",
                      label: "Вернуть на службу",
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
                >
                  Вернуть
                </button>
              )}
              <button
                onClick={() =>
                  setConfirmAction({
                    status: "fired",
                    label: "Уволить",
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-500 hover:bg-red-500/25 transition-colors ml-auto"
              >
                Уволить
              </button>
            </div>
          )}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-1 font-semibold">
            PIN для входа в планшет
          </p>
          <p className="text-xs text-muted-foreground">
            PIN хранится в зашифрованном виде. Передайте водителю PIN при создании или
            сбросьте через техника.
          </p>
        </div>

        {schedules && driverAssignments.length > 0 && (
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Назначения
            </p>
            <div className="space-y-1.5">
              {driverAssignments.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      name="Route"
                      className="w-3 h-3 text-muted-foreground"
                    />
                    <span className="font-medium">
                      Маршрут {a.routeNumber || "---"}
                    </span>
                    <span className="text-muted-foreground">
                      ТС: {a.vehicleNumber || "---"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{a.date}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        a.status === "active"
                          ? "bg-green-500/15 text-green-500"
                          : a.status === "completed"
                          ? "bg-blue-500/15 text-blue-500"
                          : "bg-gray-500/15 text-gray-500"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
              {driverAssignments.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  и ещё {driverAssignments.length - 5}...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}