/**
 * @fileoverview Report Scheduler V2 - Interface para Reportes Programados
 * @description Componente que permite crear, listar, editar y eliminar schedules de reportes automáticos.
 * @feature 004-reportes-base-core (T037, T039, T040)
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import HeaderV2 from "../Header_View";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { Switch } from "../ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { cn } from "../../lib/utils";
import {
  ArrowLeft,
  Plus,
  Clock,
  Calendar,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useToast } from "../../hooks/useToast_Hook";
import reportsApiService from "../../services/reportsApi_Service";
import ScheduleForm from "./components/ScheduleForm";

/**
 * Componente principal de Scheduler de Reportes
 */
const ReportSchedulerV2 = ({ userPermissions = [] }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);

  // Cargar schedules al montar
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await reportsApiService.getSchedules();
      setSchedules(response.data?.schedules || []);
    } catch (err) {
      console.error('[Scheduler] Error fetching schedules:', err);
      setError(err.message || 'Error al cargar los schedules');
      toast({
        title: "Error",
        description: err.message || 'No se pudieron cargar los schedules programados',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    setIsDialogOpen(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleSaveSchedule = async (scheduleData) => {
    try {
      if (editingSchedule) {
        // Actualizar schedule existente
        await reportsApiService.updateSchedule(editingSchedule.id, scheduleData);
        toast({
          title: "✅ Schedule Actualizado",
          description: `"${scheduleData.name}" ha sido actualizado exitosamente`,
          variant: "default",
        });
      } else {
        // Crear nuevo schedule
        await reportsApiService.createSchedule(scheduleData);
        toast({
          title: "✅ Schedule Creado",
          description: `"${scheduleData.name}" ha sido creado exitosamente`,
          variant: "default",
        });
      }

      // Cerrar dialog y refrescar lista
      setIsDialogOpen(false);
      setEditingSchedule(null);
      fetchSchedules();
    } catch (err) {
      console.error('[Scheduler] Error saving schedule:', err);
      const conflictName = err.apiCode === 'DUPLICATE_SCHEDULE_NAME';
      toast({
        title: conflictName ? "Nombre ya en uso" : "Error",
        description: err.message || 'No se pudo guardar el schedule',
        variant: "destructive",
      });
      throw err; // Re-throw para que el form maneje el error
    }
  };

  const handleToggleSchedule = async (scheduleId, currentActive) => {
    try {
      await reportsApiService.updateSchedule(scheduleId, { active: !currentActive });

      toast({
        title: `Schedule ${!currentActive ? 'Activado' : 'Desactivado'}`,
        description: `El schedule ha sido ${!currentActive ? 'activado' : 'desactivado'} exitosamente`,
        variant: "default",
      });

      // Actualizar estado local optimísticamente
      setSchedules(prevSchedules =>
        prevSchedules.map(schedule =>
          schedule.id === scheduleId
            ? { ...schedule, active: !currentActive }
            : schedule
        )
      );
    } catch (err) {
      console.error('[Scheduler] Error toggling schedule:', err);
      toast({
        title: "Error",
        description: err.message || 'No se pudo cambiar el estado del schedule',
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (schedule) => {
    setScheduleToDelete(schedule);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      await reportsApiService.deleteSchedule(scheduleToDelete.id);

      toast({
        title: "✅ Schedule Eliminado",
        description: `"${scheduleToDelete.name}" ha sido eliminado exitosamente`,
        variant: "default",
      });

      // Actualizar lista
      setSchedules(prevSchedules =>
        prevSchedules.filter(s => s.id !== scheduleToDelete.id)
      );

      setDeleteConfirmOpen(false);
      setScheduleToDelete(null);
    } catch (err) {
      console.error('[Scheduler] Error deleting schedule:', err);
      toast({
        title: "Error",
        description: err.message || 'No se pudo eliminar el schedule',
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate('/reports');
  };

  const getFrequencyLabel = (frequency, dayOfWeek) => {
    if (frequency === 'daily') {
      return 'Diario';
    } else if (frequency === 'weekly') {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return `Semanal - ${days[dayOfWeek]}`;
    }
    return frequency;
  };

  const getPeriodTypeLabel = (periodType) => {
    const labels = {
      'last_day': 'Último día',
      'last_week': 'Última semana',
      'last_month': 'Último mes'
    };
    return labels[periodType] || periodType;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <HeaderV2 userPermissions={userPermissions} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
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

          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Reportes Programados
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Programa reportes automáticos para recibir actualizaciones periódicas
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateSchedule} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Nuevo Reporte Programado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? 'Editar Reporte Programado' : 'Crear Reporte Programado'}
                  </DialogTitle>
                  <DialogDescription>
                    Configura la frecuencia y parámetros del reporte automático
                  </DialogDescription>
                </DialogHeader>
                <ScheduleForm
                  initialData={editingSchedule}
                  onSave={handleSaveSchedule}
                  onCancel={() => {
                    setIsDialogOpen(false);
                    setEditingSchedule(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Schedules List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Schedules Configurados ({schedules.length})</CardTitle>
              <CardDescription>
                Gestiona tus reportes programados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </Card>
                  ))}
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No hay reportes programados
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Crea tu primer reporte programado para recibir actualizaciones automáticas
                  </p>
                  <Button onClick={handleCreateSchedule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <Card
                      key={schedule.id}
                      className={cn(
                        "p-4 transition-all",
                        schedule.active ? "border-green-500 dark:border-green-600" : "border-gray-300"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {schedule.name}
                            </h3>
                            <Badge variant={schedule.active ? "default" : "secondary"}>
                              {schedule.active ? '✓ Activo' : '⏸ Pausado'}
                            </Badge>
                            {schedule.isRunning && (
                              <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                                <PlayCircle className="h-3 w-3 mr-1" />
                                En ejecución
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Frecuencia</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {getFrequencyLabel(schedule.frequency, schedule.dayOfWeek)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Hora</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {schedule.executionTime}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Período</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {getPeriodTypeLabel(schedule.periodType)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Dispositivos</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {schedule.deviceCount} seleccionado(s)
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Próxima: {schedule.nextExecutionFormatted || 'N/A'}</span>
                            </div>
                            {schedule.lastExecutionFormatted && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span>Última: {schedule.lastExecutionFormatted}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>Ejecuciones: {schedule.executionCount}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={schedule.active}
                            onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.active)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(schedule)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el schedule "{scheduleToDelete?.name}"?
              Esta acción no se puede deshacer. Los reportes ya generados se mantendrán en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false);
              setScheduleToDelete(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportSchedulerV2;
