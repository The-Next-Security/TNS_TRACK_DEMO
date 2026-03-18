/**
 * @fileoverview AlertMetricsDashboardV2 - Dashboard de Métricas de Alertas
 * @description Dashboard con métricas, gráficos y tabla de alertas recientes del sistema
 * @version 2.1.0 - Optimizado para PWA y vistas responsivas con Shadcn/UI
 * @module AlertMetricsDashboardV2
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import { motion } from "framer-motion";
import HeaderV2 from "./Header_View";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/useToast_Hook";
import { cn } from "../lib/utils";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  BarChart3,
  PieChartIcon,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  Thermometer,
  WifiOff,
  ChevronDown,
  ChevronUp,
  RotateCw,
  X
} from "lucide-react";

/**
 * Colores para los gráficos
 */
const CHART_COLORS = {
  temperature: "#3B82F6", // Azul
  disconnection: "#F97316", // Naranja
  pending: "#EF4444", // Rojo
  resolved: "#10B981", // Verde
  acknowledged: "#F59E0B", // Amarillo
  falseAlarm: "#6B7280" // Gris
};

/**
 * Paleta de colores para canales (barras apiladas)
 */
const CHANNEL_COLORS = [
  "#3B82F6", // Azul
  "#10B981", // Verde
  "#F59E0B", // Amarillo
  "#EF4444", // Rojo
  "#8B5CF6", // Violeta
  "#EC4899", // Rosa
  "#14B8A6", // Turquesa
  "#F97316", // Naranja
  "#6366F1", // Índigo
  "#A855F7", // Púrpura
  "#06B6D4", // Cyan
  "#84CC16", // Lima
  "#F43F5E", // Rose
  "#0EA5E9", // Sky
  "#D946EF"  // Fuchsia
];

/**
 * Períodos de tiempo predefinidos
 */
const TIME_RANGES = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Última semana" },
  { value: "month", label: "Último mes" },
  { value: "quarter", label: "Último trimestre" }
];

/**
 * Skeleton loader para las métricas - Optimizado para móvil
 */
const MetricsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {[1, 2, 3, 4].map(i => (
      <Skeleton key={i} className="h-28 sm:h-32" />
    ))}
  </div>
);

/**
 * Skeleton loader para gráficos - Responsivo
 */
const ChartSkeleton = () => (
  <div className="space-y-4 sm:space-y-6">
    <Skeleton className="h-64 sm:h-80 w-full" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Skeleton className="h-48 sm:h-64" />
      <Skeleton className="h-48 sm:h-64" />
    </div>
  </div>
);

/**
 * Componente de tarjeta de métrica individual - Optimizado para touch
 */
const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="hover:shadow-lg transition-shadow duration-300 touch-manipulation">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
            <p className={cn("text-xl sm:text-2xl font-bold mt-1 sm:mt-2", color)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2",
                trend > 0 ? "text-green-600" : "text-red-600"
              )}>
                <TrendingUp className={cn(
                  "h-3 w-3 sm:h-4 sm:w-4",
                  trend < 0 && "rotate-180"
                )} />
                <span className="text-xs font-medium">
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-2 sm:p-3 rounded-lg shrink-0",
            color === "text-red-500" ? "bg-red-100" :
            color === "text-green-500" ? "bg-green-100" :
            color === "text-yellow-500" ? "bg-yellow-100" :
            "bg-blue-100"
          )}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

/**
 * Tooltip personalizado para gráficos - Mejorado para móvil
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 sm:p-3 border border-gray-200 rounded-lg shadow-lg max-w-[200px]">
        <p className="font-medium text-xs sm:text-sm truncate">{label}</p>
        {payload.slice(0, 5).map((entry, index) => (
          <p key={index} className="text-xs sm:text-sm mt-1 truncate">
            <span style={{ color: entry.color }}>● </span>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
        {payload.length > 5 && (
          <p className="text-xs text-gray-500 mt-1">+{payload.length - 5} más...</p>
        )}
      </div>
    );
  }
  return null;
};

/**
 * Hook para detectar tamaño de pantalla móvil
 */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

/**
 * Hook para detectar orientación del dispositivo
 * @returns {string} 'portrait' | 'landscape'
 */
const useOrientation = () => {
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      );
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
};

/**
 * Componente de sugerencia de rotación - PWA optimizado
 */
