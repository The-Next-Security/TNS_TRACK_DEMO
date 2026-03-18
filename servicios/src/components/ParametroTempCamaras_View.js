/**
 * ParametroTempCamarasV2.js - Migrado a Shadcn/UI v2.0
 *
 * Componente para gestión INDIVIDUAL de umbrales de temperatura por cámara
 * con funcionalidad completa CRUD y actualización en tiempo real.
 *
 * @module components/ParametroTempCamarasV2
 * @requires react
 * @requires axios
 * @requires @/components/ui/*
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import presetService from "../services/preset_Service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Save,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  Plus,
  Minus,
  CheckCircle2,
  Loader2,
  Snowflake,
  Flame,
  Users,
  RefreshCcw,
  Download,
  Upload,
  Edit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import HeaderV2 from "./Header_View";
import { cn } from "@/lib/utils";
import paramTempIcon from "../assets/images/param_temp.png";
import AlertScheduleConfig from "./AlertScheduleConfig";
import CriticalityConfig from "./CriticalityConfig";

// Mapeo de íconos string a componentes
const ICON_MAP = {
  'Snowflake': Snowflake,
  'Thermometer': Thermometer,
  'Flame': Flame,
};

/**
 * ParametroTempCamarasV2 Component
 *
 * Gestiona los umbrales de temperatura INDIVIDUALES para cada cámara
 *
 * @component
 * @returns {JSX.Element} Componente de gestión de umbrales individuales
 */
