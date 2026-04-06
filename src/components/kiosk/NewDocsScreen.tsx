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
    <div className="fixed inset-0 z-[300] flex items-stretch">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 ml-auto w-full max-w-2xl bg-card flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${CATEGORY_COLOR[doc.category]}`}>
            <Icon name={CATEGORY_ICON[doc.category]} size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm md:text-base truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[doc.category]} · {doc.file_size}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-muted/30 rounded-2xl p-5 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono min-h-[200px]">
            {doc.content || 'Содержимое документа недоступно.'}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setChecked(c => !c)}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                checked ? 'bg-primary border-primary' : 'border-border bg-background'
              }`}
            >
              {checked && <Icon name="Check" size={14} className="text-primary-foreground" />}
            </div>
            <span className="text-sm text-foreground font-medium">Я прочитал данный документ</span>
          </label>
          <button
            disabled={!checked}
            onClick={onClose}
            className={`w-full h-12 rounded-2xl font-bold text-base transition-all ${
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

export default function NewDocsScreen({ onDone }: Props) {
  const [docs, setDocs] = useState<NewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [viewDoc, setViewDoc] = useState<NewDoc | null>(null);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchNewDocs()
      .then(data => setDocs(data))
      .catch(() => setDocs([]))
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
        <div className="landscape:w-[35%] portrait:py-8 portrait:px-6 flex flex-col items-center justify-center gap-5 px-8 flex-shrink-0">
          <div className="inline-flex items-center justify-center w-24 h-24 portrait:w-28 portrait:h-28 rounded-full bg-primary/15">
            <div className="w-16 h-16 portrait:w-20 portrait:h-20 rounded-full bg-primary/25 flex items-center justify-center">
              <Icon name="FileCheck" size={40} className="text-primary" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl portrait:text-3xl font-bold text-foreground mb-1">
              Новые документы
            </h1>
            <p className="text-sm portrait:text-base text-muted-foreground">
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
        <div className="landscape:flex-1 portrait:flex-1 portrait:overflow-y-auto flex flex-col px-6 landscape:py-6 portrait:py-4 portrait:pb-6 gap-4 overflow-hidden">

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && visible && (
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {grouped.map(({ cat, items }) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${CATEGORY_COLOR[cat]}`}>
                      <Icon name={CATEGORY_ICON[cat]} size={14} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{CATEGORY_LABELS[cat]}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(doc => {
                      const isRead = readIds.has(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                            isRead
                              ? 'bg-success/8 border-success/30'
                              : 'bg-card border-border'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isRead ? 'bg-success/20' : CATEGORY_COLOR[cat]
                          }`}>
                            <Icon
                              name={isRead ? 'CheckCircle2' : CATEGORY_ICON[cat]}
                              size={18}
                              className={isRead ? 'text-success' : ''}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">{doc.title}</div>
                            <div className="text-xs text-muted-foreground">{doc.file_size}</div>
                          </div>
                          <button
                            onClick={() => handleOpen(doc)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ripple flex-shrink-0 transition-all ${
                              isRead
                                ? 'bg-success/15 text-success'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            {isRead ? 'Открыть' : 'Открыть'}
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
          <div className="flex-shrink-0 pt-2">
            {visible && !allRead && (
              <p className="text-center text-xs text-muted-foreground mb-2">
                Откройте все документы, чтобы продолжить
              </p>
            )}
            <button
              onClick={handleConfirm}
              disabled={!allRead || confirming}
              className={`w-full h-14 md:h-16 rounded-2xl font-bold text-base md:text-xl transition-all ripple ${
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