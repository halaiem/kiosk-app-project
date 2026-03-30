import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Driver, ThemeMode, Message } from '@/types/kiosk';

// ── Document viewer popup ────────────────────────────────────────────────────
interface DocFile {
  name: string;
  type: 'pdf' | 'txt' | 'doc';
  size: string;
  content?: string;
}

function DocViewer({ doc, onClose }: { doc: DocFile; onClose: () => void }) {
  const download = () => {
    const text = doc.content ?? `Документ: ${doc.name}\n\nСодержимое документа загружается из системы.`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${doc.name}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
          <Icon name={doc.type === 'pdf' ? 'FileText' : 'File'} size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{doc.name}</p>
            <p className="text-[10px] text-muted-foreground">{doc.type.toUpperCase()} · {doc.size}</p>
          </div>
          <button onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium ripple">
            <Icon name="Download" size={13} />
            Скачать
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-muted/40 rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono text-xs">
            {doc.content ?? `${doc.name}\n\nДанный документ содержит регламентирующую информацию.\nДля полного просмотра скачайте файл на устройство.\n\nВерсия документа актуальна на дату последнего обновления системы.`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Section ──────────────────────────────────────────────────────────
const DOCUMENTS: DocFile[] = [
  { name: 'Регламент безопасного движения v3.2', type: 'pdf', size: '1.2 МБ', content: 'РЕГЛАМЕНТ БЕЗОПАСНОГО ДВИЖЕНИЯ\nВерсия 3.2\n\n1. Общие положения\nВодитель обязан соблюдать ПДД и внутренние регламенты предприятия.\n\n2. Скорость движения\nМаксимальная скорость в депо — 5 км/ч.\nМаксимальная скорость на маршруте — 40 км/ч.\n\n3. Остановки\nОстановка производится строго на обозначенных остановочных пунктах.\n\n4. Экстренные ситуации\nПри возникновении внештатной ситуации немедленно сообщить диспетчеру.' },
  { name: 'Инструкция при ДТП', type: 'pdf', size: '0.8 МБ', content: 'ИНСТРУКЦИЯ ПРИ ДТП\n\n1. Остановить транспортное средство.\n2. Включить аварийную сигнализацию.\n3. Вызвать скорую помощь при наличии пострадавших: 103\n4. Сообщить диспетчеру: кнопка SOS в планшете.\n5. Вызвать ГИБДД: 102\n6. Не перемещать ТС до прибытия инспектора.\n7. Зафиксировать данные свидетелей.' },
  { name: 'Порядок эвакуации пассажиров', type: 'pdf', size: '0.5 МБ', content: 'ПОРЯДОК ЭВАКУАЦИИ ПАССАЖИРОВ\n\n1. Объявить об эвакуации через речевой автоинформатор.\n2. Открыть все двери.\n3. Помочь маломобильным пассажирам.\n4. Эвакуировать в безопасное место не менее 50м от ТС.\n5. Сообщить диспетчеру о количестве эвакуированных.' },
  { name: 'Нормативы расписания маршрута №5', type: 'txt', size: '0.1 МБ', content: 'НОРМАТИВЫ РАСПИСАНИЯ МАРШРУТА №5\n\nИнтервал в час пик (07:00–09:00, 17:00–19:00): 4 мин\nИнтервал в дневное время: 7 мин\nИнтервал в вечернее время: 12 мин\n\nВремя оборота: 45 мин\nКоличество ТС на маршруте: 8\nДлина маршрута: 18.3 км\nКоличество остановок: 24' },
  { name: 'Техническое руководство ТМ-3400', type: 'pdf', size: '4.7 МБ', content: 'ТЕХНИЧЕСКОЕ РУКОВОДСТВО ТРАМВАЙ ТМ-3400\n\nОбщие характеристики:\n- Мощность тягового двигателя: 4 × 60 кВт\n- Максимальная скорость: 75 км/ч\n- Длина: 26.3 м\n- Вместимость: 220 пассажиров\n\nОсновные системы:\n1. Тяговая система — IGBT инвертор\n2. Тормозная система — электродинамический + механический\n3. Пневмосистема — компрессор 250 л/мин\n4. Система кондиционирования — 2 × 18 кВт' },
];

const EQUIPMENT: DocFile[] = [
  { name: 'Сенсорный дисплей MD-7', type: 'pdf', size: '0.3 МБ', content: 'ИНСТРУКЦИЯ: Сенсорный дисплей MD-7\n\nНазначение: Планшет водителя.\nОС: Android 11\nЭкран: 7" IPS 1280×800\n\nПитание: 12V DC\nРабочая температура: -20...+60°C\n\nПеречень органов управления:\n- Кнопка питания (боковая)\n- Регулятор громкости (боковая)\n- USB-C для зарядки\n\nПри неисправности: обратиться в техподдержку.' },
  { name: 'GPS-модуль NV-850', type: 'txt', size: '0.1 МБ', content: 'GPS-МОДУЛЬ NV-850\n\nТип: GNSS (GPS+ГЛОНАСС)\nЧастота обновления: 10 Гц\nТочность: ±2 м\nИнтерфейс: UART / CAN\nПитание: 3.3V\n\nДиагностика:\n- Зелёный LED — норма\n- Красный LED — нет сигнала\n- Мигающий — поиск спутников' },
  { name: 'Датчики давления колёс', type: 'txt', size: '0.1 МБ', content: 'ДАТЧИКИ ДАВЛЕНИЯ КОЛЁС TPMS\n\nНорма давления: 8.5–9.0 бар\nКритическое отклонение: ±1.5 бар\nИнтервал опроса: 30 сек\n\nКоды ошибок:\nE01 — нет сигнала от датчика\nE02 — низкое давление\nE03 — высокое давление' },
  { name: 'CAN-адаптер FA-200', type: 'pdf', size: '0.4 МБ', content: 'CAN-АДАПТЕР FA-200\n\nПротокол: CAN 2.0B / ISO 11898\nСкорость шины: 250/500 кбит/с\nПитание: 12/24V\n\nОсновные функции:\n- Мониторинг бортовых систем\n- Передача телеметрии диспетчеру\n- Журналирование ошибок' },
  { name: 'Система учёта пассажиров', type: 'txt', size: '0.2 МБ', content: 'СИСТЕМА УЧЁТА ПАССАЖИРОВ\n\nТип: Инфракрасные счётчики на дверях\nПередача данных: CAN → сервер диспетчера\nОбновление: при каждом закрытии дверей\n\nПоказатели:\n- Вошло пассажиров\n- Вышло пассажиров\n- Наполняемость салона %' },
];

export function ProfileSection({ driver }: { driver: Driver | null }) {
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'equip'>('info');
  const [viewDoc, setViewDoc] = useState<DocFile | null>(null);

  return (
    <div className="space-y-4">
      {viewDoc && <DocViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}

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
          {DOCUMENTS.map(doc => (
            <div key={doc.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Icon name={doc.type === 'pdf' ? 'FileText' : 'File'} size={18} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{doc.name}</div>
                <div className="text-[10px] text-muted-foreground">{doc.type.toUpperCase()} · {doc.size}</div>
              </div>
              <button
                onClick={() => setViewDoc(doc)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium ripple shrink-0"
              >
                <Icon name="Eye" size={12} />
                Открыть
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'equip' && (
        <div className="space-y-2">
          {EQUIPMENT.map(eq => (
            <div key={eq.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Icon name="Wrench" size={18} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{eq.name}</div>
                <div className="text-[10px] text-muted-foreground">Инструкция · {eq.size}</div>
              </div>
              <button
                onClick={() => setViewDoc(eq)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium ripple shrink-0"
              >
                <Icon name="Eye" size={12} />
                Открыть
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Icon name="Palette" size={13} />
          Режим темы
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onSetTheme(opt.value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ripple text-center
                ${theme === opt.value
                  ? 'bg-primary/20 border-primary text-sidebar-primary'
                  : 'bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80'}`}>
              <Icon name={opt.icon} size={20} className={theme === opt.value ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'} />
              <span className="text-xs font-semibold leading-tight">{opt.label}</span>
              <span className="text-[9px] opacity-60 leading-tight">{opt.desc}</span>
              {theme === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary" />}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-xs text-sidebar-foreground/70">
          <Icon name={isDark ? 'Moon' : 'Sun'} size={13} className={isDark ? 'text-blue-400' : 'text-yellow-400'} />
          <span>Сейчас активен: <strong className="text-sidebar-foreground">{isDark ? 'тёмный' : 'светлый'}</strong> режим</span>
        </div>
      </div>

      {theme === 'auto' && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Icon name="Clock" size={13} />
            Расписание тёмного режима
          </div>
          <div className="p-3 rounded-xl bg-sidebar-accent space-y-3">
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

// ── Equipment fault report popup ─────────────────────────────────────────────
const VEHICLE_EQUIPMENT = [
  { group: 'Тяговое оборудование', items: ['Тяговый двигатель #1', 'Тяговый двигатель #2', 'Тяговый двигатель #3', 'Тяговый двигатель #4', 'Тяговый привод #1', 'Тяговый привод #2', 'IGBT-инвертор тяги', 'Блок управления тягой'] },
  { group: 'Токосъём', items: ['Пантограф / штанга #1', 'Пантограф / штанга #2', 'Токоприёмник #1', 'Токоприёмник #2', 'Преобразователь напряжения 600V→24V', 'Преобразователь напряжения 600V→110V', 'Зарядное устройство АКБ'] },
  { group: 'Пневмосистема', items: ['Компрессор #1', 'Компрессор #2', 'Осушитель воздуха', 'Датчик давления воздуха', 'Клапан тормозной системы'] },
  { group: 'Климат / отопление', items: ['Отопитель салона #1', 'Отопитель салона #2', 'Отопитель кабины', 'Кондиционер салона', 'Вентиляция крыши'] },
  { group: 'Информирование', items: ['Речевой автоинформатор', 'Громкоговоритель #1', 'Громкоговоритель #2', 'Электронный маршрутный указатель (фронт)', 'Электронный маршрутный указатель (бок)', 'Электронный маршрутный указатель (зад)', 'Медиакомплекс DSM'] },
  { group: 'Безопасность / видеонаблюдение', items: ['ADAC 360° камера', 'Видеорегистратор', 'Камера наблюдения салон #1', 'Камера наблюдения салон #2', 'Камера наблюдения кабина', 'Система записи NVR'] },
  { group: 'Оплата проезда', items: ['Валидатор #1 (передняя дверь)', 'Валидатор #2 (средняя дверь)', 'Валидатор #3 (задняя дверь)', 'Терминал оплаты наличными', 'Сервер системы оплаты'] },
  { group: 'Двери и ходовая', items: ['Привод двери #1', 'Привод двери #2', 'Привод двери #3', 'Датчики давления колёс (4 шт)', 'Система торможения', 'Контроллер дверей'] },
  { group: 'Электроника / связь', items: ['CAN-шина (основная)', 'GPS/ГЛОНАСС модуль', 'Планшет водителя MD-7', 'Роутер 4G/WiFi', 'Счётчики пассажиров (3 шт)'] },
];

function EquipmentFaultPopup({ onClose, onSend }: { onClose: () => void; onSend: (text: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [desc, setDesc] = useState('');
  const [sent, setSent] = useState(false);

  const toggle = (item: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item)) { next.delete(item); } else { next.add(item); }
      return next;
    });
  };

  const handleSend = () => {
    if (selected.size === 0) return;
    const list = [...selected].join(', ');
    onSend(`🔧 Заявка на техпомощь:\nНеисправности: ${list}${desc ? `\nКомментарий: ${desc}` : ''}`);
    setSent(true);
    setTimeout(() => { onClose(); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Icon name="Wrench" size={18} className="text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Заявка на техпомощь</p>
            <p className="text-[10px] text-muted-foreground">Выберите неисправное оборудование</p>
          </div>
          {selected.size > 0 && (
            <span className="bg-destructive text-white text-xs font-bold px-2 py-0.5 rounded-full">{selected.size}</span>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon name="X" size={15} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {VEHICLE_EQUIPMENT.map(group => (
            <div key={group.group}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">{group.group}</p>
              <div className="space-y-1">
                {group.items.map(item => (
                  <button
                    key={item}
                    onClick={() => toggle(item)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ripple text-sm ${
                      selected.has(item) ? 'bg-destructive/15 border border-destructive/40 text-destructive' : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${selected.has(item) ? 'bg-destructive border-destructive' : 'border-border'}`}>
                      {selected.has(item) && <Icon name="Check" size={10} className="text-white" />}
                    </div>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-3 border-t border-border space-y-2">
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Дополнительное описание (необязательно)..."
            className="w-full h-16 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={handleSend}
            disabled={selected.size === 0 || sent}
            className="w-full py-3 rounded-xl bg-destructive text-white text-sm font-bold disabled:opacity-40 ripple flex items-center justify-center gap-2"
          >
            {sent ? (
              <><Icon name="Check" size={16} />Заявка отправлена!</>
            ) : (
              <><Icon name="Send" size={16} />Отправить заявку диспетчеру ({selected.size} позиций)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Messenger popup (for Связь button) ───────────────────────────────────────
const QUICK_REPLIES_DISPATCHER = [
  '📋 Прошу разъяснить задание',
  '✅ Задание выполнено',
  '⏸ Прошу технический перерыв',
  '🔄 Готов к следующему рейсу',
  '📍 Нахожусь на конечной',
  '⚠️ Прошу изменить маршрут',
];

function ContactMessengerPopup({ contact, onClose, onSend }: { contact: { name: string; role: string }; onClose: () => void; onSend: (text: string) => void }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecord = () => {
    setIsRecording(true);
    setRecordTime(0);
    recordTimer.current = setInterval(() => setRecordTime(t => t + 1), 1000);
  };
  const stopRecord = () => {
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    onSend(`🎤 Голосовое сообщение (${recordTime}с)`);
    onClose();
  };
  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Icon name="MessageSquare" size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{contact.name}</p>
            <p className="text-[10px] text-muted-foreground">{contact.role}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon name="X" size={15} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground mb-2">Быстрые сообщения</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_REPLIES_DISPATCHER.map(r => (
              <button key={r} onClick={() => { onSend(r); onClose(); }}
                className="px-2.5 py-2 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground text-xs text-left transition-all ripple">
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pb-4 pt-2 border-t border-border">
          {isRecording ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-destructive font-medium flex-1">Запись... {recordTime}с</span>
              <button onPointerUp={stopRecord} className="px-3 py-1.5 rounded-lg bg-destructive text-white text-sm ripple">Стоп</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Написать сообщение..."
                className="flex-1 px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button onPointerDown={startRecord} className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center shrink-0 ripple" title="Голосовое">
                <Icon name="Mic" size={18} className="text-muted-foreground" />
              </button>
              <button onClick={handleSend} disabled={!input.trim()} className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 ripple elevation-1">
                <Icon name="Send" size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Support Section ──────────────────────────────────────────────────────────
const SUPPORT_CONTACTS = [
  { name: 'Диспетчер линии', role: 'Оперативная связь', phone: '+7-800-555-01', icon: 'Headset', color: 'bg-blue-500/15 text-blue-500', hasContact: true },
  { name: 'Техподдержка', role: 'Ошибки оборудования', phone: '+7-800-555-02', icon: 'Wrench', color: 'bg-orange-500/15 text-orange-500', hasContact: true, hasTechList: true },
  { name: 'Скорая помощь', role: 'Медицинская помощь', phone: '103', icon: 'HeartPulse', color: 'bg-red-500/15 text-red-500', hasContact: true },
  { name: 'МЧС', role: 'Пожар / ЧС', phone: '101', icon: 'Flame', color: 'bg-red-600/15 text-red-600', hasContact: true },
  { name: 'Полиция', role: 'Правопорядок / охрана', phone: '102', icon: 'Shield', color: 'bg-blue-600/15 text-blue-600', hasContact: true },
];

export type SupportModalRequest =
  | { type: 'contact'; contact: { name: string; role: string; phone: string } }
  | { type: 'equipment' };

export function SupportSection({ onSendMessage, onOpenModal }: {
  onSendMessage?: (text: string) => void;
  onOpenModal?: (req: SupportModalRequest) => void;
}) {
  return (
    <div className="space-y-3">
      {SUPPORT_CONTACTS.map(c => (
        <div key={c.name} className="flex items-center gap-3 p-4 rounded-xl bg-muted">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>
            <Icon name={c.icon} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.role}</div>
            <div className="text-xs text-primary mt-0.5">📞 {c.phone}</div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => onOpenModal?.({ type: 'contact', contact: { name: c.name, role: c.role, phone: c.phone } })}
              className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs ripple flex items-center gap-1"
            >
              <Icon name="MessageSquare" size={11} />
              Связь
            </button>
            {c.hasTechList && (
              <button
                onClick={() => onOpenModal?.({ type: 'equipment' })}
                className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-600 text-xs ripple flex items-center gap-1"
              >
                <Icon name="List" size={11} />
                Заявка
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Admin Section ────────────────────────────────────────────────────────────
export function AdminSection() {
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
        {error && <p className="text-destructive text-sm">{error}</p>}
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
        { label: 'Диагностика системы', icon: 'Activity', danger: false },
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