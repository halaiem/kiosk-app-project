import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { useVirtualKeyboard, scrollIntoViewAboveKeyboard } from '@/hooks/useVirtualKeyboard';

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

export function EquipmentFaultPopup({ onClose, onSend }: { onClose: () => void; onSend: (text: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [desc, setDesc] = useState('');
  const [sent, setSent] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const { keyboardHeight } = useVirtualKeyboard();

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
            ref={descRef}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onFocus={() => setTimeout(() => scrollIntoViewAboveKeyboard(descRef.current, keyboardHeight), 400)}
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

export function ContactMessengerPopup({ contact, onClose, onSend }: { contact: { name: string; role: string }; onClose: () => void; onSend: (text: string) => void }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const { keyboardHeight } = useVirtualKeyboard();

  const startRecord = () => {
    setIsRecording(true);
    setRecordTime(0);
    recordTimer.current = setInterval(() => setRecordTime(t => t + 1), 1000);
  };
  const sendRecord = () => {
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    onSend(`🎤 Голосовое сообщение (${recordTime}с)`);
    onClose();
  };
  const cancelRecord = () => {
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    setRecordTime(0);
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

        <div ref={inputWrapRef} className="px-3 pb-4 pt-2 border-t border-border">
          {isRecording ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse flex-shrink-0" />
              <span className="text-sm text-destructive font-medium flex-1 tabular-nums">🎤 {recordTime}с</span>
              <button onPointerDown={e => { e.preventDefault(); cancelRecord(); }} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm font-semibold ripple">Стоп</button>
              <button onPointerDown={e => { e.preventDefault(); sendRecord(); }} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold ripple flex items-center gap-1">
                <Icon name="Send" size={14} />Отправить
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                onFocus={() => setTimeout(() => scrollIntoViewAboveKeyboard(inputWrapRef.current, keyboardHeight), 400)}
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