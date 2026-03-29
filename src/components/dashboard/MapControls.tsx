import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { MapVehicleInfo } from "@/components/dashboard/MapVehicleCard";

type VehicleType = "all" | "tram" | "trolleybus" | "bus";
type VehicleStatus = "all" | "ok" | "warning" | "critical";

interface Props {
  vehicles: MapVehicleInfo[];
  onFilterChange: (filtered: MapVehicleInfo[]) => void;
}

const TYPE_LABELS: Record<VehicleType, string> = {
  all: "Все типы",
  tram: "Трамвай",
  trolleybus: "Троллейбус",
  bus: "Автобус",
};

const STATUS_LABELS: Record<VehicleStatus, string> = {
  all: "Все статусы",
  ok: "Норма",
  warning: "Внимание",
  critical: "Критично",
};

const STATUS_DOTS: Record<VehicleStatus, string> = {
  all: "bg-muted-foreground",
  ok: "bg-green-500",
  warning: "bg-yellow-400",
  critical: "bg-red-500",
};

function getVehicleType(v: MapVehicleInfo): VehicleType {
  const types: VehicleType[] = ["tram", "tram", "tram", "trolleybus", "trolleybus", "bus"];
  const seed = parseInt(v.number, 10) || 1;
  return types[seed % types.length];
}

export default function MapControls({ vehicles, onFilterChange }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<VehicleType>("all");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    let result = [...vehicles];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (v) =>
          v.number.toLowerCase().includes(q) ||
          v.route.toLowerCase().includes(q) ||
          v.label.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((v) => getVehicleType(v) === typeFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((v) => v.status === statusFilter);
    }
    onFilterChange(result);
  }, [query, typeFilter, statusFilter, vehicles]);

  const hasFilter = typeFilter !== "all" || statusFilter !== "all";
  const hasSearch = query.trim() !== "";

  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1.5">
      {/* Search button + input */}
      <div className="flex items-center gap-1.5">
        {searchOpen && (
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Борт, маршрут, водитель..."
            className="h-8 w-48 px-3 rounded-lg bg-card/95 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-lg backdrop-blur"
            onKeyDown={(e) => e.key === "Escape" && (setSearchOpen(false), setQuery(""))}
          />
        )}
        <button
          onClick={() => { setSearchOpen(!searchOpen); setFilterOpen(false); if (searchOpen) setQuery(""); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-all border
            ${searchOpen || hasSearch ? "bg-primary text-primary-foreground border-primary" : "bg-card/95 backdrop-blur border-border text-muted-foreground hover:text-foreground"}`}
          title="Поиск по карте"
        >
          <Icon name="Search" className="w-4 h-4" />
        </button>
      </div>

      {/* Filter button + dropdown */}
      <div className="relative">
        <button
          onClick={() => { setFilterOpen(!filterOpen); setSearchOpen(false); }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-all border
            ${filterOpen || hasFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card/95 backdrop-blur border-border text-muted-foreground hover:text-foreground"}`}
          title="Фильтры"
        >
          <Icon name="SlidersHorizontal" className="w-4 h-4" />
          {hasFilter && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
              {(typeFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)}
            </span>
          )}
        </button>

        {filterOpen && (
          <div
            className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl p-3 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Type filter */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Тип транспорта</p>
              <div className="space-y-1">
                {(["all", "tram", "trolleybus", "bus"] as VehicleType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors
                      ${typeFilter === t ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                  >
                    <Icon
                      name={t === "tram" ? "TramFront" : t === "trolleybus" ? "Zap" : t === "bus" ? "Bus" : "LayoutGrid"}
                      className="w-3.5 h-3.5"
                    />
                    {TYPE_LABELS[t]}
                    {typeFilter === t && <Icon name="Check" className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Status filter */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Статус</p>
              <div className="space-y-1">
                {(["all", "ok", "warning", "critical"] as VehicleStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors
                      ${statusFilter === s ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOTS[s]}`} />
                    {STATUS_LABELS[s]}
                    {statusFilter === s && <Icon name="Check" className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {hasFilter && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1"
                >
                  <Icon name="X" className="w-3 h-3" />
                  Сбросить фильтры
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
