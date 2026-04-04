import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Message, ConnectionStatus } from '@/types/kiosk';

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
  onSend: (text: string, isVoice?: boolean, voiceDuration?: number) => void;
  isMoving: boolean;
  connection?: ConnectionStatus;
  pendingCount?: number;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onOpenFullscreen?: () => void;
  autoStartRecord?: boolean;
  onAutoRecordDone?: () => void;
}

const DEMO_TRANSCRIPTIONS = [
  'Задержитесь на конечной, регулировка интервала',
  'Принял, выполняю',
  'Понял вас, следую по маршруту',
  'На линии пробка, опоздание примерно пять минут',
  'Ревизор на маршруте, будьте готовы',
  'Всё в порядке, продолжаю движение',
];

function VoiceBubble({ duration, isOutgoing, transcription }: { duration: number; isOutgoing: boolean; transcription?: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptText, setTranscriptText] = useState(transcription || '');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePlay = () => {
    if (didLongPress.current) return;
    if (playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setPlaying(false);
      setProgress(0);
      return;
    }
    setPlaying(true);
    setProgress(0);
    const step = 100 / (duration * 10);
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setPlaying(false);
          return 0;
        }
        return prev + step;
      });
    }, 100);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    didLongPress.current = false;
    longPressRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (!transcriptText) {
        setTranscribing(true);
        setTimeout(() => {
          const demo = DEMO_TRANSCRIPTIONS[Math.floor(Math.random() * DEMO_TRANSCRIPTIONS.length)];
          setTranscriptText(demo);
          setTranscribing(false);
          setShowTranscript(true);
        }, 1500);
      } else {
        setShowTranscript(prev => !prev);
      }
    }, 1500);
  };

  const handlePointerUp = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (!didLongPress.current) handlePlay();
  };

  const handlePointerCancel = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (longPressRef.current) clearTimeout(longPressRef.current);
    };
  }, []);

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-w-[140px]">
      <div className="flex items-center gap-3">
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={e => e.preventDefault()}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
            isOutgoing
              ? 'bg-white/20 hover:bg-white/30'
              : 'bg-primary/15 hover:bg-primary/25'
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
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                backgroundColor: isOutgoing ? 'rgba(255,255,255,0.7)' : 'hsl(var(--primary))',
              }}
            />
          </div>
          <span className={`text-xs mt-0.5 block tabular-nums ${isOutgoing ? 'text-white/60' : 'text-muted-foreground'}`}>
            {formatDur(duration)}
          </span>
        </div>
      </div>
      {transcribing && (
        <div className={`mt-2 flex items-center gap-2 text-sm ${isOutgoing ? 'text-white/60' : 'text-muted-foreground'}`}>
          <Icon name="Loader" size={12} className="animate-spin" />
          <span>Транскрибация...</span>
        </div>
      )}
      {showTranscript && transcriptText && (
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

function DeliveryIcon({ status }: { status?: string }) {
  if (!status) return null;
  if (status === 'pending') return <Icon name="Clock" size={13} className="inline ml-1 text-yellow-400" />;
  if (status === 'sending') return <Icon name="Loader" size={13} className="inline ml-1 animate-spin" />;
  if (status === 'sent') return <Icon name="Check" size={13} className="inline ml-1" />;
  if (status === 'delivered') return <Icon name="CheckCheck" size={13} className="inline ml-1" />;
  if (status === 'failed') return <Icon name="AlertCircle" size={13} className="inline ml-1 text-red-400" />;
  return null;
}

export default function Messenger({
  messages,
  onSend,
  isMoving,
  connection = 'online',
  pendingCount = 0,
  onInputFocus,
  onInputBlur,
  autoStartRecord,
  onAutoRecordDone,
}: Props) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [isTranscribeMode, setIsTranscribeMode] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimeRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micDidLongPress = useRef(false);

  const chatMessages = messages
    .filter(m => m.type === 'dispatcher' || m.type === 'important')
    .slice(-50);
  const isOffline = connection === 'offline';

  // ── Скролл — всегда привязан к низу ─────────────────────────────────────

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // ── Запись ────────────────────────────────────────────────────────────────

  const stopRecordTimer = useCallback(() => {
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
  }, []);

  const startRecordNow = useCallback(() => {
    inputRef.current?.blur(); // не открываем клавиатуру
    stopRecordTimer();
    recordTimeRef.current = 0;
    setRecordTime(0);
    setIsRecording(true);
    recordTimer.current = setInterval(() => {
      recordTimeRef.current += 1;
      setRecordTime(t => t + 1);
    }, 1000);
  }, [stopRecordTimer]);

  const startTranscribeMode = useCallback(() => {
    inputRef.current?.blur();
    stopRecordTimer();
    recordTimeRef.current = 0;
    setRecordTime(0);
    setIsRecording(true);
    setIsTranscribeMode(true);
    recordTimer.current = setInterval(() => {
      recordTimeRef.current += 1;
      setRecordTime(t => t + 1);
    }, 1000);
  }, [stopRecordTimer]);

  const handleMicPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    micDidLongPress.current = false;
    micLongPressRef.current = setTimeout(() => {
      micDidLongPress.current = true;
      startTranscribeMode();
    }, 1500);
  }, [startTranscribeMode]);

  const handleMicPointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (micLongPressRef.current) {
      clearTimeout(micLongPressRef.current);
      micLongPressRef.current = null;
    }
    if (!micDidLongPress.current) {
      startRecordNow();
    }
  }, [startRecordNow]);

  const handleMicPointerCancel = useCallback(() => {
    if (micLongPressRef.current) {
      clearTimeout(micLongPressRef.current);
      micLongPressRef.current = null;
    }
  }, []);

  const handleSendVoice = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const time = recordTimeRef.current;
    stopRecordTimer();
    if (isTranscribeMode) {
      setTranscribing(true);
      setIsRecording(false);
      setRecordTime(0);
      recordTimeRef.current = 0;
      setTimeout(() => {
        const demo = DEMO_TRANSCRIPTIONS[Math.floor(Math.random() * DEMO_TRANSCRIPTIONS.length)];
        setTranscribing(false);
        setIsTranscribeMode(false);
        setInput(demo);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1500);
    } else {
      setIsRecording(false);
      setRecordTime(0);
      recordTimeRef.current = 0;
      onSend(`🎤 Голосовое сообщение (${time}с)`, true, time);
      onInputBlur?.();
    }
  }, [onSend, onInputBlur, stopRecordTimer, isTranscribeMode]);

  const handleCancelVoice = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    stopRecordTimer();
    setIsRecording(false);
    setIsTranscribeMode(false);
    setTranscribing(false);
    setRecordTime(0);
    recordTimeRef.current = 0;
    onInputBlur?.();
  }, [onInputBlur, stopRecordTimer]);

  // ── Текст ─────────────────────────────────────────────────────────────────

  const handleSendText = useCallback(() => {
    if (sendingRef.current || !input.trim()) return;
    sendingRef.current = true;
    onSend(input.trim());
    setInput('');
    setTimeout(() => { sendingRef.current = false; }, 200);
    inputRef.current?.blur();
  }, [input, onSend]);

  const handleSendTextPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    handleSendText();
  }, [handleSendText]);

  // ── Авто-старт записи при открытии fullscreen ────────────────────────────

  useEffect(() => {
    if (!autoStartRecord) return;
    onAutoRecordDone?.();
    startRecordNow();
  }, [autoStartRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  // Всегда привязан к низу — при любом изменении
  useLayoutEffect(() => {
    scrollToBottom();
  }, [chatMessages.length, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
    // Постоянный интервал — подстраховка на любой случай
    const iv = setInterval(scrollToBottom, 500);
    return () => clearInterval(iv);
  }, [scrollToBottom]);

  // ── Фокус ─────────────────────────────────────────────────────────────────

  const handleFocus = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setInputFocused(true);
    onInputFocus?.();
  }, [onInputFocus]);

  const handleBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => {
      setInputFocused(false);
      onInputBlur?.();
    }, 200);
  }, [onInputBlur]);

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full">
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
      <div ref={scrollContainerRef} className={`overflow-y-auto px-3 py-2 space-y-3 min-h-0 transition-all duration-200 ${inputFocused && !isRecording ? 'hidden' : 'flex-1'}`}>
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Icon name="MessageSquare" size={48} className="opacity-30" />
            <span className="text-2xl">Нет сообщений</span>
          </div>
        )}
        {[...chatMessages].map(msg => {
          const isOutgoing = msg.text.startsWith('[Водитель]');
          return (
            <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.type === 'important'
                  ? 'bg-destructive/15 border border-destructive/30 text-destructive-foreground'
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
                  <VoiceBubble duration={msg.voiceDuration || 5} isOutgoing={isOutgoing} transcription={msg.transcription} />
                ) : (
                  <p className="text-3xl leading-snug">{msg.text}</p>
                )}
                <div className={`text-base mt-1 ${isOutgoing ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                  {formatTime(msg.timestamp)}
                  {isOutgoing && <DeliveryIcon status={msg.deliveryStatus} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Быстрые шаблоны */}
      {!inputFocused && !isRecording && !isMoving && (
        <div className="px-3 py-1.5 border-t border-border flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onPointerDown={e => { e.preventDefault(); onSend(tpl); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted text-base text-foreground whitespace-nowrap active:scale-95 ripple"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Поле ввода */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
        {transcribing ? (
          /* ── Режим транскрибации — ожидание ── */
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <Icon name="Loader" size={20} className="text-blue-500 animate-spin flex-shrink-0" />
            <span className="text-base text-blue-600 dark:text-blue-400 font-semibold flex-1">
              Распознаю речь...
            </span>
          </div>
        ) : isRecording ? (
          /* ── Режим записи ── */
          <div className={`flex items-center gap-2 p-3 rounded-2xl ${isTranscribeMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <div className={`w-5 h-5 rounded-full animate-pulse flex-shrink-0 ${isTranscribeMode ? 'bg-blue-500' : 'bg-destructive'}`} />
            <span className={`text-base font-semibold flex-1 tabular-nums ${isTranscribeMode ? 'text-blue-600 dark:text-blue-400' : 'text-destructive'}`}>
              {isTranscribeMode ? '✍️' : '🎤'} {recordTime}с
            </span>
            <button
              onPointerDown={handleCancelVoice}
              className={`px-5 py-3 rounded-2xl text-white text-base font-semibold ripple active:scale-95 ${isTranscribeMode ? 'bg-blue-500' : 'bg-destructive'}`}
            >
              Стоп
            </button>
            <button
              onPointerDown={handleSendVoice}
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-base font-bold ripple active:scale-95 flex items-center gap-2"
            >
              <Icon name={isTranscribeMode ? 'FileText' : 'Send'} size={18} />
              {isTranscribeMode ? 'В текст' : 'Прислать'}
            </button>
          </div>
        ) : (
          /* ── Режим ввода текста ── */
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendText()}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={isOffline ? 'Сообщение (отправится при подключении)...' : 'Сообщение диспетчеру...'}
              className={`flex-1 min-w-0 h-14 tablet:h-20 px-4 rounded-2xl bg-muted border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 transition-all ${
                isOffline
                  ? 'border-yellow-500/40 focus:ring-yellow-500/40 focus:border-yellow-500'
                  : 'border-border focus:ring-primary/40 focus:border-primary'
              }`}
            />
            {/* Микрофон */}
            <button
              onPointerDown={handleMicPointerDown}
              onPointerUp={handleMicPointerUp}
              onPointerCancel={handleMicPointerCancel}
              onContextMenu={e => e.preventDefault()}
              className={`relative w-14 h-14 tablet:w-20 tablet:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ripple ${
                isRecording
                  ? 'bg-destructive border-2 border-destructive animate-pulse'
                  : 'bg-muted border border-border active:bg-destructive/20'
              }`}
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-2xl bg-destructive/40 animate-ping" />
              )}
              <Icon
                name="Mic"
                size={26}
                className={`relative z-10 tablet:!w-9 tablet:!h-9 ${isRecording ? 'text-white' : 'text-muted-foreground'}`}
              />
            </button>
            {/* Отправить текст */}
            <button
              onPointerDown={handleSendTextPointerDown}
              onTouchEnd={e => e.preventDefault()}
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