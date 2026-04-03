import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

export default function Messenger({ messages, onSend, isMoving, connection = 'online', pendingCount = 0, onInputFocus, onInputBlur }: Props) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatMessages = messages.filter(m => m.type === 'dispatcher' || m.type === 'important').slice(0, 50);
  const isOffline = connection === 'offline';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setInputFocused(true);
    onInputFocus?.();
  }, [onInputFocus]);

  const handleBlur = useCallback(() => {
    blurTimerRef.current = setTimeout(() => {
      setInputFocused(false);
      onInputBlur?.();
    }, 200);
  }, [onInputBlur]);

  const handleSend = useCallback(() => {
    if (sendingRef.current) return;
    if (!input.trim()) return;
    sendingRef.current = true;
    onSend(input.trim());
    setInput('');
    setTimeout(() => { sendingRef.current = false; }, 200);
    inputRef.current?.focus();
  }, [input, onSend]);

  const handleSendPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  const startRecord = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setIsRecording(true);
    setInputFocused(true);
    setRecordTime(0);
    recordTimer.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    onInputFocus?.();
  }, [onInputFocus]);

  const stopRecord = useCallback(() => {
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    onSend(`🎤 Голосовое сообщение (${recordTime}с)`);
    setRecordTime(0);
    setInputFocused(false);
    onInputBlur?.();
  }, [recordTime, onSend, onInputBlur]);

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // Панель ввода — рендерится через portal fixed внизу экрана
  // благодаря interactive-widget=resizes-content браузер поднимает её над клавиатурой
  const inputPanel = (
    <div
      className="fixed inset-x-0 bottom-0 z-[9998] border-t-2 border-primary/20 shadow-2xl"
      style={{ backgroundColor: 'hsl(var(--card))' }}
    >
      {isRecording ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-5 h-5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
          <span className="text-base text-destructive font-semibold flex-1 tabular-nums">
            🎤 Запись... {recordTime}с
          </span>
          <button
            onPointerDown={e => { e.preventDefault(); stopRecord(); }}
            className="px-6 py-3 rounded-2xl bg-destructive text-white text-base font-bold ripple active:scale-95"
          >
            Стоп
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isOffline ? 'Сообщение (отправится при подключении)...' : 'Сообщение диспетчеру...'}
            className={`flex-1 min-w-0 h-14 px-4 rounded-2xl bg-muted border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 transition-all ${
              isOffline
                ? 'border-yellow-500/40 focus:ring-yellow-500/40 focus:border-yellow-500'
                : 'border-border focus:ring-primary/40 focus:border-primary'
            }`}
          />
          <button
            onPointerDown={e => { e.preventDefault(); startRecord(); }}
            className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center flex-shrink-0 active:bg-destructive/20 transition-all ripple"
          >
            <Icon name="Mic" size={26} className="text-muted-foreground" />
          </button>
          <button
            onPointerDown={handleSendPointerDown}
            onTouchEnd={e => e.preventDefault()}
            disabled={!input.trim()}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all ripple elevation-1 ${
              isOffline ? 'bg-yellow-500 text-white' : 'bg-primary text-primary-foreground'
            }`}
          >
            <Icon name="Send" size={24} />
          </button>
        </div>
      )}
    </div>
  );

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

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto px-3 tablet:px-4 py-2 tablet:py-3 space-y-2 tablet:space-y-3 min-h-0">
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
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 tablet:px-4 tablet:py-3 ${
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
                <p className="text-sm tablet:text-base leading-snug tablet:leading-relaxed">{msg.text}</p>
                <div className={`text-[10px] tablet:text-xs mt-1 tablet:mt-1.5 ${isOutgoing ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                  {formatTime(msg.timestamp)}
                  {isOutgoing && <DeliveryIcon status={msg.deliveryStatus} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Быстрые шаблоны — только когда нет фокуса */}
      {!inputFocused && !isRecording && !isMoving && (
        <div className="px-3 tablet:px-4 py-1.5 border-t border-border flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onPointerDown={e => { e.preventDefault(); onSend(tpl); }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-xs text-foreground transition-all whitespace-nowrap active:scale-95 ripple"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Статичное поле ввода внизу (заглушка под размер) — всегда видно */}
      <div
        className="px-3 pb-3 pt-1.5 border-t border-border flex-shrink-0"
        style={{ visibility: inputFocused || isRecording ? 'hidden' : 'visible' }}
      >
        <div className="flex items-center gap-2">
          <div
            onPointerDown={() => { inputRef.current?.focus(); }}
            className={`flex-1 h-14 px-4 rounded-2xl bg-muted border flex items-center text-muted-foreground text-base cursor-text ${
              isOffline ? 'border-yellow-500/40' : 'border-border'
            }`}
          >
            {isOffline ? 'Сообщение (отправится при подключении)...' : 'Сообщение диспетчеру...'}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <Icon name="Mic" size={26} className="text-muted-foreground" />
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 opacity-40 ${
            isOffline ? 'bg-yellow-500 text-white' : 'bg-primary text-primary-foreground'
          }`}>
            <Icon name="Send" size={24} />
          </div>
        </div>
      </div>

      {/* Portal: фиксированная панель ввода — поднимается над клавиатурой */}
      {(inputFocused || isRecording) && createPortal(inputPanel, document.body)}
    </div>
  );
}
