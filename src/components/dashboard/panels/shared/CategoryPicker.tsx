import { useState, useMemo, useEffect, useCallback, memo } from "react";
import Icon from "@/components/ui/icon";
import {
  fetchRoutesList,
  fetchVehiclesList,
  fetchFilters,
  type ChatUser,
  type ChatDriver,
  type RouteItem,
  type VehicleItem,
  type ChatFilters,
} from "@/api/chatApi";

type CategoryKey =
  | "admin"
  | "technician"
  | "dispatcher"
  | "personnel"
  | "driver"
  | "route"
  | "vehicle"
  | "vtype"
  | "vmodel"
  | "extra";

const CATEGORIES: { key: CategoryKey; label: string; icon: string; short: string }[] = [
  { key: "admin", label: "Администратор", icon: "Shield", short: "Админ" },
  { key: "technician", label: "Технолог", icon: "Wrench", short: "Технол" },
  { key: "dispatcher", label: "Диспетчер", icon: "Radio", short: "Дисп" },
  { key: "personnel", label: "Персонал", icon: "Users", short: "Перс" },
  { key: "driver", label: "Водитель", icon: "User", short: "Водит" },
  { key: "route", label: "Маршрут", icon: "Route", short: "Маршр" },
  { key: "vehicle", label: "Транспорт", icon: "Bus", short: "Трансп" },
  { key: "vtype", label: "Тип ТС", icon: "Layers", short: "Тип ТС" },
  { key: "vmodel", label: "Модель ТС", icon: "Cpu", short: "Модель" },
  { key: "extra", label: "Ещё", icon: "Plus", short: "+ Ещё" },
];

type ExtraFilterKey = "fuel" | "year" | "color" | "manufacturer" | "shift" | "dstatus";

const EXTRA_FILTERS: { key: ExtraFilterKey; label: string; icon: string }[] = [
  { key: "fuel", label: "Тип топлива", icon: "Fuel" },
  { key: "year", label: "Год выпуска", icon: "Calendar" },
  { key: "color", label: "Цвет ТС", icon: "Palette" },
  { key: "manufacturer", label: "Производитель", icon: "Factory" },
  { key: "shift", label: "Статус смены", icon: "Clock" },
  { key: "dstatus", label: "Статус водителя", icon: "Activity" },
];

const TYPE_LABELS: Record<string, string> = {
  bus: "Автобус",
  tram: "Трамвай",
  trolleybus: "Троллейбус",
};

const FUEL_LABELS: Record<string, string> = {
  diesel: "Дизель",
  gas: "Газ",
  electric: "Электро",
  hybrid: "Гибрид",
  petrol: "Бензин",
};

const SHIFT_LABELS: Record<string, string> = {
  on_shift: "На смене",
  off_shift: "Не на смене",
  break: "Перерыв",
};

const DRIVER_STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  suspended: "Отстранён",
  vacation: "Отпуск",
  sick_leave: "Больничный",
};

interface CategoryPickerProps {
  users: ChatUser[];
  drivers: ChatDriver[];
  selectedUserIds: Set<number>;
  selectedDriverIds: Set<number>;
  onToggleUser: (id: number) => void;
  onToggleDriver: (id: number) => void;
  onSelectAllUsers: (role: string) => void;
  onSelectAllDrivers: () => void;
  onSelectDriversByIds?: (ids: number[]) => void;
  onDeselectDriversByIds?: (ids: number[]) => void;
}

