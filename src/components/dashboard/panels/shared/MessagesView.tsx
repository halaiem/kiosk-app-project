import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import useVisibilityPolling from "@/hooks/useVisibilityPolling";
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
  fetchReactions,
  toggleReaction,
  fetchReaders,
  togglePin,
  fetchPinned,
  addMembers,
  removeMember,
  fetchDashboardTemplates,
  type Chat,
  type ChatMessage,
  type ChatUser,
  type ChatDriver,
  type ReactionMap,
  type MessageStatus,
  type ReaderEntry,
  type PinnedMessage,
  type MessageType,
} from "@/api/chatApi";
import CategoryPicker from "./CategoryPicker";
import VoicePlayer from "./VoicePlayer";

// ── Types ────────────────────────────────────────────────────────────────────

interface MessagesViewProps {
  currentUserId: number;
  currentUserRole?: string;
  onChatOpen?: (chatId: number) => void;
  initialChatId?: number | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  technician: "Технолог",
  dispatcher: "Диспетчер",
  mechanic: "Механик",
  irida_tools: "Irida-Tools",
  driver: "Водитель",
};

const REACTION_EMOJIS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🔥', '👏'];

function MessageTicks({ status }: { status: MessageStatus }) {
  if (status === 'failed') {
    return (
      <span title="Не отправлено" className="inline-flex items-center ml-1">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-red-500">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M4.5 4.5L8.5 8.5M8.5 4.5L4.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }
  if (status === 'sent') {
    return (
      <span title="Отправлено" className="inline-flex items-center ml-1">
        <svg width="12" height="9" viewBox="0 0 12 9" fill="none" className="text-muted-foreground/60">
          <path d="M1 4.5L4 7.5L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span title="Доставлено" className="inline-flex items-center ml-1">
        <svg width="16" height="9" viewBox="0 0 16 9" fill="none" className="text-muted-foreground/60">
          <path d="M1 4.5L4 7.5L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 4.5L8 7.5L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  return (
    <span title="Прочитано" className="inline-flex items-center ml-1">
      <svg width="16" height="9" viewBox="0 0 16 9" fill="none" className="text-primary">
        <path d="M1 4.5L4 7.5L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 4.5L8 7.5L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

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
  currentUserRole = "admin",
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
  const [sendAsType, setSendAsType] = useState<MessageType>("message");
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // ── State: new chat modal ──
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [newChatType, setNewChatType] = useState<MessageType>("message");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [driversAll, setDriversAll] = useState<ChatDriver[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(
    new Set()
  );
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<number>>(
    new Set()
  );
  const [creatingChat, setCreatingChat] = useState(false);
  const [visibleRoles, setVisibleRoles] = useState<Set<string>>(
    new Set(["admin", "dispatcher", "technician", "mechanic", "driver"])
  );
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [addMemberUserIds, setAddMemberUserIds] = useState<Set<number>>(new Set());
  const [addMemberDriverIds, setAddMemberDriverIds] = useState<Set<number>>(new Set());

  // ── State: optimistic sending ──
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [failedMsgText, setFailedMsgText] = useState<string | null>(null);

  // ── State: pin ──
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedLoading, setPinnedLoading] = useState(false);

  // ── State: readers popup ──
  const [readersPopup, setReadersPopup] = useState<{ msgId: number; read: ReaderEntry[]; unread: ReaderEntry[] } | null>(null);
  const [readersLoading, setReadersLoading] = useState(false);

  // ── State: message search ──
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // ── State: reactions ──
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<number | null>(null);

  // ── State: templates popover ──
  const [showTemplates, setShowTemplates] = useState(false);
  const [templatesList, setTemplatesList] = useState<Array<{ id: number; title: string; content: string; icon: string; category: string }>>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── State: remove member confirm ──
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ userId?: number; driverId?: number; name: string } | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  // ── State: reply (quote) ──
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // ── State: forward message ──
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwarding, setForwarding] = useState(false);

  // ── Close emoji picker on outside click ──
  useEffect(() => {
    if (!emojiPickerMsgId) return;
    const handler = () => setEmojiPickerMsgId(null);
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [emojiPickerMsgId]);

  // ── State: voice recording ──
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeMode, setTranscribeMode] = useState(false);
  const [waveLevels, setWaveLevels] = useState<number[]>(Array(28).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveRafRef = useRef<number | null>(null);
  const waveStreamRef = useRef<MediaStream | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

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
        const [data, reacts] = await Promise.all([
          fetchMessages(chatId),
          fetchReactions(chatId),
        ]);
        setMessages(data);
        setReactions(reacts);
        scrollToBottom();
        await markRead(chatId);
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

  // ── Handle reaction click ──
  const handleReaction = async (msgId: number, emoji: string) => {
    setEmojiPickerMsgId(null);
    try {
      await toggleReaction(msgId, emoji);
      if (activeChatId) {
        const reacts = await fetchReactions(activeChatId);
        setReactions(reacts);
      }
    } catch (e) {
      console.error("Reaction failed:", e);
    }
  };

  // ── Handle readers popup ──
  const handleShowReaders = async (msgId: number) => {
    if (!activeChatId) return;
    setReadersLoading(true);
    setReadersPopup({ msgId, read: [], unread: [] });
    try {
      const data = await fetchReaders(msgId, activeChatId);
      setReadersPopup({ msgId, read: data.read, unread: data.unread });
    } catch (e) {
      console.error("Readers fetch failed:", e);
    } finally {
      setReadersLoading(false);
    }
  };

  // ── Search in messages ──
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); setSearchIndex(0); return; }
    const lower = q.toLowerCase();
    const ids = messages
      .filter((m) => m.content.toLowerCase().includes(lower))
      .map((m) => m.id);
    setSearchResults(ids);
    setSearchIndex(0);
    if (ids.length > 0) {
      setTimeout(() => {
        messageRefs.current.get(ids[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [messages]);

  const navigateSearch = (dir: 1 | -1) => {
    if (searchResults.length === 0) return;
    const next = (searchIndex + dir + searchResults.length) % searchResults.length;
    setSearchIndex(next);
    messageRefs.current.get(searchResults[next])?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ── Reset search on chat change ──
  const handleSelectChatWithSearch = (chatId: number) => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchIndex(0);
    handleSelectChat(chatId);
  };

  // ── Initial load ──
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ── Polling with visibility awareness ──
  useVisibilityPolling(loadChats, 60000);

  const pollMessages = useCallback(() => {
    if (!activeChatId) return;
    fetchMessages(activeChatId).then((data) => {
      setMessages((prev) => {
        if (data.length !== prev.length) {
          scrollToBottom();
          return data;
        }
        return prev;
      });
    }).catch(() => {});
  }, [activeChatId, scrollToBottom]);
  useVisibilityPolling(pollMessages, 30000, !!activeChatId);

  const doPing = useCallback(() => { pingOnline().catch(() => {}); }, []);
  useVisibilityPolling(doPing, 180000);

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
    setReplyTo(null);
    const chat = chats.find((c) => c.id === chatId);
    if (chat?.default_type) setSendAsType(chat.default_type);
  };

  // ── Send message ──
  const handleSend = async () => {
    if (!activeChatId || (!inputText.trim() && !pendingFile)) return;
    setSending(true);
    setIsSendingMsg(true);
    setFailedMsgText(null);
    const textSnapshot = inputText.trim() || (pendingFile ? `[${pendingFile.name}]` : "");
    try {
      const bodyText = replyTo
        ? `> ${replyTo.sender_name}: ${replyTo.content.slice(0, 120)}${replyTo.content.length > 120 ? "…" : ""}\n\n${textSnapshot}`
        : textSnapshot;

      const result = await sendMessage(
        activeChatId,
        bodyText,
        showSubject && inputSubject.trim() ? inputSubject.trim() : undefined,
        sendAsType
      );
      if (pendingFile && result?.message_id) {
        await uploadFile(result.message_id, pendingFile);
      }
      setInputText("");
      setInputSubject("");
      setPendingFile(null);
      setShowSubject(false);
      setReplyTo(null);
      await loadMessages(activeChatId);
      await loadChats();
    } catch (e) {
      console.error("Failed to send message:", e);
      setFailedMsgText(textSnapshot);
    } finally {
      setSending(false);
      setIsSendingMsg(false);
    }
  };

  // ── Pin handlers ──
  const handleTogglePin = async (msgId: number) => {
    if (!activeChatId) return;
    const res = await togglePin(msgId, activeChatId);
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, is_pinned: res.pinned, pinned_at: res.pinned ? new Date().toISOString() : null } : m)
    );
    if (showPinned) {
      const pinRes = await fetchPinned(activeChatId);
      setPinnedMessages(pinRes.pinned);
    }
  };

  const handleOpenPinned = async () => {
    if (!activeChatId) return;
    setShowPinned(true);
    setPinnedLoading(true);
    try {
      const res = await fetchPinned(activeChatId);
      setPinnedMessages(res.pinned);
    } finally {
      setPinnedLoading(false);
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
  const pickAudioMime = (): { mime: string; ext: string } => {
    const candidates = [
      { mime: "audio/webm;codecs=opus", ext: "webm" },
      { mime: "audio/ogg;codecs=opus", ext: "ogg" },
      { mime: "audio/webm", ext: "webm" },
      { mime: "audio/mp4", ext: "m4a" },
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
    }
    return { mime: "", ext: "webm" };
  };

  const startWaveAnalyser = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      waveStreamRef.current = stream;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const BARS = 28;
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        const chunk = Math.floor(buf.length / BARS);
        const levels: number[] = [];
        for (let i = 0; i < BARS; i++) {
          let sum = 0;
          for (let j = 0; j < chunk; j++) {
            const v = (buf[i * chunk + j] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / chunk);
          levels.push(Math.min(1, rms * 2.8));
        }
        setWaveLevels(levels);
        waveRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("Wave analyser failed:", e);
    }
  };

  const stopWaveAnalyser = () => {
    if (waveRafRef.current !== null) {
      cancelAnimationFrame(waveRafRef.current);
      waveRafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    waveStreamRef.current = null;
    setWaveLevels(Array(28).fill(0));
  };

  const startRecording = async (forTranscription = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      audioChunksRef.current = [];
      setTranscribeMode(forTranscription);
      startWaveAnalyser(stream);
      const { mime, ext } = pickAudioMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 }) : new MediaRecorder(stream);
      const outMime = mime || mr.mimeType || "audio/webm";
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopWaveAnalyser();
        const blob = new Blob(audioChunksRef.current, { type: outMime });
        if (blob.size > 5 * 1024 * 1024) {
          alert("Голосовое сообщение превышает 5 МБ");
          return;
        }
        if (forTranscription) {
          transcribeAudio(blob);
        } else {
          const ts = new Date().toLocaleString("ru-RU").replace(/[/:, ]/g, "-");
          const fileExt = outMime.includes("ogg") ? "ogg" : outMime.includes("mp4") ? "m4a" : ext;
          const cleanMime = outMime.split(";")[0];
          const file = new File([blob], `voice_${ts}.${fileExt}`, { type: cleanMime });
          setPendingFile(file);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      console.error("Microphone access denied:", e);
      stopWaveAnalyser();
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

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        const i = r.indexOf(",");
        resolve(i >= 0 ? r.slice(i + 1) : r);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const transcribeAudio = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const b64 = await blobToBase64(blob);
      const { default: urls } = await import("@/api/config");
      const transcribeUrl = urls["transcribe"];
      const res = await fetch(transcribeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: b64, format: "webm", transcribe: true }),
      });
      const data = await res.json();
      if (data.text) {
        setInputText((prev) => prev ? prev + " " + data.text : data.text);
        textareaRef.current?.focus();
      } else {
        alert(data.error ? `Не удалось распознать: ${data.error}` : "Не удалось распознать речь. Попробуйте ещё раз.");
      }
    } catch (e) {
      console.error("Transcription failed:", e);
      alert("Ошибка транскрибации. Попробуйте ещё раз.");
    } finally {
      setTranscribing(false);
      setTranscribeMode(false);
    }
  };

  const [voiceTranscripts, setVoiceTranscripts] = useState<Record<number, string>>({});
  const [transcribingFile, setTranscribingFile] = useState<number | null>(null);

  const transcribeVoiceFile = async (fileId: number, fileUrl: string, contentType: string) => {
    if (voiceTranscripts[fileId]) {
      setVoiceTranscripts((p) => { const c = { ...p }; delete c[fileId]; return c; });
      return;
    }
    setTranscribingFile(fileId);
    try {
      const fmt = contentType.includes("webm") ? "webm" : contentType.includes("ogg") ? "ogg" : contentType.includes("wav") ? "wav" : "mp3";
      const { default: urls } = await import("@/api/config");
      const transcribeUrl = urls["transcribe"];
      const res = await fetch(transcribeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_url: fileUrl, format: fmt, transcribe: true }),
      });
      const data = await res.json();
      if (data.text) {
        setVoiceTranscripts((p) => ({ ...p, [fileId]: data.text }));
      } else {
        alert("Не удалось распознать речь.");
      }
    } catch (e) {
      console.error("Voice transcribe failed", e);
      alert("Ошибка транскрибации.");
    } finally {
      setTranscribingFile(null);
    }
  };

  const handleMicMouseDown = () => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      startRecording(true);
    }, 1500);
  };

  const handleMicMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!longPressTriggeredRef.current) {
      startRecording(false);
    }
  };

  // ── Forward message ──
  const handleForward = async (targetChatId: number) => {
    if (!forwardMsg) return;
    setForwarding(true);
    try {
      const fwdText = `↪ Переслано от ${forwardMsg.sender_name}:\n${forwardMsg.content}`;
      const subject = forwardMsg.subject ? `Пересл.: ${forwardMsg.subject}` : undefined;
      await sendMessage(targetChatId, fwdText, subject);
      setForwardMsg(null);
      setForwardSearch("");
      if (targetChatId === activeChatId) await loadMessages(targetChatId);
      await loadChats();
    } catch (e) {
      console.error("Forward failed:", e);
    } finally {
      setForwarding(false);
    }
  };

  // ── New chat modal: load users & drivers ──
  const openNewChatModal = async () => {
    setShowNewChat(true);
    setNewChatTitle("");
    setNewChatType("message");
    setSelectedUserIds(new Set());
    setSelectedDriverIds(new Set());
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
        Array.from(selectedDriverIds),
        newChatType,
        Array.from(visibleRoles)
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

  // ── Toggle visible role ──
  const toggleVisibleRole = (role: string) => {
    setVisibleRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  // ── Templates: load ──
  const openTemplates = async () => {
    setShowTemplates((v) => !v);
    if (templatesList.length === 0 && !templatesLoading) {
      setTemplatesLoading(true);
      try {
        const list = await fetchDashboardTemplates(currentUserRole, 'dashboard');
        setTemplatesList(list);
      } catch (e) {
        console.error("Templates load failed:", e);
      } finally {
        setTemplatesLoading(false);
      }
    }
  };

  const insertTemplate = (content: string) => {
    setInputText((prev) => (prev ? prev + " " + content : content));
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  // ── Remove member ──
  const handleRemoveMember = async () => {
    if (!activeChatId || !removeMemberTarget) return;
    setRemovingMember(true);
    try {
      await removeMember(activeChatId, {
        userId: removeMemberTarget.userId,
        driverId: removeMemberTarget.driverId,
      });
      setRemoveMemberTarget(null);
      await loadChats();
      if (activeChatId) await loadMessages(activeChatId);
    } catch (e) {
      console.error("Remove member failed:", e);
    } finally {
      setRemovingMember(false);
    }
  };

  // ── Open messenger in separate window ──
  const openMessengerWindow = () => {
    window.open('/messenger-window', 'messenger', 'width=1200,height=800,resizable=yes');
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

  // ── Select all in category ──
  const selectAllUsersInRole = (role: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      users.filter((u) => u.role === role).forEach((u) => next.add(u.id));
      return next;
    });
  };
  const selectAllDrivers = () => {
    setSelectedDriverIds((prev) => {
      const next = new Set(prev);
      driversAll.forEach((d) => next.add(d.id));
      return next;
    });
  };
  const selectDriversByIds = (ids: number[]) => {
    setSelectedDriverIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const deselectDriversByIds = (ids: number[]) => {
    setSelectedDriverIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  // ── Add members to existing chat ──
  const toggleAddMemberUser = (id: number) => {
    setAddMemberUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAddMemberDriver = (id: number) => {
    setAddMemberDriverIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllAddUsers = (role: string) => {
    setAddMemberUserIds((prev) => {
      const next = new Set(prev);
      users.filter((u) => u.role === role).forEach((u) => next.add(u.id));
      return next;
    });
  };
  const selectAllAddDrivers = () => {
    setAddMemberDriverIds((prev) => {
      const next = new Set(prev);
      driversAll.forEach((d) => next.add(d.id));
      return next;
    });
  };
  const selectAddDriversByIds = (ids: number[]) => {
    setAddMemberDriverIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const deselectAddDriversByIds = (ids: number[]) => {
    setAddMemberDriverIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleAddMembers = async () => {
    if (!activeChatId) return;
    if (addMemberUserIds.size === 0 && addMemberDriverIds.size === 0) return;
    setAddingMembers(true);
    try {
      await addMembers(activeChatId, Array.from(addMemberUserIds), Array.from(addMemberDriverIds));
      setShowAddMembers(false);
      setAddMemberUserIds(new Set());
      setAddMemberDriverIds(new Set());
      await loadChats();
    } catch (e) {
      console.error("Failed to add members:", e);
    } finally {
      setAddingMembers(false);
    }
  };

  const openAddMembers = async () => {
    setShowAddMembers(true);
    setAddMemberUserIds(new Set());
    setAddMemberDriverIds(new Set());
    if (users.length === 0 || driversAll.length === 0) {
      try {
        const [u, d] = await Promise.all([fetchUsers(), fetchDrivers()]);
        setUsers(u);
        setDriversAll(d);
      } catch (e) {
        console.error("Failed to load users/drivers:", e);
      }
    }
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
            onClick={openMessengerWindow}
            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Открыть в отдельном окне"
          >
            <Icon name="ExternalLink" className="w-3.5 h-3.5" />
          </button>
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
                  onClick={() => handleSelectChatWithSearch(chat.id)}
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
                        <span className="flex items-center gap-1 truncate">
                          {chat.default_type === "notification" && (
                            <Icon name="Bell" className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                          <span
                            className={`text-xs font-semibold truncate ${
                              hasUnread
                                ? "text-foreground"
                                : "text-foreground/80"
                            }`}
                          >
                            {chat.title}
                          </span>
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
                  onClick={handleOpenPinned}
                  className={`p-1.5 rounded-lg transition-colors ${showPinned ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground hover:text-amber-500"}`}
                  title="Закреплённые сообщения"
                >
                  <Icon name="Pin" className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setShowSearch((v) => !v);
                    setSearchQuery("");
                    setSearchResults([]);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${showSearch ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  title="Поиск по сообщениям"
                >
                  <Icon name="Search" className="w-3.5 h-3.5" />
                </button>
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
                {activeChat.members.slice(0, 6).map((member, idx) => {
                  const canRemove = currentUserRole === 'admin' && !(member.user_id === currentUserId);
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          member.is_online
                            ? "bg-green-500"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      {member.name}
                      {canRemove && (
                        <button
                          onClick={() =>
                            setRemoveMemberTarget({
                              userId: member.user_id ?? undefined,
                              driverId: member.driver_id ?? undefined,
                              name: member.name,
                            })
                          }
                          className="ml-0.5 hover:text-red-500 transition-colors"
                          title="Удалить из чата"
                        >
                          <Icon name="X" className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </span>
                  );
                })}
                {activeChat.members.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{activeChat.members.length - 6}
                  </span>
                )}
              </div>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2 shrink-0">
                <Icon name="Search" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Поиск по сообщениям..."
                  className="flex-1 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {searchResults.length > 0 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {searchIndex + 1}/{searchResults.length}
                  </span>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">Не найдено</span>
                )}
                <button onClick={() => navigateSearch(-1)} disabled={searchResults.length === 0}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <Icon name="ChevronUp" className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => navigateSearch(1)} disabled={searchResults.length === 0}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <Icon name="ChevronDown" className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name="X" className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
                  const isCurrentMatch = searchResults[searchIndex] === msg.id;

                  return (
                    <div
                      key={msg.id}
                      ref={(el) => { if (el) messageRefs.current.set(msg.id, el); else messageRefs.current.delete(msg.id); }}
                      className={`flex group relative ${isMine ? "justify-end" : "justify-start"} ${isCurrentMatch ? "bg-primary/8 rounded-xl ring-1 ring-primary/30" : ""}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[70%] items-end ${
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
                            msg.message_type === "notification"
                              ? "bg-amber-500/10 border border-amber-500/20"
                              : isMine ? "bg-primary/15" : "bg-muted"
                          }`}
                        >
                          {/* Sender name & time */}
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="flex items-center gap-1">
                              {msg.message_type === "notification" && (
                                <Icon name="Bell" className="w-3 h-3 text-amber-500 shrink-0" />
                              )}
                              <span
                                className={`text-[10px] font-semibold ${
                                  isMine ? "text-primary" : "text-foreground"
                                }`}
                              >
                                {msg.sender_name}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground shrink-0">
                              {formatTime(msg.created_at)}
                              {isMine && (
                                <button
                                  onClick={() => handleShowReaders(msg.id)}
                                  className="inline-flex items-center hover:opacity-70 transition-opacity"
                                  title="Кто прочитал"
                                >
                                  <MessageTicks status={
                                    isSendingMsg && messages[messages.length - 1]?.id === msg.id
                                      ? 'sent'
                                      : (msg.status || 'sent')
                                  } />
                                </button>
                              )}
                            </span>
                          </div>

                          {/* Subject */}
                          {msg.subject && (
                            <p className="text-[10px] font-semibold text-foreground/80 mb-1">
                              Тема: {msg.subject}
                            </p>
                          )}

                          {/* Content — with quote rendering */}
                          {(() => {
                            const lines = msg.content.split("\n");
                            const quoteLines: string[] = [];
                            const bodyLines: string[] = [];
                            let inQuote = true;
                            for (const line of lines) {
                              if (inQuote && line.startsWith("> ")) {
                                quoteLines.push(line.slice(2));
                              } else {
                                inQuote = false;
                                if (!(bodyLines.length === 0 && line.trim() === "")) {
                                  bodyLines.push(line);
                                }
                              }
                            }
                            return (
                              <>
                                {quoteLines.length > 0 && (
                                  <div className="mb-1.5 pl-2 border-l-2 border-muted-foreground/40 rounded-sm">
                                    <p className="text-[10px] text-muted-foreground italic whitespace-pre-wrap line-clamp-3">
                                      {quoteLines.join("\n")}
                                    </p>
                                  </div>
                                )}
                                <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                                  {bodyLines.join("\n") || msg.content}
                                </p>
                              </>
                            );
                          })()}

                          {/* Existing reactions */}
                          {reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                              {Object.entries(reactions[msg.id]).map(([emoji, data]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  title={data.users.map((u) => u.name).join(", ")}
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted border border-border text-[11px] hover:bg-primary/10 hover:border-primary/30 transition-colors"
                                >
                                  <span>{emoji}</span>
                                  {data.count > 1 && (
                                    <span className="text-[9px] text-muted-foreground font-medium">{data.count}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Action buttons + emoji picker trigger */}
                          <div className={`flex gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                            {/* Emoji picker button */}
                            <div className="relative">
                              <button
                                onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-muted-foreground hover:text-yellow-500 px-1 py-0.5 rounded"
                                title="Добавить реакцию"
                              >
                                😊
                              </button>
                              {emojiPickerMsgId === msg.id && (
                                <div
                                  className={`absolute bottom-6 z-20 flex gap-1 bg-card border border-border rounded-xl shadow-xl px-2 py-1.5 ${isMine ? "right-0" : "left-0"}`}
                                  onMouseLeave={() => setEmojiPickerMsgId(null)}
                                >
                                  {REACTION_EMOJIS.map((e) => (
                                    <button
                                      key={e}
                                      onClick={() => handleReaction(msg.id, e)}
                                      className="text-lg hover:scale-125 transition-transform p-0.5 rounded"
                                      title={e}
                                    >
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setReplyTo(msg);
                                textareaRef.current?.focus();
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded"
                              title="Ответить с цитатой"
                            >
                              <Icon name="Reply" className="w-3 h-3" />
                              Ответить
                            </button>
                            <button
                              onClick={() => { setForwardMsg(msg); setForwardSearch(""); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded"
                              title="Переслать сообщение"
                            >
                              <Icon name="Forward" className="w-3 h-3" />
                              Переслать
                            </button>
                            <button
                              onClick={() => handleTogglePin(msg.id)}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${msg.is_pinned ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
                              title={msg.is_pinned ? "Открепить" : "Закрепить"}
                            >
                              <Icon name="Pin" className="w-3 h-3" />
                              {msg.is_pinned ? "Откреп." : "Закрепить"}
                            </button>
                          </div>

                          {/* Pin badge */}
                          {msg.is_pinned && (
                            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                              <Icon name="Pin" className="w-2.5 h-2.5 text-amber-500" />
                              <span className="text-[9px] text-amber-500 font-medium">Закреплено</span>
                            </div>
                          )}

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
                                ) : (file.content_type.startsWith("audio/") || /\.(webm|ogg|oga|mp3|wav|m4a|mp4)$/i.test(file.file_name)) ? (
                                  <div key={file.id} className="space-y-1">
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border text-primary" style={{ minWidth: 240, maxWidth: 280 }}>
                                      <VoicePlayer url={file.file_url} />
                                      <button
                                        onClick={() => transcribeVoiceFile(file.id, file.file_url, file.content_type)}
                                        disabled={transcribingFile === file.id}
                                        title={voiceTranscripts[file.id] ? "Скрыть текст" : "Распознать речь"}
                                        className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
                                      >
                                        <Icon
                                          name={transcribingFile === file.id ? "Loader2" : voiceTranscripts[file.id] ? "EyeOff" : "FileText"}
                                          className={`w-4 h-4 text-primary ${transcribingFile === file.id ? "animate-spin" : ""}`}
                                        />
                                      </button>
                                      <span className="text-[9px] text-muted-foreground shrink-0">{formatFileSize(file.file_size)}</span>
                                    </div>
                                    {voiceTranscripts[file.id] && (
                                      <div className="text-xs text-foreground/80 italic px-2 py-1 rounded bg-primary/5 border-l-2 border-primary">
                                        {voiceTranscripts[file.id]}
                                      </div>
                                    )}
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
              {/* Reply quote preview */}
              {replyTo && (
                <div className="mb-2 flex items-start gap-2 bg-primary/8 border-l-2 border-primary rounded-r-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-primary mb-0.5">{replyTo.sender_name}</p>
                    <p className="text-[11px] text-foreground/70 truncate">{replyTo.content.slice(0, 100)}{replyTo.content.length > 100 ? "…" : ""}</p>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                  >
                    <Icon name="X" className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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

              {/* Failed message notice */}
              {failedMsgText && (
                <div className="mb-2 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
                  <Icon name="AlertCircle" className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-[10px] text-red-500 flex-1 truncate">
                    Не отправлено: {failedMsgText}
                  </span>
                  <button
                    onClick={() => { setInputText(failedMsgText); setFailedMsgText(null); }}
                    className="text-[9px] font-medium text-red-500 hover:text-red-600 shrink-0 underline transition-colors"
                  >
                    Повторить
                  </button>
                  <button
                    onClick={() => setFailedMsgText(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <Icon name="X" className="w-3 h-3" />
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
                {/* Message type toggle with popup */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowTypeMenu((v) => !v)}
                    className={`p-2 rounded-lg transition-colors ${
                      sendAsType === "notification"
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    title={sendAsType === "notification" ? "Режим: Уведомление" : "Режим: Сообщение"}
                  >
                    <Icon name={sendAsType === "notification" ? "Bell" : "MessageSquare"} className="w-4 h-4" />
                  </button>
                  {showTypeMenu && (
                    <div className="absolute bottom-full mb-2 left-0 z-40 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      <div className="px-3 py-2 border-b border-border">
                        <span className="text-xs font-semibold text-foreground">Тип отправки</span>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {[
                          { key: "message" as MessageType, label: "Сообщение", icon: "MessageSquare", desc: "Обычное сообщение" },
                          { key: "notification" as MessageType, label: "Уведомление", icon: "Bell", desc: "Системное уведомление" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => { setSendAsType(opt.key); setShowTypeMenu(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                              sendAsType === opt.key ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <Icon name={opt.icon} className="w-4 h-4 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{opt.label}</p>
                              <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                            </div>
                            {sendAsType === opt.key && <Icon name="Check" className="w-3.5 h-3.5 ml-auto shrink-0 text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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

                {/* Quick templates button */}
                <div className="relative shrink-0">
                  <button
                    onClick={openTemplates}
                    className={`p-2 rounded-lg transition-colors ${
                      showTemplates
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    title="Быстрые шаблоны"
                  >
                    <Icon name="Zap" className="w-4 h-4" />
                  </button>
                  {showTemplates && (
                    <div className="absolute bottom-full mb-2 left-0 z-40 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                        <Icon name="Zap" className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground flex-1">
                          Шаблоны ответов
                        </span>
                        <button
                          onClick={() => setShowTemplates(false)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Icon name="X" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {templatesLoading ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Загрузка...
                          </div>
                        ) : templatesList.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Нет шаблонов
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {templatesList.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => insertTemplate(t.content)}
                                className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors flex items-start gap-2"
                              >
                                <Icon
                                  name={t.icon || "MessageSquare"}
                                  className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-foreground truncate">
                                    {t.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                                    {t.content}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
                {transcribing ? (
                  <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0 flex items-center gap-1.5" title="Распознавание речи...">
                    <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                    <span className="text-[9px] font-medium">STT</span>
                  </div>
                ) : recording ? (
                  <button
                    onClick={stopRecording}
                    className={`px-2.5 py-2 rounded-lg transition-colors shrink-0 ${transcribeMode ? "bg-primary/15 text-primary hover:bg-primary/25" : "bg-red-500/15 text-red-500 hover:bg-red-500/25"}`}
                    title={transcribeMode ? "Остановить и распознать" : "Остановить запись"}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Square" className="w-3.5 h-3.5 fill-current animate-pulse" />
                      <div className="flex items-center gap-[2px] h-5">
                        {waveLevels.map((lvl, i) => (
                          <span
                            key={i}
                            className="w-[2px] rounded-full bg-current transition-[height] duration-75"
                            style={{ height: `${Math.max(10, Math.round(lvl * 100))}%`, opacity: 0.55 + lvl * 0.45 }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono font-bold tabular-nums">
                        {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:{(recordingTime % 60).toString().padStart(2, "0")}
                      </span>
                      {transcribeMode && <span className="text-[8px] font-bold">STT</span>}
                    </div>
                  </button>
                ) : (
                  <button
                    onMouseDown={handleMicMouseDown}
                    onMouseUp={handleMicMouseUp}
                    onMouseLeave={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                    onTouchStart={handleMicMouseDown}
                    onTouchEnd={(e) => { e.preventDefault(); handleMicMouseUp(); }}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 select-none"
                    title="Клик — голосовое · Удержание 1.5с — голос в текст"
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

              {/* Add members toggle */}
              {activeChatId && (
                <div className="pt-2 border-t border-border/50">
                  <button
                    onClick={() => !showAddMembers && openAddMembers()}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="UserPlus" className="w-3 h-3" />
                    Добавить участников
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── NEW CHAT MODAL ── */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-2xl w-[90vw] max-w-[1400px] max-h-[92vh] flex flex-col shadow-xl">
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
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[320px_1fr] h-full min-h-0">
                {/* Left column — chat settings */}
                <div className="border-r border-border px-6 py-5 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      Название чата
                    </label>
                    <input
                      type="text"
                      value={newChatTitle}
                      onChange={(e) => setNewChatTitle(e.target.value)}
                      placeholder="Введите название..."
                      className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      Тип чата
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setNewChatType("message")}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                          newChatType === "message"
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon name="MessageSquare" className="w-4 h-4" />
                        Сообщения
                      </button>
                      <button
                        onClick={() => setNewChatType("notification")}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                          newChatType === "notification"
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
                            : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon name="Bell" className="w-4 h-4" />
                        Уведомления
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <div className="text-xs font-semibold text-foreground mb-1">Итого участников</div>
                    <div className="text-2xl font-bold text-primary">{selectedUserIds.size + selectedDriverIds.size}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedUserIds.size > 0 && <span>{selectedUserIds.size} сотр. </span>}
                      {selectedDriverIds.size > 0 && <span>{selectedDriverIds.size} вод.</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      Видимость для ролей
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { key: 'dispatcher', label: 'Диспетчер' },
                        { key: 'technician', label: 'Технолог' },
                        { key: 'mechanic', label: 'Механик' },
                        { key: 'admin', label: 'Администратор' },
                        { key: 'driver', label: 'Водитель' },
                      ].map((r) => {
                        const checked = visibleRoles.has(r.key);
                        return (
                          <label
                            key={r.key}
                            className="flex items-center gap-2 text-xs text-foreground cursor-pointer px-2 py-1.5 rounded-lg hover:bg-muted/40"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleVisibleRole(r.key)}
                              className="w-3.5 h-3.5 accent-primary"
                            />
                            {r.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right column — participants picker */}
                <div className="px-6 py-5">
                  <label className="block text-xs font-semibold text-foreground mb-3">
                    Выберите участников
                  </label>
                  <CategoryPicker
                    users={users}
                    drivers={driversAll}
                    selectedUserIds={selectedUserIds}
                    selectedDriverIds={selectedDriverIds}
                    onToggleUser={toggleUser}
                    onToggleDriver={toggleDriver}
                    onSelectAllUsers={selectAllUsersInRole}
                    onSelectAllDrivers={selectAllDrivers}
                    onSelectDriversByIds={selectDriversByIds}
                    onDeselectDriversByIds={deselectDriversByIds}
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewChat(false)}
                className="text-sm font-medium px-5 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
                className="text-sm font-medium px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingChat ? (
                  <span className="flex items-center gap-2">
                    <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                    Создание...
                  </span>
                ) : (
                  "Создать чат"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MEMBERS MODAL ── */}
      {showAddMembers && activeChatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddMembers(false)}>
          <div className="bg-card border border-border rounded-2xl w-[90vw] max-w-[1400px] max-h-[92vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name="UserPlus" className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Добавить участников</h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {chats.find((c) => c.id === activeChatId)?.title || ""}
                </p>
              </div>
              <button onClick={() => setShowAddMembers(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>

            {/* Body — two columns */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[280px_1fr] h-full min-h-0">
                {/* Left — info + counter */}
                <div className="border-r border-border px-6 py-5 flex flex-col gap-4">
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <div className="text-xs font-semibold text-foreground mb-1">Выбрано для добавления</div>
                    <div className="text-2xl font-bold text-primary">{addMemberUserIds.size + addMemberDriverIds.size}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {addMemberUserIds.size > 0 && <span>{addMemberUserIds.size} сотр. </span>}
                      {addMemberDriverIds.size > 0 && <span>{addMemberDriverIds.size} вод.</span>}
                      {addMemberUserIds.size === 0 && addMemberDriverIds.size === 0 && <span>Никого не выбрано</span>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/10 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
                    Выберите сотрудников или водителей из списка справа. Можно фильтровать по маршруту, типу ТС, модели и другим параметрам.
                  </div>
                </div>

                {/* Right — picker */}
                <div className="px-6 py-5">
                  <label className="block text-xs font-semibold text-foreground mb-3">
                    Выберите участников
                  </label>
                  <CategoryPicker
                    users={users}
                    drivers={driversAll}
                    selectedUserIds={addMemberUserIds}
                    selectedDriverIds={addMemberDriverIds}
                    onToggleUser={toggleAddMemberUser}
                    onToggleDriver={toggleAddMemberDriver}
                    onSelectAllUsers={selectAllAddUsers}
                    onSelectAllDrivers={selectAllAddDrivers}
                    onSelectDriversByIds={selectAddDriversByIds}
                    onDeselectDriversByIds={deselectAddDriversByIds}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddMembers(false)}
                className="text-sm font-medium px-5 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddMembers}
                disabled={addingMembers || (addMemberUserIds.size === 0 && addMemberDriverIds.size === 0)}
                className="text-sm font-medium px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMembers ? (
                  <span className="flex items-center gap-2">
                    <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                    Добавление...
                  </span>
                ) : (
                  `Добавить ${addMemberUserIds.size + addMemberDriverIds.size > 0 ? `(${addMemberUserIds.size + addMemberDriverIds.size})` : ""}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── READERS POPUP ── */}
      {readersPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setReadersPopup(null)}>
          <div className="bg-card border border-border rounded-2xl w-[380px] max-h-[60vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Icon name="CheckCheck" className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground flex-1">Статус прочтения</h3>
              <button onClick={() => setReadersPopup(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {readersLoading ? (
                <div className="flex justify-center py-6">
                  <Icon name="Loader2" className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Прочитали */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="16" height="9" viewBox="0 0 16 9" fill="none" className="text-primary">
                        <path d="M1 4.5L4 7.5L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 4.5L8 7.5L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-[11px] font-semibold text-foreground">Прочитали ({readersPopup.read.length})</span>
                    </div>
                    {readersPopup.read.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground pl-2">Никто ещё не прочитал</p>
                    ) : (
                      <div className="space-y-1.5">
                        {readersPopup.read.map((r, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-muted/30">
                            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {(r.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-foreground truncate">{r.name}</p>
                              <p className="text-[9px] text-muted-foreground">{ROLE_LABELS[r.role] || r.role}</p>
                            </div>
                            {r.read_at && (
                              <span className="text-[9px] text-muted-foreground shrink-0">
                                {formatTime(r.read_at)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Не прочитали */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="16" height="9" viewBox="0 0 16 9" fill="none" className="text-muted-foreground/60">
                        <path d="M1 4.5L4 7.5L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 4.5L8 7.5L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-[11px] font-semibold text-foreground">Не прочитали ({readersPopup.unread.length})</span>
                    </div>
                    {readersPopup.unread.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground pl-2">Все прочитали</p>
                    ) : (
                      <div className="space-y-1.5">
                        {readersPopup.unread.map((r, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-muted/30 opacity-60">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                              {(r.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-foreground truncate">{r.name}</p>
                              <p className="text-[9px] text-muted-foreground">{ROLE_LABELS[r.role] || r.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PINNED MESSAGES PANEL ── */}
      {showPinned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPinned(false)}>
          <div className="bg-card border border-border rounded-2xl w-[440px] max-h-[65vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Icon name="Pin" className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground flex-1">Закреплённые сообщения</h3>
              <button onClick={() => setShowPinned(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {pinnedLoading ? (
                <div className="flex justify-center py-8">
                  <Icon name="Loader2" className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : pinnedMessages.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Icon name="Pin" className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">Нет закреплённых сообщений</p>
                  <p className="text-[10px] opacity-60 mt-1">Наведи на сообщение и нажми «Закрепить»</p>
                </div>
              ) : (
                pinnedMessages.map((pm) => (
                  <div key={pm.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/6 border border-amber-500/20 hover:bg-amber-500/10 transition-colors">
                    <Icon name="Pin" className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-foreground">{pm.sender_name}</span>
                        <span className="text-[9px] text-muted-foreground shrink-0">{formatTime(pm.created_at)}</span>
                      </div>
                      {pm.subject && <p className="text-[9px] text-primary font-medium mb-0.5">Тема: {pm.subject}</p>}
                      <p className="text-[11px] text-foreground line-clamp-3 whitespace-pre-wrap">{pm.content}</p>
                      <button
                        onClick={() => {
                          messageRefs.current.get(pm.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                          setShowPinned(false);
                        }}
                        className="mt-1.5 text-[9px] text-primary hover:underline transition-colors"
                      >
                        Перейти к сообщению ↑
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        await togglePin(pm.id, activeChatId!);
                        setMessages((prev) => prev.map((m) => m.id === pm.id ? { ...m, is_pinned: false, pinned_at: null } : m));
                        setPinnedMessages((prev) => prev.filter((p) => p.id !== pm.id));
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                      title="Открепить"
                    >
                      <Icon name="PinOff" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FORWARD MESSAGE MODAL ── */}
      {forwardMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setForwardMsg(null); setForwardSearch(""); }}>
          <div className="bg-card border border-border rounded-2xl w-[90vw] max-w-[1400px] max-h-[92vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name="Forward" className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Переслать сообщение</h3>
                <p className="text-[11px] text-muted-foreground">Выберите чат для пересылки</p>
              </div>
              <button
                onClick={() => { setForwardMsg(null); setForwardSearch(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>

            {/* Body — two columns */}
            <div className="flex-1 overflow-hidden grid grid-cols-[320px_1fr] min-h-0">

              {/* Left — message preview */}
              <div className="border-r border-border px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Пересылаемое сообщение</p>
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{(forwardMsg.sender_name || "?").charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">{forwardMsg.sender_name}</span>
                    </div>
                    {forwardMsg.subject && (
                      <p className="text-[11px] text-primary font-medium">{forwardMsg.subject}</p>
                    )}
                    <p className="text-xs text-foreground leading-relaxed line-clamp-6">{forwardMsg.content}</p>
                    {forwardMsg.files && forwardMsg.files.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-1">
                        <Icon name="Paperclip" className="w-3 h-3 shrink-0" />
                        <span>{forwardMsg.files.length} вложение(й)</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
                  Выберите один или несколько чатов справа. Сообщение будет отправлено с пометкой об источнике.
                </div>
              </div>

              {/* Right — chat list */}
              <div className="flex flex-col min-h-0">
                {/* Search */}
                <div className="px-6 pt-5 pb-3 shrink-0">
                  <p className="text-xs font-semibold text-foreground mb-3">Выберите чат</p>
                  <div className="relative">
                    <Icon name="Search" className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={forwardSearch}
                      onChange={(e) => setForwardSearch(e.target.value)}
                      placeholder="Поиск по чатам..."
                      className="w-full text-sm bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 pb-5 space-y-1">
                  {chats
                    .filter((c) => !forwardSearch.trim() || c.title.toLowerCase().includes(forwardSearch.toLowerCase()))
                    .map((c) => {
                      const isActive = c.id === activeChatId;
                      const onlineCount = c.members.filter((m) => m.is_online).length;
                      const typeIcon = c.chat_type === "notification" ? "Bell" : "MessageSquare";
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleForward(c.id)}
                          disabled={forwarding}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border transition-all text-left disabled:opacity-50 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                            <Icon name={typeIcon} className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-foreground truncate">{c.title}</span>
                              {isActive && (
                                <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-md shrink-0 font-medium">текущий</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {onlineCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                              <span className="text-xs text-muted-foreground truncate">
                                {c.members.length} уч.{onlineCount > 0 ? ` · ${onlineCount} онлайн` : ""}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                            {forwarding
                              ? <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                              : <Icon name="Forward" className="w-4 h-4" />}
                          </div>
                        </button>
                      );
                    })}
                  {chats.filter((c) => !forwardSearch.trim() || c.title.toLowerCase().includes(forwardSearch.toLowerCase())).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Icon name="SearchX" className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">Чаты не найдены</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end shrink-0">
              <button
                onClick={() => { setForwardMsg(null); setForwardSearch(""); }}
                className="text-sm font-medium px-5 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── REMOVE MEMBER CONFIRM ── */}
      {removeMemberTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !removingMember && setRemoveMemberTarget(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Icon name="UserMinus" className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-foreground flex-1">
                Удалить участника
              </h3>
              <button
                onClick={() => !removingMember && setRemoveMemberTarget(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-foreground">
                Вы действительно хотите удалить{" "}
                <span className="font-semibold">{removeMemberTarget.name}</span> из этого чата?
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Участник больше не будет получать сообщения в этом чате.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setRemoveMemberTarget(null)}
                disabled={removingMember}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removingMember}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {removingMember ? (
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="UserMinus" className="w-4 h-4" />
                )}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}