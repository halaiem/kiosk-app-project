import { useState, useMemo, useEffect } from 'react';
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
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const phrase = useMemo(
    () => MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const weekday = time.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dayMonth = time.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const dispatcher = dispatcherName || 'Смирнова Е.В.';

  if (!open) return null;

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl mx-4 portrait:mx-auto portrait:w-[90%] kiosk-surface rounded-3xl elevation-4 overflow-hidden animate-in zoom-in-95 duration-300" style={{ minHeight: '67vh' }}>

        {/* LANDSCAPE: горизонтальный layout без изменений */}
        <div className="landscape:flex landscape:h-full hidden" style={{ minHeight: '67vh' }}>

          {/* LEFT 35% */}
          <div className="w-[35%] bg-gradient-to-b from-[#152d52] to-[#1e3a5f] flex flex-col items-center justify-center gap-5 px-7 py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
                <Icon name="LogOut" size={38} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white text-center">Завершить смену</h2>
            </div>
            <div className="text-center">
              <div className="font-bold text-white tabular-nums leading-none" style={{ fontSize: '70px' }}>{timeStr}</div>
              <div className="text-white/60 text-xl capitalize mt-2">{weekday}</div>
              <div className="text-white/60 text-xl mt-1">{dayMonth}</div>
            </div>
          </div>

          {/* RIGHT 65% */}
          <div className="w-[65%] p-6 space-y-4 flex flex-col justify-center">
            <div className="bg-muted rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={22} className="text-primary" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Водитель</div>
                  <div className="font-semibold text-foreground text-xl">{driver.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Route" size={22} className="text-accent-foreground" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Маршрут</div>
                  <div className="font-semibold text-foreground text-xl">№{driver.routeNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Bus" size={22} className="text-success" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Транспортное средство</div>
                  <div className="font-semibold text-foreground text-xl">{driver.vehicleNumber}</div>
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Icon name="Headset" size={20} className="text-primary" />
                <p className="text-lg text-muted-foreground">Оцените работу диспетчера</p>
              </div>
              <p className="text-xl font-semibold text-foreground">{dispatcher}</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRating(star)} onPointerEnter={() => setHoverRating(star)} onPointerLeave={() => setHoverRating(0)} className="p-1 transition-transform active:scale-90">
                    <Icon name="Star" size={42} className={`transition-colors ${star <= activeRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
              {rating > 0 && <p className="text-base text-muted-foreground">{rating <= 2 ? 'Спасибо за честную оценку' : rating <= 4 ? 'Хорошая оценка!' : 'Отличная оценка!'}</p>}
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
              <p className="text-lg font-bold text-foreground/80 italic leading-relaxed">«{phrase}»</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-muted text-foreground font-semibold text-xl transition-all active:scale-[0.97] ripple">Отменить</button>
              <button onClick={() => onConfirm(rating)} className="flex-1 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] ripple elevation-2">
                <Icon name="Hand" size={24} />До встречи
              </button>
            </div>
          </div>
        </div>

        {/* PORTRAIT: вертикальный layout */}
        <div className="portrait:flex landscape:hidden flex-col">

          {/* TOP — иконка + заголовок + время */}
          <div className="bg-gradient-to-b from-[#152d52] to-[#1e3a5f] flex flex-col items-center justify-center gap-4 px-8 py-7">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
                <Icon name="LogOut" size={38} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white text-center">Завершить смену</h2>
            </div>
            <div className="text-center">
              <div className="font-bold text-white tabular-nums leading-none" style={{ fontSize: '64px' }}>{timeStr}</div>
              <div className="text-white/60 text-lg capitalize mt-1">{weekday}</div>
              <div className="text-white/60 text-lg mt-0.5">{dayMonth}</div>
            </div>
          </div>

          {/* BOTTOM — всё остальное */}
          <div className="p-5 space-y-4 flex flex-col">
            <div className="bg-muted rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={22} className="text-primary" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Водитель</div>
                  <div className="font-semibold text-foreground text-xl">{driver.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Route" size={22} className="text-accent-foreground" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Маршрут</div>
                  <div className="font-semibold text-foreground text-xl">№{driver.routeNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Bus" size={22} className="text-success" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Транспортное средство</div>
                  <div className="font-semibold text-foreground text-xl">{driver.vehicleNumber}</div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Icon name="Headset" size={20} className="text-primary" />
                <p className="text-lg text-muted-foreground">Оцените работу диспетчера</p>
              </div>
              <p className="text-xl font-semibold text-foreground">{dispatcher}</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRating(star)} onPointerEnter={() => setHoverRating(star)} onPointerLeave={() => setHoverRating(0)} className="p-1 transition-transform active:scale-90">
                    <Icon name="Star" size={42} className={`transition-colors ${star <= activeRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
              {rating > 0 && <p className="text-base text-muted-foreground">{rating <= 2 ? 'Спасибо за честную оценку' : rating <= 4 ? 'Хорошая оценка!' : 'Отличная оценка!'}</p>}
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
              <p className="text-lg font-bold text-foreground/80 italic leading-relaxed">«{phrase}»</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-muted text-foreground font-semibold text-xl transition-all active:scale-[0.97] ripple">Отменить</button>
              <button onClick={() => onConfirm(rating)} className="flex-1 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] ripple elevation-2">
                <Icon name="Hand" size={24} />До встречи
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}