import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Message } from '@/types/kiosk';

interface ToastProps {
  message: Message;
  onConfirm: () => void;
  onReply: () => void;
  onYes?: () => void;
  onNo?: () => void;
  onPlayVoice?: () => void;
}

export function MessageToast({ message, onConfirm, onReply, onYes, onNo, onPlayVoice }: ToastProps) {
  const isVoice = message.isVoice;

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

  const iconName = isVoice ? 'Mic' : (icons[message.type] || 'Bell');
  const label = isVoice
    ? 'Голосовое сообщение'
    : message.type === 'dispatcher' ? 'Диспетчер' : message.type === 'can_error' ? 'CAN-система' : 'Уведомление';

  return (
    <div className={`animate-slide-in-down flex flex-col gap-5 p-6 md:p-10 rounded-3xl border-2 ${isVoice ? 'bg-white border-green-500/30' : (colors[message.type] || colors.normal)} w-full pointer-events-auto`}>
      <div className="flex items-start gap-4 md:gap-7">
        <div className={`w-14 h-14 md:w-24 md:h-24 rounded-2xl flex items-center justify-center flex-shrink-0
          ${isVoice ? 'bg-green-500/20' : message.type === 'can_error' ? 'bg-warning/20' : message.type === 'dispatcher' ? 'bg-primary/15' : 'bg-muted'}`}>
          <Icon name={iconName} size={28} className={`md:!w-12 md:!h-12 ${isVoice ? 'text-green-500' : message.type === 'can_error' ? 'text-warning-foreground' : message.type === 'dispatcher' ? 'text-primary' : 'text-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm md:text-xl font-bold text-muted-foreground uppercase mb-1">
            {label}
          </div>
          {isVoice ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onPlayVoice || onReply}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center active:scale-95 transition-all"
              >
                <Icon name="Play" size={24} className="text-white md:!w-8 md:!h-8" />
              </button>
              <div>
                <span className="text-lg md:text-3xl font-semibold text-foreground tabular-nums">
                  {message.voiceDuration ? `${message.voiceDuration} сек` : 'Голосовое'}
                </span>
                <p className="text-xs md:text-base text-muted-foreground mt-0.5">Нажмите ▶ для воспроизведения</p>
              </div>
            </div>
          ) : (
            <p className="text-lg md:text-3xl font-semibold text-foreground leading-snug">{message.text}</p>
          )}
        </div>
      </div>
      <div className="flex gap-3 md:gap-5">
        {isVoice ? (
          <>
            <button
              onClick={onPlayVoice || onReply}
              className="flex-1 h-14 md:h-24 rounded-2xl bg-green-500 text-white font-bold text-base md:text-2xl flex items-center justify-center gap-2 md:gap-4 active:scale-[0.98] transition-all ripple"
            >
              <Icon name="Play" size={24} className="md:!w-9 md:!h-9" />
              Прослушать
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-14 md:h-24 rounded-2xl bg-primary text-primary-foreground font-bold text-base md:text-2xl flex items-center justify-center gap-2 md:gap-4 active:scale-[0.98] transition-all ripple"
            >
              <Icon name="CheckCircle" size={24} className="md:!w-9 md:!h-9" />
              Принято
            </button>
          </>
        ) : (
          <div className="flex gap-3 md:gap-4 w-full">
            <button
              onClick={onConfirm}
              className="flex-1 h-14 md:h-24 rounded-2xl bg-primary text-primary-foreground font-bold text-base md:text-2xl flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all ripple"
            >
              <Icon name="CheckCircle" size={20} className="md:!w-8 md:!h-8" />
              Принято
            </button>
            {onYes && (
              <button
                onClick={onYes}
                className="flex-1 h-14 md:h-24 rounded-2xl bg-emerald-500 text-white font-bold text-base md:text-2xl flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all ripple"
              >
                <Icon name="ThumbsUp" size={20} className="md:!w-8 md:!h-8" />
                Да
              </button>
            )}
            {onNo && (
              <button
                onClick={onNo}
                className="flex-1 h-14 md:h-24 rounded-2xl bg-rose-500 text-white font-bold text-base md:text-2xl flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all ripple"
              >
                <Icon name="ThumbsDown" size={20} className="md:!w-8 md:!h-8" />
                Нет
              </button>
            )}
            <button
              onClick={onReply}
              className="flex-1 h-14 md:h-24 rounded-2xl bg-green-500 text-white font-bold text-base md:text-2xl flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all ripple"
            >
              <Icon name="MessageSquare" size={20} className="md:!w-8 md:!h-8" />
              Ответить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ImportantProps {
  message: Message;
  onConfirm: () => void;
  onReply: () => void;
  onYes?: () => void;
  onNo?: () => void;
}

export function ImportantMessageOverlay({ message, onConfirm, onReply, onYes, onNo }: ImportantProps) {
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
        <div className="bg-destructive rounded-t-3xl p-6 md:p-10 flex items-center gap-4 md:gap-7">
          <div className="w-16 h-16 md:w-28 md:h-28 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon name="AlertOctagon" size={40} className="md:!w-16 md:!h-16 text-white" />
          </div>
          <div>
            <div className="text-white/80 text-sm md:text-xl font-medium uppercase tracking-wide">⚠️ ВАЖНОЕ СООБЩЕНИЕ</div>
            <div className="text-white font-bold text-xl md:text-4xl">Требует подтверждения</div>
          </div>
          <div className="ml-auto text-white/70 text-2xl md:text-5xl font-mono tabular-nums">{elapsed}с</div>
        </div>

        <div className="bg-card rounded-b-3xl p-6 md:p-10">
          <p className="text-foreground text-lg md:text-3xl leading-relaxed mb-6 md:mb-10">{message.text}</p>

          <div className="flex items-center justify-between text-xs md:text-lg text-muted-foreground mb-5 md:mb-8">
            <span>{new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-1 md:gap-2">
              <Icon name="Clock" size={14} className="md:!w-5 md:!h-5" />
              Время реакции фиксируется
            </span>
          </div>

          <div className="flex gap-3 md:gap-4">
            <button
              onClick={() => dismiss(onConfirm)}
              className="flex-1 py-5 md:py-9 rounded-2xl bg-destructive text-white font-bold text-xl md:text-3xl flex items-center justify-center gap-2 md:gap-4 active:scale-[0.98] transition-all ripple animate-scale-bounce"
            >
              <Icon name="CheckCircle2" size={28} className="md:!w-11 md:!h-11" />
              Принял
            </button>
            {onYes && (
              <button
                onClick={() => dismiss(onYes)}
                className="flex-1 py-5 md:py-9 rounded-2xl bg-emerald-500 text-white font-bold text-xl md:text-3xl flex items-center justify-center gap-2 md:gap-4 active:scale-[0.98] transition-all ripple"
              >
                <Icon name="ThumbsUp" size={28} className="md:!w-11 md:!h-11" />
                Да
              </button>
            )}
            {onNo && (
              <button
                onClick={() => dismiss(onNo)}
                className="flex-1 py-5 md:py-9 rounded-2xl bg-rose-500 text-white font-bold text-xl md:text-3xl flex items-center justify-center gap-2 md:gap-4 active:scale-[0.98] transition-all ripple"
              >
                <Icon name="ThumbsDown" size={28} className="md:!w-11 md:!h-11" />
                Нет
              </button>
            )}
            <button
              onClick={() => dismiss(onReply)}
              className="flex-1 py-5 md:py-9 rounded-2xl bg-green-600 text-white font-bold text-xl md:text-3xl flex items-center justify-center gap-2 md:gap-4 active:scale-[0.98] transition-all ripple"
            >
              <Icon name="MessageSquare" size={28} className="md:!w-11 md:!h-11" />
              Ответить
            </button>
          </div>

          <p className="text-center text-xs md:text-lg text-muted-foreground mt-3 md:mt-5">
            Нажмите кнопку для продолжения.
          </p>
        </div>
      </div>
    </div>
  );
}