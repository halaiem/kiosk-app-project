import { useState, useMemo, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { DispatchMessage, DriverInfo } from "@/types/dashboard";

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
      {/* Header — drag handle */}
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

      {/* Messages */}
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

      {/* Input */}
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
                <button
                  key={thread.driverId}
                  onClick={() => setMiniSelectedThread(thread.driverId)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border transition-all relative group ${
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
                </button>
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

// ── Full Messages View ────────────────────────────────────────────────────────
export function MessagesView({
  messages,
  drivers,
  onSendMessage,
  onMarkMessageRead,
}: {
  messages: DispatchMessage[];
  drivers: DriverInfo[];
  onSendMessage: (driverId: string, text: string) => void;
  onMarkMessageRead: (id: string) => void;
}) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceMessages, setVoiceMessages] = useState<
    { id: string; driverId: string; duration: number; timestamp: Date }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const threads = useMemo(() => {
    const map = new Map<
      string,
      {
        driverId: string;
        driverName: string;
        vehicleNumber: string;
        routeNumber: string;
        lastMessage: DispatchMessage;
        unreadCount: number;
      }
    >();
    const sorted = [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    for (const msg of sorted) {
      const existing = map.get(msg.driverId);
      const unread =
        (existing?.unreadCount ?? 0) +
        (msg.direction === "incoming" && !msg.read ? 1 : 0);
      map.set(msg.driverId, {
        driverId: msg.driverId,
        driverName: msg.driverName,
        vehicleNumber: msg.vehicleNumber,
        routeNumber: msg.routeNumber,
        lastMessage: msg,
        unreadCount: unread,
      });
    }
    return [...map.values()].sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime()
    );
  }, [messages]);

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter(
      (t) =>
        t.driverName.toLowerCase().includes(q) ||
        t.vehicleNumber.toLowerCase().includes(q) ||
        t.routeNumber.toLowerCase().includes(q)
    );
  }, [threads, search]);

  const conversation = useMemo(() => {
    if (!selectedDriverId) return [];
    return [...messages]
      .filter((m) => m.driverId === selectedDriverId)
      .sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [messages, selectedDriverId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length, voiceMessages.length]);

  useEffect(() => {
    if (selectedDriverId) {
      conversation
        .filter((m) => m.direction === "incoming" && !m.read)
        .forEach((m) => onMarkMessageRead(m.id));
    }
  }, [selectedDriverId, conversation, onMarkMessageRead]);

  const handleSend = () => {
    if (!selectedDriverId || !newMessage.trim()) return;
    onSendMessage(selectedDriverId, newMessage.trim());
    setNewMessage("");
    setReplyTo(null);
  };

  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      if (selectedDriverId) {
        setVoiceMessages((prev) => [
          ...prev,
          {
            id: `vm-${Date.now()}`,
            driverId: selectedDriverId,
            duration: recordingSeconds,
            timestamp: new Date(),
          },
        ]);
      }
      setRecordingSeconds(0);
    } else {
      setIsRecording(true);
    }
  };

  const selectedThread = threads.find((t) => t.driverId === selectedDriverId);
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  const formatMsgTime = (date: Date) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const driverStatusOnline =
    selectedDriver?.status === "on_shift" || selectedDriver?.status === "break";

  const convVoiceMessages = voiceMessages.filter(
    (vm) => vm.driverId === selectedDriverId
  );

  type ChatItem =
    | { kind: "msg"; msg: DispatchMessage }
    | { kind: "voice"; vm: { id: string; driverId: string; duration: number; timestamp: Date } };

  const chatItems: ChatItem[] = [
    ...conversation.map((msg) => ({ kind: "msg" as const, msg })),
    ...convVoiceMessages.map((vm) => ({ kind: "voice" as const, vm })),
  ].sort((a, b) => {
    const ta =
      a.kind === "msg"
        ? new Date(a.msg.timestamp).getTime()
        : new Date(a.vm.timestamp).getTime();
    const tb =
      b.kind === "msg"
        ? new Date(b.msg.timestamp).getTime()
        : new Date(b.vm.timestamp).getTime();
    return ta - tb;
  });

  const QUICK_REPLIES = [
    "Принято, выполняю",
    "Задержка на маршруте",
    "Подтвердите остановку",
    "Выезжайте на маршрут",
    "Возвращайтесь в депо",
    "Свяжитесь с диспетчером",
  ];

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4 bg-transparent">
      {/* LEFT: Chat area */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl overflow-hidden min-w-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <h3 className="text-sm font-semibold text-foreground flex-1">
            {selectedDriverId && selectedThread ? (
              <span className="flex items-center gap-2">
                <span className="font-bold">Борт #{selectedThread.vehicleNumber}</span>
                <span className="text-primary font-medium text-xs">М{selectedThread.routeNumber}</span>
                <span className="text-muted-foreground font-light text-xs">{selectedThread.driverName}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${driverStatusOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              </span>
            ) : (
              "Мессенджер"
            )}
          </h3>
          <button
            onClick={() => setShowNewChat(true)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            + Новый чат
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!selectedDriverId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Icon name="MessageSquare" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Выберите борт из списка справа</p>
              </div>
            </div>
          ) : (
            chatItems.map((item) => {
              if (item.kind === "voice") {
                return (
                  <div key={item.vm.id} className="flex justify-end">
                    <div className="bg-primary/15 rounded-xl px-3 py-2 flex items-center gap-3 max-w-[220px]">
                      <Icon name="Mic" className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Голосовое</p>
                        <p className="text-[10px] text-muted-foreground">{formatDuration(item.vm.duration)}</p>
                      </div>
                    </div>
                  </div>
                );
              }
              const msg = item.msg;
              return (
                <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"} group`}>
                  <div className="relative">
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${msg.direction === "outgoing" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                      <p>{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${msg.direction === "outgoing" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatMsgTime(msg.timestamp)}</span>
                        {msg.direction === "outgoing" && (
                          <Icon name={msg.type === "urgent" ? "CheckCheck" : "Check"} className={`w-3 h-3 ${msg.type === "urgent" ? "text-green-400" : "text-primary-foreground/50"}`} />
                        )}
                      </div>
                    </div>
                    {msg.direction === "incoming" && (
                      <button onClick={() => setReplyTo(msg.text)} className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80">
                        <Icon name="Quote" className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {selectedDriverId && (
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-1.5 shrink-0">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                onClick={() => { onSendMessage(selectedDriverId, qr); }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors border border-border"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t border-border shrink-0">
          {replyTo && (
            <div className="bg-muted rounded-lg px-3 py-1.5 mb-2 text-xs flex items-center gap-2">
              <Icon name="Quote" className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 text-muted-foreground">{replyTo}</span>
              <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="X" className="w-3 h-3" />
              </button>
            </div>
          )}
          {isRecording && (
            <div className="flex items-center gap-2 text-xs text-red-500 animate-pulse mb-2">
              <span>●</span><span>Запись... {recordingSeconds}с</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isRecording ? "Идёт запись..." : selectedDriverId ? "Написать сообщение..." : "Выберите борт..."}
              disabled={isRecording || !selectedDriverId}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleVoice}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isRecording ? "bg-red-500/20 text-red-500" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
            >
              <Icon name={isRecording ? "MicOff" : "Mic"} className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isRecording || !selectedDriverId}
              className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Icon name="Send" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Vehicle list */}
      <div className="w-64 shrink-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <Icon name="Bus" className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground flex-1">Транспорт</h3>
          <span className="text-xs text-muted-foreground">{drivers.length} ТС</span>
        </div>
        <div className="px-3 py-2 border-b border-border shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Борт / маршрут / ФИО..."
            className="w-full h-8 px-3 rounded-lg bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide border-b border-border">
              Активные чаты
            </div>
          )}
          {filteredThreads.map((thread) => (
            <button
              key={thread.driverId}
              onClick={() => setSelectedDriverId(thread.driverId)}
              className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${selectedDriverId === thread.driverId ? "bg-primary/10" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${selectedDriverId === thread.driverId ? "bg-primary text-primary-foreground" : thread.unreadCount > 0 ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground"}`}>
                  {thread.vehicleNumber.slice(-3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">#{thread.vehicleNumber}</span>
                    {thread.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold min-w-[15px] h-[15px] rounded-full flex items-center justify-center px-0.5 shrink-0">{thread.unreadCount}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-primary font-semibold">М{thread.routeNumber}</p>
                  <p className="text-[10px] text-muted-foreground font-light truncate">{thread.driverName}</p>
                </div>
              </div>
            </button>
          ))}

          {drivers.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide border-b border-border mt-1">
              Все водители
            </div>
          )}
          {drivers
            .filter((d) => !filteredThreads.find((t) => t.driverId === d.id))
            .map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDriverId(d.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${selectedDriverId === d.id ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    d.status === "on_shift" ? "bg-green-500/15 text-green-600"
                    : d.status === "break" ? "bg-yellow-500/15 text-yellow-600"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {d.vehicleNumber.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-foreground">#{d.vehicleNumber}</span>
                    <p className="text-[11px] text-primary font-semibold">М{d.routeNumber}</p>
                    <p className="text-[10px] text-muted-foreground font-light truncate">{d.name}</p>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    d.status === "on_shift" ? "bg-green-500/15 text-green-600"
                    : d.status === "break" ? "bg-yellow-500/15 text-yellow-600"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {d.status === "on_shift" ? "Смена" : d.status === "break" ? "Пер." : d.status === "off_shift" ? "Вых." : "Б/л"}
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-5 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Новый чат</h3>
              <button onClick={() => setShowNewChat(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {drivers.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDriverId(d.id);
                    setShowNewChat(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground text-xs font-bold shrink-0">
                    {d.vehicleNumber.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">#{d.vehicleNumber}</p>
                    <p className="text-[11px] text-primary font-semibold">М{d.routeNumber}</p>
                    <p className="text-[10px] text-muted-foreground font-light truncate">{d.name}</p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      d.status === "on_shift"
                        ? "bg-green-500/15 text-green-600"
                        : d.status === "break"
                        ? "bg-yellow-500/15 text-yellow-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d.status === "on_shift" ? "На смене" : d.status === "break" ? "Перерыв" : d.status === "off_shift" ? "Выходной" : "Больн."}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
