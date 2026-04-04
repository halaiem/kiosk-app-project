import { useState, useRef, useEffect, useCallback } from 'react';
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
  onSend: (text: string) => void;
  isMoving: boolean;
  connection?: ConnectionStatus;
  pendingCount?: number;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onOpenFullscreen?: () => void;
  autoStartRecord?: boolean;
  onAutoRecordDone?: () => void;
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

export default function Messenger({ messages, onSend, isMoving, connection = 'online', pendingCount = 0, onInputFocus, onInputBlur, onOpenFullscreen, autoStartRecord, onAutoRecordDone }: Props) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimeRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatMessages = messages.filter(m => m.type === 'dispatcher' || m.type === 'important').slice(0, 50);
  const isOffline = connection === 'offline';

  // ── Запись ────────────────────────────────────────────────────────────────

  const startRecordNow = useCallback(() => {
    // Убираем фокус с input чтобы клавиатура не открылась
    inputRef.current?.blur();
    if (recordTimer.current) clearInterval(recordTimer.current);
    recordTimeRef.current = 0;
    setRecordTime(0);
    setIsRecording(true);
    recordTimer.current = setInterval(() => {
      recordTimeRef.current += 1;
      setRecordTime(t => t + 1);
    }, 1000);
  }, []);

  const stopRecordTimer = useCallback(() => {
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
  }, []);

  // Кнопка микрофона: всегда стартует запись прямо здесь
  const handleMicPress = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startRecordNow();
  }, [startRecordNow]);

  // Кнопка "Прислать" (только в режиме записи): отправляет голос
  const handleSendVoice = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const time = recordTimeRef.current;
    stopRecordTimer();
    setIsRecording(false);
    setRecordTime(0);
    recordTimeRef.current = 0;
    onSend(`🎤 Голосовое сообщение (${time}с)`);
    onInputBlur?.();
  }, [onSend, onInputBlur, stopRecordTimer]);

  // Кнопка "Стоп": отменяет запись без отправки
  const handleCancelVoice = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    stopRecordTimer();
    setIsRecording(false);
    setRecordTime(0);
    recordTimeRef.current = 0;
    onInputBlur?.();
  }, [onInputBlur, stopRecordTimer]);

  // ── Текст ─────────────────────────────────────────────────────────────────

  // Кнопка отправки текста (иконка Send): отправляет только текст
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

  // ── Авто-старт при открытии fullscreen ───────────────────────────────────

  useEffect(() => {
    if (!autoStartRecord) return;
    onAutoRecordDone?.();
    startRecordNow();
  }, [autoStartRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Скролл ────────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (inputFocused) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [inputFocused]);

  // ── Фокус input ──────────────────────────────────────────────────────────

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
      <div
        className={`overflow-y-auto px-3 py-2 space-y-2 min-h-0 transition-all duration-200 ${inputFocused && !isRecording ? 'hidden' : 'flex-1'}`}
      >
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Icon name="MessageSquare" size={48} className="opacity-30" />
            <span className="text-lg">Нет сообщений</span>
          </div>
        )}
        {[...chatMessages].map(msg => {
          const isOutgoing = msg.text.startsWith('[Водитель]');
          return (
            <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                msg.type === 'important'
                  ? 'bg-destructive/15 border border-destructive/30 text-destructive-foreground'
                  : isOutgoing
                  ? (msg.deliveryStatus === 'pending' || msg.deliveryStatus === 'failed')
                    ? 'bg-primary/60 text-primary-foreground rounded-br-sm'
                    : 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                {msg.type === 'important' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon name="AlertTriangle" size={16} className="text-destructive" />
                    <span className="text-xs font-bold text-destructive uppercase">Важное</span>
                  </div>
                )}
                <p className="text-sm leading-snug">{msg.text}</p>
                <div className={`text-[10px] mt-1 ${isOutgoing ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                  {formatTime(msg.timestamp)}
                  {isOutgoing && <DeliveryIcon status={msg.deliveryStatus} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Быстрые шаблоны — только без фокуса и без записи */}
      {!inputFocused && !isRecording && !isMoving && (
        <div className="px-3 py-1.5 border-t border-border flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onPointerDown={e => { e.preventDefault(); onSend(tpl); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted text-xs text-foreground whitespace-nowrap active:scale-95 ripple"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Поле ввода */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
        {isRecording ? (
          /* ── Режим записи голоса ── */
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/30">
            <div className="w-5 h-5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            <span className="text-base text-destructive font-semibold flex-1 tabular-nums">
              🎤 {recordTime}с
            </span>
            <button
              onPointerDown={handleCancelVoice}
              className="px-5 py-3 rounded-2xl bg-destructive text-white text-base font-semibold ripple active:scale-95"
            >
              Стоп
            </button>
            <button
              onPointerDown={handleSendVoice}
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-base font-bold ripple active:scale-95 flex items-center gap-2"
            >
              <Icon name="Send" size={18} />
              Прислать
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
            {/* Микрофон — стартует запись, не открывает клавиатуру */}
            <button
              onPointerDown={handleMicPress}
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