/**
 * @fileoverview Tariff Configuration Component - Phase 9 (T101)
 * @description Permite configurar las tarifas eléctricas para reportes de consumo
 * @feature 004-reportes-base-core
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";
import {
  Zap,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useToast } from "../ui/use-toast";
import axios from "axios";

/**
 * Tariff Configuration Component
 */
const TariffConfigurationV2 = () => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  
  const [tariffs, setTariffs] = useState({
    punta: 150,
    valle: 80,
    fuera_punta: 100
  });

  const [originalTariffs, setOriginalTariffs] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Load current tariff configuration
  useEffect(() => {
    loadTariffConfig();
  }, []);

  const loadTariffConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/config/tariffs', {
        withCredentials: true
      });

      const loadedTariffs = response.data.tariffs || {
        punta: 150,
        valle: 80,
        fuera_punta: 100
      };

      setTariffs(loadedTariffs);
      setOriginalTariffs(loadedTariffs);
    } catch (err) {
      console.error('[TariffConfig] Error loading tariffs:', err);
      setError('Error al cargar configuración de tarifas');
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración de tarifas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value);
    
    setTariffs(prev => ({
      ...prev,
      [field]: numValue
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

  const validateTariffs = () => {
    const errors = {};

    if (isNaN(tariffs.punta) || tariffs.punta <= 0) {
      errors.punta = 'Debe ser un valor mayor a 0';
    }
    if (isNaN(tariffs.valle) || tariffs.valle <= 0) {
      errors.valle = 'Debe ser un valor mayor a 0';
    }
    if (isNaN(tariffs.fuera_punta) || tariffs.fuera_punta <= 0) {
      errors.fuera_punta = 'Debe ser un valor mayor a 0';
    }

    if (tariffs.punta > 1000) {
      errors.punta = 'No puede exceder 1000 CLP/kWh';
    }
    if (tariffs.valle > 1000) {
      errors.valle = 'No puede exceder 1000 CLP/kWh';
    }
    if (tariffs.fuera_punta > 1000) {
      errors.fuera_punta = 'No puede exceder 1000 CLP/kWh';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateTariffs()) {
      toast({
        title: "Validación fallida",
        description: "Por favor corrige los errores antes de guardar",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await axios.put('/api/config/tariffs', tariffs, {
        withCredentials: true
      });

      setOriginalTariffs(tariffs);

      toast({
        title: "✅ Configuración guardada",
        description: "Las tarifas eléctricas se actualizaron correctamente",
        variant: "default"
      });
    } catch (err) {
      console.error('[TariffConfig] Error saving tariffs:', err);
      setError('Error al guardar configuración');
      toast({
        title: "Error",
        description: err.response?.data?.error || "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de que deseas restablecer las tarifas a los valores por defecto?')) {
      return;
    }

    try {
      setResetting(true);
      setError(null);

      const response = await axios.post('/api/config/tariffs/reset', {}, {
        withCredentials: true
      });

      const resetTariffs = response.data.tariffs || {
        punta: 150,
        valle: 80,
        fuera_punta: 100
      };

      setTariffs(resetTariffs);
      setOriginalTariffs(resetTariffs);
      setValidationErrors({});

      toast({
        title: "✅ Tarifas restablecidas",
        description: "Las tarifas se restablecieron a los valores por defecto",
        variant: "default"
      });
    } catch (err) {
      console.error('[TariffConfig] Error resetting tariffs:', err);
      toast({
        title: "Error",
        description: "No se pudo restablecer la configuración",
        variant: "destructive"
      });
    } finally {
      setResetting(false);
    }
  };

  const handleCancel = () => {
    setTariffs(originalTariffs);
    setValidationErrors({});
  };

  const hasChanges = JSON.stringify(tariffs) !== JSON.stringify(originalTariffs);

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-600" />
            <CardTitle>Configuración de Tarifas Eléctricas</CardTitle>
          </div>
          <CardDescription>
            Configura las tarifas eléctricas utilizadas para calcular los costos en los reportes de consumo
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tariff Inputs */}
          <div className="space-y-4">
            {/* Punta (Peak) */}
            <div className="space-y-2">
              <Label htmlFor="punta" className="text-base font-semibold">
                ⚡ Tarifa Punta (Horas Pico)
              </Label>
              <p className="text-sm text-gray-600">Horario: 18:00 - 23:00</p>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    id="punta"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={tariffs.punta}
                    onChange={(e) => handleInputChange('punta', e.target.value)}
                    disabled={saving || resetting}
                    className={validationErrors.punta ? 'border-red-500' : ''}
                  />
                  {validationErrors.punta && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.punta}</p>
                  )}
                </div>
                <span className="text-gray-600 font-mono mt-2">CLP/kWh</span>
              </div>
            </div>

            {/* Valle (Valley) */}
            <div className="space-y-2">
              <Label htmlFor="valle" className="text-base font-semibold">
                🌙 Tarifa Valle (Horas Valle)
              </Label>
              <p className="text-sm text-gray-600">Horario: 23:00 - 06:00</p>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    id="valle"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={tariffs.valle}
                    onChange={(e) => handleInputChange('valle', e.target.value)}
                    disabled={saving || resetting}
                    className={validationErrors.valle ? 'border-red-500' : ''}
                  />
                  {validationErrors.valle && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.valle}</p>
                  )}
                </div>
                <span className="text-gray-600 font-mono mt-2">CLP/kWh</span>
              </div>
            </div>

            {/* Fuera de Punta (Off-Peak) */}
            <div className="space-y-2">
              <Label htmlFor="fuera_punta" className="text-base font-semibold">
                🌤️ Tarifa Fuera de Pico (Horas Normales)
              </Label>
              <p className="text-sm text-gray-600">Horario: 06:00 - 18:00</p>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    id="fuera_punta"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={tariffs.fuera_punta}
                    onChange={(e) => handleInputChange('fuera_punta', e.target.value)}
                    disabled={saving || resetting}
                    className={validationErrors.fuera_punta ? 'border-red-500' : ''}
                  />
                  {validationErrors.fuera_punta && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.fuera_punta}</p>
                  )}
                </div>
                <span className="text-gray-600 font-mono mt-2">CLP/kWh</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Información</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Las tarifas se aplican automáticamente en los reportes de consumo eléctrico</li>
              <li>• Los valores deben estar entre 1 y 1000 CLP/kWh</li>
              <li>• Los cambios afectan solo a reportes futuros, no a reportes ya generados</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving || resetting}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>

            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={!hasChanges || saving || resetting}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleReset}
              variant="destructive"
              disabled={saving || resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restablecer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TariffConfigurationV2;

