import { useState, useEffect, useCallback } from "react";
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

const ROLES = ["dispatcher", "technician", "mechanic", "admin"] as const;

const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  admin: "Администратор",
};

interface RoutingRule {
  from_role: string;
  to_role: string;
  is_enabled: boolean;
}

export default function RequestRoutingSettings() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=routing`, { headers: hdrs() });
      const data = await res.json();
      setRules(data.routing || []);
    } catch {
      setError("Ошибка загрузки правил маршрутизации");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const getRule = (from: string, to: string): boolean => {
    const rule = rules.find((r) => r.from_role === from && r.to_role === to);
    return rule ? rule.is_enabled : false;
  };

  const handleToggle = async (from: string, to: string) => {
    const current = getRule(from, to);
    const newValue = !current;
    const key = `${from}-${to}`;
    setSaving(key);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}?action=routing`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ from_role: from, to_role: to, is_enabled: newValue }),
      });
      if (!res.ok) throw new Error();
      setRules((prev) => {
        const idx = prev.findIndex((r) => r.from_role === from && r.to_role === to);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], is_enabled: newValue };
          return updated;
        }
        return [...prev, { from_role: from, to_role: to, is_enabled: newValue }];
      });
      setSuccess("Сохранено");
      setTimeout(() => setSuccess(""), 2000);
    } catch {
      setError("Ошибка сохранения");
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Маршрутизация заявок</h3>
          <p className="text-sm text-muted-foreground">Настройка кто может отправлять заявки кому</p>
        </div>
        <div className="flex items-center gap-2">
          {success && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <Icon name="Check" className="w-3 h-3" />
              {success}
            </span>
          )}
          {error && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <Icon name="AlertCircle" className="w-3 h-3" />
              {error}
            </span>
          )}
          <button onClick={fetchRules} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
            <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Отправитель \ Получатель</th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center px-4 py-3 font-medium text-muted-foreground">{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((fromRole) => (
                <tr key={fromRole} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{ROLE_LABELS[fromRole]}</td>
                  {ROLES.map((toRole) => {
                    const isDiagonal = fromRole === toRole;
                    const isEnabled = getRule(fromRole, toRole);
                    const key = `${fromRole}-${toRole}`;
                    const isSaving = saving === key;
                    return (
                      <td key={toRole} className="px-4 py-3 text-center">
                        {isDiagonal ? (
                          <span className="inline-flex w-10 h-6 rounded-full bg-muted/50 items-center justify-center">
                            <Icon name="Minus" className="w-3 h-3 text-muted-foreground/50" />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggle(fromRole, toRole)}
                            disabled={isSaving}
                            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                              isEnabled ? "bg-green-500" : "bg-muted"
                            } ${isSaving ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnabled ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Icon name="Info" className="w-3 h-3" />
        Включенный переключатель означает, что роль-отправитель может создавать заявки для роли-получателя
      </div>
    </div>
  );
}