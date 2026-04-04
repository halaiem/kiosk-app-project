import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Driver } from '@/types/kiosk';

const MOTIVATIONAL_PHRASES = [
  'Каждый ваш рейс — это сотни людей, которые добрались вовремя. Вы важны!',
  'Город не спит благодаря вам. Завтра маршрут снова ждёт своего лучшего водителя!',
  'Профессионал за рулём — это вы. Отдыхайте и возвращайтесь с новыми силами!',
  'Вы — надёжное звено городского транспорта. До завтра, капитан маршрута!',
  'Отличная работа на линии! Пассажиры ценят ваш труд, даже если не говорят об этом.',
  'Безопасность и точность — ваш почерк. Отдохните, завтра новый день и новые рейсы!',
  'Настоящий профессионал не просто водит — он дарит людям уверенность. Спасибо вам!',
  'За рулём — мастер своего дела. Восстанавливайте силы, маршрут без вас не тот!',
  'Ваша смена завершена, но ваш вклад остаётся. Город благодарен — до встречи!',
  'Дорога покоряется тем, кто любит своё дело. Вы — один из лучших. До завтра!',
];

interface Props {
  open: boolean;
  driver: Driver;
  dispatcherName?: string;
  onClose: () => void;
  onConfirm: (rating: number) => void;
}

export default function EndShiftModal({ open, driver, dispatcherName, onClose, onConfirm }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const phrase = useMemo(
    () => MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  const now = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const dispatcher = dispatcherName || 'Смирнова Е.В.';

  if (!open) return null;

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md md:max-w-xl mx-4 kiosk-surface rounded-3xl elevation-4 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#152d52] to-[#1e3a5f] p-4 md:p-5 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/15 mb-2">
            <Icon name="LogOut" size={24} className="text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white">Завершить смену</h2>
          <p className="text-white/70 text-xs md:text-sm mt-1 capitalize">{dateStr}, {timeStr}</p>
        </div>

        <div className="p-4 md:p-5 space-y-3 md:space-y-4">
          <div className="bg-muted rounded-2xl p-3 md:p-4 space-y-1.5 md:space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Icon name="User" size={14} className="text-primary" />
              </div>
              <div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Водитель</div>
                <div className="font-semibold text-foreground text-xs md:text-sm">{driver.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Icon name="Route" size={14} className="text-accent-foreground" />
              </div>
              <div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Маршрут</div>
                <div className="font-semibold text-foreground text-xs md:text-sm">№{driver.routeNumber}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                <Icon name="Bus" size={14} className="text-success" />
              </div>
              <div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Транспортное средство</div>
                <div className="font-semibold text-foreground text-xs md:text-sm">{driver.vehicleNumber}</div>
              </div>
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <Icon name="Headset" size={16} className="text-primary" />
              <p className="text-xs md:text-sm text-muted-foreground">Оцените работу диспетчера</p>
            </div>
            <p className="text-sm md:text-base font-semibold text-foreground">{dispatcher}</p>
            <div className="flex items-center justify-center gap-1.5 md:gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onPointerEnter={() => setHoverRating(star)}
                  onPointerLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform active:scale-90"
                >
                  <Icon
                    name="Star"
                    size={32}
                    className={`md:!w-9 md:!h-9 transition-colors ${
                      star <= activeRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {rating <= 2 ? 'Спасибо за честную оценку' : rating <= 4 ? 'Хорошая оценка!' : 'Отличная оценка!'}
              </p>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 md:p-5 text-center">
            <p className="text-base md:text-xl font-bold text-foreground/80 italic leading-relaxed">«{phrase}»</p>
          </div>

          <div className="flex gap-3 pt-0.5">
            <button
              onClick={onClose}
              className="flex-1 py-3 md:py-3.5 rounded-2xl bg-muted text-foreground font-semibold text-sm md:text-base transition-all active:scale-[0.97] ripple"
            >
              Отменить
            </button>
            <button
              onClick={() => onConfirm(rating)}
              className="flex-1 py-3 md:py-3.5 rounded-2xl bg-[#152d52] text-white font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] ripple elevation-2"
            >
              <Icon name="Hand" size={16} />
              До встречи
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
