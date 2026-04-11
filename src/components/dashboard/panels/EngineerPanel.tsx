import { useState, useCallback } from 'react';
import type { EngineerTab, DocumentInfo, VehicleInfo, Notification } from '@/types/dashboard';
import TicketsPanel from './shared/TicketsPanel';
import { DocumentsView } from './technician/TechDocuments';
import { VehiclesView } from './technician/TechVehiclesDrivers';
import { TechDiagnosticsView } from './technician/TechDiagnosticsView';
import { NotificationsView } from './technician/TechNotificationsView';
import MessagesView from './shared/MessagesView';
import VotingView from './shared/VotingView';

interface EngineerPanelProps {
  tab: EngineerTab;
  vehicles?: VehicleInfo[];
  documents?: DocumentInfo[];
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string) => void;
  currentUserId?: number;
  onReload?: () => void;
  onUpdateDocumentStatus?: (id: string, status: DocumentInfo['status']) => void;
}

export default function EngineerPanel({
  tab,
  vehicles = [],
  documents = [],
  notifications: notifProp,
  onMarkNotificationRead: onMarkReadProp,
  currentUserId,
  onReload,
  onUpdateDocumentStatus,
}: EngineerPanelProps) {
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(notifProp || []);

  const handleMarkRead = useCallback((id: string) => {
    if (onMarkReadProp) onMarkReadProp(id);
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [onMarkReadProp]);

  if (tab === 'service_requests') return <TicketsPanel role="engineer" vehicles={vehicles} onReload={onReload} />;
  if (tab === 'documents') return <DocumentsView documents={documents} onUpdateDocumentStatus={onUpdateDocumentStatus || (() => {})} onReload={onReload} />;
  if (tab === 'vehicles') return <VehiclesView vehicles={vehicles} onReload={onReload} />;
  if (tab === 'diagnostics') return <TechDiagnosticsView onReload={onReload} />;
  if (tab === 'notifications') return <NotificationsView notifications={notifProp || localNotifs} onMarkNotificationRead={handleMarkRead} />;
  if (tab === 'dash_messages') return <MessagesView currentUserId={currentUserId || 0} />;
  if (tab === 'voting') return <VotingView currentUserId={currentUserId || 0} />;
  return null;
}
