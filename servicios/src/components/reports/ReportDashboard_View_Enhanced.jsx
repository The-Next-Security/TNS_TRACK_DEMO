/**
 * @fileoverview Enhanced Reports Dashboard V2 - Sistema de Generación de Reportes
 * @description Dashboard principal mejorado con mejor UX, accesibilidad y rendimiento
 * @feature 004-reportes-base-core (T019) - Enhanced UX
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import HeaderV2 from "../Header_View";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { ScrollArea } from "../ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
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
  ChevronDown,
  ChevronUp,
  MoreVertical,
  ExternalLink,
  Eye,
  Loader2,
  Search,
  Filter,
  X,
  ArrowUpDown,
  Info,
  Thermometer,
  Bell
} from "lucide-react";
import { useToast } from "../ui/use-toast";

// Componentes internos
import ReportCard from "./components/ReportCard";
import EmailModal from "./components/EmailModal";

/**
 * Gets emoji based on report template key
 * @param {string} templateKey - Template key from report
 * @returns {string} Emoji for the report type
 */
const getReportTypeEmoji = (templateKey) => {
  const emojis = {
    executive_temperature: '🌡️',
    executive_alerts: '🔔'
  };
  return emojis[templateKey] || '📄';
};

// Custom hooks for keyboard navigation
const useKeyboardNavigation = (items, onSelect) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!items.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev < items.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : items.length - 1
          );
          break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            e.preventDefault();
            onSelect(items[focusedIndex]);
          }
          break;
        case 'Escape':
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, onSelect]);

  return { focusedIndex, setFocusedIndex };
};

