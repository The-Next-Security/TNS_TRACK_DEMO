/**
 * @fileoverview useReportGeneration Hook - Estado de generación de reportes
 * @description Custom hook que maneja el estado y lógica de generación de reportes.
 * Proporciona estados de carga, progreso, error y resultado.
 * @feature 004-reportes-base-core (T023)
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import reportsApiService from '../services/reportsApiService';
import { useToast } from './useToast_Hook';

/**
 * Custom hook para manejar la generación de reportes
 * @returns {Object} Estado y métodos de generación
 */
const useReportGeneration = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportUrl, setReportUrl] = useState(null);

  /**
   * Generar un reporte
   * @param {Object} config - Configuración del reporte
   * @returns {Promise<Object>} - Datos del reporte generado
   */
  const generateReport = useCallback(async (config) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setReportData(null);
    setReportUrl(null);

    try {
      // Validaciones básicas
      if (!config.reportType || config.reportType === 'undefined' || config.reportType === 'null') {
        throw new Error('Tipo de reporte no especificado');
      }
      if (!config.startDate || !config.endDate) {
        throw new Error('Debe especificar el rango de fechas');
      }
      if (!config.deviceIds || config.deviceIds.length === 0) {
        throw new Error('Debe seleccionar al menos un dispositivo');
      }

      // Validar que fecha fin > fecha inicio
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);
      if (end <= start) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }

      // Validar rango máximo (365 días)
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        throw new Error('El rango de fechas no puede ser mayor a 365 días');
      }

      // Simular progreso (ya que la API no proporciona progreso real)
      setProgress(10);

      // Llamar al servicio API
      const result = await reportsApiService.generateReport(config);

      setProgress(100);
      setReportData(result.data || result);
      setReportUrl(result.data?.downloadUrl || `/api/reports/download/${result.data?.reportId}`);

      // Mostrar notificación de éxito
      toast({
        title: "✅ Reporte generado exitosamente",
        description: `El reporte se generó en ${result.data?.generationTime || 'unos segundos'}. Haz clic en "Descargar" para obtener el PDF.`,
        variant: "default",
      });

      return result;
    } catch (err) {
      const errorMessage = err.message || 'Error al generar el reporte';
      setError(errorMessage);

      // Mostrar notificación de error
      toast({
        title: "❌ Error al generar reporte",
        description: errorMessage,
        variant: "destructive",
      });

      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  /**
   * Reiniciar el estado del hook
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setError(null);
    setReportData(null);
    setReportUrl(null);
  }, []);

  /**
   * Descargar el reporte generado
   */
  const downloadReport = useCallback(async () => {
    if (!reportData?.reportId) {
      toast({
        title: "Error",
        description: "No hay reporte para descargar",
        variant: "destructive",
      });
      return;
    }

    try {
      await reportsApiService.downloadReportFile(
        reportData.reportId,
        reportData.fileName || `reporte_${reportData.reportId}.pdf`
      );

      toast({
        title: "✅ Descarga iniciada",
        description: "El reporte se está descargando...",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error al descargar",
        description: err.message || "No se pudo descargar el reporte",
        variant: "destructive",
      });
    }
  }, [reportData, toast]);

  return {
    // Estados
    isGenerating,
    progress,
    error,
    reportData,
    reportUrl,

    // Métodos
    generateReport,
    reset,
    downloadReport,
  };
};

export default useReportGeneration;
