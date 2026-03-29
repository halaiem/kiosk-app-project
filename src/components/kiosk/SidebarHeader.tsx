import Icon from '@/components/ui/icon';
import { Driver } from '@/types/kiosk';

interface SidebarHeaderProps {
  driver: Driver | null;
  onClose: () => void;
}

export default function SidebarHeader({ driver, onClose }: SidebarHeaderProps) {
  return (
    <div className="p-5 border-b border-sidebar-border bg-gradient-to-br from-primary/20 to-transparent">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Icon name="Tram" size={26} className="text-sidebar-primary" />
        </div>
        <div>
          <div className="font-bold text-sidebar-foreground">ТрамДиспетч</div>
          <div className="text-xs text-sidebar-foreground/60">Система водителя v2.4</div>
        </div>
        <button onClick={onClose} className="ml-auto w-9 h-9 rounded-xl bg-sidebar-accent flex items-center justify-center ripple">
          <Icon name="X" size={18} className="text-sidebar-foreground" />
        </button>
      </div>

      {driver && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sidebar-accent">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
            <Icon name="User" size={16} className="text-sidebar-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-sidebar-foreground truncate">{driver.name.split(' ')[0]} {driver.name.split(' ')[1]}</div>
            <div className="text-[10px] text-sidebar-foreground/60">Маршрут №{driver.routeNumber} · {driver.vehicleNumber}</div>
          </div>
          <div className="ml-auto status-dot status-online flex-shrink-0" />
        </div>
      )}
    </div>
  );
}
