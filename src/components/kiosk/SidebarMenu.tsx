import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Driver, MenuSection, ThemeMode } from '@/types/kiosk';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  unreadCount: number;
  activeSection: MenuSection | null;
  onSection: (section: MenuSection) => void;
  onLogout: () => void;
  logoTapCount: number;
  onLogoTap: () => void;
  theme: ThemeMode;
  isDark: boolean;
  darkFrom: number;
  darkTo: number;
  onSetTheme: (t: ThemeMode) => void;
  onSetDarkFrom: (h: number) => void;
  onSetDarkTo: (h: number) => void;
}

const MENU_ITEMS: { id: MenuSection; label: string; icon: string; desc: string }[] = [
  { id: 'profile', label: 'Профиль', icon: 'User', desc: 'Данные водителя и документация' },
  { id: 'notifications', label: 'Уведомления', icon: 'Bell', desc: 'Все сообщения от диспетчера' },
  { id: 'settings', label: 'Настройки', icon: 'Settings', desc: 'Параметры приложения и планшета' },
  { id: 'archive', label: 'Архив', icon: 'Archive', desc: 'История сообщений и событий' },
  { id: 'support', label: 'Поддержка', icon: 'Headphones', desc: 'Контакты техподдержки' },
];

function ProfileSection({ driver }: { driver: Driver | null }) {
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'equip'>('info');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['info', 'docs', 'equip'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ripple ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {tab === 'info' ? 'Данные' : tab === 'docs' ? 'Документы' : 'Оборудование'}
          </button>
        ))}
      </div>
      {activeTab === 'info' && driver && (
        <div className="space-y-3">
          {[
            { label: 'ФИО', value: driver.name, icon: 'User' },
            { label: 'ID водителя', value: driver.id, icon: 'IdCard' },
            { label: 'Маршрут', value: `№${driver.routeNumber}`, icon: 'Route' },
            { label: 'ТС', value: driver.vehicleNumber, icon: 'Tram' },
            { label: 'Смена', value: `с ${driver.shiftStart}`, icon: 'Clock' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Icon name={item.icon} size={18} className="text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="font-medium text-foreground">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'docs' && (
        <div className="space-y-2">
          {['Регламент безопасного движения v3.2', 'Инструкция при ДТП', 'Порядок эвакуации пассажиров', 'Нормативы расписания маршрута №5', 'Техническое руководство ТМ-3400'].map(doc => (
            <div key={doc} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Icon name="FileText" size={18} className="text-primary" />
              <span className="text-sm text-foreground flex-1">{doc}</span>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
      {activeTab === 'equip' && (
        <div className="space-y-2">
          {['Сенсорный дисплей MD-7', 'CAN-адаптер FA-200', 'GPS-модуль NV-850', 'Датчики давления колёс', 'Система учёта пассажиров'].map(eq => (
            <div key={eq} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Icon name="Wrench" size={18} className="text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{eq}</div>
                <div className="text-xs text-muted-foreground">Инструкция по эксплуатации</div>
              </div>
              <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsSection({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="px-2.5 py-1 rounded-full bg-destructive text-white text-xs font-bold">{unreadCount} новых</div>
      </div>
      {[
        { title: 'Изменение интервала', time: '09:41', type: 'info' },
        { title: 'Замедление на ул. Садовой', time: '09:38', type: 'warn' },
        { title: 'CAN: Давление колёс', time: '09:25', type: 'error' },
        { title: 'Смена подтверждена', time: '06:02', type: 'success' },
      ].map((n, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted">
          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
            n.type === 'error' ? 'bg-destructive' : n.type === 'warn' ? 'bg-warning' : n.type === 'success' ? 'bg-success' : 'bg-primary'
          }`} />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground">{n.title}</div>
            <div className="text-xs text-muted-foreground">{n.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsSection({ theme, isDark, darkFrom, darkTo, onSetTheme, onSetDarkFrom, onSetDarkTo }: {
  theme: ThemeMode; isDark: boolean; darkFrom: number; darkTo: number;
  onSetTheme: (t: ThemeMode) => void;
  onSetDarkFrom: (h: number) => void;
  onSetDarkTo: (h: number) => void;
}) {
  const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string; desc: string }[] = [
    { value: 'light', label: 'Светлая', icon: 'Sun', desc: 'Всегда светлый режим' },
    { value: 'dark', label: 'Тёмная', icon: 'Moon', desc: 'Всегда тёмный режим' },
    { value: 'auto', label: 'Авто', icon: 'Clock', desc: 'По расписанию' },
  ];

  const fmtH = (h: number) => `${String(h).padStart(2, '0')}:00`;

  return (
    <div className="space-y-4">
      {/* Theme mode selector */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Icon name="Palette" size={13} />
          Режим темы
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSetTheme(opt.value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ripple text-center
                ${theme === opt.value
                  ? 'bg-primary/20 border-primary text-sidebar-primary'
                  : 'bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80'}`}
            >
              <Icon name={opt.icon} size={20} className={theme === opt.value ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'} />
              <span className="text-xs font-semibold leading-tight">{opt.label}</span>
              <span className="text-[9px] opacity-60 leading-tight">{opt.desc}</span>
              {theme === opt.value && (
                <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
              )}
            </button>
          ))}
        </div>
        {/* Current state badge */}
        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-xs text-sidebar-foreground/70">
          <Icon name={isDark ? 'Moon' : 'Sun'} size={13} className={isDark ? 'text-blue-400' : 'text-yellow-400'} />
          <span>Сейчас активен: <strong className="text-sidebar-foreground">{isDark ? 'тёмный' : 'светлый'}</strong> режим</span>
        </div>
      </div>

      {/* Auto schedule — only when auto mode */}
      {theme === 'auto' && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Icon name="Clock" size={13} />
            Расписание тёмного режима
          </div>
          <div className="p-3 rounded-xl bg-sidebar-accent space-y-3">
            <div className="flex items-center gap-3">
              <Icon name="Moon" size={16} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-sidebar-foreground/70 mb-1">Тёмная с (час)</div>
                <input
                  type="range"
                  min={0} max={23}
                  value={darkFrom}
                  onChange={e => onSetDarkFrom(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 rounded-full"
                />
                <div className="text-sm font-bold text-sidebar-foreground mt-1 tabular-nums">{fmtH(darkFrom)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="Sun" size={16} className="text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-sidebar-foreground/70 mb-1">Светлая с (час)</div>
                <input
                  type="range"
                  min={0} max={23}
                  value={darkTo}
                  onChange={e => onSetDarkTo(Number(e.target.value))}
                  className="w-full accent-yellow-500 h-2 rounded-full"
                />
                <div className="text-sm font-bold text-sidebar-foreground mt-1 tabular-nums">{fmtH(darkTo)}</div>
              </div>
            </div>
            <div className="text-[10px] text-sidebar-foreground/50 text-center pt-1 border-t border-sidebar-border">
              Тёмный: {fmtH(darkFrom)} — {fmtH(darkTo)} · Светлый: {fmtH(darkTo)} — {fmtH(darkFrom)}
            </div>
          </div>
        </div>
      )}

      {/* Other settings */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Icon name="Settings" size={13} />
          Планшет
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'Яркость экрана', icon: 'Sun', value: '80%' },
            { label: 'Громкость уведомлений', icon: 'Volume2', value: '70%' },
            { label: 'Язык интерфейса', icon: 'Globe', value: 'Русский' },
            { label: 'Wi-Fi', icon: 'Wifi', value: 'Подключён' },
            { label: 'Bluetooth', icon: 'Bluetooth', value: 'Активен' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
              <Icon name={s.icon} size={16} className="text-sidebar-primary" />
              <span className="text-sm text-sidebar-foreground flex-1">{s.label}</span>
              <span className="text-xs text-sidebar-foreground/60">{s.value}</span>
              <Icon name="ChevronRight" size={12} className="text-sidebar-foreground/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArchiveSection() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">История за сегодня</p>
      {[
        { text: 'Смена начата', time: '06:00', icon: 'PlayCircle' },
        { text: 'Рейс №1 завершён', time: '07:45', icon: 'CheckCircle' },
        { text: 'Телеметрия отправлена (847 записей)', time: '07:46', icon: 'Activity' },
        { text: 'Рейс №2 начат', time: '07:55', icon: 'PlayCircle' },
        { text: 'CAN-ошибка 0x2F14 зафиксирована', time: '09:25', icon: 'AlertTriangle' },
      ].map((a, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
          <Icon name={a.icon} size={16} className="text-primary flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-foreground">{a.text}</div>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

function SupportSection() {
  return (
    <div className="space-y-3">
      {[
        { name: 'Диспетчер линии А', role: 'Оперативная связь', phone: '📞 +7-800-555-01', icon: 'Headset' },
        { name: 'Техподдержка CAN', role: 'Ошибки оборудования', phone: '📞 +7-800-555-02', icon: 'Wrench' },
        { name: 'GPS/Телеметрия', role: 'Вопросы навигации', phone: '📞 +7-800-555-03', icon: 'MapPin' },
        { name: 'IT-служба', role: 'Проблемы с планшетом', phone: '📞 +7-800-555-04', icon: 'Monitor' },
        { name: 'Скорая помощь', role: 'Экстренный вызов', phone: '📞 103', icon: 'AlertCircle' },
      ].map(c => (
        <div key={c.name} className="flex items-center gap-3 p-4 rounded-xl bg-muted">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Icon name={c.icon} size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.role}</div>
            <div className="text-xs text-primary mt-0.5">{c.phone}</div>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs ripple">
            Связь
          </button>
        </div>
      ))}
    </div>
  );
}

function AdminSection() {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  const tryUnlock = () => {
    if (pin === '123456789') { setUnlocked(true); setError(''); }
    else { setError('Неверный PIN'); setPin(''); }
  };

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Icon name="ShieldAlert" size={32} className="text-destructive" />
        </div>
        <h3 className="font-bold text-foreground">Администраторский доступ</h3>
        <p className="text-sm text-muted-foreground text-center">Введите PIN-код для входа</p>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryUnlock()}
          placeholder="PIN-код"
          className="w-48 text-center px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-destructive text-sm animate-shake">{error}</p>}
        <button onClick={tryUnlock} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold ripple">
          Войти
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2">
        <Icon name="ShieldCheck" size={16} className="text-success" />
        <span className="text-sm text-success font-medium">Администраторский режим активен</span>
      </div>
      {[
        { label: 'Сброс приложения', icon: 'RefreshCcw', danger: false },
        { label: 'Диагностика CAN', icon: 'Activity', danger: false },
        { label: 'Очистить кэш данных', icon: 'Trash2', danger: false },
        { label: 'Журнал ошибок системы', icon: 'FileWarning', danger: false },
        { label: 'Выйти из киоск-режима', icon: 'Unlock', danger: true },
      ].map(a => (
        <button key={a.label} className={`w-full flex items-center gap-3 p-4 rounded-xl text-left ripple transition-all
          ${a.danger ? 'bg-destructive/10 hover:bg-destructive/15 text-destructive border border-destructive/20' : 'bg-muted hover:bg-muted-foreground/15 text-foreground'}`}>
          <Icon name={a.icon} size={18} />
          <span className="font-medium text-sm">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function SidebarMenu({ isOpen, onClose, driver, unreadCount, activeSection, onSection, onLogout, logoTapCount, onLogoTap, theme, isDark, darkFrom, darkTo, onSetTheme, onSetDarkFrom, onSetDarkTo }: Props) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);

  const handleAdminTap = () => {
    const next = adminTapCount + 1;
    setAdminTapCount(next);
    if (next >= 5) { setShowAdmin(true); setAdminTapCount(0); onSection('admin'); }
    setTimeout(() => setAdminTapCount(0), 3000);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full z-50 w-80 max-w-[85vw] flex flex-col transition-transform duration-350 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'hsl(var(--sidebar-background))' }}>

        {/* Header */}
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

          {/* Driver chip */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Nav items */}
          {(!activeSection || !['profile','notifications','settings','archive','support','admin'].includes(activeSection)) && (
            <nav className="p-3 space-y-1">
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
          )}

          {/* Section content */}
          {activeSection && (
            <div className="p-4">
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
              {activeSection === 'support' && <SupportSection />}
              {activeSection === 'admin' && <AdminSection />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all ripple"
          >
            <Icon name="LogOut" size={18} />
            <span className="text-sm font-medium">Завершить смену</span>
          </button>

          {/* Admin trigger */}
          <div className="text-center">
            <button onClick={handleAdminTap} className="text-[10px] text-sidebar-foreground/25 hover:text-sidebar-foreground/40 transition-all">
              Администратор {adminTapCount > 0 ? `(${5 - adminTapCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}