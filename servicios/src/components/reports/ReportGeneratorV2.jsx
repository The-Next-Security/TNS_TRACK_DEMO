/**
 * @fileoverview Report Generator V2 - Formulario de Generación de Reportes
 * @description Componente que permite configurar y generar reportes con selección
 * de fechas, dispositivos y opciones de análisis comparativo.
 * @feature 004-reportes-base-core (T021)
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import HeaderV2 from "../HeaderV2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
import { Progress } from "../ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../../lib/utils";
import {
  ArrowLeft,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  HelpCircle
} from "lucide-react";
import { useToast } from "../ui/use-toast";
import useReportGeneration from "../../hooks/useReportGeneration";
import EmailModal from "./components/EmailModal";
import axios from "axios";

/**
 * Componente de generación de reportes
 */
const ReportGeneratorV2 = ({ userPermissions = [] }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Asegurar que templateKey siempre tenga un valor válido (evitar 'undefined'/'null' string)
  const rawTemplateParam = searchParams.get('template');
  const templateKey = (!rawTemplateParam || rawTemplateParam === 'undefined' || rawTemplateParam === 'null')
    ? 'executive_temperature'
    : rawTemplateParam;

  // Log para debugging
  console.log('[ReportGenerator] templateKey:', templateKey);

  const {
    isGenerating,
    progress,
    error,
    reportData,
    reportUrl,
    generateReport,
    reset,
    downloadReport
  } = useReportGeneration();

  // Estado del formulario - usar valor por defecto explícito
  const [formData, setFormData] = useState({
    reportType: 'executive_temperature', // Siempre inicializar con valor por defecto
    startDate: '',
    endDate: '',
    deviceIds: [],
    includeComparative: true
  });

  const [availableDevices, setAvailableDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});

  // Email Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  // Actualizar reportType cuando cambie el templateKey
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      reportType: templateKey,
      deviceIds: [] // Clear selected devices when template changes
    }));
    
    // Refetch devices for the new template type
    setLoadingDevices(true);
    fetchAvailableDevices();
  }, [templateKey]);

  // Cargar dispositivos disponibles al montar y establecer fechas por defecto
  useEffect(() => {
    fetchAvailableDevices();
    // Establecer fechas por defecto (últimos 7 días)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    setFormData(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  }, []);

  const fetchAvailableDevices = async () => {
    try {
      let devices = [];
      
      // Fetch different devices based on report type (T100)
      if (templateKey === 'executive_consumption') {
        // Get Shelly devices for consumption reports
        const response = await axios.get('/api/devices/active', {
          withCredentials: true
        });
        
        // Map to consistent format: { id, name }
        // Response from /api/devices/active returns { success, data: [{ shelly_id, dispositivo_nombre, ubicacion_nombre, ... }] }
        const devicesData = response.data?.data || response.data || [];
        devices = devicesData.map(device => ({
          id: device.shelly_id || device.id,
          name: device.dispositivo_nombre || device.nombre || `Dispositivo ${device.shelly_id || device.id}`,
          location: device.ubicacion_nombre || device.location
        }));
      } else {
        // Get Ubibot temperature devices for other report types
        const response = await axios.get('/api/ubibot/temperature-devices', {
          withCredentials: true
        });
        
        // El endpoint retorna un array directo de { channel_id, name }
        devices = (response.data || []).map(device => ({
          id: device.channel_id,
          name: device.name || `Channel ${device.channel_id}`
        }));
      }
      
      setAvailableDevices(devices);
    } catch (err) {
      console.error('[ReportGenerator] Error fetching devices:', err);
      setAvailableDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error de validación del campo
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDeviceToggle = (deviceId) => {
    setFormData(prev => {
      const isSelected = prev.deviceIds.includes(deviceId);
      return {
        ...prev,
        deviceIds: isSelected
          ? prev.deviceIds.filter(id => id !== deviceId)
          : [...prev.deviceIds, deviceId]
      };
    });

    // Limpiar error de validación
    if (validationErrors.deviceIds) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.deviceIds;
        return newErrors;
      });
    }
  };

  const selectAllDevices = () => {
    setFormData(prev => ({
      ...prev,
      deviceIds: availableDevices.map(d => d.id)
    }));
  };

  const deselectAllDevices = () => {
    setFormData(prev => ({
      ...prev,
      deviceIds: []
    }));
  };

  const validateForm = () => {
    const errors = {};

    console.log('[ReportGenerator] Validating form:', formData);

    if (!formData.startDate) {
      errors.startDate = 'Fecha de inicio requerida';
    }
    if (!formData.endDate) {
      errors.endDate = 'Fecha de fin requerida';
    }
    if (formData.startDate && formData.endDate) {
      // Normalize dates to midnight UTC to avoid timezone issues
      const startDate = new Date(formData.startDate + 'T00:00:00');
      const endDate = new Date(formData.endDate + 'T00:00:00');

      console.log('[ReportGenerator] Comparing dates:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        startTime: startDate.getTime(),
        endTime: endDate.getTime()
      });

      // Check if end date is after start date
      if (endDate.getTime() <= startDate.getTime()) {
        errors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
        console.log('[ReportGenerator] Validation error: end <= start');
      }

      // Check if range is <= 365 days
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log('[ReportGenerator] Date range in days:', daysDiff);

      if (daysDiff > 365) {
        errors.endDate = 'El rango no puede ser mayor a 365 días';
        console.log('[ReportGenerator] Validation error: range > 365 days');
      }
    }

    if (formData.deviceIds.length === 0) {
      errors.deviceIds = 'Debe seleccionar al menos un dispositivo';
    }

    // Additional validation for consumption reports: ensure only Shelly devices are selected
    if (templateKey === 'executive_consumption' && formData.deviceIds.length > 0) {
      // Shelly IDs are strings like 'fce8c0d82d02' (12 hex characters), not numbers
      const invalidDevices = formData.deviceIds.filter(id => {
        // Check if it's a number (channel_id) or doesn't match Shelly ID format
        return typeof id === 'number' || !String(id).match(/^[a-f0-9]{12}$/i);
      });
      
      if (invalidDevices.length > 0) {
        errors.deviceIds = 'Por favor seleccione solo dispositivos Shelly para reportes de consumo eléctrico. Los dispositivos de temperatura no son válidos.';
        console.warn('[ReportGenerator] Invalid device IDs detected:', invalidDevices);
        // Clear invalid device IDs to prevent submission
        setFormData(prev => ({
          ...prev,
          deviceIds: prev.deviceIds.filter(id => !invalidDevices.includes(id))
        }));
      }
    }

    console.log('[ReportGenerator] Validation errors:', errors);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await generateReport(formData);
    } catch (err) {
      // El error ya se maneja en el hook
      console.error('[ReportGenerator] Generation error:', err);
    }
  };

  const handleBack = () => {
    navigate('/reports');
  };

  const handleReset = () => {
    reset();
    setValidationErrors({});
  };

  /**
   * Opens email modal for the generated report
   */
  const handleSendEmail = () => {
    if (!reportData) return;
    setEmailModalOpen(true);
  };

  /**
   * Handles successful email send
   */
  const handleEmailSuccess = (result) => {
    toast({
      title: "✅ Email enviado exitosamente",
      description: `El reporte fue enviado a ${result.sentCount} destinatario(s)`,
      variant: "default",
    });
  };

  /**
   * Closes email modal
   */
  const handleCloseEmailModal = () => {
    setEmailModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <HeaderV2 userPermissions={userPermissions} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Generar Reporte Ejecutivo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configura los parámetros del reporte de temperatura
          </p>
        </motion.div>

        {/* Formulario */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configuración del Reporte
              </CardTitle>
              <CardDescription>
                Completa los siguientes campos para generar tu reporte
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Rango de Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Fecha Inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      disabled={isGenerating}
                      className={cn(validationErrors.startDate && "border-red-500")}
                    />
                    {validationErrors.startDate && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="endDate">Fecha Fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      disabled={isGenerating}
                      className={cn(validationErrors.endDate && "border-red-500")}
                    />
                    {validationErrors.endDate && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* Selección de Dispositivos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Dispositivos a Incluir</Label>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllDevices}
                        disabled={isGenerating || loadingDevices}
                      >
                        Seleccionar Todos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllDevices}
                        disabled={isGenerating || loadingDevices}
                      >
                        Deseleccionar Todos
                      </Button>
                    </div>
                  </div>

                  {loadingDevices ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-600">Cargando dispositivos...</span>
                    </div>
                  ) : (
                    <div className={cn(
                      "border rounded-lg p-4 max-h-64 overflow-y-auto",
                      validationErrors.deviceIds && "border-red-500"
                    )}>
                      {availableDevices.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                          No hay dispositivos disponibles
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableDevices.map((device) => (
                            <div key={device.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`device-${device.id}`}
                                checked={formData.deviceIds.includes(device.id)}
                                onCheckedChange={() => handleDeviceToggle(device.id)}
                                disabled={isGenerating}
                              />
                              <Label
                                htmlFor={`device-${device.id}`}
                                className="cursor-pointer"
                              >
                                {device.name}
                                {device.location && <span className="text-xs text-gray-500 ml-1">({device.location})</span>}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {validationErrors.deviceIds && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.deviceIds}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.deviceIds.length} dispositivo(s) seleccionado(s)
                  </p>
                </div>

                {/* Opciones */}
                <div className="space-y-3">
                  {/* Tooltip para alertas críticas - Solo visible cuando template=executive_alerts */}
                  {templateKey === 'executive_alerts' && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-5 w-5 text-blue-600 cursor-help flex-shrink-0 mt-0.5" />
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
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">
                            ¿Cuándo una alerta es crítica?
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Pasa el cursor sobre el ícono de ayuda para ver los criterios de criticidad
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tariff Information - Only visible for consumption reports (T100) */}
                  {templateKey === 'executive_consumption' && (
                    <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-5 w-5 text-yellow-600 cursor-help flex-shrink-0 mt-0.5" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-4" side="top">
                              <div className="space-y-2 text-xs">
                                <p className="font-semibold text-sm">Tarifas Eléctricas</p>
                                
                                <div>
                                  <p className="font-medium">⚡ Horas Pico (Punta):</p>
                                  <p className="text-gray-600">18:00 - 23:00 | 150 CLP/kWh</p>
                                  <p className="text-gray-500 text-[10px] italic">Mayor demanda, tarifa más alta</p>
                                </div>

                                <div>
                                  <p className="font-medium">🌙 Horas Valle:</p>
                                  <p className="text-gray-600">23:00 - 06:00 | 80 CLP/kWh</p>
                                  <p className="text-gray-500 text-[10px] italic">Menor demanda, tarifa más baja</p>
                                </div>

                                <div>
                                  <p className="font-medium">🌤️ Horas Fuera de Pico:</p>
                                  <p className="text-gray-600">06:00 - 18:00 | 100 CLP/kWh</p>
                                  <p className="text-gray-500 text-[10px] italic">Demanda normal, tarifa intermedia</p>
                                </div>

                                <div className="pt-2 border-t border-gray-200">
                                  <p className="text-gray-600 text-[10px]">
                                    Las tarifas se pueden configurar en la página de configuración del sistema.
                                  </p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900">
                            💡 Tarifas Eléctricas
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            El costo estimado se calcula usando las tarifas configuradas:<br/>
                            <span className="font-mono">Punta: 150 CLP/kWh | Valle: 80 CLP/kWh | Fuera Pico: 100 CLP/kWh</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Label>Opciones Adicionales</Label>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeComparative"
                      checked={formData.includeComparative}
                      onCheckedChange={(checked) => handleInputChange('includeComparative', checked)}
                      disabled={isGenerating}
                    />
                    <Label htmlFor="includeComparative" className="cursor-pointer">
                      Incluir análisis comparativo con período anterior
                    </Label>
                  </div>
                </div>

                {/* Progreso de Generación */}
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Generando reporte...</span>
                      <span className="text-gray-600">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {/* Mensaje de Error */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Mensaje de Éxito */}
                {reportData && !isGenerating && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      ¡Reporte generado exitosamente! Tamaño: {(reportData.fileSize / 1024).toFixed(2)} KB
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botones de Acción */}
                <div className="flex gap-3 pt-4">
                  {!reportData ? (
                    <>
                      <Button
                        type="submit"
                        disabled={isGenerating}
                        className="flex-1"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Generar Reporte
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={isGenerating}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={downloadReport}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendEmail}
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Enviar Email
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                      >
                        Generar Otro
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                      >
                        Volver
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Email Modal */}
      {reportData && (
        <EmailModal
          isOpen={emailModalOpen}
          onClose={handleCloseEmailModal}
          report={{
            id: reportData.reportId,
            name: reportData.reportName || `Reporte ${templateKey}`
          }}
          onSuccess={handleEmailSuccess}
        />
      )}
    </div>
  );
};

export default ReportGeneratorV2;
