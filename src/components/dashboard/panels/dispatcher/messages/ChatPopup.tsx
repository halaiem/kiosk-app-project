import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { DispatchMessage } from "@/types/dashboard";

// ── Message status icon ──────────────────────────────────────────────────────
export function MsgStatus({ msg, isOnline = true }: { msg: DispatchMessage; isOnline?: boolean }) {
  if (msg.direction === "incoming") return null;
  if (!isOnline) return <Icon name="WifiOff" className="w-3 h-3 text-muted-foreground/50" title="Не отправлено (офлайн)" />;
  if (msg.read) return <Icon name="CheckCheck" className="w-3 h-3 text-blue-400" title="Прочитано" />;
  return <Icon name="Check" className="w-3 h-3 text-muted-foreground/60" title="Доставлено, не прочитано" />;
}

// ── Draggable chat popup ─────────────────────────────────────────────────────
export function ChatPopup({
  thread,
  messages,
  onClose,
  onSend,
  isCritical,
}: {
  thread: { driverId: string; driverName: string; vehicleNumber: string; routeNumber: string };
  messages: DispatchMessage[];
  onClose: () => void;
  onSend: (driverId: string, text: string) => void;
  isCritical: boolean;
}) {
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const conv = [...messages]
    .filter((m) => m.driverId === thread.driverId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conv.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPos({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my });
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [dragging]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(thread.driverId, input.trim());
    setInput("");
  };

  const startRecord = () => {
    setIsRecording(true);
    setRecordTime(0);
    recordTimer.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
  };
  const stopRecord = () => {
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    onSend(thread.driverId, `🎤 Голосовое сообщение (${recordTime}с)`);
    setRecordTime(0);
  };

  const fmtTime = (d: Date) => new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="fixed z-[200] w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
      style={{ left: pos.x, top: pos.y, border: isCritical ? "2px solid rgb(239 68 68 / 0.6)" : "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
    >
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center gap-2 px-4 py-3 border-b border-border select-none cursor-grab active:cursor-grabbing ${isCritical ? "bg-red-500/10" : "bg-muted/30"}`}
      >
        {isCritical && <Icon name="Siren" className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-none">Борт #{thread.vehicleNumber}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{thread.driverName} · М{thread.routeNumber}</p>
        </div>
        <Icon name="GripHorizontal" className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0">
          <Icon name="X" className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 max-h-64">
        {conv.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Нет сообщений</p>}
        {conv.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
              m.type === "urgent" ? "bg-red-500/15 border border-red-500/30 text-foreground"
              : m.direction === "outgoing" ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
            }`}>
              {m.type === "urgent" && (
                <div className="flex items-center gap-1 mb-1">
                  <Icon name="AlertTriangle" className="w-3 h-3 text-red-500" />
                  <span className="text-[9px] font-bold text-red-500 uppercase">Срочно</span>
                </div>
              )}
              <p className="leading-relaxed">{m.text}</p>
              <div className={`flex items-center gap-1 mt-1 ${m.direction === "outgoing" ? "justify-end" : ""}`}>
                <span className={`text-[9px] ${m.direction === "outgoing" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{fmtTime(m.timestamp)}</span>
                <MsgStatus msg={m} />
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-border">
        {isRecording ? (
          <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs text-destructive flex-1">Запись... {recordTime}с</span>
            <button onPointerUp={stopRecord} className="text-[11px] px-2 py-0.5 rounded-lg bg-destructive text-white">Стоп</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ответить..."
              className="flex-1 h-9 px-2.5 rounded-xl bg-muted border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-0"
            />
            <button onPointerDown={startRecord} className="h-9 w-9 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0" title="Голосовое">
              <Icon name="Mic" className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={handleSend} disabled={!input.trim()} className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0">
              <Icon name="Send" className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
