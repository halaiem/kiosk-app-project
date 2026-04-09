import { MechanicTab } from '@/types/dashboard';
import ServiceRequestsView from './mechanic/ServiceRequestsView';
import AutoDiagnosticsView from './mechanic/AutoDiagnosticsView';
import ServiceLogView from './mechanic/ServiceLogView';
import TsDocsView from './mechanic/TsDocsView';
import EmailView from './mechanic/EmailView';
import MessagesView from './shared/MessagesView';

interface MechanicPanelProps {
  tab: MechanicTab;
  vehicles?: Record<string, unknown>[];
  currentUserId?: number;
  onReload?: () => void;
}

export default function MechanicPanel({ tab, vehicles = [], currentUserId, onReload }: MechanicPanelProps) {
  if (tab === 'service_requests') return <ServiceRequestsView vehicles={vehicles} onReload={onReload} />;
  if (tab === 'auto_diagnostics') return <AutoDiagnosticsView vehicles={vehicles} />;
  if (tab === 'service_log') return <ServiceLogView />;
  if (tab === 'ts_docs') return <TsDocsView vehicles={vehicles} />;
  if (tab === 'email') return <EmailView vehicles={vehicles} />;
  if (tab === 'dash_messages') return <MessagesView currentUserId={currentUserId || 0} />;
  return null;
}