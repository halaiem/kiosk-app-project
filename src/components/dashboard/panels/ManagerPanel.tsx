import { useState, useCallback } from 'react';
import type { ManagerTab, VehicleInfo, DriverInfo, ScheduleEntry, RouteInfo, DocumentInfo, Notification } from '@/types/dashboard';
import TicketsPanel from './shared/TicketsPanel';
import { VehiclesView, DriversView } from './technician/TechVehiclesDrivers';
import { ScheduleView } from './technician/TechSchedule';
import { NotificationsView } from './technician/TechNotificationsView';
import MessagesView from './shared/MessagesView';
import VotingView from './shared/VotingView';
import DepotParkView from './shared/DepotParkView';
import TasksView from './shared/TasksView';
import TasksArchiveView from './shared/TasksArchiveView';

interface ManagerPanelProps {
  tab: ManagerTab;
  vehicles?: VehicleInfo[];
  drivers?: DriverInfo[];
  schedule?: ScheduleEntry[];
  routes?: RouteInfo[];
  documents?: DocumentInfo[];
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string) => void;
  currentUserId?: number;
  onReload?: () => void;
}

export default function ManagerPanel({
  tab,
  vehicles = [],
  drivers = [],
  schedule = [],
  routes = [],
  documents = [],
  notifications: notifProp,
  onMarkNotificationRead: onMarkReadProp,
  currentUserId,
  onReload,
}: ManagerPanelProps) {
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(notifProp || []);

  const handleMarkRead = useCallback((id: string) => {
    if (onMarkReadProp) onMarkReadProp(id);
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [onMarkReadProp]);

  if (tab === 'service_requests') return <TicketsPanel role="manager" vehicles={vehicles} onReload={onReload} />;
  if (tab === 'tasks') return <TasksView currentUserId={currentUserId} />;
  if (tab === 'tasks_archive') return <TasksArchiveView />;
  if (tab === 'vehicles') return <VehiclesView vehicles={vehicles} onReload={onReload} />;
  if (tab === 'drivers') return <DriversView drivers={drivers} onReload={onReload} schedules={schedule} vehicles={vehicles} routes={routes} documents={documents} />;
  if (tab === 'schedule') return <ScheduleView schedule={schedule} onReload={onReload} />;
  if (tab === 'depot_park') return <DepotParkView role="manager" />;
  if (tab === 'notifications') return <NotificationsView notifications={notifProp || localNotifs} onMarkNotificationRead={handleMarkRead} />;
  if (tab === 'dash_messages') return <MessagesView currentUserId={currentUserId || 0} />;
  if (tab === 'voting') return <VotingView currentUserId={currentUserId || 0} />;
  return null;
}