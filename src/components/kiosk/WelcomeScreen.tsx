import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Driver } from '@/types/kiosk';

interface Props {
  driver: Driver;
  onStart: () => void;
}

export default function WelcomeScreen({ driver, onStart }: Props) {
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const vehicleIcon = driver.vehicleType === 'tram' ? 'Tram' : 'Bus';
  const vehicleLabel = driver.vehicleType === 'tram' ? 'Трамвай' : 'Троллейбус';
  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex h-full w-full kiosk-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="absolute top-20 -left-20 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-success/8 blur-3xl" />
      </div>

      <div className={`relative z-10 flex w-full h-full transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} landscape:flex-row portrait:flex-col`}>

        {/* LEFT/TOP — иконка успеха + время | portrait: верхняя половина, по центру, крупно */}
        <div className="landscape:w-[40%] portrait:h-[45%] flex flex-col items-center justify-center gap-6 px-8 portrait:gap-5">
          <div className="flex flex-col items-center gap-4">
            <div className="inline-flex items-center justify-center w-32 h-32 portrait:w-36 portrait:h-36 rounded-full bg-success/15 animate-scale-bounce">
              <div className="w-24 h-24 portrait:w-28 portrait:h-28 rounded-full bg-success/25 flex items-center justify-center">
                <Icon name="CheckCircle2" size={56} className="text-success landscape:block portrait:hidden" />
                <Icon name="CheckCircle2" size={72} className="text-success landscape:hidden portrait:block" />
              </div>
            </div>
            <p className="text-lg text-muted-foreground font-medium">Наряд подтверждён</p>
          </div>

          <div className="text-center">
            <div className="font-bold text-foreground tabular-nums leading-none landscape:text-[80px] portrait:text-[72px]">
              {timeStr}
            </div>
            <div className="text-base portrait:text-lg text-muted-foreground capitalize mt-2">{dateStr}</div>
          </div>
        </div>

        {/* Разделитель portrait */}
        <div className="portrait:block hidden w-full h-px bg-border/30" />

        {/* RIGHT/BOTTOM — заголовок + карточка + кнопка | portrait: нижняя половина, уже по ширине, заголовок по центру */}
        <div className="landscape:w-[60%] portrait:flex-1 portrait:overflow-y-auto flex flex-col items-center justify-center px-12 portrait:px-8 portrait:py-5">
          <div className="w-full max-w-xl portrait:max-w-sm">
            <h1 className="text-4xl portrait:text-2xl font-bold text-foreground mb-2 portrait:text-center">Добро пожаловать!</h1>
            <p className="text-base portrait:text-sm text-muted-foreground mb-6 portrait:mb-4 portrait:text-center">Проверьте данные и начните смену</p>

            <div className="kiosk-surface rounded-3xl elevation-4 p-8 portrait:p-5 mb-6 portrait:mb-4 space-y-4 portrait:space-y-3">
              <div className="flex items-center gap-4 portrait:gap-3">
                <div className="w-12 h-12 portrait:w-10 portrait:h-10 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={22} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm portrait:text-xs text-muted-foreground">Водитель</div>
                  <div className="font-semibold text-foreground text-xl portrait:text-base">{driver.name}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 portrait:gap-3">
                <div className="w-12 h-12 portrait:w-10 portrait:h-10 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Route" size={22} className="text-accent-foreground" />
                </div>
                <div>
                  <div className="text-sm portrait:text-xs text-muted-foreground">Маршрут</div>
                  <div className="font-semibold text-foreground text-xl portrait:text-base">№{driver.routeNumber}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 portrait:gap-3">
                <div className="w-12 h-12 portrait:w-10 portrait:h-10 rounded-2xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Icon name={vehicleIcon} size={22} className="text-success" />
                </div>
                <div>
                  <div className="text-sm portrait:text-xs text-muted-foreground">{vehicleLabel}</div>
                  <div className="font-semibold text-foreground text-xl portrait:text-base">{driver.vehicleNumber}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 portrait:gap-3">
                <div className="w-12 h-12 portrait:w-10 portrait:h-10 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Clock" size={22} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm portrait:text-xs text-muted-foreground">Начало смены</div>
                  <div className="font-semibold text-foreground text-xl portrait:text-base">{driver.shiftStart}</div>
                </div>
              </div>
            </div>

            <button
              onClick={onStart}
              className="w-full py-5 portrait:py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl portrait:text-xl flex items-center justify-center gap-3 elevation-3 transition-all active:scale-[0.98] ripple"
            >
              <Icon name="PlayCircle" size={28} />
              Поехали!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
