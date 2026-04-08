export type UserRole = 'dispatcher' | 'technician' | 'admin' | 'irida_tools';

export interface DashboardUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  lastLogin?: Date;
  isActive: boolean;
}

export type DispatcherTab = 'overview' | 'messages' | 'notifications' | 'alerts' | 'vehicle_issues';
export type TechnicianTab = 'routes' | 'documents' | 'vehicles' | 'drivers' | 'schedule' | 'daily_assignment' | 'diagnostics';
export type AdminTab = 'users' | 'settings' | 'servers' | 'logs' | 'diagnostic_apis' | 'admin_vehicles';
export type IridaToolsTab = 'cities' | 'it_settings' | 'ui_design' | 'software' | 'connection' | 'server' | 'equipment' | 'instructions' | 'database' | 'it_logs' | 'terminal';
export type DashboardTab = DispatcherTab | TechnicianTab | AdminTab | IridaToolsTab;

export type AlertLevel = 'info' | 'warning' | 'critical';
export type VehicleStatus = 'active' | 'maintenance' | 'idle' | 'offline';
export type DriverStatus = 'on_shift' | 'off_shift' | 'break' | 'sick';
export type DriverLifecycleStatus = 'active' | 'vacation' | 'sick_leave' | 'fired';
export type ServerStatus = 'online' | 'warning' | 'offline';
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'expired';
export type RouteStatus = 'active' | 'route_change' | 'temp_route' | 'route_extension' | 'suspended' | 'planned';

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
  routeStatus?: RouteStatus;
}

export interface VehicleInfo {
  id: string;
  number: string;
  type: 'tram' | 'trolleybus' | 'bus' | 'electrobus';
  status: VehicleStatus;
  routeNumber: string;
  driverName: string;
  lastMaintenance: Date;
  nextMaintenance: Date;
  mileage: number;
  // Extended fields
  vinNumber?: string;
  boardNumber?: string;
  govRegNumber?: string;
  model?: string;
  manufacturer?: string;
  regCertificateNumber?: string;
  documentsInfo?: string;
  year?: number;
  fuelType?: string;
  vehicleColor?: string;
  passengerCapacity?: number;
  isAccessible?: boolean;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  techInspectionExpiry?: string;
  licensePlate?: string;
  capacity?: number;
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
  pin?: string;
  vehicleType?: string;
  driverStatus?: DriverLifecycleStatus;
  statusChangedAt?: string;
  statusNote?: string;
  isActive?: boolean;
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
  driverId?: number;
  vehicleId?: string;
  routeId?: string;
  documentId?: number;
  shiftType?: 'regular' | 'additional';
  notes?: string;
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
  assignedToId?: number;
  authorId?: number;
  content?: string;
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

// Vehicle Diagnostics types
export type DiagnosticSeverity = 'ok' | 'info' | 'warning' | 'critical';
export type DiagnosticCategory = 'engine' | 'brakes' | 'electrical' | 'transmission' | 'tires' | 'body' | 'cooling' | 'emission' | 'steering' | 'general';
export type IssueReportStatus = 'new' | 'seen_dispatcher' | 'seen_technician' | 'in_progress' | 'resolved';

export interface DiagnosticCheck {
  id: string;
  checkCode: string;
  checkName: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  shortDescription: string;
  fullDescription: string;
  detectedAt: string;
}

export interface DiagnosticSummary {
  ok: number;
  warning: number;
  critical: number;
  total: number;
}

export interface VehicleStatusData {
  summary: DiagnosticSummary;
  checks: DiagnosticCheck[];
  vehicleNumber: string;
}

export interface IssueReport {
  id: string;
  vehicleNumber: string;
  driverName: string;
  routeNumber: string;
  message: string;
  severity: string;
  reportStatus: IssueReportStatus;
  dispatcherNotified: boolean;
  technicianNotified: boolean;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  resolvedByName: string | null;
  diagnosticId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TechDiagnosticReport {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  routeNumber: string;
  totalChecks: number;
  criticalCount: number;
  warningCount: number;
  lastCheckAt: string;
  checks: DiagnosticCheck[];
}

export interface DiagnosticApiConfig {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  apiName: string;
  apiType: string;
  apiUrl: string;
  pollInterval: number;
  isActive: boolean;
  createdAt: string;
}