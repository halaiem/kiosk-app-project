import Icon from "@/components/ui/icon";
import type { VehicleInfo } from "@/types/dashboard";
import { formatDate } from "./TechRoutes";
import {
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_LABELS,
  VEHICLE_STATUS_STYLES,
  VEHICLE_STATUS_LABELS,
} from "./TechVDConstants";

interface VehicleCardProps {
  vehicle: VehicleInfo;
  isOverdue: (date: Date) => boolean;
  onEdit: (v: VehicleInfo) => void;
}

export default function VehicleCard({ vehicle: v, isOverdue, onEdit }: VehicleCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
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
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${VEHICLE_STATUS_STYLES[v.status]}`}>
            {VEHICLE_STATUS_LABELS[v.status]}
          </span>
          <button
            onClick={() => onEdit(v)}
            className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            title="Редактировать"
          >
            <Icon name="Pencil" className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
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
  );
}
