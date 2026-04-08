import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { VehicleInfo } from "@/types/dashboard";
import VehicleCard from "./VehicleCard";
import VehicleCreateModal from "./VehicleCreateModal";
import VehicleEditModal from "./VehicleEditModal";

export const TRANSPORT_TYPE_MAP: Record<string, VehicleInfo["type"]> = {
  tram: "tram",
  trolleybus: "trolleybus",
  bus: "bus",
  minibus: "bus",
  electrobus: "electrobus",
};

interface VehiclesViewProps {
  vehicles: VehicleInfo[];
  onReload?: () => void;
}

export function VehiclesView({ vehicles, onReload }: VehiclesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleInfo["type"]>("all");
  const [editingVehicle, setEditingVehicle] = useState<VehicleInfo | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground flex-1">Транспортные средства</h2>
        {(["all", "tram", "trolleybus", "bus", "electrobus"] as const).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t === "all" ? "Все" : t === "tram" ? "Трамваи" : t === "trolleybus" ? "Тролл." : t === "electrobus" ? "Электроб." : "Автобусы"}
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
            <VehicleCard key={v.id} vehicle={v} isOverdue={isOverdue} onEdit={setEditingVehicle} />
          ))
        )}
      </div>

      {showForm && (
        <VehicleCreateModal onClose={() => setShowForm(false)} onReload={onReload} />
      )}

      {editingVehicle && (
        <VehicleEditModal vehicle={editingVehicle} onClose={() => setEditingVehicle(null)} onReload={onReload} />
      )}
    </div>
  );
}
