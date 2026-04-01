import Icon from "@/components/ui/icon";
import type { VehicleInfo } from "@/types/dashboard";
import type { DiagnosticApiConfig } from "@/types/dashboard";
import {
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPE_STYLES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_STYLES,
  FUEL_TYPE_LABELS,
} from "./vehicleConstants";

interface VehicleViewModalProps {
  vehicle: VehicleInfo | null;
  apis: DiagnosticApiConfig[];
  onClose: () => void;
}

export default function VehicleViewModal({ vehicle, apis, onClose }: VehicleViewModalProps) {
  if (!vehicle) return null;
  const v = vehicle;
  const linkedApis = apis.filter((a) => a.vehicleId === v.id);

  const detailRows: { label: string; value: string | number | undefined }[] = [
    { label: "VIN-номер", value: v.vinNumber },
    { label: "Бортовой номер", value: v.boardNumber ?? v.number },
    { label: "Тип ТС", value: VEHICLE_TYPE_LABELS[v.type] },
    { label: "Гос. рег. номер", value: v.govRegNumber },
    { label: "Модель", value: v.model },
    { label: "Производитель", value: v.manufacturer },
    { label: "Номер рег. свидетельства", value: v.regCertificateNumber },
    { label: "Год выпуска", value: v.year },
    { label: "Вместимость", value: v.passengerCapacity },
    { label: "Тип топлива", value: v.fuelType ? (FUEL_TYPE_LABELS[v.fuelType] ?? v.fuelType) : undefined },
    { label: "Цвет", value: v.vehicleColor },
    { label: "Пробег", value: v.mileage ? `${v.mileage.toLocaleString()} км` : undefined },
    { label: "Доступность для МГН", value: v.isAccessible ? "Да" : "Нет" },
    { label: "Номер страховки", value: v.insuranceNumber },
    { label: "Срок действия страховки", value: v.insuranceExpiry },
    { label: "Срок действия техосмотра", value: v.techInspectionExpiry },
    { label: "Маршрут", value: v.routeNumber },
    { label: "Водитель", value: v.driverName },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Icon name="Bus" className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                #{v.boardNumber ?? v.number}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_TYPE_STYLES[v.type]}`}>
                  {VEHICLE_TYPE_LABELS[v.type]}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_STATUS_STYLES[v.status]}`}>
                  {VEHICLE_STATUS_LABELS[v.status]}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
          >
            <Icon name="X" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-5">
          {detailRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-xs font-medium text-foreground">
                {row.value ?? "---"}
              </span>
            </div>
          ))}
        </div>

        {/* Documents info */}
        {v.documentsInfo && (
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Документы на ТС</p>
            <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-foreground whitespace-pre-wrap">
              {v.documentsInfo}
            </div>
          </div>
        )}

        {/* Linked APIs */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icon name="Plug" className="w-3.5 h-3.5" />
            Подключённые API ({linkedApis.length})
          </p>
          {linkedApis.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-3 text-center">
              Нет подключённых API
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {linkedApis.map((api) => (
                <div
                  key={api.id}
                  className="p-3 rounded-lg border border-border bg-muted/20 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Icon name="Plug" className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {api.apiName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {api.apiType?.toUpperCase() ?? "API"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      api.isActive
                        ? "bg-green-500/15 text-green-500"
                        : "bg-red-500/15 text-red-500"
                    }`}
                  >
                    {api.isActive ? "Активен" : "Неактивен"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
