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
  const chatMessages = messages.filter(m => m.type === 'dispatcher' || m.type === 'important').slice(0, 50);
  const isOffline = connection === 'offline';

  const handleFocus = useCallback(() => {
    setInputFocused(true);
    onInputFocus?.();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
  }, [onInputFocus]);

  const handleBlur = useCallback(() => {
    // Задержка чтобы дать время onPointerDown кнопки отправить сработать до blur
    setTimeout(() => {
      setInputFocused(false);
      onInputBlur?.();
    }, 100);
  }, [onInputBlur]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (sendingRef.current) return;
    if (!input.trim()) return;
    sendingRef.current = true;
    onSend(input.trim());
    setInput('');
    // Снимаем блокировку после отправки
    setTimeout(() => { sendingRef.current = false; }, 200);
  }, [input, onSend]);

  const handleSendPointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    // preventDefault чтобы не вызвать blur на input (клавиатура не закроется)
    e.preventDefault();
    handleSend();
    // Вернуть фокус на input чтобы клавиатура не закрывалась
    inputRef.current?.focus();
  }, [handleSend]);

  const handleTemplate = (tpl: string) => {
    onSend(tpl);
  };

  const startRecord = () => {
    setIsRecording(true);
    setRecordTime(0);
    recordTimer.current = setInterval(() => setRecordTime(t => t + 1), 1000);
  };

  const stopRecord = () => {
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    onSend(`🎤 Голосовое сообщение (${recordTime}с)`);
    setRecordTime(0);
  };

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full">
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border-b border-yellow-500/30">
          <Icon name="WifiOff" size={16} className="text-yellow-500" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Нет сети
            {pendingCount > 0 && ` — ${pendingCount} сообщ. в очереди`}
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

      {!inputFocused && (!isMoving || input.length === 0) && (
        <div className="px-3 tablet:px-4 py-1.5 tablet:py-2 border-t border-border flex-shrink-0">
          <div className="flex gap-2 tablet:gap-2.5 overflow-x-auto pb-0.5 tablet:pb-1" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => handleTemplate(tpl)}
                className="flex-shrink-0 px-3 tablet:px-4 py-1.5 tablet:py-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-xs tablet:text-sm text-foreground transition-all whitespace-nowrap active:scale-95 ripple"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 tablet:px-4 pb-3 tablet:pb-4 pt-1.5 tablet:pt-2 border-t border-border flex-shrink-0">
        {isRecording ? (
          <div className="flex items-center gap-3 p-3 tablet:p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
            <div className="w-4 h-4 tablet:w-5 tablet:h-5 rounded-full bg-destructive animate-pulse" />
            <span className="text-base tablet:text-lg text-destructive font-medium flex-1">
              Запись... {recordTime}с
            </span>
            <button
              onPointerUp={stopRecord}
              className="px-5 py-2.5 tablet:px-6 tablet:py-3 rounded-2xl bg-destructive text-white text-base tablet:text-lg font-semibold ripple"
            >
              Стоп
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              onFocus={e => { handleFocus(); setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400); }}
              onBlur={handleBlur}
              placeholder={isOffline ? "Сообщение (отправится при подключении)..." : "Сообщение диспетчеру..."}
              className={`flex-1 min-w-0 h-14 tablet:h-20 px-4 rounded-2xl bg-muted border text-foreground placeholder:text-muted-foreground text-sm tablet:text-base focus:outline-none focus:ring-2 transition-all ${
                isOffline
                  ? 'border-yellow-500/40 focus:ring-yellow-500/40 focus:border-yellow-500'
                  : 'border-border focus:ring-primary/40 focus:border-primary'
              }`}
            />
            <button
              onPointerDown={startRecord}
              className="w-14 h-14 tablet:w-20 tablet:h-20 rounded-2xl bg-muted border border-border hover:bg-muted-foreground/20 flex items-center justify-center flex-shrink-0 active:bg-destructive/20 transition-all ripple"
              title="Голосовое сообщение (удерживайте)"
            >
              <Icon name="Mic" size={28} className="text-muted-foreground tablet:!w-9 tablet:!h-9" />
            </button>
            <button
              onPointerDown={handleSendPointerDown}
              onTouchEnd={e => e.preventDefault()}
              disabled={!input.trim()}
              className={`w-14 h-14 tablet:w-20 tablet:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all ripple elevation-1 ${
                isOffline
                  ? 'bg-yellow-500 text-white'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <Icon name="Send" size={26} className="tablet:!w-[34px] tablet:!h-[34px]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}