const ParametroTempCamarasV2 = () => {
  // Estados principales
  const [cameras, setCameras] = useState([]);
  const [originalCameras, setOriginalCameras] = useState([]);
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingIds, setSavingIds] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Gestión de presets editables (desde base de datos)
  const [presets, setPresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetForm, setPresetForm] = useState({
    name: '',
    min: '',
    max: '',
    color: 'from-blue-500 to-cyan-500',
    icon: 'Thermometer',
    description: ''
  });

  // Performance optimization: Convert arrays to Sets/Maps for O(1) lookups
  const savingIdsSet = useMemo(() => new Set(savingIds), [savingIds]);
  const selectedCamerasSet = useMemo(() => new Set(selectedCameras), [selectedCameras]);

  const originalCamerasMap = useMemo(() =>
    new Map(originalCameras.map(c => [c.channel_id, c])),
    [originalCameras]
  );

  const presetsMap = useMemo(() => {
    const map = new Map();
    presets.forEach(p => map.set(`${p.min}_${p.max}`, p));
    return map;
  }, [presets]);

  /**
   * Carga inicial de presets desde API
   */
  useEffect(() => {
    const initializePresets = async () => {
      try {
        setLoadingPresets(true);

        // Intentar migración automática desde localStorage (one-time)
        try {
          const migrated = await presetService.migrateFromLocalStorage();
          if (migrated > 0) {
            setMessage(`Migración completada: ${migrated} preset(s) migrado(s) a la base de datos`);
          }
        } catch (migrationError) {
          console.warn('Error en migración de localStorage:', migrationError);
          // No bloquear si falla la migración
        }

        // Cargar presets desde la base de datos
        const fetchedPresets = await presetService.getAllPresets();
        setPresets(fetchedPresets);
        console.log(`Presets cargados desde BD: ${fetchedPresets.length}`);

      } catch (error) {
        console.error('Error cargando presets:', error);
        setMessage('Error al cargar presets de temperatura');
      } finally {
        setLoadingPresets(false);
      }
    };

    initializePresets();
  }, []);

  /**
   * Carga inicial de datos de cámaras
   */
  useEffect(() => {
    fetchCameras();
  }, []);

  /**
   * Obtiene las cámaras con sus umbrales individuales
   */
  const fetchCameras = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get("/api/temperatura/canales/umbrales", {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.channels) {
        const camerasData = response.data.channels.map(cam => {
          // Asegurar valores numéricos válidos
          const thresholdMin = parseFloat(cam.thresholds?.min ?? cam.group_thresholds?.min ?? -20);
          const thresholdMax = parseFloat(cam.thresholds?.max ?? cam.group_thresholds?.max ?? -15);
          const lastTemp = cam.last_temperature !== null && cam.last_temperature !== undefined
            ? parseFloat(cam.last_temperature)
            : null;

          return {
            channel_id: cam.channel_id,
            name: cam.name,
            threshold_min: Number.isFinite(thresholdMin) ? thresholdMin : -20,
            threshold_max: Number.isFinite(thresholdMax) ? thresholdMax : -15,
            threshold_type: cam.thresholds?.type || 'group',
            last_temperature: Number.isFinite(lastTemp) ? lastTemp : null,
            esOperativa: cam.esOperativa !== undefined ? cam.esOperativa : 1, // Default: operativa
          };
        });

        setCameras(camerasData);
        setOriginalCameras(camerasData.map(cam => ({ ...cam })));
      }
    } catch (error) {
      console.error("Error fetching cameras:", error);
      setMessage(
        error.response?.status === 401
          ? "Error de autenticación. Por favor, inicie sesión nuevamente."
          : error.response?.data?.error || "Error al cargar los datos"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valida los umbrales de temperatura
   */
  const validateThresholds = useCallback((camera) => {
    const errors = {};

    if (!Number.isFinite(camera.threshold_min) || !Number.isFinite(camera.threshold_max)) {
      errors[camera.channel_id] = "Los valores deben ser números válidos";
      return errors;
    }

    if (camera.threshold_min >= camera.threshold_max) {
      errors[camera.channel_id] = "El mínimo debe ser menor que el máximo";
      return errors;
    }

    if (camera.threshold_min < -60 || camera.threshold_max > 60) {
      errors[camera.channel_id] = "Los valores deben estar entre -60°C y 60°C";
      return errors;
    }

    const range = camera.threshold_max - camera.threshold_min;
    if (range < 2) {
      errors[camera.channel_id] = "La diferencia debe ser al menos 2°C";
      return errors;
    }

    return errors;
  }, []);

  /**
   * Maneja cambios en los inputs
   */
  const handleThresholdChange = useCallback((channelId, field, value) => {
    const numValue = parseFloat(value);

    setCameras(prev => prev.map(cam =>
      cam.channel_id === channelId
        ? { ...cam, [field]: numValue, threshold_type: 'individual' }
        : cam
    ));

    // Limpiar errores
    setValidationErrors(prev => {
      if (prev[channelId]) {
        const newErrors = { ...prev };
        delete newErrors[channelId];
        return newErrors;
      }
      return prev;
    });
  }, []);

  /**
   * Incrementa/decrementa valores con botones
   */
  const handleStepChange = useCallback((channelId, field, increment) => {
    setCameras(prev => {
      const camera = prev.find(c => c.channel_id === channelId);
      if (!camera) return prev;

      const currentValue = camera[field];
      if (currentValue === undefined || currentValue === null || !Number.isFinite(currentValue)) {
        console.warn(`Invalid current value for ${field}:`, currentValue);
        return prev;
      }

      const newValue = increment ? currentValue + 0.5 : currentValue - 0.5;

      if (newValue >= -60 && newValue <= 60) {
        return prev.map(cam =>
          cam.channel_id === channelId
            ? { ...cam, [field]: parseFloat(newValue.toFixed(2)), threshold_type: 'individual' }
            : cam
        );
      }
      return prev;
    });
  }, []);

  /**
   * Guarda los umbrales de una cámara específica
   */
  const saveCameraThresholds = useCallback(async (camera) => {
    const errors = validateThresholds(camera);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...errors }));
      return false;
    }

    try {
      setSavingIds(prev => [...prev, camera.channel_id]);
      const token = localStorage.getItem("token");

      await axios.put(
        `/api/temperatura/canales/${camera.channel_id}/umbrales`,
        {
          threshold_min: camera.threshold_min,
          threshold_max: camera.threshold_max,
          updated_by: 'Web UI',
          reason: 'Actualización manual de umbrales'
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Actualizar original
      setOriginalCameras(prev => prev.map(cam =>
        cam.channel_id === camera.channel_id
          ? { ...camera }
          : cam
      ));

      return true;
    } catch (error) {
      console.error(`Error saving camera ${camera.channel_id}:`, error);
      setMessage(error.response?.data?.error || `Error al guardar ${camera.name}`);
      return false;
    } finally {
      setSavingIds(prev => prev.filter(id => id !== camera.channel_id));
    }
  }, [validateThresholds]);

  /**
   * Guarda todos los cambios
   */
  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    setMessage("");
    let allSuccess = true;

    // Filtrar solo cámaras con cambios usando Map O(1)
    const changedCameras = cameras.filter(cam => {
      const original = originalCamerasMap.get(cam.channel_id);
      return !original ||
             cam.threshold_min !== original.threshold_min ||
             cam.threshold_max !== original.threshold_max;
    });

    if (changedCameras.length === 0) {
      setMessage("No hay cambios para guardar");
      setIsSaving(false);
      return;
    }

    for (const camera of changedCameras) {
      const success = await saveCameraThresholds(camera);
      if (!success) {
        allSuccess = false;
      }
    }

    setIsSaving(false);

    if (allSuccess) {
      setShowSuccess(true);
      setMessage(`${changedCameras.length} cámaras actualizadas exitosamente`);
      setTimeout(() => {
        setShowSuccess(false);
        setMessage("");
      }, 3000);
    }
  }, [cameras, originalCamerasMap, saveCameraThresholds]);

  /**
   * Maneja el cambio de estado operativo de una cámara
   */
  const handleToggleOperativa = useCallback(async (channelId, isOperativa) => {
    try {
      setSavingIds(prev => [...prev, channelId]);
      const token = localStorage.getItem("token");

      await axios.put(
        `/api/temperatura/canales/${channelId}/operativa`,
        { esOperativa: isOperativa },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Actualizar estado local en cameras
      setCameras(prev => prev.map(cam =>
        cam.channel_id === channelId
          ? { ...cam, esOperativa: isOperativa ? 1 : 0 }
          : cam
      ));

      // Actualizar también en originalCameras para mantener sincronización
      setOriginalCameras(prev => prev.map(cam =>
        cam.channel_id === channelId
          ? { ...cam, esOperativa: isOperativa ? 1 : 0 }
          : cam
      ));

      setShowSuccess(true);
      setMessage(`Cámara ${isOperativa ? 'activada' : 'desactivada'} correctamente`);
      setTimeout(() => {
        setShowSuccess(false);
        setMessage("");
      }, 2000);

    } catch (error) {
      console.error(`Error updating operativa status:`, error);
      setMessage(error.response?.data?.error || 'Error al cambiar estado operativo');
    } finally {
      setSavingIds(prev => prev.filter(id => id !== channelId));
    }
  }, []);

  /**
   * Aplicar preset a cámaras seleccionadas
   */
  const applyPresetToSelected = useCallback(() => {
    if (!selectedPreset || selectedCameras.length === 0) return;

    const preset = presets.find(p => p.id === selectedPreset);
    if (!preset) return;

    setCameras(prev => prev.map(cam =>
      selectedCamerasSet.has(cam.channel_id)
        ? { ...cam, threshold_min: preset.min, threshold_max: preset.max, threshold_type: 'individual' }
        : cam
    ));

    setShowPresetDialog(false);
    setMessage(`Preset "${preset.name}" aplicado a ${selectedCameras.length} cámara(s)`);
  }, [selectedPreset, selectedCameras.length, presets, selectedCamerasSet]);

  /**
   * Funciones para gestión de presets (con llamadas a API)
   */
  const handleCreatePreset = async () => {
    try {
      const validationError = validatePresetForm();
      if (validationError) {
        setMessage(validationError);
        return;
      }

      setIsSaving(true);

      const newPreset = await presetService.createPreset({
        name: presetForm.name,
        min: parseFloat(presetForm.min),
        max: parseFloat(presetForm.max),
        color: presetForm.color,
        icon: presetForm.icon,
        description: presetForm.description
      });

      // Actualizar estado local
      setPresets([...presets, newPreset]);
      resetPresetForm();
      setMessage('Preset creado exitosamente');

    } catch (error) {
      console.error('Error creando preset:', error);
      setMessage(error.message || 'Error al crear preset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePreset = async () => {
    try {
      const validationError = validatePresetForm();
      if (validationError) {
        setMessage(validationError);
        return;
      }

      setIsSaving(true);

      const updatedPreset = await presetService.updatePreset(editingPreset, {
        name: presetForm.name,
        min: parseFloat(presetForm.min),
        max: parseFloat(presetForm.max),
        color: presetForm.color,
        icon: presetForm.icon,
        description: presetForm.description
      });

      // Actualizar estado local
      setPresets(presets.map(p => p.id === editingPreset ? updatedPreset : p));
      resetPresetForm();
      setEditingPreset(null);
      setMessage('Preset actualizado exitosamente');

    } catch (error) {
      console.error('Error actualizando preset:', error);
      setMessage(error.message || 'Error al actualizar preset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (presetId) => {
    try {
      setIsSaving(true);

      await presetService.deletePreset(presetId);

      // Actualizar estado local
      setPresets(presets.filter(p => p.id !== presetId));
      setMessage('Preset eliminado exitosamente');

    } catch (error) {
      console.error('Error eliminando preset:', error);
      setMessage(error.message || 'No se puede eliminar el preset (puede estar en uso)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPreset = (preset) => {
    setEditingPreset(preset.id);
    setPresetForm({
      name: preset.name,
      min: preset.min.toString(),
      max: preset.max.toString(),
      color: preset.color,
      icon: preset.icon,
      description: preset.description || ''
    });
  };

  const resetPresetForm = () => {
    setPresetForm({
      name: '',
      min: '',
      max: '',
      color: 'from-blue-500 to-cyan-500',
      icon: 'Thermometer',
      description: ''
    });
  };

  const handleRestoreDefaultPresets = async () => {
    try {
      setIsSaving(true);

      const result = await presetService.restoreDefaults();

      // Recargar presets desde la API
      const fetchedPresets = await presetService.getAllPresets();
      setPresets(fetchedPresets);

      setMessage(result.message || 'Presets restaurados a valores por defecto');

    } catch (error) {
      console.error('Error restaurando presets:', error);
      setMessage('Error al restaurar presets por defecto');
    } finally {
      setIsSaving(false);
    }
  };

  const validatePresetForm = () => {
    if (!presetForm.name.trim()) return 'El nombre es requerido';
    if (!presetForm.min || !presetForm.max) return 'Los valores de temperatura son requeridos';

    const min = parseFloat(presetForm.min);
    const max = parseFloat(presetForm.max);

    if (isNaN(min) || isNaN(max)) return 'Los valores deben ser números válidos';
    if (min >= max) return 'El mínimo debe ser menor que el máximo';
    if (min < -60 || max > 60) return 'Los valores deben estar entre -60°C y 60°C';
    if (max - min < 2) return 'La diferencia debe ser al menos 2°C';

    // Validar nombre único (excepto al editar)
    const nameExists = presets.some(p =>
      p.name.toLowerCase() === presetForm.name.toLowerCase() &&
      p.id !== editingPreset
    );
    if (nameExists) return 'Ya existe un preset con ese nombre';

    return null;
  };

  /**
   * Resetear a valores originales
   */
  const handleReset = useCallback(() => {
    setCameras(originalCameras.map(cam => ({ ...cam })));
    setValidationErrors({});
    setSelectedCameras([]);
    setMessage("Valores restaurados");
    setShowResetDialog(false);
  }, [originalCameras]);

  /**
   * Seleccionar/deseleccionar todas las cámaras
   */
  const toggleSelectAll = useCallback(() => {
    if (selectedCameras.length === cameras.length) {
      setSelectedCameras([]);
    } else {
      setSelectedCameras(cameras.map(c => c.channel_id));
    }
  }, [selectedCameras.length, cameras]);

  /**
   * Toggle selección de cámara individual
   */
  const toggleCameraSelection = useCallback((channelId) => {
    setSelectedCameras(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  }, []);

  /**
   * Obtener preset asignado a una cámara
   */
  const getAssignedPreset = useCallback((camera) => {
    // Buscar preset que coincida exactamente con los umbrales de la cámara usando Map O(1)
    return presetsMap.get(`${camera.threshold_min}_${camera.threshold_max}`);
  }, [presetsMap]);

  /**
   * Estadísticas
   */
  const stats = useMemo(() => {
    let individual = 0;
    let group = 0;

    cameras.forEach(c => {
      if (c.threshold_type === 'individual') individual++;
      else group++;
    });

    // Optimized change detection - avoid JSON.stringify
    const hasChanges = cameras.length !== originalCameras.length ||
      cameras.some(cam => {
        const orig = originalCamerasMap.get(cam.channel_id);
        return !orig ||
          cam.threshold_min !== orig.threshold_min ||
          cam.threshold_max !== orig.threshold_max;
      });

    const hasErrors = Object.keys(validationErrors).length > 0;

    return {
      total: cameras.length,
      individual,
      group,
      selected: selectedCameras.length,
      hasChanges,
      hasErrors,
    };
  }, [cameras, originalCamerasMap, selectedCameras.length, validationErrors]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
        <HeaderV2
          title="Gestión de Umbrales Individuales"
          image={paramTempIcon}
        />
        <div className="container mx-auto max-w-7xl p-4 md:p-6">
          <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-96 w-full rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
        <HeaderV2
          title="Gestión de Umbrales Individuales"
          image={paramTempIcon}
        />

        <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
          {/* Alert Schedule Configuration - Feature 002-configurable-alert-schedules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AlertScheduleConfig />
          </motion.div>

          {/* Criticality Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <CriticalityConfig />
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card className="bg-white/70 backdrop-blur-sm border-blue-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Cámaras</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Thermometer className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-cyan-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Individualizadas</p>
                    <p className="text-2xl font-bold text-cyan-600">{stats.individual}</p>
                  </div>
                  <Settings className="h-8 w-8 text-cyan-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Grupales</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.group}</p>
                  </div>
                  <Users className="h-8 w-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-green-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Seleccionadas</p>
                    <p className="text-2xl font-bold text-green-600">{stats.selected}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Table Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="bg-white/70 backdrop-blur-sm border-gray-200/50 shadow-xl">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Thermometer className="h-5 w-5 text-blue-600" />
                      Umbrales de Temperatura por Cámara
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Gestiona los umbrales individuales de cada cámara de frío
                    </p>
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center gap-2">
                    {selectedCameras.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPresetDialog(true)}
                          className="border-blue-300 hover:bg-blue-50"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Aplicar Preset ({selectedCameras.length})
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCameras([])}
                          className="border-gray-300"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Deseleccionar
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPresetManager(true)}
                      className="border-purple-300 hover:bg-purple-50"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Gestionar Presets
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchCameras}
                      className="border-gray-300"
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Recargar
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCameras.length === cameras.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Cámara</TableHead>
                        <TableHead className="text-center">Preset Asignado</TableHead>
                        <TableHead className="text-center">Umbral Mínimo (°C)</TableHead>
                        <TableHead className="text-center">Umbral Máximo (°C)</TableHead>
                        <TableHead className="text-center">Operativa</TableHead>
                        <TableHead className="text-center">Validación</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cameras.map((camera, index) => {
                        const hasError = validationErrors[camera.channel_id];
                        const isSaving = savingIdsSet.has(camera.channel_id);
                        const isSelected = selectedCamerasSet.has(camera.channel_id);
                        const original = originalCamerasMap.get(camera.channel_id);
                        const hasChanges = original && (
                          camera.threshold_min !== original.threshold_min ||
                          camera.threshold_max !== original.threshold_max
                        );
                        const assignedPreset = getAssignedPreset(camera);

                        return (
                          <motion.tr
                            key={camera.channel_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.02 }}
                            className={cn(
                              "border-b transition-colors",
                              isSelected && "bg-blue-50/50",
                              hasError && "bg-red-50/50"
                            )}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCameraSelection(camera.channel_id)}
                              />
                            </TableCell>

                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  camera.esOperativa === 1 ? "bg-green-500 animate-pulse" : "bg-gray-400"
                                )} />
                                {camera.name}
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              {assignedPreset ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                                      "bg-gradient-to-r text-white font-medium text-sm shadow-sm",
                                      assignedPreset.color
                                    )}>
                                      {(() => {
                                        const IconComponent = ICON_MAP[assignedPreset.icon] || Thermometer;
                                        return <IconComponent className="h-3.5 w-3.5" />;
                                      })()}
                                      <span className="truncate max-w-[120px]">{assignedPreset.name}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p className="font-semibold">{assignedPreset.name}</p>
                                      <p className="text-gray-400">{assignedPreset.description}</p>
                                      <p className="font-mono">{assignedPreset.min}°C a {assignedPreset.max}°C</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Badge variant="outline" className="text-gray-500 border-gray-300">
                                  <span className="text-xs">Personalizado</span>
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleStepChange(camera.channel_id, 'threshold_min', false)}
                                  disabled={isSaving}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={camera.threshold_min}
                                  onChange={(e) => handleThresholdChange(camera.channel_id, 'threshold_min', e.target.value)}
                                  step="0.5"
                                  disabled={isSaving}
                                  className={cn(
                                    "w-20 text-center font-mono text-sm",
                                    hasError && "border-red-500"
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleStepChange(camera.channel_id, 'threshold_min', true)}
                                  disabled={isSaving}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleStepChange(camera.channel_id, 'threshold_max', false)}
                                  disabled={isSaving}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={camera.threshold_max}
                                  onChange={(e) => handleThresholdChange(camera.channel_id, 'threshold_max', e.target.value)}
                                  step="0.5"
                                  disabled={isSaving}
                                  className={cn(
                                    "w-20 text-center font-mono text-sm",
                                    hasError && "border-red-500"
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleStepChange(camera.channel_id, 'threshold_max', true)}
                                  disabled={isSaving}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={camera.esOperativa === 1}
                                  onCheckedChange={(checked) => handleToggleOperativa(camera.channel_id, checked)}
                                  disabled={isSaving}
                                />
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              {hasError ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Error
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{validationErrors[camera.channel_id]}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : hasChanges ? (
                                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Modificado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveCameraThresholds(camera)}
                                disabled={isSaving || hasError || !hasChanges}
                                className={cn(
                                  "h-8",
                                  hasChanges && !hasError && "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                )}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                  <Button
                    onClick={handleSaveAll}
                    disabled={isSaving || !stats.hasChanges || stats.hasErrors}
                    size="lg"
                    className={cn(
                      "min-w-[200px]",
                      "bg-gradient-to-r from-blue-600 to-cyan-600",
                      "hover:from-blue-700 hover:to-cyan-700",
                      "text-white font-medium shadow-lg",
                      "disabled:opacity-50"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Todos los Cambios
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowResetDialog(true)}
                    disabled={!stats.hasChanges}
                    className="min-w-[150px]"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Success Message */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed bottom-8 right-8 z-50"
              >
                <Alert className="border-green-500 bg-green-50 shadow-2xl min-w-[300px]">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-800">¡Éxito!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {message}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error/Info Messages */}
          {message && !showSuccess && (
            <Alert
              className={cn(
                "backdrop-blur-sm",
                message.includes("Error")
                  ? "border-red-200 bg-red-50/80"
                  : "border-blue-200 bg-blue-50/80"
              )}
            >
              {message.includes("Error") ? (
                <X className="h-4 w-4 text-red-600" />
              ) : (
                <Check className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription
                className={cn(
                  "font-medium",
                  message.includes("Error") ? "text-red-800" : "text-blue-800"
                )}
              >
                {message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Reset Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Restaurar valores originales?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción descartará todos los cambios no guardados y restaurará
                los valores originales de los umbrales.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                className="bg-red-600 hover:bg-red-700"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Restaurar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preset Dialog */}
        <AlertDialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aplicar Preset de Temperatura</AlertDialogTitle>
              <AlertDialogDescription>
                Selecciona un preset para aplicar a las {selectedCameras.length} cámara(s) seleccionadas
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 py-4">
              {presets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay presets disponibles</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setShowPresetDialog(false);
                      setShowPresetManager(true);
                    }}
                    className="text-blue-600"
                  >
                    Crear un preset
                  </Button>
                </div>
              ) : (
                presets.map(preset => {
                  const IconComponent = ICON_MAP[preset.icon] || Thermometer;
                  return (
                    <motion.div
                      key={preset.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        selectedPreset === preset.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-br",
                            preset.color
                          )}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{preset.name}</p>
                            <p className="text-sm text-gray-600">{preset.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-gray-700">
                            {preset.min}°C a {preset.max}°C
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={applyPresetToSelected}
                disabled={!selectedPreset}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Aplicar Preset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preset Management Dialog */}
        <Dialog open={showPresetManager} onOpenChange={setShowPresetManager}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                Gestionar Presets de Temperatura
              </DialogTitle>
              <DialogDescription>
                Crea, edita o elimina presets de temperatura personalizados
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Formulario de Preset */}
              <Card className="border-purple-200">
                <CardHeader>
                  <CardTitle className="text-base">
                    {editingPreset ? 'Editar Preset' : 'Crear Nuevo Preset'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preset-name">Nombre del Preset</Label>
                      <Input
                        id="preset-name"
                        placeholder="Ej: Ultra Congelado"
                        value={presetForm.name}
                        onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preset-icon">Ícono</Label>
                      <Select
                        value={presetForm.icon}
                        onValueChange={(value) => setPresetForm({ ...presetForm, icon: value })}
                      >
                        <SelectTrigger id="preset-icon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Snowflake">
                            <div className="flex items-center gap-2">
                              <Snowflake className="h-4 w-4" />
                              <span>Copo de Nieve</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Thermometer">
                            <div className="flex items-center gap-2">
                              <Thermometer className="h-4 w-4" />
                              <span>Termómetro</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Flame">
                            <div className="flex items-center gap-2">
                              <Flame className="h-4 w-4" />
                              <span>Llama</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preset-min">Temperatura Mínima (°C)</Label>
                      <Input
                        id="preset-min"
                        type="number"
                        step="0.5"
                        placeholder="-22"
                        value={presetForm.min}
                        onChange={(e) => setPresetForm({ ...presetForm, min: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preset-max">Temperatura Máxima (°C)</Label>
                      <Input
                        id="preset-max"
                        type="number"
                        step="0.5"
                        placeholder="-13"
                        value={presetForm.max}
                        onChange={(e) => setPresetForm({ ...presetForm, max: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preset-color">Color de Gradiente</Label>
                      <Select
                        value={presetForm.color}
                        onValueChange={(value) => setPresetForm({ ...presetForm, color: value })}
                      >
                        <SelectTrigger id="preset-color">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="from-blue-500 to-cyan-500">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded"></div>
                              <span>Azul - Cian</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="from-cyan-400 to-blue-400">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-400 rounded"></div>
                              <span>Cian - Azul</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="from-purple-500 to-pink-500">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
                              <span>Púrpura - Rosa</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="from-green-500 to-emerald-500">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded"></div>
                              <span>Verde - Esmeralda</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="from-orange-500 to-red-500">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-500 rounded"></div>
                              <span>Naranja - Rojo</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="preset-description">Descripción</Label>
                      <Input
                        id="preset-description"
                        placeholder="Ej: Para productos ultra congelados"
                        value={presetForm.description}
                        onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={editingPreset ? handleUpdatePreset : handleCreatePreset}
                      disabled={!!validatePresetForm()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingPreset ? 'Actualizar Preset' : 'Crear Preset'}
                    </Button>
                    {editingPreset && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingPreset(null);
                          resetPresetForm();
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    )}
                  </div>

                  {validatePresetForm() && (
                    <Alert className="border-amber-500 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        {validatePresetForm()}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Lista de Presets Existentes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Presets Existentes ({presets.length})</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestoreDefaultPresets}
                      className="border-amber-300 hover:bg-amber-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restaurar Defaults
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {presets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay presets disponibles. Crea uno nuevo arriba.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {presets.map((preset) => {
                        const IconComponent = ICON_MAP[preset.icon] || Thermometer;
                        return (
                          <motion.div
                            key={preset.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={cn(
                                "p-2 rounded-lg bg-gradient-to-br",
                                preset.color
                              )}>
                                <IconComponent className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{preset.name}</p>
                                <p className="text-sm text-gray-600">{preset.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-sm text-gray-700">
                                  {preset.min}°C a {preset.max}°C
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPreset(preset)}
                                className="hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePreset(preset.id)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPresetManager(false);
                  setEditingPreset(null);
                  resetPresetForm();
                }}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ParametroTempCamarasV2;