const OrientationSuggestion = ({ period, onDismiss }) => {
  const periodLabel = period === 'month' ? 'Último mes' : 'Último trimestre';
  const daysCount = period === 'month' ? 30 : 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Alert className="border-blue-200 bg-blue-50">
        <RotateCw className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-sm font-medium text-blue-900">
          Sugerencia de Visualización
        </AlertTitle>
        <AlertDescription className="text-xs text-blue-700 mt-1">
          Seleccionaste <strong>{periodLabel}</strong> ({daysCount} días).
          Para visualizar mejor todos los datos, te recomendamos rotar tu dispositivo
          a modo horizontal (landscape).
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0"
          aria-label="Cerrar sugerencia"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </motion.div>
  );
};

/**
 * Componente de sección colapsable para móvil
 */
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  // En desktop siempre abierto
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between p-2 h-auto"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Ocultar' : 'Mostrar'} ${title}`}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
};

/**
 * Componente principal del Dashboard de Métricas - Optimizado para PWA
 * @returns {React.Element} Dashboard de métricas
 */
const AlertMetricsDashboardV2 = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const orientation = useOrientation();

  // Estados del componente
  const [dateRange, setDateRange] = useState({
    start: DateTime.now().minus({ days: 7 }).toFormat("yyyy-MM-dd"),
    end: DateTime.now().toFormat("yyyy-MM-dd"),
    type: "week"
  });

  const [showOrientationSuggestion, setShowOrientationSuggestion] = useState(false);

  const [filters, setFilters] = useState({
    alertType: "all"
  });

  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState({
    daily: [],
    dailyChannels: [], // Canales únicos para leyenda de barras apiladas
    byType: [],
    byChannel: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Carga todos los datos del dashboard - Optimizado con useCallback
   */
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      // Construir parámetros de consulta
      const params = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...(filters.alertType !== "all" && { type: filters.alertType })
      };

      // Parámetros para chart-data
      const chartParams = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...(filters.alertType !== "all" && { alertType: filters.alertType })
      };

      // Realizar todas las peticiones en paralelo
      const [metricsRes, dailyRes, byTypeRes, byChannelRes] = await Promise.all([
        axios.get("/api/alertas/metricas/resumen", { params }),
        axios.get("/api/alertas/metricas/grafico", { params: { ...chartParams, type: "daily" } }),
        axios.get("/api/alertas/metricas/grafico", { params: { ...chartParams, type: "by_type" } }),
        axios.get("/api/alertas/metricas/grafico", { params: { ...chartParams, type: "by_channel" } })
      ]);

      // Procesar respuestas
      if (metricsRes.data?.success) {
        setMetrics(metricsRes.data.data);
      }

      // Procesar datos de gráficos
      const dailyDataResponse = dailyRes.data?.data || {};
      const dailyChartData = dailyDataResponse.chartData || [];
      const dailyChannels = dailyDataResponse.channels || [];

      const newChartData = {
        daily: dailyChartData,
        dailyChannels: dailyChannels,
        byType: byTypeRes.data?.data || [],
        byChannel: byChannelRes.data?.data || []
      };

      setChartData(newChartData);

      if (!isRefresh) {
        toast({
          title: "Datos actualizados",
          description: "El dashboard se ha actualizado correctamente",
          variant: "success"
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);

      // Inicializar con valores por defecto en caso de error
      setMetrics({
        totalAlerts: 0,
        pendingAlerts: 0,
        resolvedAlerts: 0,
        avgResponseTime: 0,
        resolutionRate: 0
      });
      setChartData({
        daily: [],
        dailyChannels: [],
        byType: [],
        byChannel: []
      });

      if (!isRefresh) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, filters, toast]);

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh cada 60 segundos - optimizado para PWA
    const interval = setInterval(() => {
      // Solo refrescar si la app está visible
      if (document.visibilityState === 'visible') {
        loadDashboardData(true);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  /**
   * Efecto para manejar sugerencia de orientación
   */
  useEffect(() => {
    // Solo mostrar si:
    // 1. Es móvil
    // 2. Está en portrait
    // 3. Período es month o quarter
    // 4. No se ha cerrado antes en esta sesión

    const isDismissed = sessionStorage.getItem('orientation-suggestion-dismissed') === 'true';

    if (
      isMobile &&
      orientation === 'portrait' &&
      (dateRange.type === 'month' || dateRange.type === 'quarter') &&
      !isDismissed
    ) {
      setShowOrientationSuggestion(true);
    } else {
      setShowOrientationSuggestion(false);
    }
  }, [isMobile, orientation, dateRange.type]);

  /**
   * Maneja el cierre de la sugerencia
   */
  const handleDismissOrientationSuggestion = useCallback(() => {
    setShowOrientationSuggestion(false);
    sessionStorage.setItem('orientation-suggestion-dismissed', 'true');
  }, []);

  /**
   * Maneja el cambio de rango de fechas - Memoizado
   */
  const handleDateRangeChange = useCallback((value) => {
    const now = DateTime.now();
    let newRange = {};

    switch (value) {
      case "today":
        newRange = {
          start: now.startOf("day").toFormat("yyyy-MM-dd HH:mm:ss"),
          end: now.endOf("day").toFormat("yyyy-MM-dd HH:mm:ss"),
          type: "today"
        };
        break;
      case "week":
        newRange = {
          start: now.minus({ days: 7 }).toFormat("yyyy-MM-dd"),
          end: DateTime.now().toFormat("yyyy-MM-dd"),
          type: "week"
        };
        break;
      case "month":
        newRange = {
          start: now.minus({ days: 30 }).toFormat("yyyy-MM-dd"),
          end: DateTime.now().toFormat("yyyy-MM-dd"),
          type: "month"
        };
        break;
      case "quarter":
        newRange = {
          start: now.minus({ days: 90 }).toFormat("yyyy-MM-dd"),
          end: DateTime.now().toFormat("yyyy-MM-dd"),
          type: "quarter"
        };
        break;
      default:
        return;
    }

    setDateRange(newRange);
  }, []);

  /**
   * Maneja el cambio de tipo de alerta - Memoizado
   */
  const handleAlertTypeChange = useCallback((value) => {
    setFilters(prev => ({ ...prev, alertType: value }));
  }, []);

  /**
   * Datos procesados para el gráfico de barras diario (apiladas por canal)
   */
  const dailyChartData = useMemo(() => {
    if (!chartData.daily?.length) {
      return [];
    }

    // Limitar datos en móvil para mejor rendimiento
    const filtered = chartData.daily.filter(item => item.fecha);

    if (isMobile && filtered.length > 7) {
      // En móvil, mostrar solo los últimos 7 días
      return filtered.slice(-7);
    }

    return filtered;
  }, [chartData.daily, isMobile]);

  /**
   * Datos procesados para el gráfico de pie
   */
  const pieChartData = useMemo(() => {
    if (!chartData.byType?.length) return [];

    return chartData.byType.map(item => ({
      name: item.name || (item.type === "temperature" ? "Temperatura" : "Desconexión"),
      value: item.count || 0,
      color: item.type === "temperature" ? CHART_COLORS.temperature : CHART_COLORS.disconnection
    }));
  }, [chartData.byType]);

  /**
   * Datos procesados para el gráfico de barras (Top canales)
   */
  const barChartData = useMemo(() => {
    if (!chartData.byChannel?.length) return [];

    return chartData.byChannel
      .slice(0, isMobile ? 3 : 5) // Menos items en móvil
      .map(item => ({
        sensor: item.sensorName || item.channelId,
        alertas: item.count || 0
      }));
  }, [chartData.byChannel, isMobile]);

  /**
   * Datos procesados para el gráfico de barras por canal (todos los canales con colores únicos)
   */
  const channelBarChartData = useMemo(() => {
    if (!chartData.byChannel?.length) return [];

    return chartData.byChannel.map((item, index) => ({
      channel: item.sensorName || item.channelId,
      alertas: item.count || 0,
      color: CHANNEL_COLORS[index % CHANNEL_COLORS.length]
    }));
  }, [chartData.byChannel]);

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
        <HeaderV2 title="Monitor de Alertas" />
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
          <MetricsSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100"
    >
      <HeaderV2 title="Monitor de Alertas" />

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Header con título y controles - Optimizado para móvil */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Monitor de Alertas
            </h1>
          </div>

          <Button
            variant="outline"
            size={isMobile ? "default" : "sm"}
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              refreshing && "animate-spin"
            )} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        {/* Filtros - Optimizados para móvil con sección colapsable */}
        <CollapsibleSection
          title="Filtros"
          icon={Filter}
          defaultOpen={!isMobile}
        >
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Rango de fechas */}
                <div>
                  <Label
                    htmlFor="date-range"
                    className="text-xs sm:text-sm mb-1 flex items-center gap-1"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    Período
                  </Label>
                  <Select
                    value={dateRange.type}
                    onValueChange={handleDateRangeChange}
                  >
                    <SelectTrigger
                      id="date-range"
                      className="min-h-[44px] touch-manipulation"
                      aria-label="Seleccionar período de tiempo"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_RANGES.map(range => (
                        <SelectItem
                          key={range.value}
                          value={range.value}
                          className="min-h-[44px]"
                        >
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de alerta */}
                <div>
                  <Label
                    htmlFor="alert-type"
                    className="text-xs sm:text-sm mb-1 flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    Tipo de Alerta
                  </Label>
                  <Select
                    value={filters.alertType}
                    onValueChange={handleAlertTypeChange}
                  >
                    <SelectTrigger
                      id="alert-type"
                      className="min-h-[44px] touch-manipulation"
                      aria-label="Seleccionar tipo de alerta"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="min-h-[44px]">
                        Todas
                      </SelectItem>
                      <SelectItem value="temperature" className="min-h-[44px]">
                        <span className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4" />
                          Temperatura
                        </span>
                      </SelectItem>
                      <SelectItem value="disconnection" className="min-h-[44px]">
                        <span className="flex items-center gap-2">
                          <WifiOff className="h-4 w-4" />
                          Desconexión
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleSection>

        {/* Sugerencia de orientación - Solo móvil portrait con períodos largos */}
        {showOrientationSuggestion && (
          <OrientationSuggestion
            period={dateRange.type}
            onDismiss={handleDismissOrientationSuggestion}
          />
        )}

        {/* KPI / Métrica principal */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <MetricCard
            title="Total de Alertas"
            value={metrics?.totalAlerts || 0}
            subtitle="en el período"
            icon={AlertTriangle}
            color="text-blue-500"
            trend={metrics?.trend?.total}
          />
        </div>

        {/* Gráfico de barras - Alertas por Día - Responsivo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Alertas por Día
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={isMobile ? 250 : 300}
              >
                <BarChart
                  data={dailyChartData}
                  margin={isMobile ?
                    { top: 10, right: 10, left: -20, bottom: 40 } :
                    { top: 20, right: 30, left: 20, bottom: 60 }
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="fecha"
                    stroke="#666"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    angle={isMobile ? -45 : -45}
                    textAnchor="end"
                    height={isMobile ? 40 : 60}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {!isMobile && <Legend />}
                  {/* Renderizar una barra por cada canal */}
                  {chartData.dailyChannels.slice(0, isMobile ? 5 : undefined).map((channelName, index) => (
                    <Bar
                      key={channelName}
                      dataKey={channelName}
                      stackId="a"
                      fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 sm:h-64 text-gray-500 text-sm sm:text-base">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de barras - Alertas por Canal - Cada barra con color único */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Alertas por Canal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {channelBarChartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={isMobile ? 250 : 350}
              >
                <BarChart
                  data={channelBarChartData}
                  margin={isMobile ?
                    { top: 10, right: 10, left: -20, bottom: 80 } :
                    { top: 20, right: 30, left: 20, bottom: 100 }
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="channel"
                    stroke="#666"
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={isMobile ? 80 : 100}
                    interval={0}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Un solo Bar con Cell para colores individuales */}
                  <Bar dataKey="alertas" radius={[8, 8, 0, 0]}>
                    {channelBarChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 sm:h-64 text-gray-500 text-sm sm:text-base">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráficos Pie y Barras - Optimizados para móvil */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Gráfico Pie - Por tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                Distribución por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={isMobile ? 200 : 250}
                >
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        isMobile ?
                          `${(percent * 100).toFixed(0)}%` :
                          `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={isMobile ? 60 : 80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 sm:h-64 text-gray-500 text-sm sm:text-base">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico Barras - Top sensores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                Top {isMobile ? 3 : 5} Cámaras más Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              {barChartData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={isMobile ? 200 : 250}
                >
                  <BarChart
                    data={barChartData}
                    margin={isMobile ?
                      { top: 10, right: 10, left: -20, bottom: 60 } :
                      { top: 20, right: 30, left: 20, bottom: 60 }
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="sensor"
                      stroke="#666"
                      tick={{ fontSize: isMobile ? 9 : 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis
                      stroke="#666"
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="alertas"
                      fill={CHART_COLORS.temperature}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 sm:h-64 text-gray-500 text-sm sm:text-base">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default AlertMetricsDashboardV2;