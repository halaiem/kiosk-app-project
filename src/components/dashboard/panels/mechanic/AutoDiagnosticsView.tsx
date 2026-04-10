import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import urls from '@/api/config';

const API_URL = urls["service-requests"];
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

interface ServiceRequest {
  id: number;
  request_number: string;
  title: string;
  description: string;
  vehicle_label: string;
  priority: string;
  status: string;
  category: string;
  source: string;
  creator_name: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  resolved: "Решено",
  closed: "Закрыто",
  needs_info: "Требует информации",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-500",
  in_progress: "bg-yellow-500/15 text-yellow-600",
  resolved: "bg-green-500/15 text-green-500",
  closed: "bg-zinc-500/15 text-zinc-400",
  needs_info: "bg-purple-500/15 text-purple-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  critical: "Критический",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/15 text-zinc-400",
  medium: "bg-blue-500/15 text-blue-500",
  high: "bg-orange-500/15 text-orange-500",
  critical: "bg-red-500/15 text-red-500",
};

const SOURCE_LABELS: Record<string, string> = {
  diagnostic: "Диагностика",
  fema: "FEMA",
  onboard: "Бортовая система",
};

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

interface AutoDiagnosticsViewProps {
  vehicles?: Record<string, unknown>[];
}

export default function AutoDiagnosticsView(_props: AutoDiagnosticsViewProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=requests`, { headers: hdrs() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.requests || [];
      setRequests(list);
    } catch { /* skip */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = useMemo(() => {
    return requests
      .filter((r) => ["diagnostic", "fema", "onboard"].includes(r.source))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [requests]);

  const handleTake = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}?action=requests`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ id, status: "in_progress" }),
      });
      await fetchRequests();
    } catch { /* skip */ }
    setSaving(false);
  };

  const countByStatus = useMemo(() => {
    const c: Record<string, number> = { new: 0, in_progress: 0, resolved: 0 };
    for (const r of filtered) { c[r.status] = (c[r.status] || 0) + 1; }
    return c;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Автоматическая диагностика</h2>
        <p className="text-muted-foreground mt-1">Заявки, созданные автоматическими системами диагностики</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Icon name="Radio" className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Всего заявок</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Icon name="Wrench" className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{countByStatus.new || 0}</p>
            <p className="text-xs text-muted-foreground">Новые</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Icon name="CheckCircle2" className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{countByStatus.resolved || 0}</p>
            <p className="text-xs text-muted-foreground">Решено</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={fetchRequests} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
          <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
        <span className="text-sm text-muted-foreground">
          Источники: диагностика, FEMA, бортовые системы
        </span>
      </div>

      {loading && filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Activity" className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p>Нет заявок от автоматических систем</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="Cpu" className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-foreground">{r.title}</span>
                  <span className="text-xs font-mono text-muted-foreground">{r.request_number}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{r.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || ""}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[r.priority] || ""}`}>
                    {PRIORITY_LABELS[r.priority] || r.priority}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-500">
                    {SOURCE_LABELS[r.source] || r.source}
                  </span>
                  {r.vehicle_label && <span className="text-xs text-muted-foreground">{r.vehicle_label}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{formatDate(r.created_at)}</span>
                </div>
              </div>
              {r.status === "new" && (
                <button
                  onClick={() => handleTake(r.id)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
                >
                  Взять в работу
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}