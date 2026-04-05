import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { DispatchMessage } from "@/types/dashboard";
import { MsgStatus, ChatPopup } from "./ChatPopup";

// ── Mini Messenger block ─────────────────────────────────────────────────────
export function MiniMessenger({
  messages,
  threads,
  totalUnread,
  miniInput,
  setMiniInput,
  miniSelectedThread,
  setMiniSelectedThread,
  onSendMessage,
  onOpenMessages,
  MsgStatusComponent,
}: {
  messages: DispatchMessage[];
  threads: { driverId: string; driverName: string; vehicleNumber: string; routeNumber: string; lastMessage: DispatchMessage; unreadCount: number }[];
  totalUnread: number;
  miniInput: string;
  setMiniInput: (v: string) => void;
  miniSelectedThread: string | null;
  setMiniSelectedThread: (v: string | null) => void;
  onSendMessage: (driverId: string, text: string) => void;
  onOpenMessages?: () => void;
  MsgStatusComponent: typeof MsgStatus;
}) {
  const [popupThread, setPopupThread] = useState<typeof threads[0] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seenUrgentIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newUrgent = messages.find(
      (m) => m.direction === "incoming" && m.type === "urgent" && !m.read && !seenUrgentIds.current.has(m.id)
    );
    if (!newUrgent) return;
    seenUrgentIds.current.add(newUrgent.id);
    const thread = threads.find((t) => t.driverId === newUrgent.driverId);
    if (thread) setPopupThread(thread);
  }, [messages, threads]);

  const selectedConv = [...messages]
    .filter((m) => m.driverId === miniSelectedThread)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-5);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedConv.length]);

  const handleSend = () => {
    if (!miniSelectedThread || !miniInput.trim()) return;
    onSendMessage(miniSelectedThread, miniInput.trim());
    setMiniInput("");
  };

  const startRecord = () => {
    setIsRecording(true);
    setRecordTime(0);
    recordTimer.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
  };
  const stopRecord = () => {
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    if (miniSelectedThread) onSendMessage(miniSelectedThread, `🎤 Голосовое сообщение (${recordTime}с)`);
    setRecordTime(0);
  };

  const fmtTime = (d: Date) => {
    const dt = new Date(d);
    const now = new Date();
    if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return dt.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const isCriticalThread = (driverId: string) =>
    messages.some((m) => m.driverId === driverId && m.type === "urgent" && !m.read);

  type MsgCategory = "red" | "orange" | "green" | "none";
  const getThreadCategory = (thread: typeof threads[0]): MsgCategory => {
    const unreadIncoming = messages.filter(
      (m) => m.driverId === thread.driverId && m.direction === "incoming" && !m.read
    );
    if (unreadIncoming.length === 0) return "green";
    if (unreadIncoming.some((m) => m.type === "urgent")) return "red";
    return "orange";
  };

  const CATEGORY_STYLES: Record<MsgCategory, { bg: string; border: string; dot: string; avatarBg: string; avatarText: string }> = {
    red:    { bg: "bg-red-500/8 hover:bg-red-500/14",    border: "border-l-red-500",    dot: "bg-red-500",    avatarBg: "bg-red-500/20",    avatarText: "text-red-500" },
    orange: { bg: "bg-orange-500/8 hover:bg-orange-500/14", border: "border-l-orange-500", dot: "bg-orange-500", avatarBg: "bg-orange-500/20", avatarText: "text-orange-500" },
    green:  { bg: "bg-green-500/5 hover:bg-green-500/10",  border: "border-l-green-500",  dot: "bg-green-500",  avatarBg: "bg-green-500/15",  avatarText: "text-green-600" },
    none:   { bg: "hover:bg-muted/40",                      border: "",                    dot: "",              avatarBg: "bg-muted",          avatarText: "text-muted-foreground" },
  };

  return (
    <>
      {popupThread && (
        <ChatPopup
          thread={popupThread}
          messages={messages}
          onClose={() => setPopupThread(null)}
          onSend={onSendMessage}
          isCritical={isCriticalThread(popupThread.driverId)}
        />
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Icon name="MessageSquare" className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Сообщения</h3>
          {totalUnread > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
              {totalUnread}
            </span>
          )}
          <button onClick={onOpenMessages} className="ml-auto text-[11px] text-primary hover:underline font-medium">
            Открыть все →
          </button>
        </div>

        <div className="flex min-h-[13rem] max-h-[17rem]">
          {/* LEFT — thread list */}
          <div className="w-72 shrink-0 border-r border-border overflow-y-auto">
            {threads.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Нет чатов</p>
            ) : threads.map((thread) => {
              const last = thread.lastMessage;
              const isSelected = miniSelectedThread === thread.driverId;
              const cat = getThreadCategory(thread);
              const hasUnread = thread.unreadCount > 0;
              const st = hasUnread ? CATEGORY_STYLES[cat] : CATEGORY_STYLES["none"];
              return (
                <div
                  key={thread.driverId}
                  onClick={() => setMiniSelectedThread(thread.driverId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setMiniSelectedThread(thread.driverId)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border transition-all relative group cursor-pointer ${
                    isSelected ? "bg-primary/10" : hasUnread ? `${st.bg} border-l-2 ${st.border}` : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${hasUnread ? `${st.avatarBg} ${st.avatarText}` : "bg-muted text-muted-foreground"}`}>
                        {thread.vehicleNumber.slice(-2)}
                      </div>
                      {cat !== "none" && (
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${st.dot} ${hasUnread ? "animate-pulse" : ""}`} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-foreground truncate">#{thread.vehicleNumber}</span>
                        <span className="text-[9px] text-muted-foreground shrink-0">{fmtTime(last.timestamp)}</span>
                      </div>
                      <p className="text-[10px] text-primary font-medium">М{last.routeNumber} · {thread.driverName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {last.direction === "outgoing" && <MsgStatusComponent msg={last} />}
                        <p className={`text-[10px] truncate flex-1 ${cat === "red" && hasUnread ? "text-red-500 font-medium" : cat === "orange" && hasUnread ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>
                          {last.direction === "outgoing" ? "Вы: " : ""}{last.text}
                        </p>
                        {hasUnread && (
                          <span className={`text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 shrink-0 ${st.dot}`}>
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); setPopupThread(thread); }}
                    className="absolute right-2 top-2 w-6 h-6 rounded-md flex items-center justify-center bg-muted/70 hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    title="Открыть чат"
                  >
                    <Icon name="Maximize2" className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* RIGHT — chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {miniSelectedThread ? (
              <>
                {(() => {
                  const t = threads.find((th) => th.driverId === miniSelectedThread);
                  return t ? (
                    <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-foreground">#{t.vehicleNumber}</span>
                      <span className="text-[11px] text-primary">М{t.routeNumber}</span>
                      <span className="text-[11px] text-muted-foreground">{t.driverName}</span>
                      <button
                        onClick={() => setPopupThread(t)}
                        className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        title="Открыть в popup"
                      >
                        <Icon name="Maximize2" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : null;
                })()}

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
                  {selectedConv.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-2.5 py-1.5 rounded-xl text-[11px] ${
                        m.type === "urgent" ? "bg-red-500/15 border border-red-500/30 text-foreground"
                        : m.direction === "outgoing" ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                      }`}>
                        {m.type === "urgent" && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <Icon name="AlertTriangle" className="w-2.5 h-2.5 text-red-500" />
                            <span className="text-[9px] font-bold text-red-500 uppercase">Срочно</span>
                          </div>
                        )}
                        <p>{m.text}</p>
                        <div className={`flex items-center gap-1 mt-0.5 ${m.direction === "outgoing" ? "justify-end" : ""}`}>
                          <span className={`text-[9px] ${m.direction === "outgoing" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(m.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <MsgStatusComponent msg={m} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>

                <div className="px-3 pb-2.5 pt-1.5 border-t border-border shrink-0">
                  {isRecording ? (
                    <div className="flex items-center gap-2 h-8 px-3 rounded-xl bg-destructive/10 border border-destructive/30">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-xs text-destructive flex-1">Запись... {recordTime}с</span>
                      <button onPointerUp={stopRecord} className="text-[11px] px-2 py-0.5 rounded bg-destructive text-white">Стоп</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={miniInput}
                        onChange={(e) => setMiniInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ответить..."
                        className="flex-1 h-8 px-2.5 rounded-lg bg-muted border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-0"
                      />
                      <button onPointerDown={startRecord} className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0" title="Голосовое">
                        <Icon name="Mic" className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={handleSend} disabled={!miniInput.trim()} className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0">
                        <Icon name="Send" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Icon name="MessageSquare" className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Выберите чат слева</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}