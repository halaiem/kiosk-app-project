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
      <div className="w-full max-w-md md:max-w-2xl mx-4 kiosk-surface rounded-3xl elevation-4 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-[#152d52] to-[#1e3a5f] p-5 md:p-7 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-18 md:h-18 rounded-full bg-white/15 mb-3">
            <Icon name="LogOut" size={28} className="text-white md:hidden" />
            <Icon name="LogOut" size={36} className="text-white hidden md:block" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Завершить смену</h2>
          <p className="text-white/70 text-sm md:text-base mt-1 capitalize">{dateStr}, {timeStr}</p>
        </div>

        <div className="p-5 md:p-7 space-y-4 md:space-y-5">
          <div className="bg-muted rounded-2xl p-4 md:p-5 space-y-2 md:space-y-3">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Icon name="User" size={16} className="text-primary md:hidden" />
                <Icon name="User" size={20} className="text-primary hidden md:block" />
              </div>
              <div>
                <div className="text-xs md:text-sm text-muted-foreground">Водитель</div>
                <div className="font-semibold text-foreground text-sm md:text-base">{driver.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Icon name="Route" size={16} className="text-accent-foreground md:hidden" />
                <Icon name="Route" size={20} className="text-accent-foreground hidden md:block" />
              </div>
              <div>
                <div className="text-xs md:text-sm text-muted-foreground">Маршрут</div>
                <div className="font-semibold text-foreground text-sm md:text-base">№{driver.routeNumber}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
                <Icon name="Bus" size={16} className="text-success md:hidden" />
                <Icon name="Bus" size={20} className="text-success hidden md:block" />
              </div>
              <div>
                <div className="text-xs md:text-sm text-muted-foreground">Транспортное средство</div>
                <div className="font-semibold text-foreground text-sm md:text-base">{driver.vehicleNumber}</div>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Icon name="Headset" size={18} className="text-primary" />
              <p className="text-sm md:text-base text-muted-foreground">Оцените работу диспетчера</p>
            </div>
            <p className="text-base md:text-lg font-semibold text-foreground">{dispatcher}</p>
            <div className="flex items-center justify-center gap-2 md:gap-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onPointerEnter={() => setHoverRating(star)}
                  onPointerLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Icon
                    name="Star"
                    size={36}
                    className={`md:!w-11 md:!h-11 transition-colors ${
                      star <= activeRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {rating <= 2 ? 'Спасибо за честную оценку' : rating <= 4 ? 'Хорошая оценка!' : 'Отличная оценка!'}
              </p>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 md:p-7 text-center">
            <p className="text-lg md:text-2xl text-foreground/80 italic leading-relaxed">«{phrase}»</p>
          </div>

          <div className="flex gap-3 md:gap-4 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 md:py-4 rounded-2xl bg-muted text-foreground font-semibold text-base md:text-lg transition-all active:scale-[0.97] ripple"
            >
              Отменить
            </button>
            <button
              onClick={() => onConfirm(rating)}
              className="flex-1 py-3.5 md:py-4 rounded-2xl bg-[#152d52] text-white font-semibold text-base md:text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] ripple elevation-2"
            >
              <Icon name="Hand" size={18} />
              До встречи
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
