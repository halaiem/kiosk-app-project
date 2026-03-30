import CriticalAlertPopup from "@/components/dashboard/CriticalAlertPopup";
import { OverviewView } from "./dispatcher/DispatcherOverview";
import { MessagesView } from "./dispatcher/DispatcherMessages";
import { NotificationsView, AlertsView } from "./dispatcher/DispatcherAlertsNotif";
import type {
  DispatcherTab,
  DispatchMessage,
  Notification,
  Alert,
  DriverInfo,
  DashboardStats,
} from "@/types/dashboard";

interface DispatcherPanelProps {
  tab: DispatcherTab;
  messages: DispatchMessage[];
  notifications: Notification[];
  alerts: Alert[];
  drivers: DriverInfo[];
  stats: DashboardStats;
  onSendMessage: (driverId: string, text: string) => void;
  onMarkMessageRead: (id: string) => void;
  onResolveAlert: (id: string, resolverName: string) => void;
  onMarkNotificationRead: (id: string) => void;
  userName: string;
  onOpenMessages?: () => void;
}

export default function DispatcherPanel({
  tab,
  messages,
  notifications,
  alerts,
  drivers,
  stats,
  onSendMessage,
  onMarkMessageRead,
  onResolveAlert,
  onMarkNotificationRead,
  userName,
  onOpenMessages,
}: DispatcherPanelProps) {
  if (tab === "overview") {
    return (
      <OverviewView
        stats={stats}
        alerts={alerts}
        messages={messages}
        drivers={drivers}
        onOpenMessages={onOpenMessages}
        onSendMessage={onSendMessage}
        onMarkMessageRead={onMarkMessageRead}
        onResolveAlert={onResolveAlert}
        userName={userName}
      />
    );
  }

  const criticalPopup = (
    <CriticalAlertPopup
      messages={messages}
      alerts={alerts}
      onResolveAlert={onResolveAlert}
      onMarkMessageRead={onMarkMessageRead}
      onSendReply={onSendMessage}
      userName={userName}
    />
  );

  if (tab === "messages") {
    return (<>{criticalPopup}<MessagesView messages={messages} drivers={drivers} onSendMessage={onSendMessage} onMarkMessageRead={onMarkMessageRead} /></>);
  }
  if (tab === "notifications") {
    return (<>{criticalPopup}<NotificationsView notifications={notifications} onMarkNotificationRead={onMarkNotificationRead} /></>);
  }
  if (tab === "alerts") {
    return (<>{criticalPopup}<AlertsView alerts={alerts} onResolveAlert={onResolveAlert} userName={userName} /></>);
  }
  return null;
}
