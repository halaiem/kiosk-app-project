import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { fetchVehicleStatus } from '@/api/diagnosticsApi';
import { VehicleDiagnosticSummary, VehicleDiagnosticCheck } from '@/types/kiosk';
import VehicleDiagnosticsModal from './VehicleDiagnosticsModal';

interface VehicleStatusWidgetProps {
  isDark: boolean;
}

const POLL_INTERVAL = 180_000;

export default function VehicleStatusWidget({ isDark }: VehicleStatusWidgetProps) {
  const [summary, setSummary] = useState<VehicleDiagnosticSummary | null>(null);
  const [checks, setChecks] = useState<VehicleDiagnosticCheck[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchVehicleStatus();
      setSummary(data.summary ?? { ok: 0, warning: 0, critical: 0, total: 0 });
      setChecks(data.checks ?? []);
      setVehicleNumber(data.vehicleNumber ?? '');
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [load]);

  // Determine overall status
  const hasCritical = (summary?.critical ?? 0) > 0;
  const hasWarning = (summary?.warning ?? 0) > 0;

  let dotColor = 'bg-green-400';
  let statusText = 'Норма';
  let statusTextColor = 'text-green-400';
  let iconColor = 'text-green-500';

  if (hasCritical) {
    dotColor = 'bg-red-500';
    statusText = `${summary!.critical} крит.`;
    statusTextColor = 'text-red-400';
    iconColor = 'text-red-500';
  } else if (hasWarning) {
    dotColor = 'bg-yellow-400';
    statusText = `${summary!.warning} пред.`;
    statusTextColor = 'text-yellow-400';
    iconColor = 'text-yellow-500';
  }

  if (loading || error) {
    dotColor = 'bg-muted-foreground/40';
    statusText = loading ? '...' : 'Н/Д';
    statusTextColor = 'text-muted-foreground';
    iconColor = 'text-muted-foreground/60';
  }

  return (
    <>
      <button
        onClick={() => !loading && !error && setModalOpen(true)}
        className="flex-1 w-full flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-border elevation-2 px-2 py-2 tablet:py-3 active:scale-95 transition-all ripple"
        title="Диагностика ТС"
      >
        <div className="relative">
          <Icon name="Activity" size={20} className={iconColor} />
          <div
            className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${dotColor} border-2 border-card`}
          />
        </div>
        <span className={`text-lg tablet:text-xl font-black tabular-nums leading-none ${statusTextColor}`}>
          {statusText}
        </span>
        <span className="text-[9px] tablet:text-[10px] text-muted-foreground leading-none text-center">
          статус ТС
        </span>
      </button>

      {modalOpen && (
        <VehicleDiagnosticsModal
          isDark={isDark}
          checks={checks}
          summary={summary ?? { ok: 0, warning: 0, critical: 0, total: 0 }}
          vehicleNumber={vehicleNumber}
          onClose={() => setModalOpen(false)}
          onRefresh={load}
        />
      )}
    </>
  );
}