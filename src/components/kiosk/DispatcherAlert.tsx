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
}

export default function DispatcherAlert({ alert, onConfirm, onReply }: Props) {
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
        <div className="flex justify-center mb-5">
          <div className={`relative w-24 h-24 rounded-full ${alert.color} flex items-center justify-center shadow-2xl`}>
            <div className={`absolute inset-0 rounded-full ${alert.color} animate-ping opacity-40`} />
            <Icon name={alert.icon} size={48} className="text-white relative z-10" />
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-3xl overflow-hidden shadow-2xl">
          <div className={`${alert.color} px-8 py-5 flex items-center justify-between`}>
            <span className="text-white font-bold text-lg tracking-wide uppercase">Сообщение диспетчера</span>
            <span className="text-white/70 text-base tabular-nums">{timeStr}</span>
          </div>

          <div className="px-8 py-8">
            <p className="text-foreground text-2xl font-bold leading-snug mb-3">{alert.text}</p>
            <p className="text-muted-foreground text-lg">{alert.sub}</p>
          </div>

          <div className="px-8 pb-8 flex gap-4">
            <button
              onClick={handleConfirm}
              className="flex-1 h-20 rounded-2xl bg-orange-500 text-white font-bold text-xl ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <Icon name="CheckCircle" size={32} />
              Принято
            </button>
            {onReply && (
              <button
                onClick={() => { handleConfirm(); setTimeout(() => onReply(), 350); }}
                className="flex-1 h-20 rounded-2xl bg-green-500 text-white font-bold text-xl ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <Icon name="MessageSquare" size={32} />
                Ответить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
