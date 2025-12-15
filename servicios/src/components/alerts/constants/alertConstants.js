/**
 * @fileoverview Alert System Constants
 * @description Centralized constants for alert status, types, animations, and filters
 * @version 1.0.0
 * @module alerts/constants
 */

import {
  Thermometer,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  AlertCircle,
  CheckCheck
} from "lucide-react";

/**
 * Alert status configuration mapping
 * @constant {Object} ALERT_STATUS_MAP
 * @description Maps alert statuses to their UI properties (label, icon, colors)
 */
export const ALERT_STATUS_MAP = {
  pending: {
    label: "Pendiente",
    actionLabel: "Atender",
    variant: "destructive",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10",
    borderColor: "border-red-200 dark:border-red-800"
  },
  acknowledged: {
    label: "Atendida",
    actionLabel: "Resolver",
    variant: "warning",
    icon: Activity,
    color: "text-amber-600",
    bgColor: "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10",
    borderColor: "border-amber-200 dark:border-amber-800"
  },
  resolved: {
    label: "Resuelta",
    actionLabel: "Resuelta",
    variant: "success",
    icon: CheckCheck,
    color: "text-emerald-600",
    bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10",
    borderColor: "border-emerald-200 dark:border-emerald-800"
  },
  false_alarm: {
    label: "Falsa Alarma",
    actionLabel: "Falsa Alarma",
    variant: "secondary",
    icon: XCircle,
    color: "text-slate-600",
    bgColor: "bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/20 dark:to-slate-900/10",
    borderColor: "border-slate-200 dark:border-slate-800"
  }
};

/**
 * Alert type configuration mapping
 * @constant {Object} ALERT_TYPE_MAP
 * @description Maps alert types to their UI properties (label, icon, colors)
 */
export const ALERT_TYPE_MAP = {
  temperature: {
    label: "Temperatura",
    icon: Thermometer,
    color: "text-blue-600",
    bgColor: "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  disconnection: {
    label: "Desconexión",
    icon: WifiOff,
    color: "text-orange-600",
    bgColor: "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10",
    borderColor: "border-orange-200 dark:border-orange-800"
  }
};

/**
 * Framer Motion animation variants
 * @constant {Object} ANIMATION_VARIANTS
 * @description Reusable animation configurations for consistent motion design
 */
export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  },
  staggerChildrenFast: {
    animate: {
      transition: {
        staggerChildren: 0.05
      }
    }
  }
};

/**
 * Date range filter options
 * @constant {Object} DATE_RANGE_OPTIONS
 * @description Available date range filters for alert history
 */
export const DATE_RANGE_OPTIONS = {
  today: { label: "Hoy", value: "today" },
  week: { label: "Última semana", value: "week" },
  month: { label: "Último mes", value: "month" },
  quarter: { label: "Último trimestre", value: "quarter" }
};

/**
 * Pagination configuration
 * @constant {Object} PAGINATION_CONFIG
 * @description Default pagination settings for alert tables
 */
export const PAGINATION_CONFIG = {
  itemsPerPage: 20,
  maxVisiblePages: 5
};

/**
 * Timeline event type configuration
 * @constant {Object} TIMELINE_EVENT_TYPES
 * @description Configuration for different timeline event types
 */
export const TIMELINE_EVENT_TYPES = {
  created: {
    label: "Alerta generada",
    icon: AlertTriangle,
    color: "from-red-500 to-red-600"
  },
  acknowledged: {
    label: "Alerta atendida",
    icon: Activity,
    color: "from-amber-500 to-amber-600"
  },
  observation: {
    label: "Observación agregada",
    icon: CheckCircle,
    color: "from-blue-500 to-blue-600"
  },
  resolved: {
    label: "Alerta resuelta",
    icon: CheckCheck,
    color: "from-emerald-500 to-emerald-600"
  },
  false_alarm: {
    label: "Falsa alarma",
    icon: XCircle,
    color: "from-gray-500 to-gray-600"
  }
};

/**
 * API endpoint paths
 * @constant {Object} API_ENDPOINTS
 * @description Centralized API endpoint definitions
 */
export const API_ENDPOINTS = {
  getAlertDetail: (alertId) => `/api/alerts/${alertId}`,
  listAlerts: '/api/alerts/list',
  acknowledgeAlert: '/api/alerts/acknowledge',
  resolveAlert: '/api/alerts/resolve',
  markFalseAlarm: '/api/alerts/false-alarm',
  addObservation: '/api/alerts/observation'
};

/**
 * Default alert values
 * @constant {Object} DEFAULT_VALUES
 * @description Default values used across alert components
 */
export const DEFAULT_VALUES = {
  observationMaxLength: 500,
  defaultUserEmail: "usuario@example.com",
  defaultDateRangeFilter: "week",
  defaultStatusFilter: "all",
  defaultTypeFilter: "all",
  defaultSensorFilter: "all",
  alertFetchLimit: 1000
};
