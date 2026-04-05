import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BREAK_OPTIONS = [10, 15, 20, 30];

export default function BreakModal({ isOpen, onClose }: Props) {
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!active) return;
    setRemaining(selectedDuration * 60);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setActive(false);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  const startBreak = () => setActive(true);
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = active ? ((selectedDuration * 60 - remaining) / (selectedDuration * 60)) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="kiosk-surface rounded-3xl elevation-4 p-8 max-w-sm w-full mx-4 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-warning/15 flex items-center justify-center">
              <Icon name="Coffee" size={24} className="text-warning-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Перерыв</h2>
              <p className="text-muted-foreground text-sm">Выберите длительность</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center ripple">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>

        {active ? (
          <div className="text-center py-4">
            {/* Circle progress */}
            <div className="relative inline-flex items-center justify-center w-40 h-40 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--warning))" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute text-center">
                <div className="text-3xl font-bold tabular-nums text-foreground">{formatTime(remaining)}</div>
                <div className="text-xs text-muted-foreground">осталось</div>
              </div>
            </div>
            <button onClick={() => { setActive(false); onClose(); }}
              className="px-6 py-3 rounded-xl bg-muted text-muted-foreground text-sm ripple">
              Завершить перерыв
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {BREAK_OPTIONS.map(d => (
                <button key={d} onClick={() => setSelectedDuration(d)}
                  className={`py-4 rounded-2xl font-bold text-lg transition-all ripple
                    ${selectedDuration === d ? 'bg-warning text-warning-foreground elevation-2' : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'}`}>
                  {d} мин
                </button>
              ))}
            </div>
            <button onClick={startBreak}
              className="w-full py-4 rounded-2xl bg-warning text-warning-foreground font-bold text-base flex items-center justify-center gap-2 elevation-2 ripple active:scale-[0.98]">
              <Icon name="Play" size={20} />
              Начать перерыв
            </button>
          </>
        )}
      </div>
    </div>
  );
}
