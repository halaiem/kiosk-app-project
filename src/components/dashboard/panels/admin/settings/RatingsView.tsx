import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import urls from "../../../../../../backend/func2url.json";

const API_URL = (urls as Record<string, string>)["dashboard-messages"];
const TOKEN_KEY = "dashboard_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["X-Dashboard-Token"] = t;
  return h;
}

interface RatedEntity {
  id: number;
  full_name: string;
  role: string;
  rating: number;
  rating_count: number;
}

const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  admin: "Администратор",
  driver: "Водитель",
};

const ROLE_BADGE: Record<string, string> = {
  dispatcher: "bg-blue-500/15 text-blue-600",
  technician: "bg-purple-500/15 text-purple-600",
  mechanic: "bg-amber-500/15 text-amber-600",
  admin: "bg-red-500/15 text-red-600",
  driver: "bg-green-500/15 text-green-600",
};

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value || 0);
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="Star"
          className={`w-3.5 h-3.5 ${
            n <= rounded
              ? "text-amber-500 fill-amber-500"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function formatRating(r: number): string {
  if (!r || isNaN(r)) return "0.00";
  return Number(r).toFixed(2);
}

export default function RatingsView() {
  const [tab, setTab] = useState<"users" | "drivers">("users");
  const [users, setUsers] = useState<RatedEntity[]>([]);
  const [drivers, setDrivers] = useState<RatedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}?action=ratings&scope=all`, {
        headers: hdrs(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users || []);
      setDrivers(data.drivers || []);
    } catch {
      setError("Ошибка загрузки рейтингов");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    [users]
  );

  const sortedDrivers = useMemo(
    () => [...drivers].sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    [drivers]
  );

  const current = tab === "users" ? sortedUsers : sortedDrivers;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">Рейтинги</h3>
          <p className="text-sm text-muted-foreground">
            Сводка оценок сотрудников и водителей
          </p>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
          title="Обновить"
        >
          <Icon
            name="RefreshCw"
            className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "users"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Users" className="w-4 h-4" />
          Сотрудники
          <span className="text-[10px] opacity-70">({users.length})</span>
        </button>
        <button
          onClick={() => setTab("drivers")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "drivers"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="Bus" className="w-4 h-4" />
          Водители
          <span className="text-[10px] opacity-70">({drivers.length})</span>
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-500 flex items-center gap-1">
          <Icon name="AlertCircle" className="w-3 h-3" />
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Загрузка...
          </div>
        ) : current.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Нет данных
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Имя
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Роль
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Рейтинг
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Количество оценок
                  </th>
                </tr>
              </thead>
              <tbody>
                {current.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(e.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {e.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          ROLE_BADGE[e.role] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ROLE_LABELS[e.role] || e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Stars value={e.rating || 0} />
                        <span className="text-xs font-semibold text-foreground tabular-nums">
                          {formatRating(e.rating)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground tabular-nums">
                      {e.rating_count || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
