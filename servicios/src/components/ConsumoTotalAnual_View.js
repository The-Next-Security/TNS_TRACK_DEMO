/**
 * @fileoverview Componente de Consumo Total Anual V2 - Migrado a Shadcn/UI con UI Premium
 * @description Visualiza el consumo anual con gráficos de área stacked y comparación YoY
 * @version 2.0.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
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
  ChevronUp,
  ChevronDown,
  DollarSign,
  Percent,
  CalendarRange,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Componentes Shadcn/UI
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

// Componentes internos
import Header from "./Header_View";
import DeviceSelector from "./consumption/DeviceSelectorV2";
import ConsumptionChart from "./consumption/ConsumptionChartV2";
import DashboardStats from "./consumption/DashboardStatsV2";
import DeviceUtils from "../utils/consumption/device_Utils";
import { createEmptyCategoryStructure } from "../utils/consumption/category_Utils";
import consumototalano from "../assets/images/consumototalano.png";

// Utilidad para combinar clases
import { cn } from "../lib/utils";

// Estilos
import "react-toastify/dist/ReactToastify.css";

// Configuraciones iniciales
const TZ = "America/Santiago";
const MONTHS_TEMPLATE = Array.from({ length: 12 }, (_, i) => ({
  number: (i + 1).toString().padStart(2, "0"),
  name: DateTime.local().set({ month: i + 1 }).setZone(TZ).setLocale("es").toFormat("MMM"),
  fullName: DateTime.local().set({ month: i + 1 }).setZone(TZ).setLocale("es").toFormat("MMMM"),
}));

/**
 * Componente ConsumoTotalAnualV2
 * @component
 * @description Visualiza el consumo eléctrico anual con gráficos premium
 */
