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
    <div className={`animate-slide-in-down flex flex-col gap-3 p-4 rounded-2xl border ${colors[message.type] || colors.normal} elevation-3 w-full pointer-events-auto`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          ${message.type === 'can_error' ? 'bg-warning/20' : message.type === 'dispatcher' ? 'bg-primary/15' : 'bg-muted'}`}>
          <Icon name={icons[message.type] || 'Bell'} size={18}
            className={message.type === 'can_error' ? 'text-warning-foreground' : message.type === 'dispatcher' ? 'text-primary' : 'text-foreground'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-0.5">
            {message.type === 'dispatcher' ? 'Диспетчер' : message.type === 'can_error' ? 'CAN-система' : 'Уведомление'}
          </div>
          <p className="text-sm text-foreground">{message.text}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ripple"
        >
          <Icon name="CheckCircle" size={18} />
          Принято
        </button>
        <button
          onClick={onReply}
          className="flex-1 h-11 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ripple"
        >
          <Icon name="MessageSquare" size={18} />
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
        <div className="bg-destructive rounded-t-3xl p-5 flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon name="AlertOctagon" size={32} className="text-white" />
          </div>
          <div>
            <div className="text-white/80 text-sm font-medium uppercase tracking-wide">⚠️ ВАЖНОЕ СООБЩЕНИЕ</div>
            <div className="text-white font-bold text-xl">Требует подтверждения</div>
          </div>
          <div className="ml-auto text-white/70 text-2xl font-mono tabular-nums">{elapsed}с</div>
        </div>

        <div className="bg-card rounded-b-3xl p-6 elevation-4">
          <p className="text-foreground text-base leading-relaxed mb-6">{message.text}</p>

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-5">
            <span>{new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-1">
              <Icon name="Clock" size={12} />
              Время реакции фиксируется
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => dismiss(onConfirm)}
              className="flex-1 py-5 rounded-2xl bg-destructive text-white font-bold text-xl flex items-center justify-center gap-3 elevation-3 active:scale-[0.98] transition-all ripple animate-scale-bounce"
            >
              <Icon name="CheckCircle2" size={28} />
              Принял
            </button>
            <button
              onClick={() => dismiss(onReply)}
              className="flex-1 py-5 rounded-2xl bg-green-600 text-white font-bold text-xl flex items-center justify-center gap-3 elevation-3 active:scale-[0.98] transition-all ripple"
            >
              <Icon name="MessageSquare" size={28} />
              Ответить
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Нажмите кнопку для продолжения.
          </p>
        </div>
      </div>
    </div>
  );
}