import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Message, ConnectionStatus } from '@/types/kiosk';
import { transcribeAudio } from '@/api/transcribeApi';

const QUICK_TEMPLATES = [
  '🚦 Задержка на светофоре',
  '🔧 Техническая неисправность',
  '👥 Большой пассажиропоток',
  '✅ Прибыл на конечную',
  '🛑 Экстренная остановка',
  '⏰ Опоздание ~5 мин',
  '🆗 Всё в норме',
  '🔄 Прошу сменить маршрут',
];

interface Props {
  messages: Message[];
  onSend: (text: string, isVoice?: boolean, voiceDuration?: number, audioUrl?: string) => void;
  onTranscribed?: (msgId: string, text: string) => void;
  isMoving: boolean;
  connection?: ConnectionStatus;
  pendingCount?: number;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  autoStartRecord?: boolean;
  onAutoRecordDone?: () => void;
  activeVoiceMsgId?: string | null;
}

function DeliveryIcon({ status }: { status?: string }) {
  if (!status) return null;
  if (status === 'pending') return <Icon name="Clock" size={13} className="inline ml-1 text-yellow-400" />;
  if (status === 'sending') return <Icon name="Loader" size={13} className="inline ml-1 animate-spin" />;
  if (status === 'sent') return <Icon name="Check" size={13} className="inline ml-1" />;
  if (status === 'delivered') return <Icon name="CheckCheck" size={13} className="inline ml-1" />;
  if (status === 'failed') return <Icon name="AlertCircle" size={13} className="inline ml-1 text-red-400" />;
  return null;
}

// ─── VoiceBubble ────────────────────────────────────────────────────────────

interface VoiceBubbleProps {
  msgId: string;
  duration: number;
  isOutgoing: boolean;
  transcription?: string;
  audioUrl?: string;
  autoPlay?: boolean;
  onTranscribed?: (msgId: string, text: string) => void;
}

