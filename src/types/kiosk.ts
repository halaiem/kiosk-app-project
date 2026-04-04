export type AppScreen = 'login' | 'welcome' | 'main' | 'menu';
export type MenuSection = 'profile' | 'notifications' | 'settings' | 'archive' | 'support' | 'admin';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type MessageType = 'normal' | 'important' | 'can_error' | 'dispatcher';
export type ConnectionStatus = 'online' | 'offline' | 'connecting';
export type Severity = 'info' | 'warning' | 'critical';

export interface Driver {
  id: string;
  name: string;
  routeNumber: string;
  vehicleType: 'tram' | 'trolleybus' | 'bus' | 'electrobus';
  vehicleNumber: string;
  shiftStart: string;
  dispatcherName?: string;
}

export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export interface Message {
  id: string;
  type: MessageType;
  text: string;
  timestamp: Date;
  read: boolean;
  confirmed?: boolean;
  confirmedAt?: Date;
  severity?: Severity;
  clientId?: string;
  deliveryStatus?: DeliveryStatus;
  isVoice?: boolean;
  voiceDuration?: number;
}

export interface RouteStop {
  id: number;
  name: string;
  distance: number;
  eta: number;
  isPassed: boolean;
  isCurrent: boolean;
}

export interface Vehicle {
  id: string;
  number: string;
  lat: number;
  lng: number;
  progress: number;
  interval: number;
}

export interface TelemetryPoint {
  lat: number;
  lng: number;
  speed: number;
  timestamp: Date;
  synced: boolean;
}

export interface VehicleDiagnosticCheck {
  id: string;
  checkCode: string;
  checkName: string;
  category: string;
  severity: 'ok' | 'info' | 'warning' | 'critical';
  shortDescription: string;
  fullDescription: string;
  detectedAt: string;
}

export interface VehicleDiagnosticSummary {
  ok: number;
  warning: number;
  critical: number;
  total: number;
}