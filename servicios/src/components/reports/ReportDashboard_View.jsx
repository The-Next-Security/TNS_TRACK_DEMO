/**
 * @fileoverview Reports Dashboard V2 - Sistema de Generación de Reportes
 * @description Dashboard principal para visualizar tipos de reportes disponibles,
 * estadísticas y reportes recientes. Usa Shadcn/UI components y Tailwind CSS.
 * @feature 004-reportes-base-core (T019)
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
import { cn } from "../../lib/utils";
import {
  FileText,
  Clock,
  Calendar,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Download,
  FileCheck,
  Mail,
  Zap
} from "lucide-react";
import { useToast } from "../ui/use-toast";

// Componentes internos
import ReportCard from "./components/ReportCard";
import EmailModal from "./components/EmailModal";
import ResponsiveReportsTable from "./components/ResponsiveReportsTable";

/**
 * Componente principal del Dashboard de Reportes
 */
const ReportDashboardV2 = ({ userPermissions = [] }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reportTemplates, setReportTemplates] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [stats, setStats] = useState({
    totalReports: 0,
    activeSchedules: 0,
    lastReportDate: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Email Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Cargar templates disponibles
  useEffect(() => {
    fetchReportTemplates();
    fetchRecentReports();
    fetchActiveSchedulesCount();
  }, []);

  const fetchActiveSchedulesCount = async () => {
    try {
      const response = await fetch('/api/reportes/programados/conteo', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }
      });

      if (!response.ok) {
        console.error('[ReportDashboard] Error fetching active schedules count');
        return;
      }

      const data = await response.json();
      setStats(prev => ({
        ...prev,
        activeSchedules: data.count || 0
      }));
    } catch (err) {
      console.error('[ReportDashboard] Error fetching active schedules:', err);
      // No mostrar error, es opcional
    }
  };

  const fetchReportTemplates = async () => {
    try {
      const response = await fetch('/api/reportes/plantillas', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar templates de reportes');
      }

      const data = await response.json();
      setReportTemplates(data.templates || []);
    } catch (err) {
      console.error('[ReportDashboard] Error fetching templates:', err);
      setError(err.message);
    }
  };

  const fetchRecentReports = async () => {
    try {
      const response = await fetch('/api/reportes/historial?limit=5', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar reportes recientes');
      }

      const data = await response.json();

      // Mapear los campos del backend (camelCase) a los esperados por el frontend
      const mappedReports = (data.reports || []).map(report => ({
        id: report.id,
        report_name: report.scheduleName || report.name || 'Sin nombre',
        report_type: report.type || 'Sin tipo',
        template_key: report.template_key || report.templateKey, // Agregado para mostrar emojis correctos
        created_at: report.createdAt,
        downloaded_at: report.downloadedAt,
        file_size: report.fileSize || 0,
        status: report.status,
        period: report.period,
        period_start_date: report.periodStartDate,
        period_end_date: report.periodEndDate,
        devices: report.devices || [],
        schedule_id: report.scheduleId,
        schedule_name: report.scheduleName
      }));

      setRecentReports(mappedReports);

      // Calcular estadísticas después de tener los datos
      setStats(prev => ({
        ...prev,
        totalReports: data.totalCount || mappedReports.length,
        lastReportDate: mappedReports[0]?.created_at || null
      }));

    } catch (err) {
      console.error('[ReportDashboard] Error fetching recent reports:', err);
      // No mostrar error aquí, es opcional
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = (templateKey) => {
    // Navegar al generador con fallback si el template está vacío/indefinido
    const safeKey = (!templateKey || templateKey === 'undefined' || templateKey === 'null')
      ? 'executive_temperature'
      : templateKey;
    navigate(`/reports/generate?template=${safeKey}`);
  };

  const handleViewHistory = () => {
    navigate('/reports/history');
  };

  const handleViewScheduled = () => {
    navigate('/reports/scheduled');
  };

  /**
   * Opens email modal for a specific report
   * @param {Object} report - Report object to send
   */
  const handleSendEmail = (report) => {
    setSelectedReport({
      id: report.id,
      name: report.report_name
    });
    setEmailModalOpen(true);
  };

  /**
   * Handles successful email send
   * @param {Object} result - Send result with sentCount, recipients, reportName
   */
  const handleEmailSuccess = (result) => {
    toast({
      title: "✅ Email enviado exitosamente",
      description: `El reporte "${result.reportName}" fue enviado a ${result.sentCount} destinatario(s)`,
      variant: "default",
    });
  };

  /**
   * Closes email modal
   */
  const handleCloseEmailModal = () => {
    setEmailModalOpen(false);
    setSelectedReport(null);
  };

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <HeaderV2 userPermissions={userPermissions} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Sistema de Reportes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Genera reportes ejecutivos de temperatura y monitoreo
          </p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* Total Reports */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total Reportes</p>
                    <span className="text-3xl font-bold mt-1 block">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.totalReports}
                    </span>
                  </div>
                  <FileText className="h-12 w-12 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Schedules */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Programados Activos 2</p>
                    <span className="text-3xl font-bold mt-1 block">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.activeSchedules}
                    </span>
                  </div>
                  <Clock className="h-12 w-12 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Last Report */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Último Reporte</p>
                    <span className="text-sm font-semibold mt-1 block">
                      {loading ? (
                        <Skeleton className="h-6 w-24" />
                      ) : stats.lastReportDate ? (
                        new Date(stats.lastReportDate).toLocaleDateString('es-CL')
                      ) : (
                        'Sin reportes'
                      )}
                    </span>
                  </div>
                  <Calendar className="h-12 w-12 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={handleViewHistory}
            variant="outline"
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Ver Historial Completo
          </Button>
          <Button
            onClick={handleViewScheduled}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all duration-200"
          >
            <Clock className="h-4 w-4" />
            Reportes Programados
          </Button>
        </div>

        {/* Available Report Types */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Tipos de Reportes Disponibles
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-12 w-12 mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </Card>
              ))}
            </div>
          ) : reportTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No hay templates de reportes disponibles
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportTemplates.map((template, index) => {
                // Dynamic icon based on report type
                const getIcon = (key) => {
                  switch(key) {
                    case 'executive_temperature':
                      return <TrendingUp className="h-8 w-8" />;
                    case 'executive_alerts':
                      return <AlertCircle className="h-8 w-8" />;
                    case 'executive_consumption':
                      return <Zap className="h-8 w-8" />;
                    default:
                      return <FileText className="h-8 w-8" />;
                  }
                };

                return (
                  <motion.div key={template.key} variants={itemVariants}>
                    <ReportCard
                      icon={getIcon(template.key)}
                      title={template.name}
                      description={template.description}
                      estimatedTime={template.estimatedTime ? `${template.estimatedTime}s` : '30s'}
                      onGenerate={() => handleGenerateReport(template.key)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Reportes Recientes
            </h2>

            <ResponsiveReportsTable
              reports={recentReports}
              onSendEmail={handleSendEmail}
              onDownload={null} // Using default window.open behavior
            />

            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={handleViewHistory}
                className="gap-2"
              >
                Ver Todo el Historial
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={handleCloseEmailModal}
        report={selectedReport}
        onSuccess={handleEmailSuccess}
      />
    </div>
  );
};

export default ReportDashboardV2;
