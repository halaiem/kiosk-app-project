import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Message } from '@/types/kiosk';

interface ToastProps {
  message: Message;
  onConfirm: () => void;
  onReply: () => void;
}

export function MessageToast({ message, onConfirm, onReply }: ToastProps) {
  const icons: Record<string, string> = {
    normal: 'MessageSquare',
    dispatcher: 'Radio',
    can_error: 'AlertTriangle',
    important: 'AlertOctagon',
  };

  const colors: Record<string, string> = {
    normal: 'bg-card border-border',
    dispatcher: 'bg-primary/10 border-primary/30',
    can_error: 'bg-warning/10 border-warning/30',
    important: 'bg-destructive/10 border-destructive/30',
  };

  return (
    <div className={`animate-slide-in-down flex flex-col gap-5 p-8 rounded-3xl border-2 ${colors[message.type] || colors.normal} elevation-3 w-full pointer-events-auto`}>
      <div className="flex items-start gap-5">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
          ${message.type === 'can_error' ? 'bg-warning/20' : message.type === 'dispatcher' ? 'bg-primary/15' : 'bg-muted'}`}>
          <Icon name={icons[message.type] || 'Bell'} size={32}
            className={message.type === 'can_error' ? 'text-warning-foreground' : message.type === 'dispatcher' ? 'text-primary' : 'text-foreground'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-muted-foreground uppercase mb-1">
            {message.type === 'dispatcher' ? 'Диспетчер' : message.type === 'can_error' ? 'CAN-система' : 'Уведомление'}
          </div>
          <p className="text-xl font-semibold text-foreground leading-snug">{message.text}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all ripple"
        >
          <Icon name="CheckCircle" size={28} />
          Принято
        </button>
        <button
          onClick={onReply}
          className="flex-1 h-16 rounded-2xl bg-green-500 text-white font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all ripple"
        >
          <Icon name="MessageSquare" size={28} />
          Ответить
        </button>
      </div>
    </div>
  );
}

interface ImportantProps {
  message: Message;
  onConfirm: () => void;
  onReply: () => void;
}

export function ImportantMessageOverlay({ message, onConfirm, onReply }: ImportantProps) {
  const [elapsed, setElapsed] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (cb: () => void) => {
    setLeaving(true);
    setTimeout(cb, 300);
  };

  return (
    <div className="animate-fade-in w-full">
      <div className="fixed inset-0 border-4 border-destructive animate-pulse pointer-events-none rounded-none z-0" />

      <div className={`relative z-10 w-full transition-all duration-300 ${leaving ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="bg-destructive rounded-t-3xl p-8 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon name="AlertOctagon" size={48} className="text-white" />
          </div>
          <div>
            <div className="text-white/80 text-lg font-medium uppercase tracking-wide">⚠️ ВАЖНОЕ СООБЩЕНИЕ</div>
            <div className="text-white font-bold text-2xl">Требует подтверждения</div>
          </div>
          <div className="ml-auto text-white/70 text-3xl font-mono tabular-nums">{elapsed}с</div>
        </div>

        <div className="bg-card rounded-b-3xl p-8 elevation-4">
          <p className="text-foreground text-xl leading-relaxed mb-8">{message.text}</p>

          <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
            <span>{new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-2">
              <Icon name="Clock" size={16} />
              Время реакции фиксируется
            </span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => dismiss(onConfirm)}
              className="flex-1 py-7 rounded-2xl bg-destructive text-white font-bold text-2xl flex items-center justify-center gap-4 elevation-3 active:scale-[0.98] transition-all ripple animate-scale-bounce"
            >
              <Icon name="CheckCircle2" size={36} />
              Принял
            </button>
            <button
              onClick={() => dismiss(onReply)}
              className="flex-1 py-7 rounded-2xl bg-green-600 text-white font-bold text-2xl flex items-center justify-center gap-4 elevation-3 active:scale-[0.98] transition-all ripple"
            >
              <Icon name="MessageSquare" size={36} />
              Ответить
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Нажмите кнопку для продолжения.
          </p>
        </div>
      </div>
    </div>
  );
}
