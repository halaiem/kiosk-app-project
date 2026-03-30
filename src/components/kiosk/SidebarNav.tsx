import Icon from '@/components/ui/icon';
import { Driver, MenuSection, ThemeMode } from '@/types/kiosk';
import {
  ProfileSection,
  NotificationsSection,
  SettingsSection,
  ArchiveSection,
  SupportSection,
  AdminSection,
} from '@/components/kiosk/SidebarSections';

const MENU_ITEMS: { id: MenuSection; label: string; icon: string; desc: string }[] = [
  { id: 'profile', label: 'Профиль', icon: 'User', desc: 'Данные водителя и документация' },
  { id: 'notifications', label: 'Уведомления', icon: 'Bell', desc: 'Все сообщения от диспетчера' },
  { id: 'settings', label: 'Настройки', icon: 'Settings', desc: 'Параметры приложения и планшета' },
  { id: 'archive', label: 'Архив', icon: 'Archive', desc: 'История сообщений и событий' },
  { id: 'support', label: 'Поддержка', icon: 'Headphones', desc: 'Контакты техподдержки' },
];

interface SidebarNavProps {
  driver: Driver | null;
  unreadCount: number;
  activeSection: MenuSection | null;
  sectionVisible: boolean;
  onSection: (section: MenuSection) => void;
  theme: ThemeMode;
  isDark: boolean;
  darkFrom: number;
  darkTo: number;
  onSetTheme: (t: ThemeMode) => void;
  onSetDarkFrom: (h: number) => void;
  onSetDarkTo: (h: number) => void;
  onSendMessage?: (text: string) => void;
}

export default function SidebarNav({
  driver, unreadCount, activeSection, sectionVisible, onSection,
  theme, isDark, darkFrom, darkTo, onSetTheme, onSetDarkFrom, onSetDarkTo,
  onSendMessage,
}: SidebarNavProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
      <nav
        className="p-3 space-y-1"
        style={{
          transform: activeSection ? 'translateX(-24px)' : 'translateX(0)',
          opacity: activeSection ? 0 : 1,
          transition: 'transform 0.25s ease, opacity 0.2s ease',
          pointerEvents: activeSection ? 'none' : 'auto',
        }}
      >
        {MENU_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all ripple
              ${activeSection === item.id ? 'bg-sidebar-primary/20 text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
          >
            <Icon name={item.icon} size={20} />
            <div className="flex-1">
              <div className="font-medium text-sm">{item.label}</div>
              <div className="text-[11px] opacity-60">{item.desc}</div>
            </div>
            {item.id === 'notifications' && unreadCount > 0 && (
              <div className="w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">{unreadCount}</div>
            )}
            <Icon name="ChevronRight" size={14} className="opacity-40" />
          </button>
        ))}
      </nav>

      {activeSection && (
        <div
          className="p-4 absolute top-0 left-0 w-full"
          style={{
            marginTop: '0',
            transform: sectionVisible ? 'translateX(0)' : 'translateX(24px)',
            opacity: sectionVisible ? 1 : 0,
            transition: 'transform 0.25s ease, opacity 0.2s ease',
          }}
        >
          <button onClick={() => onSection(null as unknown as MenuSection)} className="flex items-center gap-2 text-sidebar-primary text-sm mb-4 ripple">
            <Icon name="ChevronLeft" size={16} />
            Назад
          </button>
          <h3 className="font-bold text-sidebar-foreground text-lg mb-4">
            {MENU_ITEMS.find(m => m.id === activeSection)?.label || 'Администратор'}
          </h3>
          {activeSection === 'profile' && <ProfileSection driver={driver} />}
          {activeSection === 'notifications' && <NotificationsSection unreadCount={unreadCount} />}
          {activeSection === 'settings' && <SettingsSection theme={theme} isDark={isDark} darkFrom={darkFrom} darkTo={darkTo} onSetTheme={onSetTheme} onSetDarkFrom={onSetDarkFrom} onSetDarkTo={onSetDarkTo} />}
          {activeSection === 'archive' && <ArchiveSection />}
          {activeSection === 'support' && <SupportSection onSendMessage={onSendMessage} />}
          {activeSection === 'admin' && <AdminSection />}
        </div>
      )}
    </div>
  );
}