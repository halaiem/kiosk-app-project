export type UserRole = 'dispatcher' | 'technician' | 'admin';

export interface DashboardUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  lastLogin?: Date;
  isActive: boolean;
}

export type DispatcherTab = 'overview' | 'messages' | 'notifications' | 'alerts';
export type TechnicianTab = 'routes' | 'documents' | 'vehicles' | 'drivers' | 'schedule';
export type AdminTab = 'users' | 'settings' | 'servers' | 'logs';
export type DashboardTab = DispatcherTab | TechnicianTab | AdminTab;

export type AlertLevel = 'info' | 'warning' | 'critical';
export type VehicleStatus = 'active' | 'maintenance' | 'idle' | 'offline';
export type DriverStatus = 'on_shift' | 'off_shift' | 'break' | 'sick';
export type ServerStatus = 'online' | 'warning' | 'offline';
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'expired';

export interface DispatchMessage {
  id: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  routeNumber: string;
  text: string;
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  read: boolean;
  type: 'normal' | 'urgent' | 'system';
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  level: AlertLevel;
  targetRole: UserRole | 'all';
}

export interface Alert {
  id: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  routeNumber: string;
  type: 'sos' | 'breakdown' | 'delay' | 'deviation' | 'speeding';
  message: string;
  level: AlertLevel;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface RouteInfo {
  id: string;
  number: string;
  name: string;
  stopsCount: number;
  distance: number;
  avgTime: number;
  isActive: boolean;
  assignedVehicles: number;
}

export interface VehicleInfo {
  id: string;
  number: string;
  type: 'tram' | 'trolleybus' | 'bus';
  status: VehicleStatus;
  routeNumber: string;
  driverName: string;
  lastMaintenance: Date;
  nextMaintenance: Date;
  mileage: number;
}

export interface DriverInfo {
  id: string;
  name: string;
  tabNumber: string;
  status: DriverStatus;
  vehicleNumber: string;
  routeNumber: string;
  shiftStart?: Date;
  shiftEnd?: Date;
  phone: string;
  rating: number;
}

export interface ScheduleEntry {
  id: string;
  routeNumber: string;
  driverName: string;
  vehicleNumber: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
}

export interface DocumentInfo {
  id: string;
  title: string;
  type: 'route_sheet' | 'maintenance_report' | 'schedule' | 'instruction' | 'license';
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  author: string;
  assignedTo?: string;
}

export interface ServerInfo {
  id: string;
  name: string;
  status: ServerStatus;
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  lastCheck: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: Date;
  details?: string;
}

export interface DashboardStats {
  activeDrivers: number;
  totalVehicles: number;
  activeRoutes: number;
  unresolvedAlerts: number;
  avgDelay: number;
  onTimePercent: number;
}
