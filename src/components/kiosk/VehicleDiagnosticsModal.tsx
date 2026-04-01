import { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';
import { reportIssue } from '@/api/diagnosticsApi';
import { VehicleDiagnosticSummary, VehicleDiagnosticCheck } from '@/types/kiosk';

interface Props {
  isDark: boolean;
  checks: VehicleDiagnosticCheck[];
  summary: VehicleDiagnosticSummary;
  vehicleNumber: string;
  onClose: () => void;
  onRefresh: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  engine: 'Engine',
  brakes: 'Disc',
  electrical: 'Zap',
  transmission: 'Cog',
  tires: 'Circle',
  body: 'Car',
  cooling: 'Thermometer',
  emission: 'Wind',
  steering: 'Compass',
  general: 'Wrench',
};

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ok: { label: 'Норма', bg: 'bg-green-500/15', text: 'text-green-500', dot: 'bg-green-400' },
  info: { label: 'Инфо', bg: 'bg-blue-500/15', text: 'text-blue-500', dot: 'bg-blue-400' },
  warning: { label: 'Внимание', bg: 'bg-yellow-500/15', text: 'text-yellow-600', dot: 'bg-yellow-400' },
  critical: { label: 'Критично', bg: 'bg-red-500/15', text: 'text-red-500', dot: 'bg-red-500' },
};

