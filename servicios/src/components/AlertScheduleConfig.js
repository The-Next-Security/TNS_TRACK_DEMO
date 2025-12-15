/**
 * AlertScheduleConfig.js
 *
 * Componente React para gestión de horarios de envío de alertas globales.
 * Permite configurar horarios de días hábiles y sábados, con opción de respetar feriados.
 *
 * Feature: 002-configurable-alert-schedules
 * Issue: https://github.com/TNSTRACK/servicios/issues/19
 *
 * @module components/AlertScheduleConfig
 * @requires react
 * @requires alertScheduleService
 * @requires @/components/ui/*
 */

import React, { useState, useEffect } from 'react';
import alertScheduleService from '../services/alertScheduleService';
import analyticsService from '../services/analyticsService';
import CurrentConfigDisplay from './CurrentConfigDisplay';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Clock3,
  Info
} from 'lucide-react';

/**
 * Component for managing global alert schedule configuration
 */
const AlertScheduleConfig = () => {
  // ============================================================================
  // STATE
  // ============================================================================

  // Configuration state
  const [config, setConfig] = useState({
    weekday_start: '',
    weekday_end: '',
    saturday_start: '',
    saturday_end: '',
    sunday_start: '',
    sunday_end: '',
    respect_holidays: 'true'
  });

  // Original config for comparison (to detect changes)
  const [originalConfig, setOriginalConfig] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showResetDialog, setShowResetDialog] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Load configuration on component mount
   */
  useEffect(() => {
    loadConfiguration();
  }, []);

  /**
   * Clear success message after 5 seconds
   */
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  /**
   * Load current configuration from backend
   */
  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await alertScheduleService.getConfig();

      // Convert time format for display (HH:mm:ss -> HH:mm)
      const displayConfig = {
        weekday_start: alertScheduleService.formatTimeForDisplay(data.weekday_start),
        weekday_end: alertScheduleService.formatTimeForDisplay(data.weekday_end),
        saturday_start: alertScheduleService.formatTimeForDisplay(data.saturday_start),
        saturday_end: alertScheduleService.formatTimeForDisplay(data.saturday_end),
        sunday_start: alertScheduleService.formatTimeForDisplay(data.sunday_start || '00:00:00'),
        sunday_end: alertScheduleService.formatTimeForDisplay(data.sunday_end || '00:00:00'),
        respect_holidays: data.respect_holidays
      };

      setConfig(displayConfig);
      setOriginalConfig(displayConfig);
    } catch (err) {
      setError(err.message);
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save configuration changes
   */
  const saveConfiguration = async () => {
    try {
      setSaving(true);
      setError(null);
      setValidationErrors({});

      // Convert time format for API (HH:mm -> HH:mm:ss)
      const apiConfig = {
        weekday_start: alertScheduleService.formatTimeForAPI(config.weekday_start),
        weekday_end: alertScheduleService.formatTimeForAPI(config.weekday_end),
        saturday_start: alertScheduleService.formatTimeForAPI(config.saturday_start),
        saturday_end: alertScheduleService.formatTimeForAPI(config.saturday_end),
        sunday_start: alertScheduleService.formatTimeForAPI(config.sunday_start),
        sunday_end: alertScheduleService.formatTimeForAPI(config.sunday_end),
        respect_holidays: config.respect_holidays
      };

      const updatedData = await alertScheduleService.updateConfig(apiConfig);

      // Update config with returned data
      const displayConfig = {
        weekday_start: alertScheduleService.formatTimeForDisplay(updatedData.weekday_start),
        weekday_end: alertScheduleService.formatTimeForDisplay(updatedData.weekday_end),
        saturday_start: alertScheduleService.formatTimeForDisplay(updatedData.saturday_start),
        saturday_end: alertScheduleService.formatTimeForDisplay(updatedData.saturday_end),
        sunday_start: alertScheduleService.formatTimeForDisplay(updatedData.sunday_start || '00:00:00'),
        sunday_end: alertScheduleService.formatTimeForDisplay(updatedData.sunday_end || '00:00:00'),
        respect_holidays: updatedData.respect_holidays
      };

      setConfig(displayConfig);
      setOriginalConfig(displayConfig);
      setSuccessMessage('Configuración guardada exitosamente');
    } catch (err) {
      // Check if error contains validation details
      if (err.message.startsWith('Validación falló:')) {
        setError(err.message);
      } else {
        setError(err.message);
      }
      console.error('Error saving configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset configuration to defaults
   */
  const resetToDefaults = async () => {
    try {
      setResetting(true);
      setError(null);
      setShowResetDialog(false);

      const defaultData = await alertScheduleService.resetToDefaults();

      // Update config with default data
      const displayConfig = {
        weekday_start: alertScheduleService.formatTimeForDisplay(defaultData.weekday_start),
        weekday_end: alertScheduleService.formatTimeForDisplay(defaultData.weekday_end),
        saturday_start: alertScheduleService.formatTimeForDisplay(defaultData.saturday_start),
        saturday_end: alertScheduleService.formatTimeForDisplay(defaultData.saturday_end),
        sunday_start: alertScheduleService.formatTimeForDisplay(defaultData.sunday_start || '00:00:00'),
        sunday_end: alertScheduleService.formatTimeForDisplay(defaultData.sunday_end || '00:00:00'),
        respect_holidays: defaultData.respect_holidays
      };

      setConfig(displayConfig);
      setOriginalConfig(displayConfig);
      setSuccessMessage('Configuración restablecida a valores por defecto');
    } catch (err) {
      setError(err.message);
      console.error('Error resetting configuration:', err);
    } finally {
      setResetting(false);
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle input change for time fields
   */
  const handleTimeChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handle switch change for respect_holidays
   */
  const handleSwitchChange = (checked) => {
    setConfig(prev => ({
      ...prev,
      respect_holidays: checked ? 'true' : 'false'
    }));
  };

  /**
   * Handle cancel - revert to original config
   */
  const handleCancel = () => {
    setConfig(originalConfig);
    setValidationErrors({});
    setError(null);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const hasChanges = originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig);
  const isModifiedFromDefaults = originalConfig && alertScheduleService.isModified({
    weekday_start: alertScheduleService.formatTimeForAPI(originalConfig.weekday_start),
    weekday_end: alertScheduleService.formatTimeForAPI(originalConfig.weekday_end),
    saturday_start: alertScheduleService.formatTimeForAPI(originalConfig.saturday_start),
    saturday_end: alertScheduleService.formatTimeForAPI(originalConfig.saturday_end),
    sunday_start: alertScheduleService.formatTimeForAPI(originalConfig.sunday_start || '00:00'),
    sunday_end: alertScheduleService.formatTimeForAPI(originalConfig.sunday_end || '00:00'),
    respect_holidays: originalConfig.respect_holidays
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header Card - Ultra Compact */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="py-1.5 px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <CardTitle className="text-sm sm:text-base leading-none">Configuración Global de Horarios</CardTitle>
              {isModifiedFromDefaults && (
                <Badge variant="secondary" className="h-4 text-[9px] px-1 ml-1">Custom</Badge>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-none">
              <span className="font-semibold text-primary">Afecta a todos</span>
            </p>
          </div>
          <CardDescription className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Las alertas se envían fuera de los horarios definidos. Durante la franja configurada como laboral no se envían. Domingos: si Inicio ≥ Fin, se envía todo el día. "Respetar Feriados": en feriados también se envía todo el día.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Error Alert - Mobile optimized */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm sm:text-base">Error</AlertTitle>
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Alert - Mobile optimized */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-green-500 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900 text-sm sm:text-base">Éxito</AlertTitle>
              <AlertDescription className="text-green-800 text-sm">{successMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration Form - Ultra Compact */}
      <Card>
        <CardHeader className="py-1.5 px-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <CardTitle className="text-sm sm:text-base leading-none">Horarios por Día</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-3 sm:px-4 pb-3">
          {/* Weekday Hours - Ultra Compact */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-3 w-3 text-muted-foreground" />
              <Label className="text-xs font-medium">Lun-Vie</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-4">
              <div className="space-y-0.5">
                <Label htmlFor="weekday_start" className="text-[11px]">Inicio</Label>
                <Input
                  id="weekday_start"
                  type="time"
                  value={config.weekday_start}
                  onChange={(e) => handleTimeChange('weekday_start', e.target.value)}
                  className={`h-9 text-sm py-1 ${validationErrors.weekday_start ? 'border-red-500' : ''}`}
                  inputMode="none"
                />
                {validationErrors.weekday_start && (
                  <p className="text-[10px] text-red-500 leading-tight">{validationErrors.weekday_start}</p>
                )}
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="weekday_end" className="text-[11px]">Fin</Label>
                <Input
                  id="weekday_end"
                  type="time"
                  value={config.weekday_end}
                  onChange={(e) => handleTimeChange('weekday_end', e.target.value)}
                  className={`h-9 text-sm py-1 ${validationErrors.weekday_end ? 'border-red-500' : ''}`}
                  inputMode="none"
                />
                {validationErrors.weekday_end && (
                  <p className="text-[10px] text-red-500 leading-tight">{validationErrors.weekday_end}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-1.5" />

          {/* Saturday Hours - Ultra Compact */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-3 w-3 text-muted-foreground" />
              <Label className="text-xs font-medium">Sábados</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-4">
              <div className="space-y-0.5">
                <Label htmlFor="saturday_start" className="text-[11px]">Inicio</Label>
                <Input
                  id="saturday_start"
                  type="time"
                  value={config.saturday_start}
                  onChange={(e) => handleTimeChange('saturday_start', e.target.value)}
                  className={`h-9 text-sm py-1 ${validationErrors.saturday_start ? 'border-red-500' : ''}`}
                  inputMode="none"
                />
                {validationErrors.saturday_start && (
                  <p className="text-[10px] text-red-500 leading-tight">{validationErrors.saturday_start}</p>
                )}
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="saturday_end" className="text-[11px]">Fin</Label>
                <Input
                  id="saturday_end"
                  type="time"
                  value={config.saturday_end}
                  onChange={(e) => handleTimeChange('saturday_end', e.target.value)}
                  className={`h-9 text-sm py-1 ${validationErrors.saturday_end ? 'border-red-500' : ''}`}
                  inputMode="none"
                />
                {validationErrors.saturday_end && (
                  <p className="text-[10px] text-red-500 leading-tight">{validationErrors.saturday_end}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-1.5" />

          {/* Sunday Hours - Ultra Compact */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-3 w-3 text-muted-foreground" />
              <Label className="text-xs font-medium">Domingos</Label>
              <span className="text-[10px] text-muted-foreground">(Inicio ≥ fin = todo el día)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-4">
              <div className="space-y-0.5">
                <Label htmlFor="sunday_start" className="text-[11px]">Inicio</Label>
                <Input
                  id="sunday_start"
                  type="time"
                  value={config.sunday_start}
                  onChange={(e) => handleTimeChange('sunday_start', e.target.value)}
                  className={`h-9 text-sm py-1 ${validationErrors.sunday_start ? 'border-red-500' : ''}`}
                  inputMode="none"
                />
                {validationErrors.sunday_start && (
                  <p className="text-[10px] text-red-500 leading-tight">{validationErrors.sunday_start}</p>
                )}
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="sunday_end" className="text-[11px]">Fin</Label>
                <Input
                  id="sunday_end"
                  type="time"
                  value={config.sunday_end}
                  onChange={(e) => handleTimeChange('sunday_end', e.target.value)}
                  className={`h-9 text-sm py-1 ${validationErrors.sunday_end ? 'border-red-500' : ''}`}
                  inputMode="none"
                />
                {validationErrors.sunday_end && (
                  <p className="text-[10px] text-red-500 leading-tight">{validationErrors.sunday_end}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-1.5" />

          {/* Respect Holidays - Ultra Compact */}
          <div className="space-y-1">
            <div
              className="flex items-center justify-between gap-2 p-1.5 -mx-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleSwitchChange(config.respect_holidays !== 'true')}
            >
              <div className="flex-1">
                <Label htmlFor="respect_holidays" className="text-xs font-medium cursor-pointer leading-tight">
                  Respetar Feriados
                </Label>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  No enviar durante feriados nacionales
                </p>
              </div>
              <Switch
                id="respect_holidays"
                checked={config.respect_holidays === 'true'}
                onCheckedChange={handleSwitchChange}
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Ultra Compact */}
      <div className="flex flex-col sm:flex-row gap-1.5 sm:justify-end">
        <Button
          variant="outline"
          onClick={() => setShowResetDialog(true)}
          disabled={saving || resetting || !isModifiedFromDefaults}
          className="h-9 text-xs"
        >
          {resetting ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Restableciendo...
            </>
          ) : (
            <>
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Restablecer
            </>
          )}
        </Button>

        {hasChanges && (
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={saving || resetting}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
        )}

        <Button
          onClick={saveConfiguration}
          disabled={saving || resetting || !hasChanges}
          className="h-9 text-xs"
        >
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3 w-3" />
              Guardar
            </>
          )}
        </Button>
      </div>

      {/* Reset Confirmation Dialog - Mobile optimized */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">¿Restablecer configuración?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm">
                <p className="mb-3">Esta acción restablecerá la configuración de horarios laborales (cuando NO enviar alertas):</p>
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                  <li><strong>Días hábiles:</strong> 08:30 - 18:30 (horario laboral, NO enviar)</li>
                  <li><strong>Sábados:</strong> 08:30 - 14:30 (horario laboral, NO enviar)</li>
                  <li><strong>Domingos:</strong> Enviar todo el día (sin horario laboral)</li>
                  <li><strong>Feriados:</strong> Enviar todo el día (respeta feriados chilenos)</li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Las alertas se enviarán FUERA de los horarios laborales configurados.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="h-11 sm:h-10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetToDefaults} className="h-11 sm:h-10">
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AlertScheduleConfig;