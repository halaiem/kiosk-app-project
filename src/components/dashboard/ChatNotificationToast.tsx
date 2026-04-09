import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { fetchUnread, type UnreadNotification } from "@/api/chatApi";

interface ChatNotificationToastProps {
  currentUserId: number;
  onOpenChat: (chatId: number) => void;
}

function formatTime(d: string): string {
  const date = new Date(d);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 500);
  } catch (e) { void e; }
}

let notifPermission: NotificationPermission = "default";

async function requestNotifPermission() {
  if (!("Notification" in window)) return;
  notifPermission = Notification.permission;
  if (notifPermission === "default") {
    notifPermission = await Notification.requestPermission();
  }
}

function showBrowserNotification(
  n: UnreadNotification,
  onOpenChat: (chatId: number) => void
) {
  if (!("Notification" in window) || notifPermission !== "granted") return;
  if (document.hasFocus()) return;

  const body = n.subject
    ? `Тема: ${n.subject}\n${n.content}`
    : n.content;

  const notif = new Notification(n.sender_name, {
    body: body.slice(0, 200),
    icon: "/favicon.ico",
    tag: `chat-${n.message_id}`,
    silent: true,
  });

  notif.onclick = () => {
    window.focus();
    onOpenChat(n.chat_id);
    notif.close();
  };

  setTimeout(() => notif.close(), 10000);
}

const TYPE_STYLES: Record<string, { icon: string; iconBg: string; iconColor: string; borderColor: string }> = {
  notification: { icon: "Bell", iconBg: "rgba(245,158,11,0.15)", iconColor: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" },
  important: { icon: "AlertOctagon", iconBg: "rgba(220,38,38,0.15)", iconColor: "#dc2626", borderColor: "rgba(220,38,38,0.3)" },
  dispatcher: { icon: "Radio", iconBg: "rgba(236,102,12,0.15)", iconColor: "#ec660c", borderColor: "rgba(236,102,12,0.3)" },
  technician: { icon: "Wrench", iconBg: "rgba(139,92,246,0.15)", iconColor: "#8b5cf6", borderColor: "rgba(139,92,246,0.3)" },
  admin: { icon: "ShieldCheck", iconBg: "rgba(99,102,241,0.15)", iconColor: "#6366f1", borderColor: "rgba(99,102,241,0.3)" },
  can_error: { icon: "AlertTriangle", iconBg: "rgba(245,158,11,0.15)", iconColor: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" },
};

function getToastStyle(messageType?: string) {
  if (messageType && TYPE_STYLES[messageType]) return TYPE_STYLES[messageType];
  try {
    const raw = localStorage.getItem("notification_design_v2");
    if (raw && messageType) {
      const cfg = JSON.parse(raw);
      const s = cfg?.dashboard?.messages?.[messageType] || cfg?.dashboard?.notifications?.[messageType];
      if (s) return { icon: s.icon, iconBg: s.iconBgColor, iconColor: s.iconColor, borderColor: s.borderColor };
    }
  } catch { /* ignore */ }
  return { icon: "MessageSquare", iconBg: "rgba(59,130,246,0.15)", iconColor: "#3b82f6", borderColor: "transparent" };
}

export default function ChatNotificationToast({ currentUserId, onOpenChat }: ChatNotificationToastProps) {
  const [toasts, setToasts] = useState<UnreadNotification[]>([]);
  const seenIds = useRef<Set<number>>(new Set());
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (!permissionRequested.current) {
      permissionRequested.current = true;
      requestNotifPermission();
    }
  }, []);

  const poll = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const unread = await fetchUnread();
      const fresh = unread.filter((n) => !seenIds.current.has(n.message_id));
      if (fresh.length > 0) {
        fresh.forEach((n) => seenIds.current.add(n.message_id));
        setToasts((prev) => [...fresh.slice(0, 3), ...prev].slice(0, 5));
        playNotificationSound();
        fresh.forEach((n) => showBrowserNotification(n, onOpenChat));
      }
    } catch (e) { void e; }
  }, [currentUserId, onOpenChat]);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 15000);
    return () => clearInterval(iv);
  }, [poll]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.message_id !== id));
  };

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.message_id), 12000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const ts = getToastStyle((t as UnreadNotification & { message_type?: string }).message_type);
        return (
        <div
          key={t.message_id}
          className="bg-card border rounded-xl shadow-2xl p-4 animate-in slide-in-from-right-5 fade-in duration-300"
          style={{ borderColor: ts.borderColor || undefined }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: ts.iconBg }}>
              <Icon name={ts.icon} className="w-4 h-4" style={{ color: ts.iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {t.sender_name}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTime(t.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-0.5 truncate font-medium">
                {t.title}
              </p>
              {t.subject && (
                <p className="text-[11px] text-primary/80 mb-0.5 truncate">
                  Тема: {t.subject}
                </p>
              )}
              <p className="text-xs text-foreground/80 line-clamp-2">
                {t.content}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    onOpenChat(t.chat_id);
                    dismiss(t.message_id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors"
                >
                  <Icon name="Reply" className="w-3 h-3" />
                  Ответить
                </button>
                <button
                  onClick={() => dismiss(t.message_id)}
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