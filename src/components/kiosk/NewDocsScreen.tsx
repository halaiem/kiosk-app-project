import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';
import { fetchNewDocs, markDocRead, confirmNewDocs } from '@/api/driverApi';

interface NewDoc {
  id: number;
  title: string;
  category: 'schedule' | 'document' | 'instruction' | 'other';
  content: string;
  file_size: string;
  created_at: string;
  is_read: boolean;
  is_confirmed: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  schedule: 'Расписание',
  document: 'Документ',
  instruction: 'Инструкция',
  other: 'Другое',
};

const CATEGORY_ORDER = ['schedule', 'document', 'instruction', 'other'];

const CATEGORY_ICON: Record<string, string> = {
  schedule: 'CalendarClock',
  document: 'FileText',
  instruction: 'BookOpen',
  other: 'File',
};

const CATEGORY_COLOR: Record<string, string> = {
  schedule: 'bg-blue-500/15 text-blue-600',
  document: 'bg-primary/15 text-primary',
  instruction: 'bg-amber-500/15 text-amber-600',
  other: 'bg-muted text-muted-foreground',
};

function DocViewerPortal({ doc, onClose }: { doc: NewDoc; onClose: () => void }) {
  const [checked, setChecked] = useState(false);

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-card flex flex-col shadow-2xl rounded-3xl overflow-hidden max-h-[90vh]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${CATEGORY_COLOR[doc.category]}`}>
            <Icon name={CATEGORY_ICON[doc.category]} size={30} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-2xl md:text-3xl truncate">{doc.title}</p>
            <p className="text-lg text-muted-foreground">{CATEGORY_LABELS[doc.category]} · {doc.file_size}</p>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-muted/30 rounded-2xl p-5 text-4xl text-foreground leading-relaxed whitespace-pre-wrap font-mono min-h-[200px]">
            {doc.content || 'Содержимое документа недоступно.'}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-3">
          <label className="flex items-center gap-4 cursor-pointer select-none">
            <div
              onClick={() => setChecked(c => !c)}
              className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                checked ? 'bg-primary border-primary' : 'border-border bg-background'
              }`}
            >
              {checked && <Icon name="Check" size={22} className="text-primary-foreground" />}
            </div>
            <span className="text-xl text-foreground font-medium">Я прочитал данный документ</span>
          </label>
          <button
            disabled={!checked}
            onClick={onClose}
            className={`w-full h-16 rounded-2xl font-bold text-2xl transition-all ${
              checked
                ? 'bg-primary text-primary-foreground active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface Props {
  onDone: () => void;
}

const DEMO_DOCS: NewDoc[] = [
  {
    id: -1,
    title: 'Расписание маршрута №5 — апрель 2026',
    category: 'schedule',
    content: 'РАСПИСАНИЕ МАРШРУТА №5 — АПРЕЛЬ 2026\n\nИНТЕРВАЛЫ ДВИЖЕНИЯ:\n• Час пик (07:00–09:00, 17:00–19:00): каждые 4 мин\n• Дневное время (09:00–17:00): каждые 7 мин\n• Вечернее время (19:00–22:00): каждые 12 мин\n• Ночное (22:00–06:00): движение прекращено\n\nВРЕМЯ ОБОРОТА: 45 мин\nКОЛИЧЕСТВО ТС: 8 единиц\nДЛИНА МАРШРУТА: 18.3 км\nКОЛИЧЕСТВО ОСТАНОВОК: 24\n\nИЗМЕНЕНИЯ С 1 АПРЕЛЯ:\nОстановка «Площадь Труда» перенесена на 50 м в сторону ул. Садовой в связи с дорожными работами.',
    file_size: '0.1 МБ',
    created_at: new Date().toISOString(),
    is_read: false,
    is_confirmed: false,
  },
  {
    id: -2,
    title: 'Путевой лист № 2026-04-06',
    category: 'document',
    content: 'ПУТЕВОЙ ЛИСТ № 2026-04-06\n\nВОДИТЕЛЬ: согласно авторизации\nТС: согласно наряду\nМАРШРУТ: согласно назначению\n\nДАТА ВЫДАЧИ: 06.04.2026\nДАТА ДЕЙСТВИЯ: 06.04.2026\n\nОТМЕТКИ:\n✓ Медицинское освидетельствование пройдено\n✓ Технический осмотр ТС пройдён\n✓ Инструктаж проведён\n\nПОДПИСЬ ДИСПЕТЧЕРА: Смирнова Е.В.\nПЕЧАТЬ: Горэлектротранспорт',
    file_size: '0.1 МБ',
    created_at: new Date().toISOString(),
    is_read: false,
    is_confirmed: false,
  },
  {
    id: -3,
    title: 'Инструкция при обрыве контактной сети',
    category: 'instruction',
    content: 'ИНСТРУКЦИЯ ПРИ ОБРЫВЕ КОНТАКТНОЙ СЕТИ\n\n1. НЕМЕДЛЕННО остановить ТС, не покидая кабину.\n2. Включить аварийную сигнализацию.\n3. Сообщить диспетчеру: нажмите кнопку SOS или сообщение.\n4. Объявить пассажирам: «Уважаемые пассажиры, движение временно приостановлено».\n5. НЕ ВЫХОДИТЬ из ТС до прибытия аварийной бригады.\n6. Не допускать пассажиров к токоведущим частям.\n7. Зафиксировать время и место инцидента.\n\nВРЕМЯ ПРИБЫТИЯ АВАРИЙНОЙ БРИГАДЫ: до 20 мин.\nКОНТАКТ: диспетчер — кнопка SOS в планшете.',
    file_size: '0.1 МБ',
    created_at: new Date().toISOString(),
    is_read: false,
    is_confirmed: false,
  },
  {
    id: -4,
    title: 'Уведомление об изменении формы отчётности',
    category: 'other',
    content: 'УВЕДОМЛЕНИЕ\n\nС 01.05.2026 вводится новая форма суточного отчёта водителя.\n\nЧТО ИЗМЕНИТСЯ:\n• Отчёт теперь подаётся через планшет (данный раздел)\n• Бумажная форма отменяется\n• Данные о пассажиропотоке фиксируются автоматически\n\nЧТО ОСТАЁТСЯ БЕЗ ИЗМЕНЕНИЙ:\n• Путевой лист\n• Медицинское освидетельствование\n• Технический осмотр\n\nПо вопросам обращайтесь к диспетчеру или в техподдержку.',
    file_size: '0.1 МБ',
    created_at: new Date().toISOString(),
    is_read: false,
    is_confirmed: false,
  },
];

export default function NewDocsScreen({ onDone }: Props) {
  const [docs, setDocs] = useState<NewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [viewDoc, setViewDoc] = useState<NewDoc | null>(null);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchNewDocs()
      .then(data => setDocs(data.length > 0 ? data : DEMO_DOCS))
      .catch(() => setDocs(DEMO_DOCS))
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = async (doc: NewDoc) => {
    setViewDoc(doc);
    if (!readIds.has(doc.id)) {
      setReadIds(prev => new Set([...prev, doc.id]));
      await markDocRead(doc.id).catch(() => {});
    }
  };

  const handleCloseViewer = () => {
    setViewDoc(null);
  };

  const allRead = docs.length === 0 || docs.every(d => readIds.has(d.id));

  const handleConfirm = async () => {
    setConfirming(true);
    await confirmNewDocs(docs.map(d => d.id)).catch(() => null);
    onDone();
  };

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: docs.filter(d => d.category === cat),
  })).filter(g => g.items.length > 0);

  const visible = grouped.length > 0;

  return (
    <div className="flex h-full w-full kiosk-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="absolute top-20 -left-20 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-success/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full h-full landscape:flex-row portrait:flex-col">
        {/* LEFT — заголовок */}
        <div className="landscape:w-[35%] portrait:py-5 portrait:px-6 flex flex-col items-center justify-center gap-4 px-8 flex-shrink-0">
          <div className="inline-flex items-center justify-center w-24 h-24 portrait:w-[100px] portrait:h-[100px] rounded-full bg-primary/15">
            <div className="w-16 h-16 portrait:w-[72px] portrait:h-[72px] rounded-full bg-primary/25 flex items-center justify-center">
              <Icon name="FileCheck" size={40} className="text-primary" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl portrait:text-[1.7rem] font-bold text-foreground mb-1">
              Новые документы
            </h1>
            <p className="text-sm portrait:text-[0.85rem] text-muted-foreground">
              {visible
                ? 'Ознакомьтесь с документами перед началом смены'
                : 'Нет новых документов для ознакомления'}
            </p>
          </div>

          {!visible && !loading && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/15">
              <Icon name="CheckCircle2" size={18} className="text-success" />
              <span className="text-sm font-semibold text-success">Всё актуально</span>
            </div>
          )}
        </div>

        {/* Разделитель portrait */}
        <div className="portrait:block hidden w-full h-px bg-border/30" />

        {/* RIGHT — список документов */}
        <div className={`landscape:flex-1 portrait:flex-1 portrait:overflow-y-auto flex flex-col px-4 landscape:py-6 portrait:py-3 portrait:pb-5 gap-3 ${visible ? 'overflow-hidden' : ''}`}>

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && visible && (
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {grouped.map(({ cat, items }) => (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CATEGORY_COLOR[cat]}`}>
                      <Icon name={CATEGORY_ICON[cat]} size={22} />
                    </div>
                    <span className="text-xl font-bold text-foreground">{CATEGORY_LABELS[cat]}</span>
                    <span className="text-base text-muted-foreground bg-muted px-3 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map(doc => {
                      const isRead = readIds.has(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                            isRead
                              ? 'bg-success/8 border-success/30'
                              : 'bg-card border-border'
                          }`}
                        >
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isRead ? 'bg-success/20' : CATEGORY_COLOR[cat]
                          }`}>
                            <Icon
                              name={isRead ? 'CheckCircle2' : CATEGORY_ICON[cat]}
                              size={28}
                              className={isRead ? 'text-success' : ''}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xl font-semibold text-foreground truncate">{doc.title}</div>
                            <div className="text-base text-muted-foreground">{doc.file_size}</div>
                          </div>
                          <button
                            onClick={() => handleOpen(doc)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xl font-bold ripple flex-shrink-0 transition-all ${
                              isRead
                                ? 'bg-success/15 text-success'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            Открыть
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Кнопка подтверждения */}
          <div className={`flex-shrink-0 pt-2 ${!visible && !loading ? 'flex-1 flex flex-col justify-end' : ''}`}>
            {visible && !allRead && (
              <p className="text-center text-lg text-muted-foreground mb-2">
                Откройте все документы, чтобы продолжить
              </p>
            )}
            <button
              onClick={handleConfirm}
              disabled={!allRead || confirming}
              className={`w-full h-16 rounded-2xl font-bold text-2xl transition-all ripple ${
                allRead && !confirming
                  ? 'bg-primary text-primary-foreground active:scale-[0.98] shadow-lg'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {confirming ? 'Сохранение...' : 'Прочитано и утверждено'}
            </button>
          </div>
        </div>
      </div>

      {viewDoc && <DocViewerPortal doc={viewDoc} onClose={handleCloseViewer} />}
    </div>
  );
}