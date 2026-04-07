import Icon from '@/components/ui/icon';
import type { IridaToolsTab } from '@/types/dashboard';

interface IridaToolsPanelProps {
  tab: IridaToolsTab;
}

function PlaceholderSection({ title, icon, description }: { title: string; icon: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name={icon} className="w-5 h-5 text-primary" />
            </div>
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-2 bg-muted rounded w-4/5" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon name={icon} className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">{title}</span>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">В разработке</span>
        </div>
        <div className="space-y-2">
          {[80, 60, 90, 45].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-2 bg-muted rounded flex-1">
                <div className="h-2 bg-primary/40 rounded" style={{ width: `${w}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8">{w}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IridaToolsPanel({ tab }: IridaToolsPanelProps) {
  const SECTIONS: Record<IridaToolsTab, { title: string; icon: string; description: string }> = {
    cities: {
      title: 'Города',
      icon: 'Building2',
      description: 'Управление городами и регионами присутствия системы ИРИДА',
    },
    it_settings: {
      title: 'Настройки',
      icon: 'Settings2',
      description: 'Системные настройки и конфигурация платформы',
    },
    ui_design: {
      title: 'UI-дизайн',
      icon: 'Palette',
      description: 'Управление интерфейсом, темами и визуальными компонентами',
    },
    software: {
      title: 'ПО',
      icon: 'Package',
      description: 'Управление программным обеспечением, версиями и обновлениями',
    },
    connection: {
      title: 'Подключение',
      icon: 'Wifi',
      description: 'Настройка сетевых подключений и каналов передачи данных',
    },
    server: {
      title: 'Сервер',
      icon: 'Server',
      description: 'Мониторинг и управление серверной инфраструктурой',
    },
    equipment: {
      title: 'Оборудование',
      icon: 'Cpu',
      description: 'Учёт и управление оборудованием на объектах',
    },
    instructions: {
      title: 'Инструкции',
      icon: 'BookOpen',
      description: 'Техническая документация и инструкции по эксплуатации',
    },
  };

  const section = SECTIONS[tab];

  return (
    <PlaceholderSection
      title={section.title}
      icon={section.icon}
      description={section.description}
    />
  );
}
