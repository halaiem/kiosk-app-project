import Icon from '@/components/ui/icon';
import { ThemeMode } from '@/types/kiosk';

// ── Notifications Section ────────────────────────────────────────────────────
export function NotificationsSection({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="px-2.5 py-1 rounded-full bg-destructive text-white text-xs font-bold">{unreadCount} новых</div>
      </div>
      {[
        { title: 'Изменение интервала', time: '09:41', type: 'info' },
        { title: 'Замедление на ул. Садовой', time: '09:38', type: 'warn' },
        { title: 'Давление колёс — внимание', time: '09:25', type: 'error' },
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

// ── Settings Section ─────────────────────────────────────────────────────────
export function SettingsSection({ theme, isDark, darkFrom, darkTo, onSetTheme, onSetDarkFrom, onSetDarkTo }: {
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
      <div>
        <div className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Icon name="Palette" size={13} />
          Режим темы
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onSetTheme(opt.value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ripple text-center
                ${theme === opt.value
                  ? 'bg-white/30 border-white text-sidebar-foreground'
                  : 'bg-white/15 border-white/20 text-sidebar-foreground hover:bg-white/25'}`}>
              <Icon name={opt.icon} size={20} className={theme === opt.value ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'} />
              <span className="text-xs font-semibold leading-tight">{opt.label}</span>
              <span className="text-[9px] opacity-60 leading-tight">{opt.desc}</span>
              {theme === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary" />}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 text-xs text-sidebar-foreground/70">
          <Icon name={isDark ? 'Moon' : 'Sun'} size={13} className={isDark ? 'text-blue-400' : 'text-yellow-400'} />
          <span>Сейчас активен: <strong className="text-sidebar-foreground">{isDark ? 'тёмный' : 'светлый'}</strong> режим</span>
        </div>
      </div>

      {theme === 'auto' && (
        <div>
          <div className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Icon name="Clock" size={13} />
            Расписание тёмного режима
          </div>
          <div className="p-3 rounded-xl bg-white/15 space-y-3">
            {[
              { icon: 'Moon', color: 'text-blue-400', label: 'Тёмная с (час)', val: darkFrom, set: onSetDarkFrom, accent: 'accent-blue-500' },
              { icon: 'Sun', color: 'text-yellow-400', label: 'Светлая с (час)', val: darkTo, set: onSetDarkTo, accent: 'accent-yellow-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <Icon name={s.icon} size={16} className={`${s.color} flex-shrink-0`} />
                <div className="flex-1">
                  <div className="text-xs text-sidebar-foreground/70 mb-1">{s.label}</div>
                  <input type="range" min={0} max={23} value={s.val} onChange={e => s.set(Number(e.target.value))} className={`w-full ${s.accent} h-2 rounded-full`} />
                  <div className="text-sm font-bold text-sidebar-foreground mt-1 tabular-nums">{fmtH(s.val)}</div>
                </div>
              </div>
            ))}
            <div className="text-[10px] text-sidebar-foreground/50 text-center pt-1 border-t border-sidebar-border">
              Тёмный: {fmtH(darkFrom)} — {fmtH(darkTo)} · Светлый: {fmtH(darkTo)} — {fmtH(darkFrom)}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/20">
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

// ── Archive Section ──────────────────────────────────────────────────────────
export function ArchiveSection() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">История за сегодня</p>
      {[
        { text: 'Смена начата', time: '06:00', icon: 'PlayCircle' },
        { text: 'Рейс №1 завершён', time: '07:45', icon: 'CheckCircle' },
        { text: 'Телеметрия отправлена (847 записей)', time: '07:46', icon: 'Activity' },
        { text: 'Рейс №2 начат', time: '07:55', icon: 'PlayCircle' },
        { text: 'Ошибка давления колёс зафиксирована', time: '09:25', icon: 'AlertTriangle' },
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

// Re-export Message type usage marker (keeps import used)
export type { Message };