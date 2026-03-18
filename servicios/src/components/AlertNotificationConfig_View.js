/**
 * @fileoverview AlertNotificationConfigV2 - Configuración de Notificaciones Push
 * @description Configuración de Do Not Disturb y preferencias de notificación por dispositivo
 * @version 2.0.0 - Migración a Shadcn/UI y Tailwind CSS
 * @module AlertNotificationConfigV2
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import HeaderV2 from "./Header_View";
import PushNotificationManager from "./PushNotificationManager";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "../hooks/useToast_Hook";
import { cn } from "../lib/utils";
import {
  Settings,
  Bell,
  BellOff,
  Moon,
  Clock,
  Calendar,
  AlertTriangle,
  Info,
  Save,
  RotateCcw,
  Monitor,
  Smartphone,
  Globe,
  HelpCircle,
  Plus,
  Trash2
} from "lucide-react";
import { myNotificationHorarios } from "../services/notificationHorarios_Service";

/**
 * Días de la semana con sus etiquetas
 */
const DAYS_OF_WEEK = [
  { id: "Monday", label: "Lun", fullLabel: "Lunes" },
  { id: "Tuesday", label: "Mar", fullLabel: "Martes" },
  { id: "Wednesday", label: "Mié", fullLabel: "Miércoles" },
  { id: "Thursday", label: "Jue", fullLabel: "Jueves" },
  { id: "Friday", label: "Vie", fullLabel: "Viernes" },
  { id: "Saturday", label: "Sáb", fullLabel: "Sábado" },
  { id: "Sunday", label: "Dom", fullLabel: "Domingo" }
];

/**
 * Tipos de alertas disponibles
 */
const ALERT_TYPES = [
  {
    id: "temperature",
    label: "Alertas de temperatura",
    description: "Notificaciones cuando la temperatura sale de los rangos configurados",
    icon: "🌡️"
  },
  {
    id: "disconnection",
    label: "Alertas de desconexión",
    description: "Notificaciones cuando un dispositivo pierde conexión",
    icon: "📡"
  }
];

/**
 * Skeleton loader para el estado de carga
 */
const ConfigSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

/**
 * Componente para detectar el tipo de dispositivo
 */
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  let deviceType = "Desktop";
  let deviceIcon = Monitor;

  if (/android/i.test(userAgent)) {
    deviceType = "Android";
    deviceIcon = Smartphone;
  } else if (/iPad|iPhone|iPod/.test(userAgent)) {
    deviceType = "iOS";
    deviceIcon = Smartphone;
  } else if (/mobile/i.test(userAgent)) {
    deviceType = "Mobile";
    deviceIcon = Smartphone;
  }

  const browser = (() => {
    if (userAgent.indexOf("Chrome") > -1) return "Chrome";
    if (userAgent.indexOf("Safari") > -1) return "Safari";
    if (userAgent.indexOf("Firefox") > -1) return "Firefox";
    if (userAgent.indexOf("Edge") > -1) return "Edge";
    return "Navegador";
  })();

  return { deviceType, browser, icon: deviceIcon };
};

/**
 * Componente principal de configuración de notificaciones
 * @returns {React.Element} Componente de configuración
 */
