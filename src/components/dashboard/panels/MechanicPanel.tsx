import { useState, useCallback } from 'react';
import { MechanicTab } from '@/types/dashboard';
import type { Notification } from '@/types/dashboard';
import TicketsPanel from './shared/TicketsPanel';
import AutoDiagnosticsView from './mechanic/AutoDiagnosticsView';
import ServiceLogView from './mechanic/ServiceLogView';
import TsDocsView from './mechanic/TsDocsView';
import EmailView from './mechanic/EmailView';
import { MechNotificationsView } from './mechanic/MechNotificationsView';
import MessagesView from './shared/MessagesView';
import VotingView from './shared/VotingView';

interface MechanicPanelProps {
  tab: MechanicTab;
  vehicles?: Record<string, unknown>[];
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string) => void;
  currentUserId?: number;
  onReload?: () => void;
}

export default function MechanicPanel({ tab, vehicles = [], notifications: notifProp, onMarkNotificationRead: onMarkReadProp, currentUserId, onReload }: MechanicPanelProps) {
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(notifProp || []);

  const handleMarkRead = useCallback((id: string) => {
    if (onMarkReadProp) onMarkReadProp(id);
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [onMarkReadProp]);

  if (tab === 'service_requests') return <TicketsPanel role="mechanic" vehicles={vehicles} onReload={onReload} />;
  if (tab === 'auto_diagnostics') return <AutoDiagnosticsView vehicles={vehicles} />;
  if (tab === 'service_log') return <ServiceLogView />;
  if (tab === 'ts_docs') return <TsDocsView vehicles={vehicles} />;
  if (tab === 'email') return <EmailView vehicles={vehicles} />;
  if (tab === 'notifications') return <MechNotificationsView notifications={notifProp || localNotifs} onMarkNotificationRead={handleMarkRead} />;
  if (tab === 'dash_messages') return <MessagesView currentUserId={currentUserId || 0} />;
  if (tab === 'voting') return <VotingView currentUserId={currentUserId || 0} />;
  return null;
}