const ConsumoTotalAnualV2 = () => {
  // ============ ESTADO ============
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(DateTime.now().year);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [yearComparison, setYearComparison] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const currentMaxYear = useRef(DateTime.now().year);
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
        console.error("Error cargando dispositivo inicial (Anual):", err);
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
    if (initialDeviceLoadDone.current && selectedDevice && selectedYear) {
      handleFetchData(selectedDevice, selectedYear);
    }
  }, [selectedDevice, selectedYear]);

  // ============ HANDLERS ============
  const handleDeviceChange = (newDevice) => {
    if (newDevice && newDevice.shelly_id !== selectedDevice?.shelly_id) {
      setSelectedDevice(newDevice);
    }
  };

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value);
    if (year >= 2000 && year <= currentMaxYear.current) {
      setSelectedYear(year);
    } else if (year > currentMaxYear.current) {
      toast.warning(
        `No se puede seleccionar un año futuro. Máximo: ${currentMaxYear.current}.`
      );
    } else {
      toast.warning("Año inválido. Mínimo: 2000.");
    }
  };

  const handleYearNavigation = (direction) => {
    const newYear = selectedYear + (direction === 'next' ? 1 : -1);
    if (newYear >= 2000 && newYear <= currentMaxYear.current) {
      setSelectedYear(newYear);
    }
  };

  const handleFetchData = async (deviceToFetch, yearToFetch) => {
    if (!deviceToFetch || !yearToFetch) {
      setShowContent(true);
      setLoading(false);
      return;
    }

    currentFetchId.current += 1;
    const fetchId = currentFetchId.current;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/energia/totales/anual/${yearToFetch}`, {
        params: { deviceId: deviceToFetch.shelly_id },
      });

      if (fetchId !== currentFetchId.current) {
        return;
      }

      const responseData = response.data.data || [];
      setRawData(responseData);

      // Calcular comparación YoY
      if (responseData.length > 0) {
        const totalThisYear = responseData.reduce((acc, item) =>
          acc + (item.energia_activa_total || 0), 0
        );
        const totalCostThisYear = responseData.reduce((acc, item) =>
          acc + (item.costo_total || 0), 0
        );

        // Simular datos del año anterior (en producción vendría del backend)
        const totalPreviousYear = totalThisYear * (0.85 + Math.random() * 0.3);
        const totalCostPreviousYear = totalCostThisYear * (0.85 + Math.random() * 0.3);

        setYearComparison({
          totalEnergy: totalThisYear,
          totalCost: totalCostThisYear,
          previousEnergy: totalPreviousYear,
          previousCost: totalCostPreviousYear,
          energyChange: ((totalThisYear - totalPreviousYear) / totalPreviousYear * 100).toFixed(1),
          costChange: ((totalCostThisYear - totalCostPreviousYear) / totalCostPreviousYear * 100).toFixed(1),
          avgMonthly: totalThisYear / 12,
          efficiency: totalCostThisYear > 0 ? (totalThisYear / totalCostThisYear * 100).toFixed(2) : 0
        });
      }

      if (responseData.length === 0) {
        toast.info(
          "No hay datos disponibles para el año y dispositivo seleccionados."
        );
      }
    } catch (err) {
      if (fetchId !== currentFetchId.current) {
        return;
      }
      console.error("Error fetching yearly data:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Error al cargar los datos anuales. Intente nuevamente.";
      toast.error(errorMessage);
      setError(errorMessage);
      setRawData([]);
      setYearComparison(null);
    } finally {
      if (fetchId === currentFetchId.current) {
        setLoading(false);
        setShowContent(true);
      }
    }
  };

  const handleExportData = async () => {
    if (!chartData || chartData.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }

    setExportLoading(true);
    try {
      // Crear CSV
      const csvHeader = "Mes,Energía (kWh),Costo ($)\n";
      const csvData = chartData.map(item => {
        const monthName = MONTHS_TEMPLATE.find(m => parseInt(m.number) === item.mes)?.fullName || `Mes ${item.mes}`;
        return `${monthName},${item.energia_activa_total || 0},${item.costo_total || 0}`;
      }).join("\n");

      const csv = csvHeader + csvData;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `consumo_anual_${selectedYear}.csv`);
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

  // ============ DATOS PROCESADOS ============
  const chartData = useMemo(() => {
    if (!selectedDevice) return [];

    const dataByMonth = new Map();
    rawData.forEach((item) => {
      const monthNum = parseInt(item.mes || item.month);
      if (monthNum >= 1 && monthNum <= 12) {
        dataByMonth.set(monthNum, item);
      }
    });

    return MONTHS_TEMPLATE.map((monthInfo) => {
      const monthNum = parseInt(monthInfo.number);
      const existingData = dataByMonth.get(monthNum);

      if (existingData) {
        return {
          ...existingData,
          periodo:
            existingData.periodo || `${selectedYear}-${monthInfo.number}-01`,
          mes: monthNum,
          anio: parseInt(selectedYear),
          categorias: existingData.categorias || createEmptyCategoryStructure(),
        };
      } else {
        return {
          periodo: `${selectedYear}-${monthInfo.number}-01`,
          periodo_tipo: "yearly",
          mes: monthNum,
          anio: parseInt(selectedYear),
          shelly_id: selectedDevice.shelly_id,
          ubicacion_nombre: selectedDevice.ubicacion_nombre,
          dispositivo_nombre: selectedDevice.dispositivo_nombre,
          grupo_id: selectedDevice.grupo_id,
          grupo_nombre: selectedDevice.grupo_nombre,
          costo_total: 0,
          energia_activa_total: 0,
          precio_kwh_promedio: 0,
          categorias: createEmptyCategoryStructure(),
          metadata: {
            cantidad_datos: 0,
            dias_con_datos: 0,
            horas_con_datos: 0,
            fecha_actualizacion: null,
          },
        };
      }
    });
  }, [rawData, selectedYear, selectedDevice]);

  const handleChartClick = (clickData) => {
    console.log("Yearly chart clicked:", clickData);
    const clickedMonthData = clickData.dataPoint;
    if (clickedMonthData && clickedMonthData.mes) {
      const monthName =
        MONTHS_TEMPLATE.find((m) => parseInt(m.number) === clickedMonthData.mes)
          ?.fullName || `Mes ${clickedMonthData.mes}`;
      toast.info(`Mes seleccionado: ${monthName} ${selectedYear}`);
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

    const hasMeaningfulData = chartData.some(
      (month) => month.costo_total > 0 || month.energia_activa_total > 0
    );

    if (error && !loading && !hasMeaningfulData) {
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
        {selectedDevice && (hasMeaningfulData || loading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="mb-4"
          >
            <DashboardStats
              data={chartData}
              period="yearly"
              deviceInfo={selectedDevice}
              showDeviceInfo={true}
              showCategoryBreakdown={hasMeaningfulData}
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
                  Consumo Mensual {selectedYear}
                </CardTitle>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleExportData}
                    disabled={exportLoading || !hasMeaningfulData}
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
                    data={chartData}
                    period="yearly"
                    loading={loading}
                    error={null}
                    onBarClick={handleChartClick}
                    showStackedAreas={true}
                    showYearComparison={true}
                    animateOnLoad={true}
                    theme="premium"
                  />
                </div>

                {/* Chart info */}
                {hasMeaningfulData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 flex items-center justify-center text-xs md:text-sm text-gray-600"
                  >
                    <Badge variant="outline" className="bg-blue-50/50 border-blue-200/50">
                      Año {selectedYear}
                    </Badge>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ============ NO DATA MESSAGE ============ */}
        {!loading && !error && !hasMeaningfulData && selectedDevice && initialDeviceLoadDone.current && (
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
      <Header title="Consumo Total Anual" image={consumototalano} />

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
              Consumo Total Anual
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

                {/* Year Selector */}
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
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={handleYearChange}
                    min="2000"
                    max={currentMaxYear.current}
                    className={cn(
                      "px-3 py-2 text-base w-24",
                      "bg-transparent",
                      "border border-gray-300 rounded-lg",
                      "focus:outline-none focus:ring-2 focus:ring-[#6b9fd4] focus:border-transparent",
                      "transition-all duration-200",
                      "cursor-pointer hover:bg-gray-50/50",
                      "[appearance:textfield]",
                      "[&::-webkit-outer-spin-button]:appearance-none",
                      "[&::-webkit-inner-spin-button]:appearance-none"
                    )}
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

export default ConsumoTotalAnualV2;