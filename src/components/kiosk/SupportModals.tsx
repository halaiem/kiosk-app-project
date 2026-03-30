import { useState } from 'react';
import Icon from '@/components/ui/icon';

export type SupportModalRequest =
  | { type: 'contact'; contact: { name: string; role: string; phone: string } }
  | { type: 'equipment' };

// ── Связь ────────────────────────────────────────────────────────────────────
export function SupportContactModal({ contact, onClose, onSend }: {
  contact: { name: string; role: string; phone: string };
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [message, setMessage] = useState('');
  const send = () => {
    if (message.trim()) { onSend(message.trim()); setMessage(''); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-card flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-5 border-b border-border flex-shrink-0"
        style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))' }}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon name="MessageSquare" size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white leading-tight">Связь: {contact.name}</h2>
          <p className="text-sm text-white/70">{contact.role}</p>
        </div>
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center ripple active:scale-95 transition-all"
        >
          <Icon name="X" size={24} className="text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Phone block */}
        <div className="flex gap-3">
          <div className="flex-1 p-5 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Icon name="Phone" size={24} className="text-blue-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Прямой номер</div>
              <div className="text-2xl font-black text-foreground tabular-nums">📞 {contact.phone}</div>
            </div>
          </div>
          <a
            href={`tel:${contact.phone.replace(/\D/g, '')}`}
            className="flex flex-col items-center justify-center gap-1.5 px-5 rounded-2xl bg-green-500 text-white font-bold ripple active:scale-95 transition-all shadow-lg"
          >
            <Icon name="PhoneCall" size={26} />
            <span className="text-sm">Позвонить</span>
          </a>
        </div>

        {/* Quick messages */}
        <div>
          <p className="text-base font-semibold text-foreground mb-3">Быстрое сообщение</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              'Прошу помощи',
              'Неисправность ТС',
              'Задержка на маршруте',
              'Инцидент с пассажиром',
              'Нет высадки пассажиров',
              'Схожу с маршрута',
            ].map(t => (
              <button
                key={t}
                onClick={() => setMessage(t)}
                className={`px-4 py-4 rounded-2xl border text-base text-left transition-all ripple leading-tight ${
                  message === t
                    ? 'border-primary bg-primary/15 text-primary font-semibold'
                    : 'border-border bg-muted/50 text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Или введите своё сообщение..."
            rows={4}
            className="mt-4 w-full px-4 py-4 rounded-2xl border border-border bg-background text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border flex gap-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 h-16 rounded-2xl bg-muted text-muted-foreground text-base font-medium ripple"
        >
          Отмена
        </button>
        <button
          onClick={send}
          disabled={!message.trim()}
          className="flex-1 h-16 rounded-2xl bg-primary text-primary-foreground text-base font-bold ripple disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Icon name="Send" size={20} />
          Отправить
        </button>
      </div>
    </div>
  );
}

// ── Заявка ───────────────────────────────────────────────────────────────────
export function SupportEquipmentModal({ onClose, onSend }: {
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const items = [
    'Сенсорный дисплей не реагирует',
    'GPS-сигнал отсутствует',
    'Камера не работает',
    'Принтер билетов',
    'Валидаторы оплаты',
    'Кондиционер',
    'Двери (передние)',
    'Двери (задние)',
    'Освещение салона',
    'Аудиосистема',
    'Речевой автоинформатор',
    'Громкоговорители',
    'Электронные маршрутные указатели',
    'Медиакомплексы',
    'DSM',
    'ADAC',
    '360 camera',
    'Видеорегистратор',
    'Система оплаты проезда',
  ];

  const toggle = (v: string) =>
    setSelected(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v]);

  const send = () => {
    const text = `Заявка на тех. обслуживание:\n${selected.map(s => `• ${s}`).join('\n')}${note ? `\nПримечание: ${note}` : ''}`;
    onSend(text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] bg-card flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-5 border-b border-border flex-shrink-0"
        style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))' }}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Wrench" size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white">Заявка в техподдержку</h2>
          <p className="text-sm text-white/70">Отметьте все неисправности</p>
        </div>
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center ripple active:scale-95 transition-all"
        >
          <Icon name="X" size={24} className="text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {items.map(item => (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-all ripple ${
                selected.includes(item)
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-border bg-muted/40'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                selected.includes(item) ? 'bg-orange-500 border-orange-500' : 'border-border'
              }`}>
                {selected.includes(item) && <Icon name="Check" size={14} className="text-white" />}
              </div>
              <span className={`text-sm leading-tight ${
                selected.includes(item) ? 'font-semibold text-orange-600' : 'text-foreground'
              }`}>
                {item}
              </span>
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Дополнительные подробности..."
          rows={4}
          className="w-full px-4 py-4 rounded-2xl border border-border bg-background text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border flex gap-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 h-16 rounded-2xl bg-muted text-muted-foreground text-base font-medium ripple"
        >
          Отмена
        </button>
        <button
          onClick={send}
          disabled={selected.length === 0}
          className="flex-1 h-16 rounded-2xl bg-orange-500 text-white text-base font-bold ripple disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Icon name="Send" size={20} />
          Отправить заявку {selected.length > 0 && `(${selected.length})`}
        </button>
      </div>
    </div>
  );
}