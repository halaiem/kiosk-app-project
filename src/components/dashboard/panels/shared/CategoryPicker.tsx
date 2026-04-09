import { useState, useMemo, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  fetchRoutesList,
  fetchVehiclesList,
  type ChatUser,
  type ChatDriver,
  type RouteItem,
  type VehicleItem,
} from "@/api/chatApi";

type RoleFilter =
  | "admin"
  | "technician"
  | "dispatcher"
  | "personnel"
  | "driver"
  | "route"
  | "vehicle";

const CATEGORIES: { key: RoleFilter; label: string; icon: string; short: string }[] = [
  { key: "admin", label: "Администраторы", icon: "Shield", short: "Адм" },
  { key: "technician", label: "Техники", icon: "Wrench", short: "Тех" },
  { key: "dispatcher", label: "Диспетчеры", icon: "Radio", short: "Дисп" },
  { key: "personnel", label: "Персонал", icon: "Users", short: "Перс" },
  { key: "driver", label: "Водители", icon: "User", short: "Вод" },
  { key: "route", label: "Маршруты", icon: "Route", short: "Маршр" },
  { key: "vehicle", label: "Транспорт", icon: "Bus", short: "Трансп" },
];

interface CategoryPickerProps {
  users: ChatUser[];
  drivers: ChatDriver[];
  selectedUserIds: Set<number>;
  selectedDriverIds: Set<number>;
  onToggleUser: (id: number) => void;
  onToggleDriver: (id: number) => void;
  onSelectAllUsers: (role: string) => void;
  onSelectAllDrivers: () => void;
}

export default function CategoryPicker({
  users,
  drivers,
  selectedUserIds,
  selectedDriverIds,
  onToggleUser,
  onToggleDriver,
  onSelectAllUsers,
  onSelectAllDrivers,
}: CategoryPickerProps) {
  const [activeCategory, setActiveCategory] = useState<RoleFilter | null>(null);
  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);

  useEffect(() => {
    if (activeCategory === "route" && !routesLoaded) {
      fetchRoutesList().then((r) => { setRoutes(r); setRoutesLoaded(true); }).catch(() => {});
    }
    if (activeCategory === "vehicle" && !vehiclesLoaded) {
      fetchVehiclesList().then((v) => { setVehicles(v); setVehiclesLoaded(true); }).catch(() => {});
    }
  }, [activeCategory, routesLoaded, vehiclesLoaded]);

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

  const getCategoryCount = (key: RoleFilter) => {
    if (["admin", "technician", "dispatcher", "personnel"].includes(key))
      return users.filter((u) => u.role === key).length;
    if (key === "driver") return drivers.length;
    if (key === "route") return routes.length;
    if (key === "vehicle") return vehicles.length;
    return 0;
  };

  const getSelectedCount = (key: RoleFilter) => {
    if (["admin", "technician", "dispatcher", "personnel"].includes(key))
      return users.filter((u) => u.role === key && selectedUserIds.has(u.id)).length;
    if (key === "driver") return drivers.filter((d) => selectedDriverIds.has(d.id)).length;
    return 0;
  };

  const isUserRole = activeCategory && ["admin", "technician", "dispatcher", "personnel"].includes(activeCategory);
  const isDriver = activeCategory === "driver";
  const isRoute = activeCategory === "route";
  const isVehicle = activeCategory === "vehicle";

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          const selCount = getSelectedCount(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(active ? null : cat.key)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-medium whitespace-nowrap transition-all shrink-0 ${
                active
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              <Icon name={cat.icon} className="w-3 h-3" />
              <span>{cat.short}</span>
              {selCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1 py-0 text-[8px] font-bold leading-tight">
                  {selCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory && (
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
            {(isUserRole || isDriver) && (
              <button
                onClick={() => isDriver ? onSelectAllDrivers() : onSelectAllUsers(activeCategory!)}
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
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(user.id)}
                  onChange={() => onToggleUser(user.id)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0"
                />
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.is_online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                <span className="text-xs text-foreground flex-1 truncate">{user.full_name}</span>
              </label>
            ))}

            {isDriver && filteredDrivers.map((driver) => (
              <label key={driver.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedDriverIds.has(driver.id)}
                  onChange={() => onToggleDriver(driver.id)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0"
                />
                <span className="text-xs text-foreground truncate flex-1">
                  <span className="text-muted-foreground font-mono text-[10px] mr-1">{driver.tab_number}</span>
                  {driver.full_name}
                </span>
                {driver.board_number && <span className="text-[10px] text-muted-foreground shrink-0">Б{driver.board_number}</span>}
                {driver.route_number && <span className="text-[10px] text-primary shrink-0">M{driver.route_number}</span>}
              </label>
            ))}

            {isRoute && (filteredRoutes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">Нет маршрутов</p>
            ) : filteredRoutes.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 transition-colors">
                <Icon name="Route" className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground">№{r.route_number}</span>
                <span className="text-xs text-muted-foreground truncate flex-1">{r.name}</span>
              </div>
            )))}

            {isVehicle && (filteredVehicles.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">Нет транспорта</p>
            ) : filteredVehicles.map((v) => (
              <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 transition-colors">
                <Icon name="Bus" className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground">{v.board_number || v.label}</span>
                {v.model && <span className="text-xs text-muted-foreground truncate flex-1">{v.model}</span>}
                {v.route_number && <span className="text-[10px] text-primary shrink-0">M{v.route_number}</span>}
              </div>
            )))}

            {(isUserRole && filteredUsers.length === 0) && <p className="text-[11px] text-muted-foreground text-center py-4">Не найдено</p>}
            {(isDriver && filteredDrivers.length === 0) && <p className="text-[11px] text-muted-foreground text-center py-4">Не найдено</p>}
          </div>
        </div>
      )}
    </div>
  );
}