function VoiceBubble({ msgId, duration, isOutgoing, transcription, audioUrl, autoPlay, onTranscribed }: VoiceBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(!!transcription);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptText, setTranscriptText] = useState(transcription || '');
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (transcription && !transcriptText) {
      setTranscriptText(transcription);
      setShowTranscript(true);
    }
  }, [transcription]);

  // Автовоспроизведение когда приходит autoPlay=true
  useEffect(() => {
    if (autoPlay) play();
  }, [autoPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopProgress = () => {
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
  };

  const play = useCallback(() => {
    stopProgress();
    setPlaying(true);
    setProgress(0);

    // Воспроизведение реального аудио если есть URL
    if (audioUrl) {
      if (!audioRef.current) audioRef.current = new Audio(audioUrl);
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      audio.onended = () => { stopProgress(); setPlaying(false); setProgress(0); };
    }

    // Анимация прогресса
    const step = 100 / (Math.max(duration, 1) * 10);
    progressTimer.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          stopProgress();
          setPlaying(false);
          return 0;
        }
        return prev + step;
      });
    }, 100);
  }, [audioUrl, duration]);

  const stop = useCallback(() => {
    stopProgress();
    audioRef.current?.pause();
    setPlaying(false);
    setProgress(0);
  }, []);

  const doTranscribe = useCallback(async () => {
    if (transcriptText) {
      setShowTranscript(v => !v);
      return;
    }
    setTranscribing(true);
    try {
      let text = '';
      if (audioUrl) {
        const resp = await fetch(audioUrl);
        const blob = await resp.blob();
        text = await transcribeAudio(blob);
      }
      if (!text) text = 'Нет речи для распознавания';
      setTranscriptText(text);
      setShowTranscript(true);
      onTranscribed?.(msgId, text);
    } catch {
      setTranscriptText('Не удалось распознать речь');
      setShowTranscript(true);
    } finally {
      setTranscribing(false);
    }
  }, [transcriptText, audioUrl, msgId, onTranscribed]);

  // Обработка нажатия кнопки Play:
  // - короткое нажатие → play/pause
  // - удержание 1.5с → транскрибация
  const onPtrDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      doTranscribe();
    }, 1500);
  };

  const onPtrUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (!isLongPress.current) {
      if (playing) stop(); else play();
    }
  };

  const onPtrCancel = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  useEffect(() => () => {
    stopProgress();
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    audioRef.current?.pause();
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-w-[150px]">
      <div className="flex items-center gap-3">
        <button
          onPointerDown={onPtrDown}
          onPointerUp={onPtrUp}
          onPointerCancel={onPtrCancel}
          onContextMenu={e => e.preventDefault()}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 select-none ${
            isOutgoing ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/15 hover:bg-primary/25'
          }`}
        >
          <Icon
            name={transcribing ? 'Loader' : playing ? 'Pause' : 'Play'}
            size={18}
            className={`${isOutgoing ? 'text-white' : 'text-primary'} ${transcribing ? 'animate-spin' : ''}`}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: isOutgoing ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-100"
              style={{ width: `${progress}%`, backgroundColor: isOutgoing ? 'rgba(255,255,255,0.8)' : 'hsl(var(--primary))' }}
            />
          </div>
          <span className={`text-xs mt-0.5 block tabular-nums ${isOutgoing ? 'text-white/60' : 'text-muted-foreground'}`}>
            {fmt(duration)}
          </span>
        </div>
      </div>
      {transcribing && (
        <div className={`mt-2 flex items-center gap-2 text-sm ${isOutgoing ? 'text-white/60' : 'text-muted-foreground'}`}>
          <Icon name="Loader" size={12} className="animate-spin flex-shrink-0" />
          <span>Распознаю речь...</span>
        </div>
      )}
      {showTranscript && transcriptText && !transcribing && (
        <div className={`mt-2 pt-2 text-xl leading-snug ${isOutgoing ? 'border-t border-white/20 text-white/90' : 'border-t border-border text-foreground/80'}`}>
          <div className="flex items-start gap-1.5">
            <Icon name="FileText" size={14} className={`mt-1 flex-shrink-0 ${isOutgoing ? 'text-white/50' : 'text-muted-foreground'}`} />
            <span>{transcriptText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Messenger ──────────────────────────────────────────────────────────────

type RecordMode = 'idle' | 'voice' | 'transcribe';

export default function Messenger({
  messages, onSend, onTranscribed,
  isMoving, connection = 'online', pendingCount = 0,
  onInputFocus, onInputBlur,
  autoStartRecord, onAutoRecordDone,
  activeVoiceMsgId,
}: Props) {
  const [input, setInput] = useState('');
  const [recordMode, setRecordMode] = useState<RecordMode>('idle');
  const [recordTime, setRecordTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Refs для записи
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimeRef = useRef(0);

  // Refs для UI
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);
  const micLongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micIsLongRef = useRef(false);

  const chatMessages = messages.filter(m => m.type === 'dispatcher' || m.type === 'important').slice(-50);
  const isOffline = connection === 'offline';
  const isRecording = recordMode !== 'idle';

  // ── Прокрутка ──────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => { scrollToBottom(); }, [chatMessages.length, scrollToBottom]);
  useEffect(() => {
    scrollToBottom();
    const iv = setInterval(scrollToBottom, 500);
    return () => clearInterval(iv);
  }, [scrollToBottom]);

  useEffect(() => {
    if (activeVoiceMsgId) {
      setTimeout(() => {
        const el = scrollRef.current?.querySelector(`[data-msg-id="${activeVoiceMsgId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [activeVoiceMsgId]);

  // ── Запись ────────────────────────────────────────────────────────────────
  const stopRecordTimer = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const startMicStream = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(100);
      return true;
    } catch {
      return false;
    }
  };

  const stopMicStream = (): Promise<Blob> => {
    return new Promise(resolve => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') {
        resolve(new Blob(audioChunksRef.current));
        return;
      }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        resolve(blob);
      };
      mr.stop();
    });
  };

  const cancelMic = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') { mr.ondataavailable = null; mr.onstop = null; mr.stop(); }
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const beginRecording = useCallback(async (mode: 'voice' | 'transcribe') => {
    inputRef.current?.blur();
    stopRecordTimer();
    recordTimeRef.current = 0;
    setRecordTime(0);
    const ok = await startMicStream();
    if (!ok) return;
    setRecordMode(mode);
    recordTimerRef.current = setInterval(() => {
      recordTimeRef.current += 1;
      setRecordTime(t => t + 1);
    }, 1000);
  }, []);

  // ── Кнопка микрофона ──────────────────────────────────────────────────────
  const onMicDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    micIsLongRef.current = false;
    micLongTimerRef.current = setTimeout(() => {
      micIsLongRef.current = true;
      beginRecording('transcribe');
    }, 1500);
  }, [beginRecording]);

  const onMicUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (micLongTimerRef.current) { clearTimeout(micLongTimerRef.current); micLongTimerRef.current = null; }
    if (!micIsLongRef.current) beginRecording('voice');
  }, [beginRecording]);

  const onMicCancel = useCallback(() => {
    if (micLongTimerRef.current) { clearTimeout(micLongTimerRef.current); micLongTimerRef.current = null; }
  }, []);

  // ── Отправка / отмена записи ──────────────────────────────────────────────
  const handleSendVoice = useCallback(async (e: React.PointerEvent) => {
    e.preventDefault();
    stopRecordTimer();
    const mode = recordMode;
    setRecordMode('idle');
    setRecordTime(0);

    const blob = await stopMicStream();
    const audioUrl = blob.size > 100 ? URL.createObjectURL(blob) : undefined;
    const dur = recordTimeRef.current;
    recordTimeRef.current = 0;

    if (mode === 'transcribe') {
      setTranscribing(true);
      try {
        const text = blob.size > 500 ? await transcribeAudio(blob) : '';
        setInput(text || '');
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch {
        setInput('');
      } finally {
        setTranscribing(false);
      }
    } else {
      onSend(`🎤 Голосовое сообщение (${dur}с)`, true, dur, audioUrl);
      onInputBlur?.();
    }
  }, [recordMode, onSend, onInputBlur]);

  const handleCancelVoice = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    stopRecordTimer();
    cancelMic();
    setRecordMode('idle');
    setTranscribing(false);
    setRecordTime(0);
    recordTimeRef.current = 0;
    onInputBlur?.();
  }, [onInputBlur]);

  // ── Текст ────────────────────────────────────────────────────────────────
  const handleSendText = useCallback(() => {
    if (sendingRef.current || !input.trim()) return;
    sendingRef.current = true;
    onSend(input.trim());
    setInput('');
    setTimeout(() => { sendingRef.current = false; }, 200);
    inputRef.current?.blur();
  }, [input, onSend]);

  // ── Авто-старт ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoStartRecord) return;
    onAutoRecordDone?.();
    beginRecording('voice');
  }, [autoStartRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Фокус ────────────────────────────────────────────────────────────────
  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setInputFocused(true);
    onInputFocus?.();
  }, [onInputFocus]);

  const handleBlur = useCallback(() => {
    blurTimerRef.current = setTimeout(() => { setInputFocused(false); onInputBlur?.(); }, 200);
  }, [onInputBlur]);

  const fmt = (d: Date) => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full">
      {/* Офлайн-баннер */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border-b border-yellow-500/30">
          <Icon name="WifiOff" size={16} className="text-yellow-500" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Нет сети{pendingCount > 0 && ` — ${pendingCount} сообщ. в очереди`}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] text-yellow-600 dark:text-yellow-400">отправится при подключении</span>
          </div>
        </div>
      )}
      {!isOffline && pendingCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border-b border-blue-500/20">
          <Icon name="Loader" size={14} className="text-blue-500 animate-spin" />
          <span className="text-xs text-blue-600 dark:text-blue-400">Отправка {pendingCount} сообщений...</span>
        </div>
      )}

      {/* Сообщения */}
      <div ref={scrollRef} className={`overflow-y-auto px-3 py-2 space-y-3 min-h-0 transition-all duration-200 ${inputFocused && !isRecording ? 'hidden' : 'flex-1'}`}>
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Icon name="MessageSquare" size={48} className="opacity-30" />
            <span className="text-2xl">Нет сообщений</span>
          </div>
        )}
        {chatMessages.map(msg => {
          const isOutgoing = msg.text.startsWith('[Водитель]');
          return (
            <div key={msg.id} data-msg-id={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 transition-all ${
                activeVoiceMsgId === msg.id ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
              } ${
                msg.type === 'important'
                  ? 'bg-destructive/15 border border-destructive/30'
                  : isOutgoing
                    ? (msg.deliveryStatus === 'pending' || msg.deliveryStatus === 'failed')
                      ? 'bg-primary/60 text-primary-foreground rounded-br-sm'
                      : 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                {msg.type === 'important' && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon name="AlertTriangle" size={20} className="text-destructive" />
                    <span className="text-base font-bold text-destructive uppercase">Важное</span>
                  </div>
                )}
                {msg.isVoice ? (
                  <VoiceBubble
                    msgId={msg.id}
                    duration={msg.voiceDuration || 5}
                    isOutgoing={isOutgoing}
                    transcription={msg.transcription}
                    audioUrl={msg.audioUrl}
                    autoPlay={activeVoiceMsgId === msg.id}
                    onTranscribed={onTranscribed}
                  />
                ) : (
                  <p className="text-3xl leading-snug">{msg.text}</p>
                )}
                <div className={`text-base mt-1 ${isOutgoing ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                  {fmt(msg.timestamp)}
                  {isOutgoing && <DeliveryIcon status={msg.deliveryStatus} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Быстрые шаблоны */}
      {!inputFocused && !isRecording && !isMoving && (
        <div className="px-3 py-1.5 border-t border-border flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button key={i} onPointerDown={e => { e.preventDefault(); onSend(tpl); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted text-base text-foreground whitespace-nowrap active:scale-95 ripple">
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Поле ввода */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
        {transcribing ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <Icon name="Loader" size={20} className="text-blue-500 animate-spin flex-shrink-0" />
            <span className="text-base text-blue-600 dark:text-blue-400 font-semibold flex-1">Распознаю речь...</span>
          </div>
        ) : isRecording ? (
          <div className={`flex items-center gap-2 p-3 rounded-2xl ${
            recordMode === 'transcribe'
              ? 'bg-blue-500/10 border border-blue-500/30'
              : 'bg-destructive/10 border border-destructive/30'
          }`}>
            <div className={`w-5 h-5 rounded-full animate-pulse flex-shrink-0 ${recordMode === 'transcribe' ? 'bg-blue-500' : 'bg-destructive'}`} />
            <span className={`text-base font-semibold flex-1 tabular-nums ${recordMode === 'transcribe' ? 'text-blue-600 dark:text-blue-400' : 'text-destructive'}`}>
              {recordMode === 'transcribe' ? '✍️' : '🎤'} {recordTime}с
            </span>
            <button onPointerDown={handleCancelVoice}
              className={`px-5 py-3 rounded-2xl text-white text-base font-semibold ripple active:scale-95 ${recordMode === 'transcribe' ? 'bg-blue-500' : 'bg-destructive'}`}>
              Стоп
            </button>
            <button onPointerDown={handleSendVoice}
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-base font-bold ripple active:scale-95 flex items-center gap-2">
              <Icon name={recordMode === 'transcribe' ? 'FileText' : 'Send'} size={18} />
              {recordMode === 'transcribe' ? 'В текст' : 'Прислать'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendText()}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={isOffline ? 'Сообщение (при подключении)...' : 'Сообщение диспетчеру...'}
              className={`flex-1 min-w-0 h-14 tablet:h-20 px-4 rounded-2xl bg-muted border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 transition-all ${
                isOffline ? 'border-yellow-500/40 focus:ring-yellow-500/40' : 'border-border focus:ring-primary/40 focus:border-primary'
              }`}
            />
            {/* 🎤 Микрофон: нажать = запись голоса, удержать 1.5с = голос→текст */}
            <button
              onPointerDown={onMicDown}
              onPointerUp={onMicUp}
              onPointerCancel={onMicCancel}
              onContextMenu={e => e.preventDefault()}
              className="relative w-14 h-14 tablet:w-20 tablet:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 bg-muted border border-border active:bg-destructive/20 transition-all select-none ripple"
              title="Нажми — запись; удержи 1.5с — голос в текст"
            >
              <Icon name="Mic" size={26} className="tablet:!w-9 tablet:!h-9 text-muted-foreground" />
            </button>
            <button
              onPointerDown={e => { e.preventDefault(); handleSendText(); }}
              disabled={!input.trim()}
              className={`w-14 h-14 tablet:w-20 tablet:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all ripple elevation-1 ${
                isOffline ? 'bg-yellow-500 text-white' : 'bg-primary text-primary-foreground'
              }`}
            >
              <Icon name="Send" size={24} className="tablet:!w-8 tablet:!h-8" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
