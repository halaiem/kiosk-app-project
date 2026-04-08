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

export default function ChatNotificationToast({ currentUserId, onOpenChat }: ChatNotificationToastProps) {
  const [toasts, setToasts] = useState<UnreadNotification[]>([]);
  const seenIds = useRef<Set<number>>(new Set());

  const poll = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const unread = await fetchUnread();
      const fresh = unread.filter((n) => !seenIds.current.has(n.message_id));
      if (fresh.length > 0) {
        fresh.forEach((n) => seenIds.current.add(n.message_id));
        setToasts((prev) => [...fresh.slice(0, 3), ...prev].slice(0, 5));
        playNotificationSound();
      }
    } catch (e) { void e; }
  }, [currentUserId]);

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
      {toasts.map((t) => (
        <div
          key={t.message_id}
          className="bg-card border border-border rounded-xl shadow-2xl p-4 animate-in slide-in-from-right-5 fade-in duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="MessageSquare" className="w-4 h-4 text-primary" />
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
      ))}
    </div>
  );
}