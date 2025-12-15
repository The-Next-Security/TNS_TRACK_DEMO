/**
 * CurrentConfigDisplay.jsx
 *
 * Panel de visualización de la configuración actual con metadatos de auditoría.
 * Feature: 002-configurable-alert-schedules (Phase 5 - User Story 3)
 * Tasks: T064-T070
 */

import React from 'react';
import moment from 'moment-timezone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, X, User, Clock4, Calendar } from 'lucide-react';

/**
 * Component to display current active configuration
 * Shows schedule hours, holiday settings, and audit metadata
 */
const CurrentConfigDisplay = ({ config, loading }) => {
  if (loading) {
    return null; // Skip display during loading
  }

  if (!config || !config.updated_at) {
    return null; // No config loaded yet
  }

  // Format time for display (HH:mm from HH:mm:ss)
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5); // "08:30:00" -> "08:30"
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'No disponible';
    return moment(timestamp).tz('America/Santiago').format('DD/MM/YYYY HH:mm:ss');
  };

  // Determine if Sunday is "always send"
  const isSundayAlwaysSend = () => {
    if (!config.sunday_start || !config.sunday_end) return false;
    const start = config.sunday_start.split(':').map(Number);
    const end = config.sunday_end.split(':').map(Number);
    const startDecimal = start[0] + start[1] / 60;
    const endDecimal = end[0] + end[1] / 60;
    return startDecimal >= endDecimal;
  };

  const sundayAlwaysSend = isSundayAlwaysSend();

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock4 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Configuración Actual</CardTitle>
        </div>
        <CardDescription>
          Valores activos en el sistema. Las alertas se envían <strong>fuera</strong> de estos horarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weekdays */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Días Hábiles (L-V)</span>
            </div>
            <div className="pl-6 text-sm text-muted-foreground">
              {formatTime(config.weekday_start)} - {formatTime(config.weekday_end)}
              <p className="text-xs mt-1">Horario laboral (NO enviar)</p>
            </div>
          </div>

          {/* Saturdays */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sábados</span>
            </div>
            <div className="pl-6 text-sm text-muted-foreground">
              {formatTime(config.saturday_start)} - {formatTime(config.saturday_end)}
              <p className="text-xs mt-1">Horario laboral (NO enviar)</p>
            </div>
          </div>

          {/* Sundays */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Domingos</span>
            </div>
            <div className="pl-6 text-sm text-muted-foreground">
              {sundayAlwaysSend ? (
                <>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Enviar todo el día
                  </Badge>
                  <p className="text-xs mt-1">Sin horario laboral</p>
                </>
              ) : (
                <>
                  {formatTime(config.sunday_start)} - {formatTime(config.sunday_end)}
                  <p className="text-xs mt-1">Horario laboral (NO enviar)</p>
                </>
              )}
            </div>
          </div>

          {/* Holidays */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Feriados Chilenos</span>
            </div>
            <div className="pl-6">
              {config.respect_holidays === 'true' ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  Enviar todo el día
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  <X className="h-3 w-3 mr-1" />
                  Tratar como día normal
                </Badge>
              )}
              <p className="text-xs mt-1 text-muted-foreground">
                {config.respect_holidays === 'true'
                  ? 'Feriados = sin horario laboral'
                  : 'Feriados = aplicar horario según día'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Audit Metadata */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Información de Auditoría
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {/* Last Modified */}
            <div className="flex items-center gap-2">
              <Clock4 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Última Modificación</div>
                <div className="text-xs text-muted-foreground">
                  {formatTimestamp(config.updated_at)}
                </div>
              </div>
            </div>

            {/* Modified By */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Modificado Por</div>
                <div className="text-xs text-muted-foreground">
                  {config.updated_by || 'Sistema'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentConfigDisplay;
