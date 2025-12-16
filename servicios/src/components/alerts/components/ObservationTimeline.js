/**
 * @fileoverview ObservationTimeline Component
 * @description Timeline view of alert events (creation, acknowledgment, observations, resolution)
 * @version 1.0.0
 * @module alerts/components/ObservationTimeline
 */

import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Activity,
  MessageSquare,
  CheckCheck,
  XCircle,
  Clock,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { ScrollArea } from "../../ui/scroll-area";
import { cn } from "../../../lib/utils";
import { parseObservations } from "../utils/alertUtils";
import { formatDateTime, formatRelativeTime } from "../utils/alertUtils";

/**
 * TimelineEvent - Single timeline event item
 * @param {Object} props - Component props
 * @param {React.Component} props.icon - Icon component
 * @param {string} props.title - Event title
 * @param {string} props.user - User who performed the action
 * @param {string} props.timestamp - Event timestamp
 * @param {string} [props.content] - Optional event content/notes
 * @param {string} props.colorFrom - Gradient start color
 * @param {string} props.colorTo - Gradient end color
 * @param {boolean} [props.isLast=false] - Whether this is the last event
 * @param {number} [props.delay=0] - Animation delay
 * @returns {JSX.Element} TimelineEvent component
 */
const TimelineEvent = ({
  icon: Icon,
  title,
  user,
  timestamp,
  content,
  colorFrom,
  colorTo,
  isLast = false,
  delay = 0
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="flex gap-4 pb-4 border-b last:border-0 group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 p-3 rounded-lg transition-colors"
  >
    <div className="relative">
      <div className={cn(
        "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg",
        `from-${colorFrom} to-${colorTo}`
      )}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      {!isLast && (
        <div className="absolute top-10 left-5 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}
    </div>
    <div className="flex-1 space-y-1">
      <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
      {user && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" />
          {user}
        </p>
      )}
      {content && (
        <Card className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
        </Card>
      )}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDateTime(timestamp)} • {formatRelativeTime(timestamp)}
      </p>
    </div>
  </motion.div>
);

/**
 * ObservationTimeline - Complete timeline of alert events
 * @param {Object} props - Component props
 * @param {Object} props.alert - Alert object with all event data
 * @param {string} [props.userEmail] - Current user email for fallback
 * @returns {JSX.Element} ObservationTimeline component
 */
export const ObservationTimeline = ({ alert, userEmail = "" }) => {
  if (!alert) return null;

  const observations = parseObservations(alert.observations);

  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-600" />
          Línea de Tiempo
        </CardTitle>
        <CardDescription>
          Historial completo de cambios y eventos
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {/* Event: Creation */}
            <TimelineEvent
              icon={AlertTriangle}
              title="Alerta generada"
              user="Sistema automático"
              timestamp={alert.createdAt}
              colorFrom="red-500"
              colorTo="red-600"
              delay={0}
            />

            {/* Event: Acknowledgment */}
            {alert.acknowledgedAt && (
              <TimelineEvent
                icon={Activity}
                title="Alerta atendida"
                user={alert.acknowledgedBy}
                timestamp={alert.acknowledgedAt}
                colorFrom="amber-500"
                colorTo="amber-600"
                delay={0.1}
              />
            )}

            {/* Events: All Observations (Oldest to Newest) */}
            {observations.map((obs, index) => (
              <TimelineEvent
                key={obs.id || index}
                icon={MessageSquare}
                title="Observación agregada"
                user={obs.userId || userEmail}
                timestamp={obs.createdAt}
                content={obs.text}
                colorFrom="blue-500"
                colorTo="blue-600"
                delay={0.1 * (index + 2)}
              />
            ))}

            {/* Event: Resolution */}
            {alert.resolvedAt && (
              <TimelineEvent
                icon={CheckCheck}
                title="Alerta resuelta"
                user={alert.resolvedBy}
                timestamp={alert.resolvedAt}
                content={alert.resolutionNotes}
                colorFrom="emerald-500"
                colorTo="emerald-600"
                isLast={!alert.markedFalseAt}
              />
            )}

            {/* Event: False Alarm */}
            {alert.status === "false_alarm" && alert.markedFalseAt && (
              <TimelineEvent
                icon={XCircle}
                title="Marcada como falsa alarma"
                user={alert.markedFalseBy}
                timestamp={alert.markedFalseAt}
                colorFrom="gray-500"
                colorTo="gray-600"
                isLast={true}
              />
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
