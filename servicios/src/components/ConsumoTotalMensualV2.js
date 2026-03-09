/**
 * @fileoverview Componente de Consumo Total Mensual V2 - Migrado a Shadcn/UI con UI Premium
 * @description Visualiza el consumo mensual con gráficos de barras agrupadas/stacked
 * @version 2.0.0
 */

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import moment from "moment-timezone";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Zap,
  BarChart3,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  PieChart
} from "lucide-react";

// Componentes Shadcn/UI
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

// Componentes internos
import Header from "./HeaderV2";
import DeviceSelector from "./consumption/DeviceSelectorV2";
import ConsumptionChart from "./consumption/ConsumptionChartV2";
import DashboardStats from "./consumption/DashboardStatsV2";
import DeviceUtils from "../utils/consumption/device_Utils";
import ConsumoTotalMensualImage from "../assets/images/consumototalmes.png";

// Utilidad para combinar clases
import { cn } from "../lib/utils";

// Estilos
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";

// Configuraciones iniciales
moment.tz.setDefault("America/Santiago");
registerLocale("es", es);

/**
 * Componente ConsumoTotalMensualV2
 * @component
 * @description Visualiza el consumo eléctrico mensual con gráficos premium
 */
const ConsumoTotalMensualV2 = () => {
  // ============ ESTADO ============
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(moment().toDate());
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [monthComparison, setMonthComparison] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const currentMonthMaxDate = useRef(moment().endOf("month").toDate());
  const initialDeviceLoadDone = useRef(false);
  const currentFetchId = useRef(0);

  // ============ EFECTOS ============
  useEffect(() => {
    const loadInitialDevice = async () => {
      setLoading(true);
      setError(null);
      try {
        const device = await DeviceUtils.getCurrentDevice();
        setSelectedDevice(device);
        initialDeviceLoadDone.current = true;
      } catch (err) {
        console.error("Error cargando dispositivo inicial (Mensual):", err);
        toast.error(err.message || "Error cargando dispositivos disponibles.");
        setError(
          "No se pudo cargar la información del dispositivo. Intente recargar la página."
        );
        setLoading(false);
        setShowContent(true);
      }
    };
    loadInitialDevice();
  }, []);

  useEffect(() => {
    if (initialDeviceLoadDone.current && selectedDevice && selectedDate) {
      handleFetchData(selectedDevice, selectedDate);
    }
  }, [selectedDevice, selectedDate]);

  // ============ HANDLERS ============
  const handleDeviceChange = (newDevice) => {
    if (newDevice && newDevice.shelly_id !== selectedDevice?.shelly_id) {
      setSelectedDevice(newDevice);
    }
  };

  const handleDateChange = (date) => {
    if (moment(date).startOf("month").isAfter(moment().startOf("month"))) {
      toast.warning("No se puede seleccionar un mes futuro.");
    } else {
      setSelectedDate(date);
    }
  };

  const handleMonthNavigation = (direction) => {
    const newDate = moment(selectedDate)
      .add(direction === 'next' ? 1 : -1, 'month')
      .toDate();

    if (moment(newDate).startOf("month").isAfter(moment().startOf("month"))) {
      toast.warning("No se puede seleccionar un mes futuro.");
    } else {
      setSelectedDate(newDate);
    }
  };

  const handleFetchData = async (deviceToFetch, dateToFetch) => {
    if (!deviceToFetch || !dateToFetch) {
      setShowContent(true);
      setLoading(false);
      return;
    }

    currentFetchId.current += 1;
    const fetchId = currentFetchId.current;

    setLoading(true);
    setError(null);

    try {
      const formattedDate = moment(dateToFetch).format("YYYY-MM-DD");
      const response = await axios.get(`/api/totals/monthly/${formattedDate}`, {
        params: { deviceId: deviceToFetch.shelly_id },
      });

      if (fetchId !== currentFetchId.current) {
        return;
      }

      const responseData = response.data.data || [];
      if (responseData.length === 0) {
        setData([]);
        setMonthComparison(null);
        toast.info(
          "No hay datos disponibles para el mes y dispositivo seleccionados."
        );
      } else {
        const sortedData = responseData.sort((a, b) =>
          moment(a.periodo).diff(moment(b.periodo))
        );
        setData(sortedData);

        // Calcular comparación mes a mes
        const totalThisMonth = sortedData.reduce((acc, item) => acc + item.consumo_kwh, 0);
        const avgDaily = totalThisMonth / sortedData.length;
        const maxDay = Math.max(...sortedData.map(item => item.consumo_kwh));
        const minDay = Math.min(...sortedData.map(item => item.consumo_kwh));

        // Simular comparación con mes anterior (en producción esto vendría del backend)
        const previousMonthTotal = totalThisMonth * (0.85 + Math.random() * 0.3);
        const percentageChange = ((totalThisMonth - previousMonthTotal) / previousMonthTotal * 100).toFixed(1);

        setMonthComparison({
          total: totalThisMonth,
          avgDaily,
          maxDay,
          minDay,
          previousTotal: previousMonthTotal,
          change: percentageChange,
          trend: totalThisMonth > previousMonthTotal ? 'up' : 'down'
        });
      }
    } catch (err) {
      if (fetchId !== currentFetchId.current) {
        return;
      }
      console.error("Error fetching monthly data:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Error al cargar los datos mensuales. Intente nuevamente.";
      toast.error(errorMessage);
      setError(errorMessage);
      setData([]);
      setMonthComparison(null);
    } finally {
      if (fetchId === currentFetchId.current) {
        setLoading(false);
        setShowContent(true);
      }
    }
  };

  const handleChartClick = (clickData) => {
    console.log("Monthly chart clicked:", clickData);
    const clickedDayData = clickData.dataPoint;
    if (clickedDayData && clickedDayData.periodo) {
      toast.info(
        `Día seleccionado: ${moment(clickedDayData.periodo).format(
          "DD [de] MMMM"
        )}`
      );
    }
  };

  const handleExportData = async () => {
    if (!data || data.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }

    setExportLoading(true);
    try {
      // Crear CSV
      const csvHeader = "Fecha,Consumo (kWh)\n";
      const csvData = data.map(item =>
        `${moment(item.periodo).format('DD/MM/YYYY')},${item.consumo_kwh}`
      ).join("\n");

      const csv = csvHeader + csvData;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `consumo_mensual_${moment(selectedDate).format('YYYY-MM')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Datos exportados exitosamente");
    } catch (error) {
      console.error("Error al exportar:", error);
      toast.error("Error al exportar los datos");
    } finally {
      setExportLoading(false);
    }
  };

  // ============ RENDERIZADO ============
  const renderMainContent = () => {
    if (!showContent && loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-4"
          >
            <div className="animate-pulse">
              <Activity className="h-12 w-12 text-blue-500 mx-auto" />
            </div>
            <p className="text-lg text-gray-600">Cargando datos iniciales...</p>
          </motion.div>
        </div>
      );
    }

    if (error && !loading && data.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mt-8"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">

        {/* ============ STATS DASHBOARD ============ */}
        {selectedDevice && (data.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="mb-4"
          >
            <DashboardStats
              data={data}
              period="monthly"
              deviceInfo={selectedDevice}
              showDeviceInfo={true}
              showCategoryBreakdown={data.length > 0}
            />
          </motion.div>
        )}

        {/* ============ ENHANCED CHART SECTION - PREMIUM STYLE ============ */}
        {selectedDevice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ y: -4 }}
          >
            <Card className={cn(
              "bg-white/80 backdrop-blur-sm",
              "border-2 border-gray-300/50",
              "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
              "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
              "transition-all duration-300",
              "rounded-xl"
            )}>
              <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-5">
                <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2.5 text-gray-800">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  Consumo Diario del Mes
                </CardTitle>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleExportData}
                    disabled={exportLoading || data.length === 0}
                    className={cn(
                      "bg-gradient-to-r from-blue-600 to-cyan-600",
                      "hover:from-blue-700 hover:to-cyan-700",
                      "text-white shadow-md hover:shadow-lg",
                      "transition-all duration-200",
                      "font-semibold"
                    )}
                    size="sm"
                  >
                    {exportLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Exportar CSV
                  </Button>
                </motion.div>
              </CardHeader>

              <CardContent className="px-6 pb-6">
                <div className={cn(
                  "relative",
                  "p-3 md:p-4 rounded-xl",
                  "bg-gradient-to-br from-gray-50/60 to-blue-50/30",
                  "border border-gray-200/40"
                )}>
                  <ConsumptionChart
                    data={data}
                    period="monthly"
                    loading={loading}
                    error={null}
                    onBarClick={handleChartClick}
                    showComparison={true}
                    showTrendIndicators={true}
                    animateOnLoad={true}
                    theme="premium"
                  />
                </div>

                {/* Chart info */}
                {data.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 flex items-center justify-center text-xs md:text-sm text-gray-600"
                  >
                    <Badge variant="outline" className="bg-blue-50/50 border-blue-200/50">
                      {data.length} días con datos registrados
                    </Badge>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ============ NO DATA MESSAGE ============ */}
        {!loading && !error && data.length === 0 && selectedDevice && initialDeviceLoadDone.current && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">
              No hay datos disponibles para la selección actual.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
      <Header title="Consumo Total Mensual" image={ConsumoTotalMensualImage} />

      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* ============ PREMIUM HEADER - ESTILO TEMPERATURA CAMARAS ============ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Consumo Total Mensual
            </h1>
          </motion.div>

          {/* ============ CONTROLES EN LA MISMA LINEA - ESTILO TEMPERATURA CAMARAS ============ */}
          {(initialDeviceLoadDone.current || error) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex justify-center mb-8 relative z-20"
            >
              <div className="flex flex-col md:flex-row items-center gap-4">
                {/* Device Selector */}
                <div className={cn(
                  "inline-flex items-center gap-3 px-4 py-2 w-full md:w-auto min-w-[280px]",
                  "bg-white backdrop-blur-sm",
                  "border-2 border-[#6b9fd4]/40",
                  "rounded-xl",
                  "shadow-[0_8px_24px_-4px_rgba(107,159,212,0.3),0_4px_12px_-2px_rgba(107,159,212,0.2)]",
                  "hover:shadow-[0_12px_32px_-4px_rgba(107,159,212,0.4),0_6px_16px_-2px_rgba(107,159,212,0.3)]",
                  "transition-all duration-300"
                )}>
                  <Activity className="h-5 w-5 text-[#6b9fd4] flex-shrink-0" />
                  <div className="flex-1">
                    <DeviceSelector
                      selectedDeviceId={selectedDevice?.shelly_id}
                      onDeviceChange={handleDeviceChange}
                      disabled={loading && !initialDeviceLoadDone.current}
                    />
                  </div>
                </div>

                {/* Date Picker */}
                <div className={cn(
                  "inline-flex items-center gap-3 px-4 py-2 w-full md:w-auto",
                  "bg-white backdrop-blur-sm",
                  "border-2 border-[#6b9fd4]/40",
                  "rounded-xl",
                  "shadow-[0_8px_24px_-4px_rgba(107,159,212,0.3),0_4px_12px_-2px_rgba(107,159,212,0.2)]",
                  "hover:shadow-[0_12px_32px_-4px_rgba(107,159,212,0.4),0_6px_16px_-2px_rgba(107,159,212,0.3)]",
                  "transition-all duration-300"
                )}>
                  <Calendar className="h-5 w-5 text-[#6b9fd4]" />
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    dateFormat="MM/yyyy"
                    showMonthYearPicker
                    className={cn(
                      "px-3 py-2 text-base",
                      "bg-transparent",
                      "border border-gray-300 rounded-lg",
                      "focus:outline-none focus:ring-2 focus:ring-[#6b9fd4] focus:border-transparent",
                      "transition-all duration-200",
                      "cursor-pointer hover:bg-gray-50/50"
                    )}
                    locale="es"
                    maxDate={currentMonthMaxDate.current}
                    disabled={loading && !initialDeviceLoadDone.current}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ============ MAIN CONTENT ============ */}
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default ConsumoTotalMensualV2;