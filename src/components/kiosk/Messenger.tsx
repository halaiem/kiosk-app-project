import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Message } from '@/types/kiosk';

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
}

export default function Messenger({ messages, onSend, isMoving }: Props) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatMessages = messages.filter(m => m.type === 'dispatcher' || m.type === 'important').slice(0, 30);

  const handleFocus = useCallback(() => {
    setKeyboardOpen(true);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
  }, []);

  const handleBlur = useCallback(() => {
    setKeyboardOpen(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

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
      {!keyboardOpen && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
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
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.type === 'important'
                    ? 'bg-destructive/15 border border-destructive/30 text-destructive-foreground'
                    : isOutgoing
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}>
                  {msg.type === 'important' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon name="AlertTriangle" size={16} className="text-destructive" />
                      <span className="text-xs font-bold text-destructive uppercase">Важное</span>
                    </div>
                  )}
                  <p className="text-base leading-relaxed">{msg.text}</p>
                  <div className={`text-xs mt-1.5 ${isOutgoing ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>
                    {formatTime(msg.timestamp)}
                    {isOutgoing && <Icon name="CheckCheck" size={13} className="inline ml-1" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

      {!keyboardOpen && (!isMoving || input.length === 0) && (
        <div className="px-4 py-2 border-t border-border">
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => handleTemplate(tpl)}
                className="flex-shrink-0 px-4 py-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-sm text-foreground transition-all whitespace-nowrap active:scale-95 ripple"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0">
        {isRecording ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
            <div className="w-5 h-5 rounded-full bg-destructive animate-pulse" />
            <span className="text-lg text-destructive font-medium flex-1">
              Запись... {recordTime}с
            </span>
            <button
              onPointerUp={stopRecord}
              className="px-6 py-3 rounded-2xl bg-destructive text-white text-lg font-semibold ripple"
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
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Сообщение диспетчеру..."
              className="flex-1 min-w-0 h-20 px-4 rounded-2xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <button
              onPointerDown={startRecord}
              className="w-20 h-20 rounded-2xl bg-muted border border-border hover:bg-muted-foreground/20 flex items-center justify-center flex-shrink-0 active:bg-destructive/20 transition-all ripple"
              title="Голосовое сообщение (удерживайте)"
            >
              <Icon name="Mic" size={36} className="text-muted-foreground" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all ripple elevation-1"
            >
              <Icon name="Send" size={34} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