// Mobile-optimized report row component
const MobileReportRow = ({ report, onDownload, onEmail, isNew }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "border rounded-lg p-4 mb-3 transition-all",
        "dark:border-gray-700",
        isNew && "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700",
        "hover:shadow-md active:scale-[0.98]"
      )}
    >
      <div
        className="flex justify-between items-start cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`Report: ${report.report_name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {report.downloaded_at ? (
              <FileCheck className="h-4 w-4 text-gray-400 flex-shrink-0" aria-label="Downloaded" />
            ) : (
              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" aria-label="New report" />
            )}
            <h3 className="font-medium text-sm truncate">
              {report.report_name}
            </h3>
            {isNew && (
              <Badge variant="default" className="ml-auto bg-blue-500">
                Nuevo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-base cursor-help">
                    {getReportTypeEmoji(report.template_key)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{report.report_type}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="truncate">
              {new Date(report.created_at).toLocaleDateString('es-CL')}
            </span>
          </div>
        </div>
        <button
          className="ml-2 p-1 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t dark:border-gray-700">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Fecha completa:</span>
                  <span>{new Date(report.created_at).toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Tamaño:</span>
                  <span>{(report.file_size / 1024).toFixed(2)} KB</span>
                </div>
                {report.period && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Periodo:</span>
                    <span>{report.period}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEmail(report)}
                  className="flex-1 h-11 touch-manipulation"
                  aria-label={`Send ${report.report_name} by email`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onDownload(report)}
                  className="flex-1 h-11 touch-manipulation"
                  aria-label={`Download ${report.report_name}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Desktop table row with enhanced interactions
const DesktopReportRow = ({
  report,
  onDownload,
  onEmail,
  isNew,
  isFocused,
  onFocus
}) => {
  const [showActions, setShowActions] = useState(false);
  const rowRef = useRef(null);

  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.focus();
    }
  }, [isFocused]);

  return (
    <TableRow
      ref={rowRef}
      className={cn(
        "group transition-all duration-200",
        isNew && "bg-blue-50 dark:bg-blue-900/20",
        isFocused && "ring-2 ring-blue-500 ring-offset-2",
        "hover:bg-gray-50 dark:hover:bg-gray-800"
      )}
      tabIndex={0}
      onFocus={onFocus}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      aria-label={`Report: ${report.report_name}`}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  {report.downloaded_at ? (
                    <FileCheck className="h-4 w-4 text-gray-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-blue-500 animate-pulse" />
                  )}
                  <span className="text-base">{getReportTypeEmoji(report.template_key)}</span>
                  <span className="max-w-[200px] truncate">
                    {report.report_name}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{report.report_name}</p>
                {!report.downloaded_at && (
                  <p className="text-xs text-blue-500 mt-1">Nuevo - No descargado</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isNew && (
            <Badge variant="default" className="ml-2 bg-blue-500 animate-pulse">
              Nuevo
            </Badge>
          )}
        </div>
      </TableCell>

      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-fit">
                <span className="text-xl cursor-help">{getReportTypeEmoji(report.template_key)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{report.report_type}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      <TableCell className="text-gray-600 dark:text-gray-400">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                {new Date(report.created_at).toLocaleDateString('es-CL')}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{new Date(report.created_at).toLocaleString('es-CL')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      <TableCell className="text-gray-600 dark:text-gray-400">
        {(report.file_size / 1024).toFixed(2)} KB
      </TableCell>

      <TableCell className="text-right">
        <div className={cn(
          "flex items-center justify-end gap-1 transition-opacity duration-200",
          !showActions && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        )}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEmail(report)}
                  className="h-9 w-9 p-0"
                  aria-label={`Send ${report.report_name} by email`}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar por email</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(report)}
                  className="h-9 w-9 p-0"
                  aria-label={`Download ${report.report_name}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {report.downloaded_at ? 'Descargar de nuevo' : 'Descargar (Nuevo)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  );
};

// Loading skeleton for table
const TableSkeleton = ({ rows = 5, mobile = false }) => {
  if (mobile) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Tamaño</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Empty state component
const EmptyState = ({ onGenerate }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="text-center py-12"
  >
    <FileText className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      No hay reportes recientes
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
      Comienza generando tu primer reporte para ver el historial aquí
    </p>
    <Button onClick={onGenerate} className="gap-2">
      <TrendingUp className="h-4 w-4" />
      Generar Primer Reporte
    </Button>
  </motion.div>
);

/**
 * Enhanced Reports Dashboard Component
 */
const ReportDashboardV2Enhanced = ({ userPermissions = [] }) => {
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
  const [isMobile, setIsMobile] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filterText, setFilterText] = useState('');

  // Email Modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load data
  useEffect(() => {
    fetchReportTemplates();
    fetchRecentReports();
    fetchActiveSchedulesCount();
  }, []);

  // Auto-refresh recent reports
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecentReports();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
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
      const response = await fetch('/api/reportes/historial?limit=10', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }
      });

      if (!response.ok) {
        throw new Error('Error al cargar reportes recientes');
      }

      const data = await response.json();

      const mappedReports = (data.reports || []).map(report => ({
        id: report.id,
        report_name: report.scheduleName || report.name || 'Sin nombre',
        report_type: report.type || 'Sin tipo',
        template_key: report.template_key || report.templateKey,
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

      setStats(prev => ({
        ...prev,
        totalReports: data.totalCount || mappedReports.length,
        lastReportDate: mappedReports[0]?.created_at || null
      }));

    } catch (err) {
      console.error('[ReportDashboard] Error fetching recent reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = useCallback((templateKey) => {
    const safeKey = (!templateKey || templateKey === 'undefined' || templateKey === 'null')
      ? 'executive_temperature'
      : templateKey;
    navigate(`/reports/generate?template=${safeKey}`);
  }, [navigate]);

  const handleViewHistory = useCallback(() => {
    navigate('/reports/history');
  }, [navigate]);

  const handleViewScheduled = useCallback(() => {
    navigate('/reports/scheduled');
  }, [navigate]);

  const handleDownload = useCallback((report) => {
    // Mark as downloading
    const link = document.createElement('a');
    link.href = `/api/reportes/descargar/${report.id}`;
    link.target = '_blank';
    link.download = `${report.report_name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Update local state to show as downloaded
    setRecentReports(prev =>
      prev.map(r =>
        r.id === report.id
          ? { ...r, downloaded_at: new Date().toISOString() }
          : r
      )
    );

    toast({
      title: "Descarga iniciada",
      description: `Descargando ${report.report_name}`,
    });
  }, [toast]);

  const handleSendEmail = useCallback((report) => {
    setSelectedReport({
      id: report.id,
      name: report.report_name
    });
    setEmailModalOpen(true);
  }, []);

  const handleEmailSuccess = useCallback((result) => {
    toast({
      title: "Email enviado exitosamente",
      description: `El reporte "${result.reportName}" fue enviado a ${result.sentCount} destinatario(s)`,
      variant: "default",
    });
  }, [toast]);

  const handleCloseEmailModal = useCallback(() => {
    setEmailModalOpen(false);
    setSelectedReport(null);
  }, []);

  // Sorting logic
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Filtered and sorted reports
  const processedReports = useMemo(() => {
    let filtered = recentReports;

    // Apply filter
    if (filterText) {
      filtered = filtered.filter(report =>
        report.report_name.toLowerCase().includes(filterText.toLowerCase()) ||
        report.report_type.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc'
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }

      if (sortConfig.key === 'file_size') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [recentReports, filterText, sortConfig]);

  // Keyboard navigation for reports
  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation(
    processedReports,
    (report) => handleDownload(report)
  );

  // Animation variants
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
          <Alert variant="destructive" className="mb-6" role="alert">
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
                    <p className="text-3xl font-bold mt-1" aria-live="polite">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.totalReports}
                    </p>
                  </div>
                  <FileText className="h-12 w-12 opacity-80" aria-hidden="true" />
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
                    <p className="text-3xl font-bold mt-1" aria-live="polite">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.activeSchedules}
                    </p>
                  </div>
                  <Clock className="h-12 w-12 opacity-80" aria-hidden="true" />
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
                    <p className="text-sm font-semibold mt-1" aria-live="polite">
                      {loading ? (
                        <Skeleton className="h-6 w-24" />
                      ) : stats.lastReportDate ? (
                        new Date(stats.lastReportDate).toLocaleDateString('es-CL')
                      ) : (
                        'Sin reportes'
                      )}
                    </p>
                  </div>
                  <Calendar className="h-12 w-12 opacity-80" aria-hidden="true" />
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
            disabled
          >
            <BarChart3 className="h-4 w-4" />
            Ver Historial
            <Badge variant="secondary" className="ml-2">Próximamente</Badge>
          </Button>
          <Button
            onClick={handleViewScheduled}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all duration-200 active:scale-95"
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
              {reportTemplates.map((template, index) => (
                <motion.div key={template.key} variants={itemVariants}>
                  <ReportCard
                    icon={<TrendingUp className="h-8 w-8" />}
                    title={template.name}
                    description={template.description}
                    estimatedTime={template.estimatedTime ? `${template.estimatedTime}s` : '30s'}
                    onGenerate={() => handleGenerateReport(template.key)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Reports Section */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">
                Reportes Recientes
              </h2>

              {processedReports.length > 0 && !isMobile && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar reportes..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="pl-10 pr-10 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                      aria-label="Buscar reportes"
                    />
                    {filterText && (
                      <button
                        onClick={() => setFilterText('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label="Limpiar búsqueda"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-0">
                  <TableSkeleton mobile={isMobile} />
                </CardContent>
              </Card>
            ) : processedReports.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState onGenerate={() => handleGenerateReport('executive_temperature')} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {isMobile ? (
                    <div className="p-4">
                      <AnimatePresence mode="popLayout">
                        {processedReports.map((report) => (
                          <MobileReportRow
                            key={report.id}
                            report={report}
                            onDownload={handleDownload}
                            onEmail={handleSendEmail}
                            isNew={!report.downloaded_at}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead
                              className="cursor-pointer select-none"
                              onClick={() => handleSort('report_name')}
                            >
                              <div className="flex items-center gap-1">
                                Nombre
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead
                              className="cursor-pointer select-none"
                              onClick={() => handleSort('created_at')}
                            >
                              <div className="flex items-center gap-1">
                                Fecha
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="cursor-pointer select-none"
                              onClick={() => handleSort('file_size')}
                            >
                              <div className="flex items-center gap-1">
                                Tamaño
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedReports.map((report, index) => (
                            <DesktopReportRow
                              key={report.id}
                              report={report}
                              onDownload={handleDownload}
                              onEmail={handleSendEmail}
                              isNew={!report.downloaded_at}
                              isFocused={index === focusedIndex}
                              onFocus={() => setFocusedIndex(index)}
                            />
                          ))}
                        </TableBody>
                        {processedReports.length > 5 && (
                          <TableCaption>
                            Mostrando {processedReports.length} reportes recientes
                          </TableCaption>
                        )}
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}

            {processedReports.length > 0 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={handleViewHistory}
                  disabled
                  className="gap-2"
                >
                  Ver Todo el Historial
                  <Badge variant="secondary" className="ml-2">Próximamente</Badge>
                </Button>
              </div>
            )}
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

      {/* Accessibility: Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Saltar al contenido principal
      </a>
    </div>
  );
};

export default ReportDashboardV2Enhanced;