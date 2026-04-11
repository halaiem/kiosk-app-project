import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { TicketNotification } from "@/hooks/useTicketNotifications";
import urls from "@/api/config";
import type { DashboardTab } from "@/types/dashboard";

const API_URL = urls["service-requests"];
const TOKEN_KEY = "dashboard_token";

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) h["X-Dashboard-Token"] = t;
  return h;
}

function playTicketSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close(), 500);
  } catch { void 0; }
}

const TYPE_META: Record<string, { icon: string; bg: string; color: string; border: string }> = {
  new_request:         { icon: "FilePlus",      bg: "rgba(59,130,246,0.15)",   color: "#3b82f6", border: "rgba(59,130,246,0.3)" },
  status_changed:      { icon: "RefreshCw",     bg: "rgba(99,102,241,0.15)",   color: "#6366f1", border: "rgba(99,102,241,0.3)" },
  new_comment:         { icon: "MessageSquare", bg: "rgba(139,92,246,0.15)",   color: "#8b5cf6", border: "rgba(139,92,246,0.3)" },
  forwarded:           { icon: "Forward",       bg: "rgba(249,115,22,0.15)",   color: "#f97316", border: "rgba(249,115,22,0.3)" },
  forwarded_to_you:    { icon: "Forward",       bg: "rgba(249,115,22,0.15)",   color: "#f97316", border: "rgba(249,115,22,0.3)" },
  approved:            { icon: "CheckCircle2",  bg: "rgba(16,185,129,0.15)",   color: "#10b981", border: "rgba(16,185,129,0.3)" },
  rejected:            { icon: "XCircle",       bg: "rgba(239,68,68,0.15)",    color: "#ef4444", border: "rgba(239,68,68,0.3)" },
  resolved:            { icon: "BadgeCheck",    bg: "rgba(34,197,94,0.15)",    color: "#22c55e", border: "rgba(34,197,94,0.3)" },
  closed:              { icon: "Archive",       bg: "rgba(113,113,122,0.15)",  color: "#71717a", border: "rgba(113,113,122,0.3)" },
  cancelled:           { icon: "Ban",           bg: "rgba(249,115,22,0.15)",   color: "#f97316", border: "rgba(249,115,22,0.3)" },
  needs_clarification: { icon: "HelpCircle",   bg: "rgba(168,85,247,0.15)",   color: "#a855f7", border: "rgba(168,85,247,0.3)" },
};

function getMeta(type: string) {
  return TYPE_META[type] ?? { icon: "Bell", bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" };
}

function formatTime(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

interface TicketToast extends TicketNotification {
  _toastId: number;
}

interface Props {
  onNavigate?: (tab: DashboardTab) => void;
}

let _toastCounter = 0;

export default function TicketNotificationToast({ onNavigate }: Props) {
  const [toasts, setToasts] = useState<TicketToast[]>([]);
  const seenIds = useRef<Set<number>>(new Set());
  const initialised = useRef(false);

  const dismiss = useCallback((toastId: number) => {
    setToasts(prev => prev.filter(t => t._toastId !== toastId));
  }, []);

  const markRead = useCallback(async (notifId: number) => {
    try {
      await fetch(`${API_URL}?action=notifications`, {
        method: "PUT",
        headers: hdrs(),
        body: JSON.stringify({ id: notifId }),
      });
    } catch { void 0; }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?action=notifications&unread_only=true`, { headers: hdrs() });
      if (!res.ok) return;
      const data = await res.json();
      const items: TicketNotification[] = data.notifications || [];

      if (!initialised.current) {
        items.forEach(n => seenIds.current.add(n.id));
        initialised.current = true;
        return;
      }

      const fresh = items.filter(n => !seenIds.current.has(n.id));
      if (fresh.length === 0) return;

      fresh.forEach(n => seenIds.current.add(n.id));
      const newToasts: TicketToast[] = fresh.slice(0, 3).map(n => ({ ...n, _toastId: ++_toastCounter }));
      setToasts(prev => [...newToasts, ...prev].slice(0, 5));
      playTicketSound();
    } catch { void 0; }
  }, []);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 15000);
    return () => clearInterval(iv);
  }, [poll]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(t => setTimeout(() => dismiss(t._toastId), 8000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(t => {
        const meta = getMeta(t.type);
        return (
          <div
            key={t._toastId}
            className="pointer-events-auto bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-5 fade-in duration-300"
            style={{ borderColor: meta.border }}
          >
            {/* Цветная полоска сверху */}
            <div className="h-0.5 w-full" style={{ backgroundColor: meta.color, opacity: 0.6 }} />

            <div className="p-3.5 flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: meta.bg }}
              >
                <Icon name={meta.icon} className="w-4.5 h-4.5" style={{ color: meta.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                    {t.title}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{formatTime(t.created_at)}</span>
                    <button
                      onClick={() => dismiss(t._toastId)}
                      className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Icon name="X" className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {t.request_number && (
                  <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground mb-1">
                    {t.request_number}
                  </span>
                )}

                {t.message && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{t.message}</p>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      markRead(t.id);
                      dismiss(t._toastId);
                      onNavigate?.("service_requests" as DashboardTab);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white transition-colors"
                    style={{ backgroundColor: meta.color }}
                  >
                    <Icon name="ClipboardList" className="w-3 h-3" />
                    Открыть
                  </button>
                  <button
                    onClick={() => { markRead(t.id); dismiss(t._toastId); }}
                    className="px-2 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] hover:text-foreground transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}