export default memo(function CategoryPicker({
  users,
  drivers,
  selectedUserIds,
  selectedDriverIds,
  onToggleUser,
  onToggleDriver,
  onSelectAllUsers,
  onSelectAllDrivers,
  onSelectDriversByIds,
  onDeselectDriversByIds,
}: CategoryPickerProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [filters, setFilters] = useState<ChatFilters | null>(null);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [selectedVTypes, setSelectedVTypes] = useState<Set<string>>(new Set());
  const [selectedVModels, setSelectedVModels] = useState<Set<string>>(new Set());

  const [activeExtraFilter, setActiveExtraFilter] = useState<ExtraFilterKey | null>(null);
  const [selectedExtraValues, setSelectedExtraValues] = useState<Record<ExtraFilterKey, Set<string>>>({
    fuel: new Set(), year: new Set(), color: new Set(), manufacturer: new Set(), shift: new Set(), dstatus: new Set(),
  });

  useEffect(() => {
    if (activeCategory === "route" && !routesLoaded) {
      fetchRoutesList().then((r) => { setRoutes(r); setRoutesLoaded(true); }).catch(() => {});
    }
    if ((activeCategory === "vehicle" || activeCategory === "vtype" || activeCategory === "vmodel") && !vehiclesLoaded) {
      fetchVehiclesList().then((v) => { setVehicles(v); setVehiclesLoaded(true); }).catch(() => {});
    }
    if ((activeCategory === "vtype" || activeCategory === "vmodel" || activeCategory === "extra") && !filtersLoaded) {
      fetchFilters().then((f) => { setFilters(f); setFiltersLoaded(true); }).catch(() => {});
    }
  }, [activeCategory, routesLoaded, vehiclesLoaded, filtersLoaded]);

  const q = search.toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!activeCategory || !["admin", "technician", "dispatcher", "personnel"].includes(activeCategory)) return [];
    return users.filter((u) => u.role === activeCategory && (!q || u.full_name.toLowerCase().includes(q)));
  }, [users, activeCategory, q]);

  const filteredDrivers = useMemo(() => {
    if (activeCategory !== "driver") return [];
    return drivers.filter((d) =>
      !q || d.full_name.toLowerCase().includes(q) || d.tab_number.toLowerCase().includes(q) || (d.board_number && d.board_number.toLowerCase().includes(q))
    );
  }, [drivers, activeCategory, q]);

  const filteredRoutes = useMemo(() => {
    if (activeCategory !== "route") return [];
    return routes.filter((r) => !q || r.route_number.toLowerCase().includes(q) || (r.name && r.name.toLowerCase().includes(q)));
  }, [routes, activeCategory, q]);

  const filteredVehicles = useMemo(() => {
    if (activeCategory !== "vehicle") return [];
    return vehicles.filter((v) =>
      !q || (v.board_number && v.board_number.toLowerCase().includes(q)) || (v.model && v.model.toLowerCase().includes(q)) || v.label.toLowerCase().includes(q)
    );
  }, [vehicles, activeCategory, q]);

  const filteredVTypes = useMemo(() => {
    if (activeCategory !== "vtype" || !filters) return [];
    return filters.vehicle_types.filter((t) => !q || (TYPE_LABELS[t] || t).toLowerCase().includes(q));
  }, [filters, activeCategory, q]);

  const filteredVModels = useMemo(() => {
    if (activeCategory !== "vmodel" || !filters) return [];
    return filters.vehicle_models.filter((m) => !q || m.toLowerCase().includes(q));
  }, [filters, activeCategory, q]);

  const getDriverIdsByRoute = useCallback((routeNumber: string) => {
    return drivers.filter((d) => d.route_number === routeNumber).map((d) => d.id);
  }, [drivers]);

  const getDriverIdsByVehicleBoardNumber = useCallback((boardNumber: string) => {
    return drivers.filter((d) => d.board_number === boardNumber).map((d) => d.id);
  }, [drivers]);

  const getDriverIdsByVehicleType = useCallback((vtype: string) => {
    if (!filters) return [];
    const boardNumbers = filters.vehicle_index.filter((vi) => vi.transport_type === vtype).map((vi) => vi.board_number).filter(Boolean) as string[];
    return drivers.filter((d) => d.board_number && boardNumbers.includes(d.board_number)).map((d) => d.id);
  }, [filters, drivers]);

  const getDriverIdsByVehicleModel = useCallback((model: string) => {
    if (!filters) return [];
    const boardNumbers = filters.vehicle_index.filter((vi) => vi.model === model).map((vi) => vi.board_number).filter(Boolean) as string[];
    return drivers.filter((d) => d.board_number && boardNumbers.includes(d.board_number)).map((d) => d.id);
  }, [filters, drivers]);

  const getDriverIdsByExtraFilter = useCallback((filterKey: ExtraFilterKey, value: string) => {
    if (!filters) return [];
    if (filterKey === "fuel") {
      const boards = filters.vehicle_index.filter((vi) => {
        const v = vehicles.find((vv) => vv.id === vi.id);
        return v !== undefined;
      }).map((vi) => vi.board_number).filter(Boolean) as string[];
      return drivers.filter((d) => d.board_number && boards.includes(d.board_number)).map((d) => d.id);
    }
    if (filterKey === "shift") {
      return filters.driver_index.filter((di) => di.vehicle_type !== null).map((di) => di.id);
    }
    if (filterKey === "dstatus") {
      return filters.driver_index.map((di) => di.id);
    }
    if (filterKey === "manufacturer" || filterKey === "color") {
      const boards = filters.vehicle_index.map((vi) => vi.board_number).filter(Boolean) as string[];
      return drivers.filter((d) => d.board_number && boards.includes(d.board_number)).map((d) => d.id);
    }
    if (filterKey === "year") {
      const boards = filters.vehicle_index.map((vi) => vi.board_number).filter(Boolean) as string[];
      return drivers.filter((d) => d.board_number && boards.includes(d.board_number)).map((d) => d.id);
    }
    return [];
  }, [filters, drivers, vehicles]);

  const getCategoryCount = (key: CategoryKey) => {
    if (["admin", "technician", "dispatcher", "personnel"].includes(key))
      return users.filter((u) => u.role === key).length;
    if (key === "driver") return drivers.length;
    if (key === "route") return routes.length;
    if (key === "vehicle") return vehicles.length;
    if (key === "vtype") return filters?.vehicle_types.length || 0;
    if (key === "vmodel") return filters?.vehicle_models.length || 0;
    if (key === "extra") return EXTRA_FILTERS.length;
    return 0;
  };

  const getSelectedCount = (key: CategoryKey) => {
    if (["admin", "technician", "dispatcher", "personnel"].includes(key))
      return users.filter((u) => u.role === key && selectedUserIds.has(u.id)).length;
    if (key === "driver") return drivers.filter((d) => selectedDriverIds.has(d.id)).length;
    if (key === "route") return selectedRoutes.size;
    if (key === "vehicle") return selectedVehicles.size;
    if (key === "vtype") return selectedVTypes.size;
    if (key === "vmodel") return selectedVModels.size;
    if (key === "extra") {
      let total = 0;
      Object.values(selectedExtraValues).forEach((s) => { total += s.size; });
      return total;
    }
    return 0;
  };

  const toggleGroupItem = useCallback((
    value: string,
    selectedSet: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    getIds: (val: string) => number[],
  ) => {
    const ids = getIds(value);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
        if (ids.length > 0) onDeselectDriversByIds?.(ids);
      } else {
        next.add(value);
        if (ids.length > 0) onSelectDriversByIds?.(ids);
      }
      return next;
    });
  }, [onSelectDriversByIds, onDeselectDriversByIds]);

  const selectAllInGroup = useCallback((
    allValues: string[],
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
    getIds: (val: string) => number[],
  ) => {
    setSelected(new Set(allValues));
    const allIds = allValues.flatMap(getIds);
    const unique = [...new Set(allIds)];
    if (unique.length > 0) onSelectDriversByIds?.(unique);
  }, [onSelectDriversByIds]);

  const toggleExtraValue = useCallback((filterKey: ExtraFilterKey, value: string) => {
    const ids = getDriverIdsByExtraFilter(filterKey, value);
    setSelectedExtraValues((prev) => {
      const next = { ...prev };
      const s = new Set(prev[filterKey]);
      if (s.has(value)) {
        s.delete(value);
        if (ids.length > 0) onDeselectDriversByIds?.(ids);
      } else {
        s.add(value);
        if (ids.length > 0) onSelectDriversByIds?.(ids);
      }
      next[filterKey] = s;
      return next;
    });
  }, [getDriverIdsByExtraFilter, onSelectDriversByIds, onDeselectDriversByIds]);

  const selectAllExtraValues = useCallback((filterKey: ExtraFilterKey, allValues: string[]) => {
    const allIds = allValues.flatMap((v) => getDriverIdsByExtraFilter(filterKey, v));
    const unique = [...new Set(allIds)];
    setSelectedExtraValues((prev) => ({
      ...prev,
      [filterKey]: new Set(allValues),
    }));
    if (unique.length > 0) onSelectDriversByIds?.(unique);
  }, [getDriverIdsByExtraFilter, onSelectDriversByIds]);

  const getExtraFilterValues = useCallback((key: ExtraFilterKey): string[] => {
    if (!filters) return [];
    switch (key) {
      case "fuel": return filters.fuel_types;
      case "year": return filters.years.map(String);
      case "color": return filters.colors;
      case "manufacturer": return filters.manufacturers;
      case "shift": return filters.shift_statuses;
      case "dstatus": return filters.driver_statuses;
    }
  }, [filters]);

  const getExtraLabel = useCallback((key: ExtraFilterKey, val: string) => {
    switch (key) {
      case "fuel": return FUEL_LABELS[val] || val;
      case "shift": return SHIFT_LABELS[val] || val;
      case "dstatus": return DRIVER_STATUS_LABELS[val] || val;
      default: return val;
    }
  }, []);

  const isUserRole = activeCategory && ["admin", "technician", "dispatcher", "personnel"].includes(activeCategory);
  const isDriver = activeCategory === "driver";
  const isRoute = activeCategory === "route";
  const isVehicle = activeCategory === "vehicle";
  const isVType = activeCategory === "vtype";
  const isVModel = activeCategory === "vmodel";
  const isExtra = activeCategory === "extra";

  const driversCountOnRoute = useCallback((rn: string) => getDriverIdsByRoute(rn).length, [getDriverIdsByRoute]);
  const driversCountOnBoard = useCallback((bn: string) => getDriverIdsByVehicleBoardNumber(bn).length, [getDriverIdsByVehicleBoardNumber]);
  const driversCountOnType = useCallback((t: string) => getDriverIdsByVehicleType(t).length, [getDriverIdsByVehicleType]);
  const driversCountOnModel = useCallback((m: string) => getDriverIdsByVehicleModel(m).length, [getDriverIdsByVehicleModel]);

  const vehicleCountByType = useCallback((t: string) => {
    return vehicles.filter((v) => {
      const vItem = filters?.vehicle_index.find((vi) => vi.id === v.id);
      return vItem?.transport_type === t;
    }).length;
  }, [vehicles, filters]);

  const vehicleCountByModel = useCallback((m: string) => {
    return vehicles.filter((v) => v.model === m).length;
  }, [vehicles]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          const selCount = getSelectedCount(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(active ? null : cat.key);
                setSearch("");
                if (cat.key !== "extra") setActiveExtraFilter(null);
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-medium whitespace-nowrap transition-all shrink-0 ${
                active
                  ? cat.key === "extra"
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
                    : "bg-primary/15 border-primary/30 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              <Icon name={cat.icon} className="w-3 h-3" />
              <span>{cat.short}</span>
              {selCount > 0 && (
                <span className={`rounded-full px-1 py-0 text-[8px] font-bold leading-tight ${
                  cat.key === "extra" ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
                }`}>
                  {selCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory && !isExtra && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30">
            <div className="relative flex-1">
              <Icon name="Search" className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full text-[11px] bg-transparent pl-6 pr-2 py-0.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            {(isUserRole || isDriver || isRoute || isVehicle || isVType || isVModel) && (
              <button
                onClick={() => {
                  if (isDriver) onSelectAllDrivers();
                  else if (isRoute) selectAllInGroup(routes.map((r) => r.route_number), setSelectedRoutes, getDriverIdsByRoute);
                  else if (isVehicle) selectAllInGroup(vehicles.filter((v) => v.board_number).map((v) => v.board_number!), setSelectedVehicles, getDriverIdsByVehicleBoardNumber);
                  else if (isVType && filters) selectAllInGroup(filters.vehicle_types, setSelectedVTypes, getDriverIdsByVehicleType);
                  else if (isVModel && filters) selectAllInGroup(filters.vehicle_models, setSelectedVModels, getDriverIdsByVehicleModel);
                  else if (isUserRole) onSelectAllUsers(activeCategory!);
                }}
                className="text-[9px] text-primary hover:underline shrink-0"
              >
                Выбрать всех
              </button>
            )}
            <span className="text-[9px] text-muted-foreground shrink-0">
              {getCategoryCount(activeCategory)}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isUserRole && filteredUsers.map((user) => (
              <label key={user.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => onToggleUser(user.id)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0" />
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.is_online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                <span className="text-xs text-foreground flex-1 truncate">{user.full_name}</span>
              </label>
            ))}

            {isDriver && filteredDrivers.map((driver) => (
              <label key={driver.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedDriverIds.has(driver.id)} onChange={() => onToggleDriver(driver.id)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">
                  <span className="text-muted-foreground font-mono text-[10px] mr-1">{driver.tab_number}</span>
                  {driver.full_name}
                </span>
                {driver.board_number && <span className="text-[10px] text-muted-foreground shrink-0">Б{driver.board_number}</span>}
                {driver.route_number && <span className="text-[10px] text-primary shrink-0">M{driver.route_number}</span>}
              </label>
            ))}

            {isRoute && filteredRoutes.map((route) => {
              const count = driversCountOnRoute(route.route_number);
              const checked = selectedRoutes.has(route.route_number);
              return (
                <label key={route.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                  <input type="checkbox" checked={checked}
                    onChange={() => toggleGroupItem(route.route_number, selectedRoutes, setSelectedRoutes, getDriverIdsByRoute)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0" />
                  <Icon name="Route" className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate">
                    <span className="font-semibold">М{route.route_number}</span>
                    {route.name && <span className="text-muted-foreground ml-1">{route.name}</span>}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{count} вод.</span>
                </label>
              );
            })}

            {isVehicle && filteredVehicles.map((v) => {
              const bn = v.board_number || v.label;
              const count = driversCountOnBoard(bn);
              const checked = selectedVehicles.has(bn);
              return (
                <label key={v.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                  <input type="checkbox" checked={checked}
                    onChange={() => toggleGroupItem(bn, selectedVehicles, setSelectedVehicles, getDriverIdsByVehicleBoardNumber)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0" />
                  <Icon name="Bus" className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate">
                    <span className="font-semibold">{v.board_number || v.label}</span>
                    {v.model && <span className="text-muted-foreground ml-1">{v.model}</span>}
                  </span>
                  {v.route_number && <span className="text-[10px] text-primary shrink-0">M{v.route_number}</span>}
                  <span className="text-[10px] text-muted-foreground shrink-0">{count} вод.</span>
                </label>
              );
            })}

            {isVType && filteredVTypes.map((t) => {
              const checked = selectedVTypes.has(t);
              const vCount = vehicleCountByType(t);
              const dCount = driversCountOnType(t);
              return (
                <label key={t} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                  <input type="checkbox" checked={checked}
                    onChange={() => toggleGroupItem(t, selectedVTypes, setSelectedVTypes, getDriverIdsByVehicleType)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0" />
                  <Icon name="Layers" className="w-3 h-3 text-violet-500 shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate font-medium">{TYPE_LABELS[t] || t}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{vCount} ТС</span>
                  <span className="text-[10px] text-primary shrink-0">{dCount} вод.</span>
                </label>
              );
            })}

            {isVModel && filteredVModels.map((m) => {
              const checked = selectedVModels.has(m);
              const vCount = vehicleCountByModel(m);
              const dCount = driversCountOnModel(m);
              return (
                <label key={m} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                  <input type="checkbox" checked={checked}
                    onChange={() => toggleGroupItem(m, selectedVModels, setSelectedVModels, getDriverIdsByVehicleModel)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0" />
                  <Icon name="Cpu" className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate font-medium">{m}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{vCount} ТС</span>
                  <span className="text-[10px] text-primary shrink-0">{dCount} вод.</span>
                </label>
              );
            })}

            {((isUserRole && filteredUsers.length === 0) || (isDriver && filteredDrivers.length === 0) ||
              (isRoute && filteredRoutes.length === 0) || (isVehicle && filteredVehicles.length === 0) ||
              (isVType && filteredVTypes.length === 0) || (isVModel && filteredVModels.length === 0)) && (
              <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">Не найдено</div>
            )}
          </div>

          {(isRoute && selectedRoutes.size > 0) && (
            <div className="px-3 py-1.5 border-t border-border/50 bg-primary/5 text-[10px] text-primary">
              Маршрутов: {selectedRoutes.size} — водители добавлены автоматически
            </div>
          )}
          {(isVehicle && selectedVehicles.size > 0) && (
            <div className="px-3 py-1.5 border-t border-border/50 bg-blue-500/5 text-[10px] text-blue-600">
              ТС: {selectedVehicles.size} — водители добавлены автоматически
            </div>
          )}
          {(isVType && selectedVTypes.size > 0) && (
            <div className="px-3 py-1.5 border-t border-border/50 bg-violet-500/5 text-[10px] text-violet-600">
              Типов: {selectedVTypes.size} — водители ТС этих типов добавлены
            </div>
          )}
          {(isVModel && selectedVModels.size > 0) && (
            <div className="px-3 py-1.5 border-t border-border/50 bg-emerald-500/5 text-[10px] text-emerald-600">
              Моделей: {selectedVModels.size} — водители ТС этих моделей добавлены
            </div>
          )}
        </div>
      )}

      {isExtra && (
        <div className="border border-amber-500/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-amber-500/5 border-b border-amber-500/20">
            <p className="text-[10px] text-amber-700 font-medium">Дополнительные фильтры — выберите категорию</p>
          </div>

          <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide border-b border-border/50">
            {EXTRA_FILTERS.map((ef) => {
              const active = activeExtraFilter === ef.key;
              const cnt = selectedExtraValues[ef.key].size;
              return (
                <button
                  key={ef.key}
                  onClick={() => { setActiveExtraFilter(active ? null : ef.key); setSearch(""); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-medium whitespace-nowrap transition-all shrink-0 ${
                    active
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon name={ef.icon} className="w-2.5 h-2.5" />
                  <span>{ef.label}</span>
                  {cnt > 0 && (
                    <span className="bg-amber-500 text-white rounded-full px-1 py-0 text-[7px] font-bold leading-tight">
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeExtraFilter && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30">
                <div className="relative flex-1">
                  <Icon name="Search" className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full text-[11px] bg-transparent pl-6 pr-2 py-0.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    const vals = getExtraFilterValues(activeExtraFilter).filter((v) => !q || getExtraLabel(activeExtraFilter, v).toLowerCase().includes(q));
                    selectAllExtraValues(activeExtraFilter, vals);
                  }}
                  className="text-[9px] text-amber-600 hover:underline shrink-0"
                >
                  Выбрать всех
                </button>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {getExtraFilterValues(activeExtraFilter).length}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {getExtraFilterValues(activeExtraFilter)
                  .filter((v) => !q || getExtraLabel(activeExtraFilter, v).toLowerCase().includes(q))
                  .map((val) => {
                    const checked = selectedExtraValues[activeExtraFilter].has(val);
                    return (
                      <label key={val} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                        <input type="checkbox" checked={checked}
                          onChange={() => toggleExtraValue(activeExtraFilter, val)}
                          className="w-3.5 h-3.5 rounded border-border text-amber-500 focus:ring-amber-500/50 shrink-0" />
                        <span className="text-xs text-foreground flex-1 truncate">{getExtraLabel(activeExtraFilter, val)}</span>
                      </label>
                    );
                  })}
                {getExtraFilterValues(activeExtraFilter).filter((v) => !q || getExtraLabel(activeExtraFilter, v).toLowerCase().includes(q)).length === 0 && (
                  <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">Нет данных</div>
                )}
              </div>

              {selectedExtraValues[activeExtraFilter].size > 0 && (
                <div className="px-3 py-1.5 border-t border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-600">
                  Выбрано: {selectedExtraValues[activeExtraFilter].size} — водители добавлены по фильтру
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
})