export default function VehicleDiagnosticsModal({
  isDark,
  checks,
  summary,
  vehicleNumber,
  onClose,
  onRefresh,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportMode, setReportMode] = useState(false);
  const [reportDiagId, setReportDiagId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState('');
  const [reportSeverity, setReportSeverity] = useState('warning');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const openReportForm = (diagId?: string) => {
    setReportDiagId(diagId ?? null);
    setReportMessage('');
    setReportSeverity('warning');
    setReportMode(true);
  };

  const sendReport = async () => {
    if (!reportMessage.trim()) return;
    setSending(true);
    try {
      await reportIssue({
        diagnosticId: reportDiagId ?? undefined,
        message: reportMessage.trim(),
        severity: reportSeverity,
      });
      setReportMode(false);
      setToast('Сообщение отправлено диспетчеру');
      onRefresh();
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('Ошибка отправки');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSending(false);
    }
  };

  const sevConf = (sev: string) => SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.info;

  const content = (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col ${isDark ? 'dark' : ''}`}
      style={{ backgroundColor: 'hsl(var(--kiosk-bg))' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0"
        style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))', color: 'hsl(var(--kiosk-header-text))' }}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Activity" size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white leading-tight">Диагностика ТС</h2>
          {vehicleNumber && (
            <p className="text-sm text-white/70">Борт {vehicleNumber}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center ripple active:scale-95 transition-all"
        >
          <Icon name="X" size={24} className="text-white" />
        </button>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────── */}
      <div className="flex gap-3 px-6 py-4 border-b border-border flex-shrink-0" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
        <SummaryBadge count={summary.ok} label="Норма" dotColor="bg-green-400" textColor="text-green-500" bgColor="bg-green-500/10" />
        <SummaryBadge count={summary.warning} label="Внимание" dotColor="bg-yellow-400" textColor="text-yellow-500" bgColor="bg-yellow-500/10" />
        <SummaryBadge count={summary.critical} label="Критично" dotColor="bg-red-500" textColor="text-red-500" bgColor="bg-red-500/10" />
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/60">
          <span className="text-sm text-muted-foreground">Всего:</span>
          <span className="text-lg font-black text-foreground tabular-nums">{summary.total}</span>
        </div>
      </div>

      {/* ── Checks list ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
        {checks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Icon name="ShieldCheck" size={48} className="mb-3 text-green-400" />
            <p className="text-lg font-semibold">Диагностических данных нет</p>
            <p className="text-sm">Проверки не обнаружены для этого ТС</p>
          </div>
        )}

        {checks.map(check => {
          const isExpanded = expandedId === check.id;
          const sc = sevConf(check.severity);
          const catIcon = CATEGORY_ICONS[check.category] ?? 'Wrench';

          return (
            <div
              key={check.id}
              className={`rounded-2xl border transition-all ${
                check.severity === 'critical'
                  ? 'border-red-500/40 bg-red-500/5'
                  : check.severity === 'warning'
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-border bg-card'
              }`}
            >
              {/* Row */}
              <button
                onClick={() => toggle(check.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-muted/30 transition-colors rounded-2xl"
              >
                {/* Category icon */}
                <div className={`w-10 h-10 rounded-xl ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={catIcon} size={20} className={sc.text} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-foreground text-sm leading-tight truncate">
                      {check.checkName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug truncate">
                    {check.shortDescription}
                  </p>
                </div>

                {/* Severity badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${sc.bg} flex-shrink-0`}>
                  <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  <span className={`text-xs font-semibold ${sc.text}`}>{sc.label}</span>
                </div>

                {/* Chevron */}
                <Icon
                  name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                  size={18}
                  className="text-muted-foreground flex-shrink-0"
                />
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/50 mx-4 space-y-3">
                  <div className="pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Код: {check.checkCode}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(check.detectedAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {check.fullDescription}
                    </p>
                  </div>

                  {(check.severity === 'warning' || check.severity === 'critical') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReportForm(check.id);
                      }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold ripple active:scale-[0.98] transition-all w-full justify-center"
                    >
                      <Icon name="AlertTriangle" size={16} />
                      Сообщить диспетчеру
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom action ───────────────────────────────────────── */}
      {!reportMode && (
        <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl bg-muted text-muted-foreground text-base font-medium ripple active:scale-[0.98] transition-all"
          >
            Закрыть
          </button>
          <button
            onClick={() => openReportForm()}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground text-base font-bold ripple active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Icon name="AlertTriangle" size={20} />
            Сообщить диспетчеру
          </button>
        </div>
      )}

      {/* ── Report form overlay ─────────────────────────────────── */}
      {reportMode && (
        <div className="px-6 py-4 border-t border-border flex-shrink-0 space-y-4" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
          <div className="flex items-center gap-3 mb-1">
            <Icon name="MessageSquare" size={20} className="text-primary" />
            <span className="text-base font-bold text-foreground">Сообщение диспетчеру</span>
          </div>

          {/* Severity selector */}
          <div className="flex gap-2">
            {(['warning', 'critical'] as const).map(sev => {
              const sc2 = sevConf(sev);
              return (
                <button
                  key={sev}
                  onClick={() => setReportSeverity(sev)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ripple ${
                    reportSeverity === sev
                      ? `${sc2.bg} ${sc2.text} border-current`
                      : 'border-border text-muted-foreground bg-muted/40'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${sc2.dot}`} />
                  {sc2.label}
                </button>
              );
            })}
          </div>

          {/* Quick messages */}
          <div className="flex flex-wrap gap-2">
            {[
              'Критическая неисправность',
              'Требуется остановка',
              'Странный шум/вибрация',
              'Сигнал на приборной панели',
            ].map(txt => (
              <button
                key={txt}
                onClick={() => setReportMessage(txt)}
                className={`px-3 py-2 rounded-xl border text-sm transition-all ripple ${
                  reportMessage === txt
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-muted/40 text-foreground'
                }`}
              >
                {txt}
              </button>
            ))}
          </div>

          <textarea
            value={reportMessage}
            onChange={e => setReportMessage(e.target.value)}
            placeholder="Опишите проблему..."
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />

          <div className="flex gap-3">
            <button
              onClick={() => setReportMode(false)}
              className="flex-1 h-14 rounded-2xl bg-muted text-muted-foreground text-base font-medium ripple active:scale-[0.98] transition-all"
            >
              Отмена
            </button>
            <button
              onClick={sendReport}
              disabled={!reportMessage.trim() || sending}
              className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground text-base font-bold ripple active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Icon name="Loader2" size={20} className="animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Icon name="Send" size={20} />
                  Отправить
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-foreground text-background text-sm font-semibold shadow-2xl animate-fade-in z-[10000]">
          {toast}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

/* ── Summary badge subcomponent ──────────────────────────────────────────── */

function SummaryBadge({
  count,
  label,
  dotColor,
  textColor,
  bgColor,
}: {
  count: number;
  label: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${bgColor}`}>
      <div className={`w-3 h-3 rounded-full ${dotColor}`} />
      <div className="flex flex-col">
        <span className={`text-lg font-black tabular-nums leading-none ${textColor}`}>{count}</span>
        <span className="text-[10px] text-muted-foreground leading-none mt-0.5">{label}</span>
      </div>
    </div>
  );
}
