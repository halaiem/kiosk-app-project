import { useState, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import {
  useAppSettings,
  FONT_SIZE_LABELS,
  type BrandColors,
  type FontSize,
} from "@/context/AppSettingsContext";
import { FontSettingsBlock } from "./FontSettingsBlock";

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: "sidebarBg", label: "Фон сайдбара" },
  { key: "headerBg", label: "Фон шапки" },
  { key: "primaryBtn", label: "Кнопка (активная)" },
  { key: "primaryBtnHover", label: "Кнопка (наведение)" },
  { key: "primaryBtnDisabled", label: "Кнопка (неактивная)" },
  { key: "textColor", label: "Цвет текста" },
  { key: "sidebarTextColor", label: "Текст сайдбара" },
  { key: "widgetBg", label: "Фон виджетов" },
  { key: "widgetBorder", label: "Рамка виджетов" },
  { key: "cardBg", label: "Фон карточек" },
  { key: "accentColor", label: "Акцентный цвет" },
];

const DEFAULT_BRAND_COLORS: BrandColors = {
  sidebarBg: "#ec660c",
  headerBg: "#ec660c",
  primaryBtn: "#ec660c",
  primaryBtnHover: "#d45a0a",
  primaryBtnDisabled: "#f3a96e",
  textColor: "#141414",
  sidebarTextColor: "#141414",
  widgetBg: "#ffffff",
  widgetBorder: "#e5e7eb",
  cardBg: "#ffffff",
  accentColor: "#ec660c",
};

const FONT_SIZE_PX: Record<FontSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

function ColorPickerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-6 h-6 cursor-pointer">
          <div className="w-6 h-6 rounded-lg border border-border" style={{ background: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 h-7 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function BrandColorsBlock({
  title,
  iconName,
  colors,
  onUpdate,
  onReset,
}: {
  title: string;
  iconName: string;
  colors: BrandColors;
  onUpdate: (key: keyof BrandColors, val: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={iconName} className="w-4 h-4 text-pink-500" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-3">
        {COLOR_FIELDS.map(({ key, label }) => (
          <ColorPickerRow
            key={key}
            label={label}
            value={colors[key]}
            onChange={(v) => onUpdate(key, v)}
          />
        ))}
        <button
          onClick={onReset}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Сбросить к значениям по умолчанию
        </button>
      </div>
    </div>
  );
}

/* ── Dashboard Preview ─────────────────────────────────────────── */
function DashboardPreview({
  colors, carrierName, carrierLogo,
}: { colors: BrandColors; carrierName: string; carrierLogo: string | null }) {
  const NAV_ITEMS = ['Обзор', 'Заявки', 'Задачи', 'Сообщения', 'Уведомления', 'Настройки'];
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Monitor" className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">Превью дашборда</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">точная копия интерфейса</span>
      </div>
      {/* Scale wrapper */}
      <div className="p-3">
        <div className="rounded-xl overflow-hidden border border-border/50" style={{ height: 260 }}>
          {/* Full dashboard layout */}
          <div className="flex h-full" style={{ backgroundColor: colors.widgetBg }}>

            {/* ── Sidebar ── */}
            <div className="w-[120px] shrink-0 flex flex-col h-full" style={{ backgroundColor: colors.sidebarBg }}>
              {/* Sidebar header */}
              <div className="px-2 py-2 flex items-center gap-1.5 border-b" style={{ borderColor: `${colors.sidebarTextColor}20`, minHeight: 42 }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: colors.primaryBtn }}>
                  {carrierLogo
                    ? <img src={carrierLogo} alt="" className="w-full h-full object-contain" />
                    : <Icon name="Building2" size={12} style={{ color: '#fff' }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[8px] font-bold truncate leading-tight" style={{ color: colors.sidebarTextColor }}>
                    {carrierName || 'ИРИДА'}
                  </div>
                  <div className="text-[6px] opacity-50 leading-tight" style={{ color: colors.sidebarTextColor }}>Диспетчер</div>
                </div>
              </div>
              {/* User block */}
              <div className="mx-1.5 mt-1.5 mb-0.5 px-1.5 py-1 rounded-md flex items-center gap-1"
                style={{ backgroundColor: `${colors.sidebarTextColor}15` }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' }}>И</div>
                <div className="text-[7px] truncate" style={{ color: colors.sidebarTextColor, opacity: 0.7 }}>Иванов И.И.</div>
              </div>
              {/* Nav items */}
              <div className="flex-1 px-1.5 py-1 space-y-0.5 overflow-hidden">
                {NAV_ITEMS.map((item, i) => (
                  <div key={item} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md"
                    style={{
                      backgroundColor: i === 0 ? colors.sidebarTextColor : 'transparent',
                      opacity: i === 0 ? 1 : 0.6,
                    }}>
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{
                      backgroundColor: i === 0 ? colors.sidebarBg : colors.sidebarTextColor,
                      opacity: 0.8,
                    }} />
                    <span className="text-[7px] truncate leading-none" style={{
                      color: i === 0 ? colors.sidebarBg : colors.sidebarTextColor,
                    }}>{item}</span>
                  </div>
                ))}
              </div>
              {/* Footer nav */}
              <div className="px-1.5 pb-2 pt-1 border-t space-y-0.5" style={{ borderColor: `${colors.sidebarTextColor}20` }}>
                {['Обновить', 'Тема', 'Выйти'].map(lbl => (
                  <div key={lbl} className="flex items-center gap-1.5 px-1.5 py-0.5 opacity-50">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: colors.sidebarTextColor }} />
                    <span className="text-[6px]" style={{ color: colors.sidebarTextColor }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top header bar */}
              <div className="px-3 py-1.5 flex items-center justify-between shrink-0"
                style={{ backgroundColor: colors.headerBg, minHeight: 32 }}>
                <span className="text-[8px] font-semibold" style={{ color: '#fff', opacity: 0.9 }}>Обзор</span>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center"
                    style={{ borderColor: `${colors.sidebarTextColor}30`, backgroundColor: colors.cardBg }}>
                    <Icon name="Bell" size={9} style={{ color: colors.textColor }} />
                  </div>
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center"
                    style={{ borderColor: `${colors.sidebarTextColor}30`, backgroundColor: colors.cardBg }}>
                    <Icon name="Sun" size={9} style={{ color: colors.textColor }} />
                  </div>
                </div>
              </div>

              {/* Widgets grid */}
              <div className="flex-1 p-2 overflow-hidden">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-1 mb-1.5">
                  {[
                    { label: 'Водители', val: '24', icon: 'Users' },
                    { label: 'Маршруты', val: '12', icon: 'Route' },
                    { label: 'ТС', val: '18', icon: 'Bus' },
                    { label: 'Тревоги', val: '3', icon: 'AlertTriangle' },
                  ].map(w => (
                    <div key={w.label} className="rounded-md p-1.5 flex flex-col gap-0.5"
                      style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.widgetBorder}` }}>
                      <div className="text-[10px] font-bold leading-none" style={{ color: colors.textColor }}>{w.val}</div>
                      <div className="text-[6px] opacity-50 leading-none" style={{ color: colors.textColor }}>{w.label}</div>
                    </div>
                  ))}
                </div>
                {/* Main widgets */}
                <div className="grid grid-cols-2 gap-1 h-[calc(100%-28px)]">
                  {[
                    { label: 'Карта маршрутов', icon: 'Map' },
                    { label: 'Заявки', icon: 'ClipboardList' },
                    { label: 'Сообщения', icon: 'MessagesSquare' },
                    { label: 'Уведомления', icon: 'Bell' },
                  ].map(w => (
                    <div key={w.label} className="rounded-md p-1.5 flex flex-col gap-0.5 overflow-hidden"
                      style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.widgetBorder}` }}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Icon name={w.icon} size={8} style={{ color: colors.primaryBtn }} />
                        <span className="text-[7px] font-semibold" style={{ color: colors.textColor }}>{w.label}</span>
                      </div>
                      <div className="space-y-0.5 flex-1">
                        {[1, 2, 3].map(j => (
                          <div key={j} className="h-1 rounded-full"
                            style={{ backgroundColor: colors.widgetBorder, width: `${90 - j * 15}%` }} />
                        ))}
                      </div>
                      {/* Primary button */}
                      <div className="mt-0.5 h-2.5 rounded flex items-center justify-center"
                        style={{ backgroundColor: colors.primaryBtn }}>
                        <span className="text-[5px] text-white font-medium">Открыть</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tablet Preview ─────────────────────────────────────────────── */
function TabletPreview({
  colors, carrierName, carrierLogo,
}: { colors: BrandColors; carrierName: string; carrierLogo: string | null }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Tablet" className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">Превью планшета</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">экран водителя</span>
      </div>
      <div className="p-3">
        <div className="rounded-xl overflow-hidden border border-border/50" style={{ height: 260 }}>
          {/* Tablet layout: flex-col, dark/kiosk bg */}
          <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1e35' }}>

            {/* ── Top bar (always visible header) ── */}
            <div className="flex items-center gap-2 px-3 py-2 shrink-0"
              style={{ backgroundColor: colors.headerBg }}>
              {/* Menu button */}
              <div className="w-7 h-7 flex items-center justify-center">
                <Icon name="Menu" size={14} className="text-white" />
              </div>
              {/* Route info card */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg flex-1 min-w-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-white/50 leading-none" style={{ fontSize: 6 }}>маршрут</span>
                  <span className="text-white font-black leading-none" style={{ fontSize: 12 }}>№5</span>
                </div>
                <div className="w-px h-5 bg-white/20 shrink-0" />
                <div className="flex items-center gap-1 text-white/80 min-w-0" style={{ fontSize: 7 }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span className="truncate">Депо Северное</span>
                  <Icon name="ArrowRight" size={8} className="text-white/40 shrink-0" />
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="truncate">Депо Южное</span>
                </div>
                {/* Vehicle number */}
                <div className="px-1.5 py-0.5 rounded-md ml-1 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <span className="text-white/80 font-bold" style={{ fontSize: 7 }}>А001</span>
                </div>
              </div>
              {/* Right: time + status */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <span className="text-white/70 font-mono" style={{ fontSize: 7 }}>●Онлайн</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white font-mono font-bold leading-none" style={{ fontSize: 10 }}>09:41</span>
                  <span className="text-white/50 leading-none" style={{ fontSize: 6 }}>пн, 12 апр</span>
                </div>
              </div>
            </div>

            {/* ── Main content grid ── */}
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 160px', gridTemplateRows: '1fr 80px' }}>

              {/* Map widget */}
              <div className="relative overflow-hidden m-1 rounded-lg row-span-1"
                style={{ backgroundColor: '#1a2f4a', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Map placeholder */}
                <div className="absolute inset-0 opacity-20">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="absolute h-px bg-blue-300" style={{ top: `${25 + i*18}%`, left: 0, right: 0 }} />
                  ))}
                  {[0,1,2].map(i => (
                    <div key={i} className="absolute w-px bg-blue-300" style={{ left: `${20 + i*25}%`, top: 0, bottom: 0 }} />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <Icon name="Map" size={24} className="text-blue-300" />
                </div>
                <div className="absolute bottom-1 left-1 text-white/50 font-mono" style={{ fontSize: 6 }}>Карта маршрута</div>
                {/* Route line */}
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.5 }}>
                  <polyline points="20,60 50,40 80,50 110,30 130,45" stroke={colors.primaryBtn} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <circle cx="20" cy="60" r="2.5" fill="#4ade80" />
                  <circle cx="130" cy="45" r="2.5" fill="#f87171" />
                </svg>
              </div>

              {/* Stops widget */}
              <div className="m-1 ml-0 rounded-lg flex flex-col overflow-hidden"
                style={{ backgroundColor: '#1a2f4a', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="px-2 py-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-white/60 font-medium" style={{ fontSize: 7 }}>Маршрут / Остановки</span>
                </div>
                <div className="flex-1 p-1 space-y-0.5 overflow-hidden">
                  {['Вокзал', 'Ул. Ленина', '▶ Площадь', 'Парк', 'Конечная'].map((stop, i) => (
                    <div key={stop} className="flex items-center gap-1 px-1 py-0.5 rounded"
                      style={{ backgroundColor: i === 2 ? `${colors.primaryBtn}30` : 'transparent' }}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i < 2 ? 'bg-white/20' : i === 2 ? 'bg-green-400' : 'bg-white/30'}`} />
                      <span style={{ color: i === 2 ? colors.primaryBtn : 'rgba(255,255,255,0.5)', fontSize: 6 }}>{stop}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messenger widget */}
              <div className="m-1 mt-0 rounded-lg flex flex-col overflow-hidden"
                style={{ backgroundColor: '#1a2f4a', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="px-2 py-1 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-white/60 font-medium" style={{ fontSize: 7 }}>Мессенджер</span>
                  <span className="rounded-full px-1 text-white font-bold" style={{ fontSize: 6, backgroundColor: colors.primaryBtn }}>2</span>
                </div>
                <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
                  {['Диспетчер: Выходите на смену', 'Сис: Маршрут обновлён'].map((msg, i) => (
                    <div key={i} className="px-1.5 py-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)', fontSize: 6, color: 'rgba(255,255,255,0.6)' }}>
                      {msg}
                    </div>
                  ))}
                </div>
                <div className="px-1.5 pb-1.5 flex gap-1">
                  <div className="flex-1 h-4 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
                  <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ backgroundColor: colors.primaryBtn }}>
                    <Icon name="Send" size={7} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Status widget */}
              <div className="m-1 mt-0 ml-0 rounded-lg flex flex-col overflow-hidden"
                style={{ backgroundColor: '#1a2f4a', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="px-2 py-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-white/60 font-medium" style={{ fontSize: 7 }}>Статус ТС</span>
                </div>
                <div className="flex-1 p-1 flex flex-col justify-around">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-white/40" style={{ fontSize: 6 }}>Скорость</span>
                    <span className="text-white font-bold" style={{ fontSize: 8 }}>42 км/ч</span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-white/40" style={{ fontSize: 6 }}>Интервал</span>
                    <span className="text-green-400 font-bold" style={{ fontSize: 8 }}>+2 мин</span>
                  </div>
                  <div className="h-1 rounded-full mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full w-2/3" style={{ backgroundColor: colors.primaryBtn }} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Live Screenshot Preview ────────────────────────────────────── */
type ScreenshotSlot = {
  id: string;          // DOM id to capture
  label: string;
  icon: string;
  hint: string;
};

const DASHBOARD_SLOTS: ScreenshotSlot[] = [
  { id: 'dashboard-login',   label: 'Экран авторизации',      icon: 'LogIn',   hint: 'Откройте страницу входа' },
  { id: 'dashboard-root',    label: 'Дашборд целиком',        icon: 'Monitor', hint: 'Откройте дашборд' },
  { id: 'dashboard-sidebar', label: 'Sidebar (раскрытый)',    icon: 'PanelLeft', hint: 'Sidebar должен быть виден' },
];

const TABLET_SLOTS: ScreenshotSlot[] = [
  { id: 'kiosk-login',  label: 'Авторизация планшет',  icon: 'Tablet',  hint: 'Откройте приложение водителя' },
  { id: 'kiosk-main',   label: 'Главный экран',         icon: 'LayoutGrid', hint: 'Войдите в приложение водителя' },
  { id: 'kiosk-menu',   label: 'Меню (sidebar)',        icon: 'Menu',    hint: 'Откройте боковое меню' },
];

function LiveScreenshotPreview({ title, icon, slots }: {
  title: string; icon: string; slots: ScreenshotSlot[];
}) {
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});
  const [capturing, setCapturing] = useState<string | null>(null);
  const [captureAll, setCaptureAll] = useState(false);

  const captureSlot = useCallback(async (slot: ScreenshotSlot) => {
    setCapturing(slot.id);
    try {
      const el = document.getElementById(slot.id);
      if (!el) {
        // Element not found — show placeholder
        setScreenshots(prev => ({ ...prev, [slot.id]: '__not_found__' }));
        setCapturing(null);
        return;
      }
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5,
        logging: false,
        backgroundColor: null,
        ignoreElements: (el) => el.classList?.contains('screenshot-ignore'),
      });
      setScreenshots(prev => ({ ...prev, [slot.id]: canvas.toDataURL('image/jpeg', 0.85) }));
    } catch (e) {
      setScreenshots(prev => ({ ...prev, [slot.id]: '__error__' }));
    }
    setCapturing(null);
  }, []);

  const captureAllSlots = useCallback(async () => {
    setCaptureAll(true);
    for (const slot of slots) {
      await captureSlot(slot);
    }
    setCaptureAll(false);
  }, [slots, captureSlot]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={icon} className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Скриншот реального интерфейса</span>
          <button
            onClick={captureAllSlots}
            disabled={captureAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
            <Icon name={captureAll ? 'Loader' : 'RefreshCw'} size={12} className={captureAll ? 'animate-spin' : ''} />
            {captureAll ? 'Снимаем...' : 'Обновить все'}
          </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {slots.map(slot => {
          const img = screenshots[slot.id];
          const isCapturing = capturing === slot.id;
          return (
            <div key={slot.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                  <Icon name={slot.icon} size={11} className="text-muted-foreground" />
                  {slot.label}
                </span>
                <button
                  onClick={() => captureSlot(slot)}
                  disabled={isCapturing}
                  title="Обновить превью"
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50">
                  <Icon name={isCapturing ? 'Loader' : 'RefreshCw'} size={11} className={isCapturing ? 'animate-spin' : ''} />
                </button>
              </div>
              <div
                className="relative rounded-xl overflow-hidden border border-border cursor-pointer group"
                style={{ height: 160 }}
                onClick={() => !isCapturing && captureSlot(slot)}>
                {isCapturing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 gap-2">
                    <Icon name="Loader" size={20} className="animate-spin text-primary" />
                    <span className="text-[10px] text-muted-foreground">Снимаем скриншот...</span>
                  </div>
                ) : img === '__not_found__' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 gap-2 p-3">
                    <Icon name="AlertCircle" size={20} className="text-amber-500" />
                    <span className="text-[10px] text-center text-muted-foreground leading-snug">
                      Элемент не найден.<br />{slot.hint}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); captureSlot(slot); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground">
                      Попробовать
                    </button>
                  </div>
                ) : img === '__error__' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10 gap-2">
                    <Icon name="X" size={20} className="text-red-500" />
                    <span className="text-[10px] text-red-500">Ошибка снимка</span>
                  </div>
                ) : img ? (
                  <>
                    <img src={img} alt={slot.label} className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white text-[10px] bg-black/60 px-2 py-0.5 rounded">Обновить</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 gap-2 p-3">
                    <Icon name="Camera" size={20} className="text-muted-foreground" />
                    <span className="text-[10px] text-center text-muted-foreground leading-snug">
                      Нажмите чтобы сделать скриншот
                    </span>
                    <span className="text-[9px] text-center text-muted-foreground/60 leading-snug">
                      {slot.hint}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-3">
        <div className="text-[10px] text-muted-foreground/70 bg-muted/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <Icon name="Info" size={11} className="shrink-0 mt-0.5 text-blue-400" />
          <span>
            Скриншоты снимаются с реального интерфейса прямо сейчас.
            Перейдите к нужному экрану (авторизация, дашборд, планшет), затем вернитесь сюда и нажмите «Обновить».
            Изменения настроек отразятся мгновенно.
          </span>
        </div>
      </div>
    </div>
  );
}

export function BrandColorsPreviewCards() {
  const { settings, updateSettings } = useAppSettings();

  const updateDashboardColor = (key: keyof BrandColors, val: string) => {
    const updated = { ...settings.brandColorsDashboard, [key]: val };
    updateSettings({ brandColorsDashboard: updated, brandColors: updated });
  };

  const updateTabletColor = (key: keyof BrandColors, val: string) => {
    updateSettings({ brandColorsTablet: { ...settings.brandColorsTablet, [key]: val } });
  };

  return (
    <>
      {/* ════════ 3. BRAND COLORS DASHBOARD ════════ */}
      <BrandColorsBlock
        title="Цвета дашборда"
        iconName="Monitor"
        colors={settings.brandColorsDashboard}
        onUpdate={updateDashboardColor}
        onReset={() =>
          updateSettings({
            brandColorsDashboard: { ...DEFAULT_BRAND_COLORS },
            brandColors: { ...DEFAULT_BRAND_COLORS },
          })
        }
      />

      {/* ════════ 4. BRAND COLORS TABLET ════════ */}
      <BrandColorsBlock
        title="Цвета планшета"
        iconName="Tablet"
        colors={settings.brandColorsTablet}
        onUpdate={updateTabletColor}
        onReset={() => updateSettings({ brandColorsTablet: { ...DEFAULT_BRAND_COLORS } })}
      />

      {/* ════════ 5. FONT ════════ */}
      <FontSettingsBlock />

      {/* ════════ 6. FONT SIZE ════════ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Icon name="ALargeSmall" className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-semibold text-foreground">Размер шрифта</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((key) => (
              <button
                key={key}
                onClick={() => updateSettings({ fontSize: key })}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                  settings.fontSize === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="font-bold" style={{ fontSize: `${FONT_SIZE_PX[key]}px` }}>Аа</span>
                <span className="text-[10px] leading-tight">{FONT_SIZE_LABELS[key]}</span>
                <span className="text-[9px] opacity-60">{FONT_SIZE_PX[key]}px</span>
              </button>
            ))}
          </div>
          {/* Preview */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Превью текста</p>
            {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((key) => (
              <p
                key={key}
                className={`text-foreground ${settings.fontSize === key ? "font-bold" : ""}`}
                style={{ fontSize: `${FONT_SIZE_PX[key]}px` }}
              >
                {FONT_SIZE_LABELS[key]} ({FONT_SIZE_PX[key]}px) - Диспетчерская система ИРИДА
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ 7. LIVE PREVIEW DASHBOARD ════════ */}
      <LiveScreenshotPreview
        title="Превью дашборда — живые скриншоты"
        icon="Monitor"
        slots={DASHBOARD_SLOTS}
      />

      {/* ════════ 8. LIVE PREVIEW TABLET ════════ */}
      <LiveScreenshotPreview
        title="Превью планшета — живые скриншоты"
        icon="Tablet"
        slots={TABLET_SLOTS}
      />
    </>
  );
}

export default BrandColorsPreviewCards;