import { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';
import { Driver } from '@/types/kiosk';

// ── Document viewer popup ────────────────────────────────────────────────────
interface DocFile {
  name: string;
  type: 'pdf' | 'txt' | 'doc';
  size: string;
  content?: string;
}

function DocViewer({ doc, onClose }: { doc: DocFile; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Затемнение только правой части */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        style={{ left: '320px' }}
        onClick={onClose}
      />
      {/* Панель справа */}
      <div
        className="absolute top-0 right-0 bottom-0 bg-card border-l border-border shadow-2xl flex flex-col pointer-events-auto"
        style={{ left: '320px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
          <Icon name={doc.type === 'pdf' ? 'FileText' : 'File'} size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{doc.name}</p>
            <p className="text-[10px] text-muted-foreground">{doc.type.toUpperCase()} · {doc.size}</p>
          </div>
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
    </div>,
    document.body
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
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'docs' | 'equip' | null>(null);
  const [viewDoc, setViewDoc] = useState<DocFile | null>(null);

  const tabContent = activeTab && (
    <div className="fixed top-0 left-80 right-0 bottom-0 z-[45] bg-background/95 backdrop-blur-sm overflow-y-auto" onClick={() => setActiveTab(null)}>
      <div className="max-w-2xl mx-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {activeTab === 'info' ? 'Данные водителя' : activeTab === 'schedule' ? 'Расписание' : activeTab === 'docs' ? 'Документы' : 'Оборудование'}
          </h2>
          <button onClick={() => setActiveTab(null)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>

        {activeTab === 'info' && driver && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'ФИО', value: driver.name, icon: 'User' },
              { label: 'ID водителя', value: driver.id, icon: 'IdCard' },
              { label: 'Маршрут', value: `№${driver.routeNumber}`, icon: 'Route' },
              { label: 'ТС', value: driver.vehicleNumber, icon: 'Tram' },
              { label: 'Смена', value: `с ${driver.shiftStart}`, icon: 'Clock' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                <Icon name={item.icon} size={22} className="text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="font-semibold text-foreground text-base">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-2">
            {DOCUMENTS.map(doc => (
              <div key={doc.name} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                <Icon name={doc.type === 'pdf' ? 'FileText' : 'File'} size={22} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{doc.name}</div>
                  <div className="text-xs text-muted-foreground">{doc.type.toUpperCase()} · {doc.size}</div>
                </div>
                <button
                  onClick={() => setViewDoc(doc)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-medium ripple shrink-0"
                >
                  <Icon name="Eye" size={14} />
                  Открыть
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-2">
            {DOCUMENTS.map(doc => (
              <div key={doc.name} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                <Icon name={doc.type === 'pdf' ? 'FileText' : 'File'} size={22} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{doc.name}</div>
                  <div className="text-xs text-muted-foreground">{doc.type.toUpperCase()} · {doc.size}</div>
                </div>
                <button
                  onClick={() => setViewDoc(doc)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-medium ripple shrink-0"
                >
                  <Icon name="Eye" size={14} />
                  Открыть
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'equip' && (
          <div className="space-y-2">
            {EQUIPMENT.map(eq => (
              <div key={eq.name} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                <Icon name="Cpu" size={22} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{eq.name}</div>
                  <div className="text-xs text-muted-foreground">{eq.type.toUpperCase()} · {eq.size}</div>
                </div>
                <button
                  onClick={() => setViewDoc(eq)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-medium ripple shrink-0"
                >
                  <Icon name="Eye" size={14} />
                  Открыть
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-0">
      {viewDoc && <DocViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}

      {/* Вертикальные табы */}
      <div className="flex flex-col gap-1.5 w-full">
        {([
          { key: 'info' as const, label: 'Данные', icon: 'User' },
          { key: 'schedule' as const, label: 'Расписание', icon: 'CalendarClock' },
          { key: 'docs' as const, label: 'Документация', icon: 'FileText' },
          { key: 'equip' as const, label: 'Оборудование', icon: 'Cpu' },
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(isActive ? null : tab.key)}
              style={isActive ? { backgroundColor: '#faaf57', color: '#1a1a1a' } : { backgroundColor: '#ffffff', color: '#374151' }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ripple w-full text-left border ${
                isActive
                  ? 'border-[#faaf57] shadow-md'
                  : 'border-gray-200 hover:border-[#faaf57]/50 hover:bg-orange-50'
              }`}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
              {isActive && (
                <span className="ml-auto">
                  <Icon name="ChevronRight" size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabContent && createPortal(tabContent, document.body)}
    </div>
  );
}