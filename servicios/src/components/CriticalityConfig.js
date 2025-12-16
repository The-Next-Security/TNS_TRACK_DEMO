/**
 * CriticalityConfig.js
 *
 * Component for managing criticality thresholds for alerts.
 * Allows administrators to configure when an alert is considered critical.
 *
 * @module components/CriticalityConfig
 * @requires react
 * @requires axios
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Timer,
  Users,
  Save,
  RotateCcw,
  Loader2
} from "lucide-react";

export default function CriticalityConfig() {
  const [config, setConfig] = useState({
    critical_temp_deviation_percent: 20,
    critical_disconnection_hours: 2,
    critical_disconnection_count: 5
  });

  const [initialConfig, setInitialConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed =
      config.critical_temp_deviation_percent !== initialConfig.critical_temp_deviation_percent ||
      config.critical_disconnection_hours !== initialConfig.critical_disconnection_hours ||
      config.critical_disconnection_count !== initialConfig.critical_disconnection_count;
    setHasChanges(changed);
  }, [config, initialConfig]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get("/api/config/alert-schedules");

      if (response.data?.config) {
        const loadedConfig = {
          critical_temp_deviation_percent: parseFloat(response.data.config.critical_temp_deviation_percent || 20),
          critical_disconnection_hours: parseFloat(response.data.config.critical_disconnection_hours || 2),
          critical_disconnection_count: parseInt(response.data.config.critical_disconnection_count || 5, 10)
        };

        setConfig(loadedConfig);
        setInitialConfig(loadedConfig);
      }
    } catch (err) {
      console.error("Error loading criticality config:", err);
      setError("Error al cargar la configuración de criticidad. Usando valores por defecto.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Validate inputs
      if (config.critical_temp_deviation_percent < 0 || config.critical_temp_deviation_percent > 100) {
        setError("El porcentaje de desviación debe estar entre 0 y 100.");
        return;
      }

      if (config.critical_disconnection_hours < 0 || config.critical_disconnection_hours > 72) {
        setError("Las horas de desconexión deben estar entre 0 y 72.");
        return;
      }

      if (config.critical_disconnection_count < 1 || config.critical_disconnection_count > 50) {
        setError("La cantidad de sensores debe estar entre 1 y 50.");
        return;
      }

      // Save to backend
      const response = await axios.post("/api/config/alert-schedules", config);

      if (response.data?.success) {
        setSuccessMessage("Configuración de criticidad actualizada exitosamente.");
        setInitialConfig(config);

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error("Error saving criticality config:", err);
      setError(err.response?.data?.message || "Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(initialConfig);
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-orange-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            Configuración de Criticidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8 text-sm">
            Cargando configuración...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="bg-white/80 backdrop-blur-sm border-orange-200/50">
        <CardHeader className="py-1.5 px-3 sm:px-4">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0" />
            <CardTitle className="text-sm sm:text-base leading-none">Configuración de Criticidad de Alertas</CardTitle>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-0.5">
            Umbrales para alertas críticas (DND)
          </p>
        </CardHeader>

        <CardContent className="space-y-2 px-3 sm:px-4 pb-3">
          {/* Error Message - Mobile optimized */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message - Mobile optimized */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Temperature Deviation Parameter - Ultra Compact */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-orange-600 shrink-0" />
              <Label htmlFor="temp-deviation" className="text-xs font-medium">
                Desviación Temp. Crítica (%)
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-0.5 -m-0.5 rounded-sm hover:bg-accent/50 transition-colors"
                    type="button"
                  >
                    <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]" side="top">
                  <div className="space-y-1 text-[10px]">
                    <p className="font-semibold text-xs">Ejemplo:</p>
                    <p className="text-gray-600 leading-tight">
                      Rango 2-8°C (6°C) • 20%=1.2°C<br />
                      Temp 0.5°C → 1.5°C fuera → CRÍTICA
                    </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>

            <Input
              id="temp-deviation"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              max="100"
              step="1"
              value={config.critical_temp_deviation_percent}
              onChange={(e) => handleInputChange('critical_temp_deviation_percent', parseFloat(e.target.value))}
              className="w-full sm:max-w-xs h-9 text-sm py-1"
            />
            <p className="text-[10px] text-gray-500 leading-tight">
              {'>'} {config.critical_temp_deviation_percent}% = Crítica
            </p>
          </div>

          {/* Disconnection Hours Parameter - Ultra Compact */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Timer className="h-3 w-3 text-orange-600 shrink-0" />
              <Label htmlFor="disconnection-hours" className="text-xs font-medium">
                Horas Desconexión Crítica
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-0.5 -m-0.5 rounded-sm hover:bg-accent/50 transition-colors"
                    type="button"
                  >
                    <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]" side="top">
                  <div className="space-y-1 text-[10px]">
                    <p className="font-semibold text-xs">Ejemplo:</p>
                    <p className="text-gray-600 leading-tight">
                      Umbral 2h: 1h → Normal • 3h → CRÍTICA
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <Input
              id="disconnection-hours"
              type="number"
              inputMode="decimal"
              min="0"
              max="72"
              step="0.5"
              value={config.critical_disconnection_hours}
              onChange={(e) => handleInputChange('critical_disconnection_hours', parseFloat(e.target.value))}
              className="w-full sm:max-w-xs h-9 text-sm py-1"
            />
            <p className="text-[10px] text-gray-500 leading-tight">
              {'>'} {config.critical_disconnection_hours}h = Crítica
            </p>
          </div>

          {/* Disconnection Count Parameter - Ultra Compact */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-orange-600 shrink-0" />
              <Label htmlFor="disconnection-count" className="text-xs font-medium">
                Cant. Sensores Desc. Crítica
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-0.5 -m-0.5 rounded-sm hover:bg-accent/50 transition-colors"
                    type="button"
                  >
                    <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]" side="top">
                  <div className="space-y-1 text-[10px]">
                    <p className="font-semibold text-xs">Ejemplo:</p>
                    <p className="text-gray-600 leading-tight">
                      Umbral 5: 3 desc. → Normal • 6 desc. → CRÍTICA
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <Input
              id="disconnection-count"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              max="50"
              step="1"
              value={config.critical_disconnection_count}
              onChange={(e) => handleInputChange('critical_disconnection_count', parseInt(e.target.value, 10))}
              className="w-full sm:max-w-xs h-9 text-sm py-1"
            />
            <p className="text-[10px] text-gray-500 leading-tight">
              ≥ {config.critical_disconnection_count} sensores = Crítica
            </p>
          </div>

          {/* Action Buttons - Ultra Compact */}
          <div className="flex flex-col sm:flex-row gap-1.5 pt-2 border-t mt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="bg-orange-600 hover:bg-orange-700 h-9 text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3 w-3" />
                  Guardar Configuración
                </>
              )}
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              disabled={saving || !hasChanges}
              className="h-9 text-xs"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Cancelar
            </Button>
          </div>

          {/* Info Footer - Ultra Compact */}
          <div className="pt-1.5 border-t mt-1.5">
            <p className="text-[10px] text-gray-600 leading-tight">
              <strong>Nota:</strong> Las alertas críticas rompen DND si está habilitado en config. personal.
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}