const AlertNotificationConfigV2 = () => {
  const { toast } = useToast();
  const deviceInfo = getDeviceInfo();
  const DeviceIcon = deviceInfo.icon;

  // Estados del componente
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [preferences, setPreferences] = useState({
    dndEnabled: false,
    dndStartTime: "22:00",
    dndEndTime: "08:00",
    dndDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    allowCriticalAlerts: true,
    enabledAlertTypes: ["temperature", "disconnection"]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPreferences, setOriginalPreferences] = useState(null);

  // Mis horarios de envío (ale_horarios_usuario)
  const [misHorarios, setMisHorarios] = useState([]);
  const [misHorariosLoading, setMisHorariosLoading] = useState(false);
  const [showAddHorario, setShowAddHorario] = useState(false);
  const [nuevoHorario, setNuevoHorario] = useState({
    id_tipo_alerta: 1,
    canal: "email",
    dia_semana: 1,
    hora_inicio: "08:00:00",
    hora_fin: "18:00:00"
  });

  useEffect(() => {
    loadSubscriptionAndPreferences();
  }, []);

  const loadMisHorarios = async () => {
    setMisHorariosLoading(true);
    try {
      const data = await myNotificationHorarios.list();
      setMisHorarios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AlertNotificationConfig] loadMisHorarios:", e);
      toast({ title: "Error", description: e.message || "No se pudieron cargar tus horarios", variant: "destructive" });
      setMisHorarios([]);
    } finally {
      setMisHorariosLoading(false);
    }
  };

  useEffect(() => {
    loadMisHorarios();
  }, []);

  /**
   * ✅ iOS FIX: Listener para detectar cuando se guarda subscriptionId
   * Esto es crítico para iOS donde PushNotificationManager puede guardar
   * el subscriptionId después de que este componente ya se haya cargado
   */
  useEffect(() => {
    // Polling para verificar subscriptionId (iOS Safari a veces no dispara storage events)
    const checkSubscriptionId = () => {
      const currentSubId = localStorage.getItem("pushSubscriptionId");
      if (currentSubId && currentSubId !== subscriptionId) {
        console.log('[AlertNotificationConfigV2] 🔄 SubscriptionId actualizado detectado:', currentSubId);
        setSubscriptionId(currentSubId);

        // Recargar preferencias para la nueva suscripción
        loadSubscriptionAndPreferences();

        toast({
          title: "Suscripción detectada",
          description: "Ya puedes configurar tus preferencias de notificaciones",
          variant: "default"
        });
      }
    };

    // Verificar cada 2 segundos durante el primer minuto (para cuando el usuario acaba de suscribirse)
    const pollInterval = setInterval(checkSubscriptionId, 2000);

    // Limpiar después de 1 minuto
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 60000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [subscriptionId]);

  /**
   * Detecta cambios en las preferencias
   */
  useEffect(() => {
    if (originalPreferences) {
      const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
      setHasChanges(changed);
    }
  }, [preferences, originalPreferences]);

  /**
   * Carga el ID de suscripción y las preferencias
   */
  const loadSubscriptionAndPreferences = async () => {
    try {
      setLoading(true);

      // ✅ iOS: Obtener ID desde localStorage (guardado por PushNotificationManager)
      const subId = localStorage.getItem("pushSubscriptionId");

      console.log('[AlertNotificationConfigV2] Cargando preferencias, subscriptionId:', subId);

      // ✅ iOS: Si no existe, indicar que debe suscribirse primero
      if (!subId) {
        console.log('[AlertNotificationConfigV2] ⚠️ No hay subscriptionId en localStorage');

        // Solo mostrar toast si es la carga inicial
        if (!subscriptionId) {
          toast({
            title: "Sin suscripción activa",
            description: "Debes activar las notificaciones primero en la sección 'Notificaciones Push' más abajo.",
            variant: "warning"
          });
        }

        setLoading(false);
        return;
      }

      setSubscriptionId(subId);

      // Cargar preferencias desde el servidor
      const response = await axios.get(`/api/push/preferences/${subId}`);

      if (response.data && response.data.success && response.data.preferences) {
        const loadedPrefs = response.data.preferences;
        console.log('[AlertNotificationConfigV2] ✅ Preferencias cargadas:', loadedPrefs);
        setPreferences(loadedPrefs);
        setOriginalPreferences(loadedPrefs);
      } else {
        // Si no hay preferencias guardadas, usar las predeterminadas
        console.log('[AlertNotificationConfigV2] Usando preferencias predeterminadas');
        setOriginalPreferences(preferences);
      }
    } catch (error) {
      console.error("[AlertNotificationConfigV2] Error loading preferences:", error);

      // ✅ iOS: Mejor manejo de errores con logging detallado
      if (error.response?.status === 404) {
        // Sin preferencias guardadas (normal para primera vez)
        console.log('[AlertNotificationConfigV2] Sin preferencias en servidor (primera vez)');
        toast({
          title: "Sin preferencias configuradas",
          description: "Usando configuración predeterminada. Puedes personalizarla a continuación.",
          variant: "default"
        });
        setOriginalPreferences(preferences);
      } else if (!navigator.onLine) {
        console.error('[AlertNotificationConfigV2] Sin conexión a internet');
        toast({
          title: "Sin conexión",
          description: "No se pudieron cargar las preferencias. Verifica tu conexión.",
          variant: "destructive"
        });
      } else {
        // Error real de conexión o servidor
        console.error('[AlertNotificationConfigV2] Error de servidor:', error.response?.status);
        toast({
          title: "Error",
          description: "No se pudieron cargar las preferencias. Verifica tu conexión.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cambio del estado DND
   */
  const handleDndToggle = (checked) => {
    setPreferences(prev => {
      const updates = { dndEnabled: checked };

      // Si activa DND sin días seleccionados, seleccionar días laborables por defecto
      if (checked && prev.dndDays.length === 0) {
        updates.dndDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      }

      return {
        ...prev,
        ...updates
      };
    });
  };

  /**
   * Maneja el cambio de días seleccionados
   */
  const handleDayToggle = (dayId) => {
    setPreferences(prev => {
      const newDays = prev.dndDays.includes(dayId)
        ? prev.dndDays.filter(d => d !== dayId)
        : [...prev.dndDays, dayId];

      return {
        ...prev,
        dndDays: newDays
      };
    });
  };

  /**
   * Maneja el cambio de tipos de alerta
   */
  const handleAlertTypeToggle = (typeId) => {
    setPreferences(prev => {
      const newTypes = prev.enabledAlertTypes.includes(typeId)
        ? prev.enabledAlertTypes.filter(t => t !== typeId)
        : [...prev.enabledAlertTypes, typeId];

      return {
        ...prev,
        enabledAlertTypes: newTypes
      };
    });
  };

  /**
   * Valida las preferencias antes de guardar
   */
  const validatePreferences = () => {
    if (preferences.dndEnabled) {
      // Validar que haya al menos un día seleccionado
      if (preferences.dndDays.length === 0) {
        toast({
          title: "Error de validación",
          description: "Debe seleccionar al menos un día de la semana para el modo No Molestar",
          variant: "destructive"
        });
        return false;
      }

      // Validar formato de hora
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(preferences.dndStartTime) || !timeRegex.test(preferences.dndEndTime)) {
        toast({
          title: "Error de validación",
          description: "El formato de hora debe ser HH:MM (ej: 22:00)",
          variant: "destructive"
        });
        return false;
      }
    }

    // Validar que haya al menos un tipo de alerta habilitado
    if (preferences.enabledAlertTypes.length === 0) {
      toast({
        title: "Error de validación",
        description: "Debe habilitar al menos un tipo de alerta",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  /**
   * Guarda las preferencias en el servidor
   */
  const handleSave = async () => {
    if (!validatePreferences()) {
      return;
    }

    // ✅ CRÍTICO iOS: Validar subscriptionId antes de intentar guardar
    if (!subscriptionId) {
      console.error('[AlertNotificationConfigV2] No hay subscriptionId disponible');
      toast({
        title: "Error de suscripción",
        description: "No hay una suscripción activa. Por favor, activa las notificaciones primero en la sección de abajo.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);

      // ✅ iOS: Verificar una vez más justo antes de enviar (por si cambió)
      const currentSubId = localStorage.getItem("pushSubscriptionId");
      const finalSubId = currentSubId || subscriptionId;

      if (!finalSubId) {
        throw new Error("No se pudo obtener el ID de suscripción");
      }

      console.log(`[AlertNotificationConfigV2] Guardando preferencias para suscripción: ${finalSubId}`);

      const response = await axios.post(`/api/push/preferences/${finalSubId}`, {
        ...preferences,
        deviceInfo: {
          type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          userAgent: navigator.userAgent
        },
        updatedAt: new Date().toISOString()
      });

      if (response.data && response.data.success) {
        setOriginalPreferences(preferences);
        setHasChanges(false);

        console.log('[AlertNotificationConfigV2] ✅ Preferencias guardadas exitosamente');

        toast({
          title: "Éxito",
          description: "La configuración se ha guardado correctamente",
          variant: "success"
        });
      }
    } catch (error) {
      console.error("[AlertNotificationConfigV2] Error saving preferences:", error);

      // ✅ Mejorado: Mensajes de error más específicos
      let errorMessage = "No se pudo guardar la configuración. Por favor, intente nuevamente.";

      if (error.response?.status === 400) {
        errorMessage = "Datos inválidos. Verifica tu configuración.";
      } else if (error.response?.status === 404) {
        errorMessage = "Suscripción no encontrada. Por favor, reactiva las notificaciones.";
        // Limpiar subscriptionId inválido
        localStorage.removeItem("pushSubscriptionId");
        setSubscriptionId(null);
      } else if (!navigator.onLine) {
        errorMessage = "Sin conexión a internet. Verifica tu conexión e intenta nuevamente.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Restablece las preferencias a los valores por defecto
   */
  const handleReset = () => {
    const defaultPrefs = {
      dndEnabled: false,
      dndStartTime: "22:00",
      dndEndTime: "08:00",
      dndDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      allowCriticalAlerts: true,
      enabledAlertTypes: ["temperature", "disconnection"]
    };

    setPreferences(defaultPrefs);

    toast({
      title: "Configuración restablecida",
      description: "Se han restaurado los valores predeterminados",
      variant: "default"
    });
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
        <HeaderV2 title="Configuración de Notificaciones" />
        <div className="max-w-3xl mx-auto p-6">
          <ConfigSkeleton />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100"
    >
      <HeaderV2 title="Configuración de Notificaciones" />

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Título con ícono */}
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">
            Configuración de Notificaciones Push
          </h1>
        </div>

        {/* Estado Actual del Dispositivo */}
        <Card className={cn(
          "border-blue-200/60",
          !subscriptionId && "border-orange-200/60 bg-orange-50/30"
        )}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <DeviceIcon className="h-5 w-5" />
              Estado Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Dispositivo:</span>{" "}
                <span className="font-medium">{deviceInfo.browser} en {deviceInfo.deviceType}</span>
              </div>
              <div>
                <span className="text-gray-600">ID de Suscripción:</span>{" "}
                {subscriptionId ? (
                  <span className="font-mono text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    ✓ {subscriptionId.toString().slice(0, 10)}...
                  </span>
                ) : (
                  <span className="font-mono text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    ⚠ No configurado
                  </span>
                )}
              </div>
            </div>

            {/* ✅ iOS: Mensaje de ayuda si no hay subscriptionId */}
            {!subscriptionId && (
              <Alert className="mt-4 border-orange-300 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm text-orange-800">
                  <strong>Acción requerida:</strong> Debes activar las notificaciones push primero (ve a la sección de abajo).
                  {deviceInfo.deviceType === 'iOS' && (
                    <span className="block mt-1">
                      📱 <strong>iOS:</strong> Asegúrate de haber instalado la app en tu pantalla de inicio.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuración de No Molestar - Phase 6 US4 (T076-T079) */}
        <Card className="border-orange-200/60 border-l-4 border-l-orange-400">
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Moon className="h-5 w-5 text-orange-500" />
                🔕 Mi Modo No Molestar Personal
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Esta configuración es personal y solo afecta a tus notificaciones push. No afecta a otros usuarios.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle principal - Styled as prominent button */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-lg border-2 shadow-sm transition-all duration-200",
              preferences.dndEnabled
                ? "bg-orange-100 border-orange-400 hover:bg-orange-200 hover:border-orange-500"
                : "bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400"
            )}>
              <div className="flex items-center gap-3">
                {preferences.dndEnabled ? (
                  <BellOff className="h-5 w-5 text-orange-600" />
                ) : (
                  <Bell className="h-5 w-5 text-blue-600" />
                )}
                <Label htmlFor="dnd-switch" className="text-base font-semibold text-gray-900 cursor-pointer">
                  Activar No Molestar
                </Label>
              </div>
              <Switch
                id="dnd-switch"
                checked={preferences.dndEnabled}
                onCheckedChange={handleDndToggle}
                disabled={saving}
              />
            </div>

            {/* Configuración de horario */}
            <div className={cn(
              "space-y-4 transition-opacity duration-300",
              !preferences.dndEnabled && "opacity-50 pointer-events-none"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <Label className="text-sm font-medium">Horario</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time" className="text-sm">
                    Desde
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={preferences.dndStartTime}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      dndStartTime: e.target.value
                    }))}
                    disabled={!preferences.dndEnabled || saving}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time" className="text-sm">
                    Hasta
                  </Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={preferences.dndEndTime}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      dndEndTime: e.target.value
                    }))}
                    disabled={!preferences.dndEnabled || saving}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Días de la semana */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <Label className="text-sm font-medium">Días de la semana</Label>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day.id}
                      className="flex flex-col items-center"
                    >
                      <Checkbox
                        id={`day-${day.id}`}
                        checked={preferences.dndDays.includes(day.id)}
                        onCheckedChange={() => handleDayToggle(day.id)}
                        disabled={!preferences.dndEnabled || saving}
                        className="mb-1"
                      />
                      <Label
                        htmlFor={`day-${day.id}`}
                        className={cn(
                          "text-xs cursor-pointer select-none",
                          preferences.dndDays.includes(day.id)
                            ? "text-blue-600 font-medium"
                            : "text-gray-600"
                        )}
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permitir alertas críticas */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="critical-alerts" className="text-sm font-medium cursor-pointer">
                        Permitir alertas críticas durante DND
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs p-4" side="top">
                            <div className="space-y-2 text-xs">
                              <p className="font-semibold text-sm">¿Cuándo una alerta es crítica?</p>

                              <div>
                                <p className="font-medium">🌡️ Temperatura crítica:</p>
                                <p className="text-gray-600">Desviación {'>'} 20% del rango permitido</p>
                                <p className="text-gray-500 text-[10px] italic">Ej: Rango 2-8°C, temp 0.5°C → 25% fuera → CRÍTICA</p>
                              </div>

                              <div>
                                <p className="font-medium">📡 Desconexión crítica:</p>
                                <p className="text-gray-600">• Desconectado {'>'} 2 horas</p>
                                <p className="text-gray-600">• 5 o más sensores desconectados</p>
                                <p className="text-gray-500 text-[10px] italic">Ej: 3 horas offline → CRÍTICA</p>
                              </div>

                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-gray-600">
                                  <span className="font-medium">Activo:</span> Solo alertas críticas rompen DND
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Inactivo:</span> Ninguna alerta durante DND
                                </p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Las alertas de alta prioridad se mostrarán incluso en modo No Molestar
                    </p>
                  </div>
                </div>
                <Switch
                  id="critical-alerts"
                  checked={preferences.allowCriticalAlerts}
                  onCheckedChange={(checked) => setPreferences(prev => ({
                    ...prev,
                    allowCriticalAlerts: checked
                  }))}
                  disabled={!preferences.dndEnabled || saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mis horarios de envío (ale_horarios_usuario) */}
        <Card className="border-teal-200/60 border-l-4 border-l-teal-400">
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-500" />
                Mis horarios de envío
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ventanas en las que quieres recibir alertas por tipo y canal. Si no defines horario, se usa el horario base definido por el administrador.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {misHorariosLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                {misHorarios.length === 0 && !showAddHorario && (
                  <p className="text-sm text-gray-500">No tienes horarios personalizados. Se usa el horario base.</p>
                )}
                {misHorarios.length > 0 && (
                  <ul className="space-y-2">
                    {misHorarios.map((h) => (
                      <li
                        key={h.id_horario_usuario}
                        className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <span className="text-sm">
                          {h.id_tipo_alerta === 1 ? "Temperatura" : "Desconexión"} · {h.canal} · {h.dia_semana === 0 ? "Feriado" : `Día ${h.dia_semana}`} · {String(h.hora_inicio).slice(0, 5)}–{String(h.hora_fin).slice(0, 5)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={saving}
                          onClick={async () => {
                            try {
                              await myNotificationHorarios.delete(h.id_horario_usuario);
                              toast({ title: "Eliminado", description: "Horario eliminado." });
                              loadMisHorarios();
                            } catch (e) {
                              toast({ title: "Error", description: e.message || "No se pudo eliminar", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {showAddHorario ? (
                  <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/50 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <select
                          className="w-full mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                          value={nuevoHorario.id_tipo_alerta}
                          onChange={(e) => setNuevoHorario((prev) => ({ ...prev, id_tipo_alerta: parseInt(e.target.value, 10) }))}
                        >
                          <option value={1}>Temperatura</option>
                          <option value={2}>Desconexión</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Canal</Label>
                        <select
                          className="w-full mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                          value={nuevoHorario.canal}
                          onChange={(e) => setNuevoHorario((prev) => ({ ...prev, canal: e.target.value }))}
                        >
                          <option value="email">Email</option>
                          <option value="push">Push</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Día</Label>
                        <select
                          className="w-full mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                          value={nuevoHorario.dia_semana}
                          onChange={(e) => setNuevoHorario((prev) => ({ ...prev, dia_semana: parseInt(e.target.value, 10) }))}
                        >
                          <option value={0}>Feriado</option>
                          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                            <option key={d} value={d}>{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][d - 1]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-xs">Desde</Label>
                          <Input
                            type="time"
                            className="mt-1 h-8"
                            value={nuevoHorario.hora_inicio.slice(0, 5)}
                            onChange={(e) => setNuevoHorario((prev) => ({ ...prev, hora_inicio: e.target.value + ":00" }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Hasta</Label>
                          <Input
                            type="time"
                            className="mt-1 h-8"
                            value={nuevoHorario.hora_fin.slice(0, 5)}
                            onChange={(e) => setNuevoHorario((prev) => ({ ...prev, hora_fin: e.target.value + ":00" }))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await myNotificationHorarios.create(nuevoHorario);
                            toast({ title: "Guardado", description: "Horario añadido." });
                            setShowAddHorario(false);
                            setNuevoHorario({ id_tipo_alerta: 1, canal: "email", dia_semana: 1, hora_inicio: "08:00:00", hora_fin: "18:00:00" });
                            loadMisHorarios();
                          } catch (e) {
                            toast({ title: "Error", description: e.message || "No se pudo crear", variant: "destructive" });
                          }
                        }}
                      >
                        Añadir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddHorario(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setShowAddHorario(true)}>
                    <Plus className="h-4 w-4" />
                    Añadir horario
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Tipos de Alerta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipos de Alerta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALERT_TYPES.map((type) => (
              <div
                key={type.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                  preferences.enabledAlertTypes.includes(type.id)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <Checkbox
                  id={`alert-${type.id}`}
                  checked={preferences.enabledAlertTypes.includes(type.id)}
                  onCheckedChange={() => handleAlertTypeToggle(type.id)}
                  disabled={saving}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`alert-${type.id}`}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <span className="text-lg">{type.icon}</span>
                    {type.label}
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {type.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || !subscriptionId}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges || !subscriptionId}
            className={cn(
              "flex items-center gap-2",
              hasChanges && subscriptionId
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400"
            )}
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : subscriptionId ? "Guardar Configuración" : "Activa notificaciones primero"}
          </Button>
        </div>

        {/* Nota informativa */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Nota:</strong> La configuración se aplica solo a este dispositivo/navegador.
            Si usa múltiples dispositivos, debe configurar cada uno por separado. Las notificaciones
            requieren que haya otorgado permisos al navegador.
          </AlertDescription>
        </Alert>

        {/* Separador */}
        <div className="my-8 border-t border-gray-300"></div>

        {/* Sección de Activar/Desactivar Notificaciones Push */}
        <Card className="border-green-200/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              Activar/Desactivar Notificaciones Push
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Administra tu suscripción a las notificaciones push. Debes activarlas primero para poder configurar tus preferencias arriba.
            </p>
          </CardHeader>
          <CardContent>
            <PushNotificationManager />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default AlertNotificationConfigV2;