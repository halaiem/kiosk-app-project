import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Message, ConnectionStatus } from '@/types/kiosk';
import { transcribeAudio, uploadAudio } from '@/api/transcribeApi';

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

function VoiceBubble({ msgId, duration, isOutgoing, transcription, audioUrl, autoPlay, onTranscribed }: {
  msgId: string; duration: number; isOutgoing: boolean; transcription?: string;
  audioUrl?: string; autoPlay?: boolean; onTranscribed?: (id: string, t: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(!!transcription);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptText, setTranscriptText] = useState(transcription || '');
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Используем HTML <audio> элемент в DOM — единственный надёжный способ на мобильном Chrome
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { if (transcription) { setTranscriptText(transcription); setShowTranscript(true); } }, [transcription]);

  const stopProgress = () => { if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; } };

  const play = useCallback(() => {
    stopProgress();
    setPlaying(true);
    setProgress(0);
    if (audioUrl && audioElRef.current) {
      const el = audioElRef.current;
      el.currentTime = 0;
      el.play().catch(err => console.error('audio play error:', err));
    }
    const step = 100 / (Math.max(duration, 1) * 10);
    progressTimer.current = setInterval(() => {
      setProgress(p => { if (p >= 100) { stopProgress(); setPlaying(false); return 0; } return p + step; });
    }, 100);
  }, [audioUrl, duration]);

  const stop = useCallback(() => {
    stopProgress();
    audioElRef.current?.pause();
    setPlaying(false);
    setProgress(0);
  }, []);

  useEffect(() => { if (autoPlay) play(); }, [autoPlay]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stopProgress(); audioElRef.current?.pause(); }, []);

  const handlePlayClick = () => { if (playing) stop(); else play(); };

  const handleTranscribe = async () => {
    if (transcriptText) { setShowTranscript(v => !v); return; }
    setTranscribing(true);
    try {
      let text = '';
      if (audioUrl) { const r = await fetch(audioUrl); text = await transcribeAudio(await r.blob()); }
      if (!text) text = 'Нет речи для распознавания';
      setTranscriptText(text); setShowTranscript(true); onTranscribed?.(msgId, text);
    } catch { setTranscriptText('Ошибка распознавания'); setShowTranscript(true); }
    finally { setTranscribing(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-w-[150px]">
      {/* Скрытый audio элемент — нужен для мобильного Chrome */}
      {audioUrl && <audio ref={audioElRef} src={audioUrl} preload="none"
        onEnded={() => { stopProgress(); setPlaying(false); setProgress(0); }} />}
      <div className="flex items-center gap-3">
        {/* Play/Pause — простой onClick */}
        <button onClick={handlePlayClick} type="button"
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
            isOutgoing ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/15 hover:bg-primary/25'}`}>
          <Icon name={transcribing ? 'Loader' : playing ? 'Pause' : 'Play'} size={18}
            className={`${isOutgoing ? 'text-white' : 'text-primary'} ${transcribing ? 'animate-spin' : ''}`} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: isOutgoing ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-100"
              style={{ width: `${progress}%`, backgroundColor: isOutgoing ? 'rgba(255,255,255,0.8)' : 'hsl(var(--primary))' }} />
          </div>
          <span className={`text-xs mt-0.5 block tabular-nums ${isOutgoing ? 'text-white/60' : 'text-muted-foreground'}`}>{fmt(duration)}</span>
        </div>
        {/* Кнопка транскрибации — отдельная */}
        <button onClick={handleTranscribe} type="button"
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
            isOutgoing ? 'bg-white/10 hover:bg-white/20' : 'bg-muted hover:bg-muted/80'}`}
          title="Распознать текст">
          <Icon name="FileText" size={13} className={isOutgoing ? 'text-white/60' : 'text-muted-foreground'} />
        </button>
      </div>
      {transcribing && (
        <div className={`mt-2 flex items-center gap-2 text-sm ${isOutgoing ? 'text-white/60' : 'text-muted-foreground'}`}>
          <Icon name="Loader" size={12} className="animate-spin" /><span>Распознаю...</span>
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
  onInputFocus, onInputBlur, autoStartRecord, onAutoRecordDone, activeVoiceMsgId,
}: Props) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<RecordMode>('idle');
  const [recordTime, setRecordTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendLock = useRef(false);

  const chats = messages.filter(m => m.type === 'dispatcher' || m.type === 'important').slice(-50);
  const isOffline = connection === 'offline';
  const recording = mode !== 'idle';

  const scrollBottom = useCallback(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, []);
  useLayoutEffect(() => { scrollBottom(); }, [chats.length, scrollBottom]);
  useEffect(() => { scrollBottom(); const i = setInterval(scrollBottom, 500); return () => clearInterval(i); }, [scrollBottom]);
  useEffect(() => {
    if (activeVoiceMsgId) setTimeout(() => {
      scrollRef.current?.querySelector(`[data-msg-id="${activeVoiceMsgId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, [activeVoiceMsgId]);

  // ── Запись микрофона ──────────────────────────────────────────────────────
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startMic = async (): Promise<boolean> => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Микрофон недоступен в этом браузере');
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onerror = (e) => { console.error('MediaRecorder error', e); setMicError('Ошибка записи'); };
      mr.start(100);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Mic error:', msg);
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setMicError('Нет доступа к микрофону — проверь разрешения');
      } else if (msg.includes('NotFound') || msg.includes('Devices')) {
        setMicError('Микрофон не найден');
      } else {
        setMicError(`Ошибка микрофона: ${msg}`);
      }
      return false;
    }
  };

  const stopMic = (): Promise<Blob> => new Promise(resolve => {
    const mr = recorderRef.current;
    if (!mr || mr.state === 'inactive') { resolve(new Blob(chunksRef.current)); return; }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null; recorderRef.current = null;
      resolve(blob);
    };
    mr.stop();
  });

  const killMic = () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== 'inactive') { mr.ondataavailable = null; mr.onstop = null; mr.stop(); }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; recorderRef.current = null;
  };

  const beginRecord = useCallback(async (m: 'voice' | 'transcribe') => {
    inputRef.current?.blur();
    stopTimer(); timeRef.current = 0; setRecordTime(0);
    const ok = await startMic();
    if (!ok) return;
    setMode(m);
    timerRef.current = setInterval(() => { timeRef.current += 1; setRecordTime(t => t + 1); }, 1000);
  }, []);

  // ── Кнопки записи — onClick (работает на Android/iOS/Desktop) ─────────────
  const handleMicClick = useCallback(() => { beginRecord('voice'); }, [beginRecord]);
  const handleMicLongClick = useCallback(() => { beginRecord('transcribe'); }, [beginRecord]);

  const handleSendVoice = useCallback(async () => {
    stopTimer();
    const m = mode; setMode('idle'); setRecordTime(0);
    const blob = await stopMic();
    const dur = timeRef.current; timeRef.current = 0;
    if (m === 'transcribe') {
      setTranscribing(true);
      try {
        const t = blob.size > 500 ? await transcribeAudio(blob) : '';
        setInput(t || '');
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch { setInput(''); }
      finally { setTranscribing(false); }
    } else {
      // Сначала отправляем сообщение с локальным URL, потом обновляем на CDN
      const localUrl = blob.size > 100 ? URL.createObjectURL(blob) : undefined;
      onSend(`🎤 Голосовое сообщение (${dur}с)`, true, dur, localUrl);
      onInputBlur?.();
      // Загружаем в S3 в фоне — но это уже нужно для VoiceBubble через props
      if (blob.size > 100) uploadAudio(blob).catch(() => {});
    }
  }, [mode, onSend, onInputBlur]);

  const handleCancel = useCallback(() => {
    stopTimer(); killMic(); setMode('idle'); setTranscribing(false); setRecordTime(0); timeRef.current = 0; onInputBlur?.();
  }, [onInputBlur]);

  const handleSendText = useCallback(() => {
    if (sendLock.current || !input.trim()) return;
    sendLock.current = true;
    onSend(input.trim()); setInput('');
    setTimeout(() => { sendLock.current = false; }, 200);
    inputRef.current?.blur();
  }, [input, onSend]);

  useEffect(() => { if (!autoStartRecord) return; onAutoRecordDone?.(); beginRecord('voice'); }, [autoStartRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFocus = useCallback(() => { if (blurRef.current) clearTimeout(blurRef.current); setInputFocused(true); onInputFocus?.(); }, [onInputFocus]);
  const onBlur = useCallback(() => { blurRef.current = setTimeout(() => { setInputFocused(false); onInputBlur?.(); }, 200); }, [onInputBlur]);

  const fmt = (d: Date) => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // ── Long press для микрофона (кросс-платформенный) ──────────────────────
  const longRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLong = useRef(false);

  const micTouchStart = () => {
    wasLong.current = false;
    longRef.current = setTimeout(() => { wasLong.current = true; handleMicLongClick(); }, 1500);
  };
  const micTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (longRef.current) { clearTimeout(longRef.current); longRef.current = null; }
    if (!wasLong.current) handleMicClick();
  };
  const micTouchCancel = () => { if (longRef.current) { clearTimeout(longRef.current); longRef.current = null; } };

  return (
    <div className="flex flex-col h-full">
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border-b border-yellow-500/30">
          <Icon name="WifiOff" size={16} className="text-yellow-500" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Нет сети{pendingCount > 0 && ` — ${pendingCount} в очереди`}</span>
        </div>
      )}
      {!isOffline && pendingCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border-b border-blue-500/20">
          <Icon name="Loader" size={14} className="text-blue-500 animate-spin" />
          <span className="text-xs text-blue-600 dark:text-blue-400">Отправка {pendingCount} сообщений...</span>
        </div>
      )}

      {/* Сообщения */}
      <div ref={scrollRef} className={`overflow-y-auto px-3 py-2 space-y-3 min-h-0 transition-all ${inputFocused && !recording ? 'hidden' : 'flex-1'}`}>
        {chats.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Icon name="MessageSquare" size={48} className="opacity-30" /><span className="text-2xl">Нет сообщений</span>
          </div>
        )}
        {chats.map(msg => {
          const out = msg.text.startsWith('[Водитель]');
          return (
            <div key={msg.id} data-msg-id={msg.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 transition-all ${
                activeVoiceMsgId === msg.id ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
              } ${msg.type === 'important' ? 'bg-destructive/15 border border-destructive/30'
                : out ? ((msg.deliveryStatus === 'pending' || msg.deliveryStatus === 'failed') ? 'bg-primary/60' : 'bg-primary') + ' text-primary-foreground rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'}`}>
                {msg.type === 'important' && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon name="AlertTriangle" size={20} className="text-destructive" />
                    <span className="text-base font-bold text-destructive uppercase">Важное</span>
                  </div>
                )}
                {msg.isVoice ? (
                  <VoiceBubble msgId={msg.id} duration={msg.voiceDuration || 5} isOutgoing={out}
                    transcription={msg.transcription} audioUrl={msg.audioUrl}
                    autoPlay={activeVoiceMsgId === msg.id} onTranscribed={onTranscribed} />
                ) : (
                  <p className="text-3xl leading-snug">{msg.text}</p>
                )}
                <div className={`text-base mt-1 ${out ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                  {fmt(msg.timestamp)}{out && <DeliveryIcon status={msg.deliveryStatus} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Быстрые шаблоны */}
      {!inputFocused && !recording && !isMoving && (
        <div className="px-3 py-1.5 border-t border-border flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => onSend(t)} type="button"
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted text-base text-foreground whitespace-nowrap active:scale-95 ripple">{t}</button>
            ))}
          </div>
        </div>
      )}

      {/* Поле ввода */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
        {transcribing ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <Icon name="Loader" size={20} className="text-blue-500 animate-spin" />
            <span className="text-base text-blue-600 dark:text-blue-400 font-semibold flex-1">Распознаю речь...</span>
          </div>
        ) : recording ? (
          <div className={`flex items-center gap-2 p-3 rounded-2xl ${mode === 'transcribe' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <div className={`w-5 h-5 rounded-full animate-pulse flex-shrink-0 ${mode === 'transcribe' ? 'bg-blue-500' : 'bg-destructive'}`} />
            <span className={`text-base font-semibold flex-1 tabular-nums ${mode === 'transcribe' ? 'text-blue-600 dark:text-blue-400' : 'text-destructive'}`}>
              {mode === 'transcribe' ? '✍️' : '🎤'} {recordTime}с
            </span>
            <button onClick={handleCancel} type="button"
              className={`px-5 py-3 rounded-2xl text-white text-base font-semibold active:scale-95 ${mode === 'transcribe' ? 'bg-blue-500' : 'bg-destructive'}`}>
              Стоп
            </button>
            <button onClick={handleSendVoice} type="button"
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-base font-bold active:scale-95 flex items-center gap-2">
              <Icon name={mode === 'transcribe' ? 'FileText' : 'Send'} size={18} />
              {mode === 'transcribe' ? 'В текст' : 'Прислать'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {micError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
                <Icon name="AlertCircle" size={16} className="text-destructive flex-shrink-0" />
                <span className="text-sm text-destructive">{micError}</span>
                <button onClick={() => setMicError(null)} className="ml-auto text-destructive/60 hover:text-destructive">
                  <Icon name="X" size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendText()} onFocus={onFocus} onBlur={onBlur}
                placeholder={isOffline ? 'Сообщение (при подключении)...' : 'Сообщение диспетчеру...'}
                className={`flex-1 min-w-0 h-14 tablet:h-20 px-4 rounded-2xl bg-muted border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 transition-all ${
                  isOffline ? 'border-yellow-500/40 focus:ring-yellow-500/40' : 'border-border focus:ring-primary/40 focus:border-primary'}`} />

              {/* 🎤 Микрофон */}
              <button type="button"
                onTouchStart={micTouchStart}
                onTouchEnd={micTouchEnd}
                onTouchCancel={micTouchCancel}
                onClick={() => { if (!('ontouchstart' in window)) handleMicClick(); }}
                className="relative w-14 h-14 tablet:w-20 tablet:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 bg-muted border border-border active:bg-destructive/20 transition-all select-none">
                <Icon name="Mic" size={26} className="tablet:!w-9 tablet:!h-9 text-muted-foreground" />
              </button>

              <button type="button" onClick={handleSendText} disabled={!input.trim()}
                className={`w-14 h-14 tablet:w-20 tablet:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all elevation-1 ${
                  isOffline ? 'bg-yellow-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                <Icon name="Send" size={24} className="tablet:!w-8 tablet:!h-8" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}