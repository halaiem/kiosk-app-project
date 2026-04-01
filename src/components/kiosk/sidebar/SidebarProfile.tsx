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
    <div className="space-y-3">
      {viewDoc && createPortal(<DocViewer doc={viewDoc} onClose={() => setViewDoc(null)} />, document.body)}

      {/* Horizontal tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-sidebar-accent/60">
        {([
          { key: 'info' as const, label: 'Данные', icon: 'User' },
          { key: 'docs' as const, label: 'Документация', icon: 'FileText' },
          { key: 'equip' as const, label: 'Оборудование', icon: 'Cpu' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ripple"
            style={
              activeTab === tab.key
                ? { backgroundColor: '#faaf57', color: '#1a1a1a', boxShadow: '0 2px 8px rgba(250,175,87,0.45)' }
                : { backgroundColor: 'transparent', color: 'var(--sidebar-foreground)', opacity: 0.7 }
            }
          >
            <Icon name={tab.icon} size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content inline in sidebar */}
      <div className="mt-1">
        {activeTab === 'info' && driver && (
          <div className="space-y-2">
            {[
              { label: 'ФИО', value: driver.name, icon: 'User' },
              { label: 'ID водителя', value: driver.id, icon: 'IdCard' },
              { label: 'Маршрут', value: `№${driver.routeNumber}`, icon: 'Route' },
              { label: 'ТС', value: driver.vehicleNumber, icon: 'Tram' },
              { label: 'Смена', value: `с ${driver.shiftStart}`, icon: 'Clock' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-border/40">
                <Icon name={item.icon} size={18} className="shrink-0" style={{ color: '#faaf57' }} />
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground leading-tight">{item.label}</div>
                  <div className="font-semibold text-foreground text-sm truncate">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'info' && !driver && (
          <div className="text-center py-6 text-muted-foreground text-sm">Нет данных водителя</div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-2">
            {DOCUMENTS.map(doc => (
              <div key={doc.name} className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-border/40">
                <Icon name={doc.type === 'pdf' ? 'FileText' : 'File'} size={18} className="shrink-0" style={{ color: '#faaf57' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground leading-snug line-clamp-2">{doc.name}</div>
                  <div className="text-[10px] text-muted-foreground">{doc.type.toUpperCase()} · {doc.size}</div>
                </div>
                <button
                  onClick={() => setViewDoc(doc)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ripple shrink-0 transition-all"
                  style={{ backgroundColor: 'rgba(250,175,87,0.15)', color: '#faaf57' }}
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
              <div key={eq.name} className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-border/40">
                <Icon name="Cpu" size={18} className="shrink-0" style={{ color: '#faaf57' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground leading-snug line-clamp-2">{eq.name}</div>
                  <div className="text-[10px] text-muted-foreground">{eq.type.toUpperCase()} · {eq.size}</div>
                </div>
                <button
                  onClick={() => setViewDoc(eq)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ripple shrink-0 transition-all"
                  style={{ backgroundColor: 'rgba(250,175,87,0.15)', color: '#faaf57' }}
                >
                  <Icon name="Eye" size={12} />
                  Открыть
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}