import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  fetchChats,
  fetchMessages,
  fetchUsers,
  fetchDrivers,
  createChat,
  sendMessage,
  uploadFile,
  markRead,
  pingOnline,
  type Chat,
  type ChatMessage,
  type ChatUser,
  type ChatDriver,
} from "@/api/chatApi";

// ── Types ────────────────────────────────────────────────────────────────────

interface MessagesViewProps {
  currentUserId: number;
  onChatOpen?: (chatId: number) => void;
  initialChatId?: number | null;
}

type RoleFilter =
  | "admin"
  | "technician"
  | "dispatcher"
  | "personnel"
  | "driver";

const ROLE_FILTER_LABELS: Record<RoleFilter, string> = {
  admin: "Администраторы",
  technician: "Техники",
  dispatcher: "Диспетчеры",
  personnel: "Персонал",
  driver: "Водители",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  technician: "Техник",
  dispatcher: "Диспетчер",
  personnel: "Персонал",
  irida_tools: "Irida-Tools",
  driver: "Водитель",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const time = `${hh}:${mm}`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (msgDay.getTime() === today.getTime()) return time;
  if (msgDay.getTime() === yesterday.getTime()) return `Вчера ${time}`;

  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mo} ${time}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

function getInitial(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

function exportChat(chat: Chat, msgs: ChatMessage[]) {
  const lines: string[] = [
    `=== Экспорт переписки: ${chat.title} ===`,
    `Дата экспорта: ${new Date().toLocaleString("ru-RU")}`,
    `Участники: ${chat.members.map((m) => m.name).join(", ")}`,
    `Всего сообщений: ${msgs.length}`,
    "═".repeat(50),
    "",
  ];
  for (const m of msgs) {
    const time = new Date(m.created_at).toLocaleString("ru-RU");
    lines.push(`[${time}] ${m.sender_name} (${ROLE_LABELS[m.sender_role] || m.sender_role}):`);
    if (m.subject) lines.push(`  Тема: ${m.subject}`);
    lines.push(`  ${m.content}`);
    if (m.files && m.files.length > 0) {
      for (const f of m.files) {
        lines.push(`  📎 ${f.file_name} (${formatFileSize(f.file_size)}) — ${f.file_url}`);
      }
    }
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat_${chat.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MessagesView({
  currentUserId,
  onChatOpen,
  initialChatId = null,
}: MessagesViewProps) {
  // ── State: chats & messages ──
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(
    initialChatId
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatSearch, setChatSearch] = useState("");

  // ── State: input ──
  const [inputText, setInputText] = useState("");
  const [inputSubject, setInputSubject] = useState("");
  const [showSubject, setShowSubject] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  // ── State: new chat modal ──
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [driversAll, setDriversAll] = useState<ChatDriver[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(
    new Set()
  );
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<number>>(
    new Set()
  );
  const [activeRoleFilters, setActiveRoleFilters] = useState<Set<RoleFilter>>(
    new Set()
  );
  const [participantSearch, setParticipantSearch] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);

  // ── State: voice recording ──
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  // ── Load chats ──
  const loadChats = useCallback(async () => {
    try {
      const data = await fetchChats();
      setChats(data);
    } catch (e) {
      console.error("Failed to load chats:", e);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // ── Load messages for active chat ──
  const loadMessages = useCallback(
    async (chatId: number) => {
      setLoadingMessages(true);
      try {
        const data = await fetchMessages(chatId);
        setMessages(data);
        scrollToBottom();
        await markRead(chatId);
        // Update unread in chats list
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, unread_count: 0 } : c))
        );
      } catch (e) {
        console.error("Failed to load messages:", e);
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  // ── Initial load ──
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ── Polling: refresh chats every 10s ──
  useEffect(() => {
    const interval = setInterval(() => {
      loadChats();
      if (activeChatId) {
        fetchMessages(activeChatId).then((data) => {
          setMessages((prev) => {
            if (data.length !== prev.length) {
              scrollToBottom();
              return data;
            }
            return prev;
          });
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [loadChats, activeChatId, scrollToBottom]);

  // ── Ping online every 60s ──
  useEffect(() => {
    pingOnline().catch(() => {});
    const interval = setInterval(() => {
      pingOnline().catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Handle initial chat ID ──
  useEffect(() => {
    if (initialChatId && initialChatId !== activeChatId) {
      setActiveChatId(initialChatId);
      loadMessages(initialChatId);
    }
  }, [initialChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Select chat ──
  const handleSelectChat = (chatId: number) => {
    setActiveChatId(chatId);
    loadMessages(chatId);
    onChatOpen?.(chatId);
  };

  // ── Send message ──
  const handleSend = async () => {
    if (!activeChatId || (!inputText.trim() && !pendingFile)) return;
    setSending(true);
    try {
      const result = await sendMessage(
        activeChatId,
        inputText.trim() || (pendingFile ? `[${pendingFile.name}]` : ""),
        showSubject && inputSubject.trim() ? inputSubject.trim() : undefined
      );
      if (pendingFile && result?.message_id) {
        await uploadFile(result.message_id, pendingFile);
      }
      setInputText("");
      setInputSubject("");
      setPendingFile(null);
      setShowSubject(false);
      await loadMessages(activeChatId);
      await loadChats();
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  // ── File selection ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Максимальный размер файла: 5 МБ");
      return;
    }
    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 5 * 1024 * 1024) {
          alert("Голосовое сообщение превышает 5 МБ");
          return;
        }
        const ts = new Date().toLocaleString("ru-RU").replace(/[/:, ]/g, "-");
        const file = new File([blob], `voice_${ts}.webm`, { type: "audio/webm" });
        setPendingFile(file);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      console.error("Microphone access denied:", e);
      alert("Нет доступа к микрофону. Проверьте разрешения браузера.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // ── New chat modal: load users & drivers ──
  const openNewChatModal = async () => {
    setShowNewChat(true);
    setNewChatTitle("");
    setSelectedUserIds(new Set());
    setSelectedDriverIds(new Set());
    setActiveRoleFilters(new Set());
    setParticipantSearch("");
    try {
      const [u, d] = await Promise.all([fetchUsers(), fetchDrivers()]);
      setUsers(u);
      setDriversAll(d);
    } catch (e) {
      console.error("Failed to load users/drivers:", e);
    }
  };

  // ── Create chat ──
  const handleCreateChat = async () => {
    if (!newChatTitle.trim()) return;
    if (selectedUserIds.size === 0 && selectedDriverIds.size === 0) return;
    setCreatingChat(true);
    try {
      const chatId = await createChat(
        newChatTitle.trim(),
        Array.from(selectedUserIds),
        Array.from(selectedDriverIds)
      );
      setShowNewChat(false);
      await loadChats();
      handleSelectChat(chatId);
    } catch (e) {
      console.error("Failed to create chat:", e);
    } finally {
      setCreatingChat(false);
    }
  };

  // ── Toggle role filter ──
  const toggleRoleFilter = (role: RoleFilter) => {
    setActiveRoleFilters((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  // ── Toggle user selection ──
  const toggleUser = (id: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Toggle driver selection ──
  const toggleDriver = (id: number) => {
    setSelectedDriverIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Filtered chats ──
  const filteredChats = useMemo(() => {
    if (!chatSearch.trim()) return chats;
    const q = chatSearch.toLowerCase();
    return chats.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.last_message && c.last_message.toLowerCase().includes(q)) ||
        (c.last_sender && c.last_sender.toLowerCase().includes(q))
    );
  }, [chats, chatSearch]);

  // ── Filtered users by role & search (for new chat modal) ──
  const filteredUsersByRole = useMemo(() => {
    const q = participantSearch.toLowerCase();
    const roleToFilter: Record<string, RoleFilter> = {
      admin: "admin",
      technician: "technician",
      dispatcher: "dispatcher",
      personnel: "personnel",
    };
    return users.filter((u) => {
      const userRole = roleToFilter[u.role];
      if (!userRole) return false;
      if (!activeRoleFilters.has(userRole)) return false;
      if (q && !u.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, activeRoleFilters, participantSearch]);

  // ── Filtered drivers (for new chat modal) ──
  const filteredDriversList = useMemo(() => {
    if (!activeRoleFilters.has("driver")) return [];
    const q = participantSearch.toLowerCase();
    return driversAll.filter((d) => {
      if (
        q &&
        !d.full_name.toLowerCase().includes(q) &&
        !d.tab_number.toLowerCase().includes(q) &&
        !(d.board_number && d.board_number.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [driversAll, activeRoleFilters, participantSearch]);

  // ── Select all in category ──
  const selectAllUsersInRole = (role: RoleFilter) => {
    if (role === "driver") {
      setSelectedDriverIds((prev) => {
        const next = new Set(prev);
        filteredDriversList.forEach((d) => next.add(d.id));
        return next;
      });
    } else {
      const roleMap: Record<string, string> = {
        admin: "admin",
        technician: "technician",
        dispatcher: "dispatcher",
        personnel: "personnel",
      };
      const roleVal = roleMap[role];
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        users
          .filter((u) => u.role === roleVal)
          .forEach((u) => next.add(u.id));
        return next;
      });
    }
  };

  // ── Active chat data ──
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  // ── Keyboard shortcut: Ctrl+Enter to send ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex gap-0 bg-transparent">
      {/* ── LEFT PANEL: Chat List ── */}
      <div className="w-80 shrink-0 flex flex-col bg-card border border-border rounded-l-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Icon name="MessageSquare" className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground flex-1">
            Чаты
          </h3>
          <button
            onClick={openNewChatModal}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Новый чат
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Icon
              name="Search"
              className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Поиск чатов..."
              className="w-full text-xs bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex items-center justify-center py-10">
              <Icon
                name="Loader2"
                className="w-5 h-5 text-muted-foreground animate-spin"
              />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Icon name="MessageSquare" className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Нет чатов</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const hasUnread = chat.unread_count > 0;
              const anyOnline = chat.members.some((m) => m.is_online);

              return (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border transition-all ${
                    isActive
                      ? "bg-primary/10"
                      : hasUnread
                        ? "bg-orange-500/5 hover:bg-orange-500/10"
                        : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar with online indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {getInitial(chat.title)}
                      </div>
                      {anyOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-green-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-semibold truncate ${
                            hasUnread
                              ? "text-foreground"
                              : "text-foreground/80"
                          }`}
                        >
                          {chat.title}
                        </span>
                        <span className="text-[9px] text-muted-foreground shrink-0">
                          {chat.last_message_at
                            ? formatTime(chat.last_message_at)
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p
                          className={`text-[10px] truncate flex-1 ${
                            hasUnread
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {chat.last_sender && (
                            <span className="text-muted-foreground">
                              {chat.last_sender}:{" "}
                            </span>
                          )}
                          {chat.last_message || "Нет сообщений"}
                        </p>
                        {hasUnread && (
                          <span className="bg-primary text-primary-foreground text-[9px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1 shrink-0">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Conversation ── */}
      <div className="flex-1 flex flex-col bg-card border-y border-r border-border rounded-r-2xl overflow-hidden min-w-0">
        {!activeChatId || !activeChat ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon
                name="MessageSquare"
                className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3"
              />
              <p className="text-sm text-muted-foreground">
                Выберите чат из списка
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                или создайте новый
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground flex-1 truncate">
                  {activeChat.title}
                </h3>
                <button
                  onClick={() => exportChat(activeChat, messages)}
                  className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Экспорт переписки"
                >
                  <Icon name="Download" className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {activeChat.members.length} уч.
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {activeChat.members.slice(0, 6).map((member, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        member.is_online
                          ? "bg-green-500"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                    {member.name}
                  </span>
                ))}
                {activeChat.members.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{activeChat.members.length - 6}
                  </span>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Icon
                    name="Loader2"
                    className="w-5 h-5 text-muted-foreground animate-spin"
                  />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Icon
                    name="MessagesSquare"
                    className="w-8 h-8 mb-2 opacity-30"
                  />
                  <p className="text-xs">Нет сообщений</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_user_id === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex gap-2 max-w-[70%] ${
                          isMine ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            isMine
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {getInitial(msg.sender_name)}
                        </div>

                        {/* Bubble */}
                        <div
                          className={`rounded-xl px-3 py-2 min-w-[120px] ${
                            isMine ? "bg-primary/15" : "bg-muted"
                          }`}
                        >
                          {/* Sender name & time */}
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span
                              className={`text-[10px] font-semibold ${
                                isMine ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {msg.sender_name}
                            </span>
                            <span className="text-[9px] text-muted-foreground shrink-0">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>

                          {/* Subject */}
                          {msg.subject && (
                            <p className="text-[10px] font-semibold text-foreground/80 mb-1">
                              Тема: {msg.subject}
                            </p>
                          )}

                          {/* Content */}
                          <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>

                          {/* Files */}
                          {msg.files && msg.files.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {msg.files.map((file) =>
                                isImageType(file.content_type) ? (
                                  <a
                                    key={file.id}
                                    href={file.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={file.file_url}
                                      alt={file.file_name}
                                      className="max-w-full max-h-48 rounded-lg border border-border"
                                    />
                                  </a>
                                ) : file.content_type.startsWith("audio/") ? (
                                  <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border">
                                    <Icon name="Mic" className="w-4 h-4 text-primary shrink-0" />
                                    <audio controls preload="metadata" className="h-8 flex-1 min-w-0" style={{ maxWidth: 240 }}>
                                      <source src={file.file_url} type={file.content_type} />
                                    </audio>
                                    <span className="text-[9px] text-muted-foreground shrink-0">{formatFileSize(file.file_size)}</span>
                                  </div>
                                ) : (
                                  <a
                                    key={file.id}
                                    href={file.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border hover:bg-background transition-colors"
                                  >
                                    <Icon
                                      name="FileText"
                                      className="w-4 h-4 text-primary shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-medium text-foreground truncate">
                                        {file.file_name}
                                      </p>
                                      <p className="text-[9px] text-muted-foreground">
                                        {formatFileSize(file.file_size)}
                                      </p>
                                    </div>
                                  </a>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              {/* Subject toggle */}
              {showSubject && (
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputSubject}
                    onChange={(e) => setInputSubject(e.target.value)}
                    placeholder="Тема сообщения..."
                    className="flex-1 text-xs bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    onClick={() => {
                      setShowSubject(false);
                      setInputSubject("");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="X" className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pending file */}
              {pendingFile && (
                <div className="mb-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <Icon
                    name={pendingFile.type.startsWith("audio/") ? "Mic" : "Paperclip"}
                    className="w-3.5 h-3.5 text-primary shrink-0"
                  />
                  <span className="text-[10px] text-foreground truncate flex-1">
                    {pendingFile.type.startsWith("audio/") ? "Голосовое сообщение" : pendingFile.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatFileSize(pendingFile.size)}
                  </span>
                  <button
                    onClick={() => setPendingFile(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="X" className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Text input row */}
              <div className="flex items-end gap-2">
                {/* Subject button */}
                <button
                  onClick={() => setShowSubject((v) => !v)}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    showSubject
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title="Добавить тему"
                >
                  <Icon name="Hash" className="w-4 h-4" />
                </button>

                {/* File attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Прикрепить файл"
                >
                  <Icon name="Paperclip" className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите сообщение... (Ctrl+Enter для отправки)"
                  rows={1}
                  className="flex-1 text-xs bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[36px] max-h-[100px]"
                  style={{
                    height: "auto",
                    minHeight: "36px",
                  }}
                  onInput={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 100) + "px";
                  }}
                />

                {/* Microphone button */}
                {recording ? (
                  <button
                    onClick={stopRecording}
                    className="p-2 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25 transition-colors shrink-0 animate-pulse"
                    title="Остановить запись"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon name="Square" className="w-3.5 h-3.5 fill-current" />
                      <span className="text-[10px] font-mono font-bold tabular-nums">
                        {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:{(recordingTime % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Записать голосовое"
                  >
                    <Icon name="Mic" className="w-4 h-4" />
                  </button>
                )}

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={
                    sending || (!inputText.trim() && !pendingFile)
                  }
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Отправить"
                >
                  {sending ? (
                    <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon name="Send" className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── NEW CHAT MODAL ── */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-2xl w-[620px] max-h-[85vh] flex flex-col shadow-xl">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Icon name="Plus" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground flex-1">
                Новый чат
              </h3>
              <button
                onClick={() => setShowNewChat(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Chat name */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Название чата
                </label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="Введите название..."
                  className="w-full text-xs bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Role filters */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-2">
                  Категории участников
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(ROLE_FILTER_LABELS) as [
                      RoleFilter,
                      string,
                    ][]
                  ).map(([role, label]) => {
                    const active = activeRoleFilters.has(role);
                    return (
                      <button
                        key={role}
                        onClick={() => toggleRoleFilter(role)}
                        className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          active
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {active && (
                          <Icon
                            name="Check"
                            className="w-3 h-3 inline mr-1"
                          />
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search inside participants */}
              {activeRoleFilters.size > 0 && (
                <div className="relative">
                  <Icon
                    name="Search"
                    className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2"
                  />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Поиск участников..."
                    className="w-full text-xs bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              )}

              {/* Users list per active role */}
              {(["admin", "technician", "dispatcher", "personnel"] as const)
                .filter((role) => activeRoleFilters.has(role))
                .map((role) => {
                  const roleUsers = filteredUsersByRole.filter(
                    (u) => u.role === role
                  );
                  if (roleUsers.length === 0) return null;

                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-foreground">
                          {ROLE_FILTER_LABELS[role]}
                        </span>
                        <button
                          onClick={() => selectAllUsersInRole(role)}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Выбрать всех
                        </button>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {roleUsers.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUserIds.has(user.id)}
                              onChange={() => toggleUser(user.id)}
                              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0"
                            />
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                user.is_online
                                  ? "bg-green-500"
                                  : "bg-muted-foreground/40"
                              }`}
                            />
                            <span className="text-xs text-foreground flex-1 truncate">
                              {user.full_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {ROLE_LABELS[user.role] || user.role}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

              {/* Drivers list */}
              {activeRoleFilters.has("driver") &&
                filteredDriversList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-foreground">
                        Водители
                      </span>
                      <button
                        onClick={() => selectAllUsersInRole("driver")}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Выбрать всех
                      </button>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredDriversList.map((driver) => (
                        <label
                          key={driver.id}
                          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDriverIds.has(driver.id)}
                            onChange={() => toggleDriver(driver.id)}
                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/50 shrink-0"
                          />
                          <span className="text-xs text-foreground truncate flex-1">
                            <span className="text-muted-foreground font-mono text-[10px] mr-1">
                              {driver.tab_number}
                            </span>
                            {driver.full_name}
                          </span>
                          {driver.board_number && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              Б{driver.board_number}
                            </span>
                          )}
                          {driver.route_number && (
                            <span className="text-[10px] text-primary shrink-0">
                              M{driver.route_number}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              {/* Empty state when filters are active but no results */}
              {activeRoleFilters.size > 0 &&
                filteredUsersByRole.length === 0 &&
                filteredDriversList.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">
                      Участники не найдены
                    </p>
                  </div>
                )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Выбрано: {selectedUserIds.size + selectedDriverIds.size} уч.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewChat(false)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateChat}
                  disabled={
                    creatingChat ||
                    !newChatTitle.trim() ||
                    (selectedUserIds.size === 0 &&
                      selectedDriverIds.size === 0)
                  }
                  className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingChat ? (
                    <span className="flex items-center gap-1">
                      <Icon
                        name="Loader2"
                        className="w-3 h-3 animate-spin"
                      />
                      Создание...
                    </span>
                  ) : (
                    "Создать чат"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}