import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  Edit,
  Save,
  X,
  AlertCircle,
  Settings,
  Check,
  ChevronDown,
  Layers,
  Gauge,
  Snowflake,
  Flame,
  Package,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '../hooks/use-toast';
import HeaderV2 from './HeaderV2';
import axios from 'axios';

// Presets de temperatura
const TEMPERATURE_PRESETS = [
  {
    id: 'group1',
    name: 'Grupo 1 - Congelado',
    icon: Snowflake,
    min: -22,
    max: -13,
    color: 'from-blue-500 to-cyan-500',
    description: 'Productos ultra congelados'
  },
  {
    id: 'group2',
    name: 'Grupo 2 - Refrigerado',
    icon: Package,
    min: -5,
    max: 5,
    color: 'from-cyan-500 to-teal-500',
    description: 'Productos refrigerados'
  }
];

const ThresholdManagementV2 = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [editingCamera, setEditingCamera] = useState(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ min: '', max: '' });
  const [savingIds, setSavingIds] = useState([]);
  const { toast } = useToast();

  // Fetch cameras with thresholds
  const fetchCamerasWithThresholds = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ubibot/channels/thresholds');

      // Mock data for development
      const mockData = [
        {
          channel_id: '1',
          name: 'Cámara Frontal A1',
          min_threshold: -20,
          max_threshold: -15,
          default_min: -22,
          default_max: -13,
          last_temperature: -18.5,
          status: 'normal'
        },
        {
          channel_id: '2',
          name: 'Cámara Lateral B2',
          min_threshold: -22,
          max_threshold: -13,
          default_min: -22,
          default_max: -13,
          last_temperature: -19.2,
          status: 'normal'
        },
        {
          channel_id: '3',
          name: 'Cámara Trasera C3',
          min_threshold: -3,
          max_threshold: 2,
          default_min: -5,
          default_max: 5,
          last_temperature: 0.5,
          status: 'warning'
        },
        {
          channel_id: '4',
          name: 'Cámara Superior D4',
          min_threshold: -5,
          max_threshold: 5,
          default_min: -5,
          default_max: 5,
          last_temperature: 3.2,
          status: 'normal'
        }
      ];

      setCameras(response.data || mockData);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      // Use mock data on error
      setCameras([
        {
          channel_id: '1',
          name: 'Cámara Frontal A1',
          min_threshold: -20,
          max_threshold: -15,
          default_min: -22,
          default_max: -13,
          last_temperature: -18.5,
          status: 'normal'
        }
      ]);
      toast({
        title: "Advertencia",
        description: "No se pudieron cargar todos los datos. Mostrando datos de ejemplo.",
        variant: "warning"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCamerasWithThresholds();
  }, [fetchCamerasWithThresholds]);

  // Handle individual threshold save
  const handleSaveThreshold = async (channelId, thresholds) => {
    setSavingIds(prev => [...prev, channelId]);
    try {
      await axios.put(`/api/ubibot/channel/${channelId}/thresholds`, thresholds);

      setCameras(prev => prev.map(cam =>
        cam.channel_id === channelId
          ? { ...cam, min_threshold: thresholds.min, max_threshold: thresholds.max }
          : cam
      ));

      toast({
        title: "Umbrales actualizados",
        description: "Los umbrales se han guardado correctamente.",
        variant: "success"
      });

      setEditingCamera(null);
      setFormData({ min: '', max: '' });
    } catch (error) {
      console.error('Error saving threshold:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los umbrales.",
        variant: "destructive"
      });
    } finally {
      setSavingIds(prev => prev.filter(id => id !== channelId));
    }
  };

  // Handle bulk threshold save
  const handleBulkSave = async (thresholds) => {
    const selectedChannelIds = selectedCameras.map(id => id);
    setSavingIds(selectedChannelIds);

    try {
      // If backend supports bulk update
      await axios.put('/api/ubibot/channels/bulk-thresholds', {
        channelIds: selectedChannelIds,
        thresholds
      });

      // Update local state
      setCameras(prev => prev.map(cam =>
        selectedChannelIds.includes(cam.channel_id)
          ? { ...cam, min_threshold: thresholds.min, max_threshold: thresholds.max }
          : cam
      ));

      toast({
        title: "Actualización masiva completada",
        description: `Se actualizaron ${selectedChannelIds.length} cámaras.`,
        variant: "success"
      });

      setBulkEditOpen(false);
      setSelectedCameras([]);
      setFormData({ min: '', max: '' });
    } catch (error) {
      // Fallback: update one by one
      for (const channelId of selectedChannelIds) {
        await handleSaveThreshold(channelId, thresholds);
      }
    } finally {
      setSavingIds([]);
    }
  };

  // Apply preset to selected cameras
  const applyPreset = async (preset) => {
    if (selectedCameras.length === 0) {
      toast({
        title: "Seleccione cámaras",
        description: "Debe seleccionar al menos una cámara para aplicar el preset.",
        variant: "warning"
      });
      return;
    }

    await handleBulkSave({ min: preset.min, max: preset.max });
  };

  // Check if threshold differs from default
  const isDifferentFromDefault = (camera) => {
    return camera.min_threshold !== camera.default_min ||
           camera.max_threshold !== camera.default_max;
  };

  // Toggle camera selection
  const toggleCameraSelection = (channelId) => {
    setSelectedCameras(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  // Select all cameras
  const toggleSelectAll = () => {
    if (selectedCameras.length === cameras.length) {
      setSelectedCameras([]);
    } else {
      setSelectedCameras(cameras.map(cam => cam.channel_id));
    }
  };

  // Get temperature status color
  const getTemperatureStatus = (camera) => {
    if (!camera.last_temperature) return 'default';
    if (camera.last_temperature < camera.min_threshold) return 'destructive';
    if (camera.last_temperature > camera.max_threshold) return 'destructive';
    if (Math.abs(camera.last_temperature - camera.min_threshold) < 2 ||
        Math.abs(camera.last_temperature - camera.max_threshold) < 2) return 'warning';
    return 'success';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <HeaderV2 />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                <Thermometer className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Gestión de Umbrales de Temperatura
                </h1>
                <p className="text-blue-200 mt-1">
                  Configure los límites de temperatura para cada cámara
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={fetchCamerasWithThresholds}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-200">
                  Total Cámaras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{cameras.length}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-200">
                  Personalizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-400">
                  {cameras.filter(isDifferentFromDefault).length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-200">
                  En Alerta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">
                  {cameras.filter(c => c.status === 'warning').length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-200">
                  Seleccionadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {selectedCameras.length}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedCameras.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Alert className="bg-blue-500/20 border-blue-400/30">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-white">
                  {selectedCameras.length} cámara(s) seleccionada(s)
                </AlertTitle>
                <AlertDescription className="mt-3 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => setBulkEditOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Seleccionadas
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Aplicar Preset
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64">
                      <DropdownMenuLabel>Presets de Temperatura</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {TEMPERATURE_PRESETS.map(preset => (
                        <DropdownMenuItem
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${preset.color}`}>
                              <preset.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{preset.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {preset.min}°C a {preset.max}°C
                              </div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCameras([])}
                    className="text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpiar Selección
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-white">
                Configuración de Umbrales por Cámara
              </CardTitle>
              <Badge variant="outline" className="bg-white/10 text-blue-200 border-blue-400/30">
                {cameras.length} cámaras totales
              </Badge>
            </div>
            <CardDescription className="text-blue-200">
              Configure los umbrales mínimos y máximos para cada cámara de forma individual o masiva
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg overflow-hidden border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/5 hover:bg-white/10 border-white/10">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCameras.length === cameras.length && cameras.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="border-white/30"
                      />
                    </TableHead>
                    <TableHead className="text-blue-200">Cámara</TableHead>
                    <TableHead className="text-blue-200 text-center">Temperatura Actual</TableHead>
                    <TableHead className="text-blue-200 text-center">Umbral Mínimo</TableHead>
                    <TableHead className="text-blue-200 text-center">Umbral Máximo</TableHead>
                    <TableHead className="text-blue-200 text-center">Estado</TableHead>
                    <TableHead className="text-blue-200 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Gauge className="w-8 h-8 text-blue-400" />
                          </motion.div>
                          <p className="text-blue-200">Cargando cámaras...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : cameras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <Thermometer className="w-8 h-8 text-blue-400/50" />
                          <p className="text-blue-200">No se encontraron cámaras</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cameras.map((camera, index) => (
                      <motion.tr
                        key={camera.channel_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedCameras.includes(camera.channel_id)}
                            onCheckedChange={() => toggleCameraSelection(camera.channel_id)}
                            className="border-white/30"
                          />
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                              <Thermometer className="w-3 h-3 text-white" />
                            </div>
                            {camera.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={getTemperatureStatus(camera)}
                            className="min-w-[80px] justify-center"
                          >
                            {camera.last_temperature ? `${camera.last_temperature}°C` : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Snowflake className="w-4 h-4 text-blue-400" />
                            <span className="text-cyan-300 font-mono">
                              {camera.min_threshold}°C
                            </span>
                            {isDifferentFromDefault(camera) && camera.min_threshold !== camera.default_min && (
                              <Badge variant="outline" className="ml-2 text-xs bg-blue-500/20 text-blue-300 border-blue-400/30">
                                Personalizado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Flame className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-300 font-mono">
                              {camera.max_threshold}°C
                            </span>
                            {isDifferentFromDefault(camera) && camera.max_threshold !== camera.default_max && (
                              <Badge variant="outline" className="ml-2 text-xs bg-orange-500/20 text-orange-300 border-orange-400/30">
                                Personalizado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {isDifferentFromDefault(camera) ? (
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                              Personalizado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-white/10 text-blue-200 border-blue-400/30">
                              Por Defecto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCamera(camera);
                              setFormData({
                                min: camera.min_threshold.toString(),
                                max: camera.max_threshold.toString()
                              });
                            }}
                            disabled={savingIds.includes(camera.channel_id)}
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20"
                          >
                            {savingIds.includes(camera.channel_id) ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Settings className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <Edit className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Individual Edit Dialog */}
        <Dialog open={!!editingCamera} onOpenChange={() => setEditingCamera(null)}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-cyan-400" />
                Editar Umbrales - {editingCamera?.name}
              </DialogTitle>
              <DialogDescription className="text-blue-200">
                Configure los umbrales de temperatura para esta cámara
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="min" className="text-blue-200 flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-blue-400" />
                  Umbral Mínimo (°C)
                </Label>
                <Input
                  id="min"
                  type="number"
                  value={formData.min}
                  onChange={(e) => setFormData(prev => ({ ...prev, min: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="-22"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max" className="text-blue-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Umbral Máximo (°C)
                </Label>
                <Input
                  id="max"
                  type="number"
                  value={formData.max}
                  onChange={(e) => setFormData(prev => ({ ...prev, max: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="-13"
                />
              </div>

              {formData.min && formData.max && parseFloat(formData.min) >= parseFloat(formData.max) && (
                <Alert className="bg-red-500/20 border-red-400/30">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    El umbral mínimo debe ser menor que el máximo
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setEditingCamera(null)}
                className="text-white hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={() => handleSaveThreshold(editingCamera.channel_id, {
                  min: parseFloat(formData.min),
                  max: parseFloat(formData.max)
                })}
                disabled={
                  !formData.min ||
                  !formData.max ||
                  parseFloat(formData.min) >= parseFloat(formData.max) ||
                  savingIds.includes(editingCamera?.channel_id)
                }
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Edit Dialog */}
        <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Edición Masiva de Umbrales
              </DialogTitle>
              <DialogDescription className="text-blue-200">
                Aplicar los mismos umbrales a {selectedCameras.length} cámara(s) seleccionada(s)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Quick Presets */}
              <div className="space-y-2">
                <Label className="text-blue-200">Presets Rápidos</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPERATURE_PRESETS.map(preset => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ min: preset.min.toString(), max: preset.max.toString() })}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 justify-start"
                    >
                      <preset.icon className="w-4 h-4 mr-2" />
                      <div className="text-left">
                        <div className="text-xs">{preset.name}</div>
                        <div className="text-xs opacity-70">{preset.min}° a {preset.max}°</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-min" className="text-blue-200 flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-blue-400" />
                  Umbral Mínimo (°C)
                </Label>
                <Input
                  id="bulk-min"
                  type="number"
                  value={formData.min}
                  onChange={(e) => setFormData(prev => ({ ...prev, min: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="-22"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-max" className="text-blue-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Umbral Máximo (°C)
                </Label>
                <Input
                  id="bulk-max"
                  type="number"
                  value={formData.max}
                  onChange={(e) => setFormData(prev => ({ ...prev, max: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="-13"
                />
              </div>

              {formData.min && formData.max && parseFloat(formData.min) >= parseFloat(formData.max) && (
                <Alert className="bg-red-500/20 border-red-400/30">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    El umbral mínimo debe ser menor que el máximo
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="bg-blue-500/20 border-blue-400/30">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  Esta acción actualizará {selectedCameras.length} cámara(s) con los nuevos umbrales
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setBulkEditOpen(false);
                  setFormData({ min: '', max: '' });
                }}
                className="text-white hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={() => handleBulkSave({
                  min: parseFloat(formData.min),
                  max: parseFloat(formData.max)
                })}
                disabled={
                  !formData.min ||
                  !formData.max ||
                  parseFloat(formData.min) >= parseFloat(formData.max) ||
                  savingIds.length > 0
                }
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                {savingIds.length > 0 ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                    </motion.div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Aplicar a {selectedCameras.length} cámara(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ThresholdManagementV2;