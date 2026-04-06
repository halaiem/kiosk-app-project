import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';

interface AlertData {
  id: string;
  icon: string;
  color: string;
  text: string;
  sub: string;
}

interface Props {
  alert: AlertData;
  onConfirm: () => void;
  onReply?: () => void;
  onYes?: () => void;
  onNo?: () => void;
}

export default function DispatcherAlert({ alert, onConfirm, onReply, onYes, onNo }: Props) {
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 300);
  };

  return (
    <div
      className="w-full"
      style={{ transition: 'opacity 0.3s', opacity: visible ? 1 : 0 }}
    >
      <div
        className="w-full"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(60px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', opacity: visible ? 1 : 0 }}
      >
        <div className="flex justify-center mb-4 md:mb-7">
          <div className={`relative w-16 h-16 md:w-28 md:h-28 rounded-full ${alert.color} flex items-center justify-center shadow-2xl`}>
            <div className={`absolute inset-0 rounded-full ${alert.color} animate-ping opacity-40`} />
            <Icon name={alert.icon} size={36} className="md:!w-14 md:!h-14 text-white relative z-10" />
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-3xl overflow-hidden shadow-2xl">
          <div className={`${alert.color} px-6 md:px-10 py-4 md:py-6 flex items-center justify-between`}>
            <span className="text-white font-bold text-base md:text-2xl tracking-wide uppercase">Сообщение диспетчера</span>
            <span className="text-white/70 text-sm md:text-xl tabular-nums">{timeStr}</span>
          </div>

          <div className="px-6 md:px-10 py-6 md:py-10">
            <p className="text-foreground text-xl md:text-4xl font-bold leading-snug mb-2 md:mb-4">{alert.text}</p>
            <p className="text-muted-foreground text-base md:text-2xl">{alert.sub}</p>
          </div>

          <div className="px-6 md:px-10 pb-6 md:pb-10 flex gap-3 md:gap-4">
            <button
              onClick={handleConfirm}
              className="flex-[2] h-14 md:h-24 rounded-2xl bg-orange-500 text-white font-bold text-lg md:text-3xl ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 md:gap-4"
            >
              <Icon name="CheckCircle" size={24} className="md:!w-9 md:!h-9" />
              Принято
            </button>
            {onYes && (
              <button
                onClick={() => { handleConfirm(); setTimeout(() => onYes(), 300); }}
                className="flex-[1] h-14 md:h-24 rounded-2xl bg-emerald-500 text-white font-bold text-lg md:text-3xl ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 md:gap-4"
              >
                <Icon name="ThumbsUp" size={24} className="md:!w-9 md:!h-9" />
                Да
              </button>
            )}
            {onNo && (
              <button
                onClick={() => { handleConfirm(); setTimeout(() => onNo(), 300); }}
                className="flex-[1] h-14 md:h-24 rounded-2xl bg-rose-500 text-white font-bold text-lg md:text-3xl ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 md:gap-4"
              >
                <Icon name="ThumbsDown" size={24} className="md:!w-9 md:!h-9" />
                Нет
              </button>
            )}
            {onReply && (
              <button
                onClick={() => { handleConfirm(); setTimeout(() => onReply(), 350); }}
                className="flex-[2] h-14 md:h-24 rounded-2xl bg-green-500 text-white font-bold text-lg md:text-3xl ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 md:gap-4"
              >
                <Icon name="MessageSquare" size={24} className="md:!w-9 md:!h-9" />
                Ответить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}