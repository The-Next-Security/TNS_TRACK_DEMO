/**
 * @fileoverview Schedule Form Component - Formulario para crear/editar schedules
 * @description Componente de formulario para configurar reportes programados con
 * selección de frecuencia, período, dispositivos y opciones.
 * @feature 004-reportes-base-core (T038)
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Checkbox } from "../../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Alert, AlertDescription } from "../../ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import axios from "axios";

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

const PERIOD_TYPES = [
  { value: 'last_day', label: 'Último día completo' },
  { value: 'last_week', label: 'Última semana completa (Lun-Dom)' },
  { value: 'last_month', label: 'Último mes completo' }
];

/**
 * Schedule Form Component
 * @param {Object} initialData - Datos iniciales para edición (null para creación)
 * @param {Function} onSave - Callback al guardar (recibe scheduleData)
 * @param {Function} onCancel - Callback al cancelar
 */
const ScheduleForm = ({ initialData = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    reportType: 'executive_temperature',
    frequency: 'weekly',
    dayOfWeek: 1, // Lunes
    time: '08:00',
    periodType: 'last_week',
    deviceIds: [],
    includeComparative: true,
    active: true
  });

  const [availableDevices, setAvailableDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos iniciales si es edición
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        reportType: initialData.reportType || 'executive_temperature',
        frequency: initialData.frequency || 'weekly',
        dayOfWeek: initialData.dayOfWeek !== undefined ? initialData.dayOfWeek : 1,
        time: initialData.executionTime || '08:00',
        periodType: initialData.periodType || 'last_week',
        deviceIds: initialData.deviceIds || [],
        includeComparative: initialData.options?.includeComparative !== false,
        active: initialData.active !== false
      });
    }
  }, [initialData]);

  // Cargar dispositivos disponibles
  useEffect(() => {
    fetchAvailableDevices();
  }, []);

  const fetchAvailableDevices = async () => {
    try {
      const response = await axios.get('/api/temperatura/dispositivos', {
        withCredentials: true
      });

      const devices = response.data || [];
      setAvailableDevices(devices);
    } catch (err) {
      console.error('[ScheduleForm] Error fetching devices:', err);
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
      deviceIds: availableDevices.map(d => d.channel_id)
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

    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'El nombre es requerido';
    }

    if (!formData.reportType) {
      errors.reportType = 'El tipo de reporte es requerido';
    }

    if (!formData.frequency) {
      errors.frequency = 'La frecuencia es requerida';
    }

    if (formData.frequency === 'weekly' && (formData.dayOfWeek === undefined || formData.dayOfWeek === null)) {
      errors.dayOfWeek = 'El día de la semana es requerido para frecuencia semanal';
    }

    if (!formData.time || !/^\d{2}:\d{2}$/.test(formData.time)) {
      errors.time = 'La hora debe estar en formato HH:MM';
    }

    if (!formData.periodType) {
      errors.periodType = 'El tipo de período es requerido';
    }

    if (formData.deviceIds.length === 0) {
      errors.deviceIds = 'Debe seleccionar al menos un dispositivo';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const scheduleData = {
        name: formData.name.trim(),
        reportType: formData.reportType,
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : null,
        time: formData.time,
        periodType: formData.periodType,
        deviceIds: formData.deviceIds,
        options: {
          includeComparative: formData.includeComparative
        },
        active: formData.active
      };

      await onSave(scheduleData);
      // El padre cierra el dialog y refresca la lista
    } catch (err) {
      console.error('[ScheduleForm] Error saving:', err);
      setError(err.message || 'Error al guardar el schedule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre */}
      <div>
        <Label htmlFor="name">Nombre del Schedule *</Label>
        <Input
          id="name"
          type="text"
          placeholder="Ej: Reporte Semanal de Calidad"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          disabled={isSaving}
          className={cn(validationErrors.name && "border-red-500")}
        />
        {validationErrors.name && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
        )}
      </div>

      {/* Frecuencia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="frequency">Frecuencia *</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value) => handleInputChange('frequency', value)}
            disabled={isSaving}
          >
            <SelectTrigger className={cn(validationErrors.frequency && "border-red-500")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diario</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.frequency && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.frequency}</p>
          )}
        </div>

        {formData.frequency === 'weekly' && (
          <div>
            <Label htmlFor="dayOfWeek">Día de la Semana *</Label>
            <Select
              value={formData.dayOfWeek?.toString()}
              onValueChange={(value) => handleInputChange('dayOfWeek', parseInt(value, 10))}
              disabled={isSaving}
            >
              <SelectTrigger className={cn(validationErrors.dayOfWeek && "border-red-500")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.dayOfWeek && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.dayOfWeek}</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="time">Hora de Ejecución *</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => handleInputChange('time', e.target.value)}
            disabled={isSaving}
            className={cn(validationErrors.time && "border-red-500")}
          />
          {validationErrors.time && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.time}</p>
          )}
        </div>
      </div>

      {/* Período */}
      <div>
        <Label htmlFor="periodType">Período del Reporte *</Label>
        <Select
          value={formData.periodType}
          onValueChange={(value) => handleInputChange('periodType', value)}
          disabled={isSaving}
        >
          <SelectTrigger className={cn(validationErrors.periodType && "border-red-500")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_TYPES.map(period => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationErrors.periodType && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.periodType}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Ej: "Última semana completa" genera reportes de Lunes a Domingo anterior
        </p>
      </div>

      {/* Dispositivos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Dispositivos a Incluir *</Label>
          <div className="space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllDevices}
              disabled={isSaving || loadingDevices}
            >
              Seleccionar Todos
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={deselectAllDevices}
              disabled={isSaving || loadingDevices}
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
                  <div key={device.channel_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`schedule-device-${device.channel_id}`}
                      checked={formData.deviceIds.includes(device.channel_id)}
                      onCheckedChange={() => handleDeviceToggle(device.channel_id)}
                      disabled={isSaving}
                    />
                    <Label
                      htmlFor={`schedule-device-${device.channel_id}`}
                      className="cursor-pointer"
                    >
                      {device.name || `Channel ${device.channel_id}`}
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
        <Label>Opciones Adicionales</Label>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeComparative"
            checked={formData.includeComparative}
            onCheckedChange={(checked) => handleInputChange('includeComparative', checked)}
            disabled={isSaving}
          />
          <Label htmlFor="includeComparative" className="cursor-pointer">
            Incluir análisis comparativo con período anterior
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => handleInputChange('active', checked)}
            disabled={isSaving}
          />
          <Label htmlFor="active" className="cursor-pointer">
            Activar schedule inmediatamente
          </Label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            initialData ? 'Actualizar Schedule' : 'Crear Schedule'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default ScheduleForm;
