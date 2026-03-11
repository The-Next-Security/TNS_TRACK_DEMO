/**
 * TemperaturaCamarasV2.js
 *
 * Componente para visualización de temperaturas de cámaras de frío
 * Migrado a Shadcn/UI v2.0 con Tailwind CSS
 *
 * @module TemperaturaCamarasV2
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  annotationPlugin
);
import "chartjs-adapter-luxon";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { DateTime } from "luxon";
import { motion } from "framer-motion";
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  Thermometer,
  Clock,
  AlertCircle,
  Settings,
  Users
} from "lucide-react";

// Componentes Shadcn/UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HeaderV2 from "./Header_View";
import { cn } from "@/lib/utils";

registerLocale("es", es);

const LINE_COLOR = "rgba(75,192,192,1)";

/**
 * Componente principal para visualización de temperaturas de cámaras de frío
 *
 * @component
 * @returns {JSX.Element} Interfaz de visualización de temperaturas
 */
const TemperaturaCamarasV2 = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState(null);
  const today = useRef(DateTime.now().setZone("America/Santiago").endOf("day").toJSDate());

  useEffect(() => {
    fetchTemperatureData(selectedDate);
  }, [selectedDate]);

  /**
   * Obtiene datos de temperatura desde el servidor
   *
   * @param {Date} date - Fecha para consultar datos
   * @returns {Promise<void>}
   */
  const fetchTemperatureData = async (date) => {
    try {
      const formattedDate = DateTime.fromJSDate(date).toFormat("yyyy-MM-dd");
      console.log("Fetching data for date:", formattedDate);
      const response = await axios.get("/api/ubibot/temperature-camaras-data", {
        params: { date: formattedDate },
      });
      console.log("Datos recibidos:", response.data);

      // Al procesar los datos recibidos, asumimos que ya vienen en hora de Santiago
      const formattedData = response.data.map((device) => ({
        ...device,
        data: device.data.map((item) => ({
          ...item,
          timestamp: (typeof item.timestamp === 'number' ? DateTime.fromMillis(item.timestamp) : DateTime.fromISO(item.timestamp)).toJSDate(),
        })),
      }));

      setData(formattedData);
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error fetching temperature data:", error);
      setLoading(false);
      setError("Error al cargar los datos. Por favor, intente nuevamente.");
    }
  };

  /**
   * Maneja el cambio de fecha en el selector
   *
   * @param {Date} date - Nueva fecha seleccionada
   */
  const handleDateChange = (date) => {
    if (DateTime.fromJSDate(date).startOf("day") <= DateTime.now().startOf("day")) {
      setSelectedDate(date);
      setLoading(true);
    } else {
      alert("No se puede seleccionar una fecha futura.");
    }
  };

  /**
   * Genera archivo CSV con datos de temperatura
   *
   * @param {Object} deviceData - Datos del dispositivo
   * @returns {string} Contenido CSV
   */
  const generateCSV = (deviceData) => {
    const headers = "Device Name,Fecha,Hora,External Temperature\n";
    const rows = deviceData.data
      .map((item) => {
        const dt = typeof item.timestamp === 'number' ? DateTime.fromMillis(item.timestamp) : DateTime.fromISO(item.timestamp);
        const fecha = dt.setZone("America/Santiago").toFormat("dd-MM-yy");
        const hora = dt.setZone("America/Santiago").toFormat("HH:mm");
        const temperature = item.external_temperature
          .toString()
          .replace(".", ",");

        return `"${deviceData.name}",${fecha},${hora},${temperature}`;
      })
      .join("\n");

    return headers + rows;
  };

  /**
   * Maneja la descarga de datos en formato CSV
   *
   * @param {string} channelId - ID del canal
   * @param {string} deviceName - Nombre del dispositivo
   */
  const handleDownload = (channelId, deviceName) => {
    const deviceData = data.find((item) => item.channel_id === channelId);
    if (deviceData) {
      const csvContent = generateCSV(deviceData);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `${deviceName}_external_temperatures.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  /**
   * Crea las opciones de configuración para el gráfico con líneas de referencia
   *
   * @param {Object} parametros - Parámetros de temperatura (mínimo/máximo)
   * @param {Object} deviceData - Datos completos del dispositivo incluyendo tipo de umbral
   * @returns {Object} Opciones de configuración para Chart.js
   */
  const createChartOptions = (parametros, deviceData) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            stepSize: 3,
            displayFormats: {
              hour: "HH:mm",
            },
          },
          adapters: {
            date: {
              locale: 'es',
            },
          },
          title: {
            display: true,
            text: "Hora",
            font: {
              size: 12,
              weight: '600'
            },
            color: '#64748b'
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false,
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
            font: {
              size: 11
            },
            color: '#94a3b8'
          },
        },
        y: {
          title: {
            display: true,
            text: "Temperatura Sonda (°C)",
            font: {
              size: 12,
              weight: '600'
            },
            color: '#64748b'
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false,
          },
          ticks: {
            callback: function (value) {
              return value.toFixed(1) + "°";
            },
            font: {
              size: 11
            },
            color: '#94a3b8'
          },
          beginAtZero: false,
          suggestedMin: function (context) {
            const data = context.chart.data.datasets[0].data;
            const minTemp = Math.min(...data.map((point) => point.y));
            // Asegurar que las líneas de referencia siempre sean visibles
            const parametroMin = parametros?.minimo || -20;
            return Math.min(minTemp < 0 ? Math.floor(minTemp) - 1 : -1, parametroMin - 2);
          },
          suggestedMax: function (context) {
            const data = context.chart.data.datasets[0].data;
            const maxTemp = Math.max(...data.map((point) => point.y));
            // Asegurar que las líneas de referencia siempre sean visibles
            const parametroMax = parametros?.maximo || -15;
            return Math.max(maxTemp > 0 ? Math.ceil(maxTemp) + 1 : 1, parametroMax + 2);
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(100, 116, 139, 0.2)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: function (tooltipItems) {
              const x = tooltipItems[0].parsed.x;
              const dt = typeof x === 'number' ? DateTime.fromMillis(x) : DateTime.fromJSDate(x);
              return dt.setZone("America/Santiago").toFormat("dd/MM/yyyy HH:mm:ss");
            },
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2) + "°C";
              }
              return label;
            },
            afterLabel: function (context) {
              // Mostrar información de umbrales en el tooltip
              if (parametros && context.datasetIndex === 0) {
                const thresholdType = deviceData?.parametros?.type === 'individual'
                  ? 'Umbrales Personalizados'
                  : 'Umbrales Grupales';
                return [
                  '',
                  `${thresholdType}:`,
                  `Mín: ${parametros.minimo || -20}°C`,
                  `Máx: ${parametros.maximo || -15}°C`
                ];
              }
              return [];
            },
          },
        },
        annotation: {
          annotations: {
            // Línea de referencia en 0°C (existente)
            zeroLine: {
              type: "line",
              yMin: 0,
              yMax: 0,
              borderColor: "#7114db",
              borderWidth: 1,
              borderDash: [],
              display: true,
              drawTime: "beforeDatasetsDraw",
            },
            // Línea de referencia para temperatura mínima
            minTempLine: {
              type: "line",
              yMin: parametros?.minimo || -20,
              yMax: parametros?.minimo || -20,
              borderColor: "#FA8072", // Color rojo salmón
              borderWidth: 1,
              borderDash: [5, 5], // Línea discontinua
              display: true,
              drawTime: "beforeDatasetsDraw",
              label: {
                enabled: false,
              },
            },
            // Línea de referencia para temperatura máxima
            maxTempLine: {
              type: "line",
              yMin: parametros?.maximo || -15,
              yMax: parametros?.maximo || -15,
              borderColor: "#FA8072", // Color rojo salmón
              borderWidth: 1,
              borderDash: [5, 5], // Línea discontinua
              display: true,
              drawTime: "beforeDatasetsDraw",
              label: {
                enabled: false,
              },
            },
          },
        },
      },
    };
  };

  /**
   * Calcula el tiempo total que las temperaturas estuvieron por encima de 0°C
   *
   * @param {Array} temperatureData - Array de datos de temperatura
   * @returns {Object} Objeto con minutos y porcentaje
   */
  const calculateTimeAboveZero = (temperatureData) => {
    if (!temperatureData || temperatureData.length === 0) {
      return { minutes: 0, percentage: 0 };
    }

    let totalMinutesAboveZero = 0;

    for (let i = 0; i < temperatureData.length; i++) {
      const currentPoint = temperatureData[i];
      const temperature = parseFloat(currentPoint.external_temperature);

      if (temperature >= 0) {
        let durationMinutes = 0;

        if (i < temperatureData.length - 1) {
          const nextPoint = temperatureData[i + 1];
          const currentTime = typeof currentPoint.timestamp === 'number' ? DateTime.fromMillis(currentPoint.timestamp) : DateTime.fromISO(currentPoint.timestamp);
          const nextTime = typeof nextPoint.timestamp === 'number' ? DateTime.fromMillis(nextPoint.timestamp) : DateTime.fromISO(nextPoint.timestamp);
          durationMinutes = nextTime.diff(currentTime, "minutes").minutes;
        } else {
          const currentTime = typeof currentPoint.timestamp === 'number' ? DateTime.fromMillis(currentPoint.timestamp) : DateTime.fromISO(currentPoint.timestamp);
          const endTime = isCurrentDay()
            ? DateTime.now()
            : DateTime.fromJSDate(selectedDate).endOf("day");
          durationMinutes = endTime.diff(currentTime, "minutes").minutes;
        }

        totalMinutesAboveZero += Math.max(0, durationMinutes);
      }
    }

    const totalDayMinutes = 24 * 60;
    const percentage = Math.round((totalMinutesAboveZero / totalDayMinutes) * 100);

    return {
      minutes: Math.round(totalMinutesAboveZero),
      percentage: percentage,
    };
  };

  /**
   * Verifica si la fecha seleccionada es el día actual
   *
   * @returns {boolean} True si es el día actual
   */
  const isCurrentDay = () => {
    return DateTime.fromJSDate(selectedDate).hasSame(DateTime.now(), "day");
  };

  /**
   * Formatea el texto del tiempo por encima de 0°C
   *
   * @param {Object} timeData - Resultado de calculateTimeAboveZero
   * @returns {string} Texto formateado
   */
  const formatTimeAboveZero = (timeData) => {
    if (timeData.minutes === 0) {
      return "Sin temperaturas positivas";
    }

    return `Tiempo por encima de 0°C: ${timeData.minutes} minutos (${timeData.percentage}%)`;
  };

  /**
   * Calcula el número de ciclos de temperatura
   *
   * @param {Array} temperatureData - Array de datos de temperatura
   * @returns {number} Número de ciclos completos y medios ciclos
   */
  const calculateTemperatureCycles = (temperatureData) => {
    if (!temperatureData || temperatureData.length === 0) {
      return 0;
    }

    let completeCycles = 0;
    let isCurrentlyAbove = false;
    let hasStartedCycle = false;

    // Evaluar cada punto de temperatura
    for (let i = 0; i < temperatureData.length; i++) {
      const currentTemp = parseFloat(temperatureData[i].external_temperature);

      if (currentTemp > 0 && !isCurrentlyAbove) {
        // Temperatura acaba de subir por encima de 0°C
        isCurrentlyAbove = true;
        hasStartedCycle = true;
      } else if (currentTemp < 0 && isCurrentlyAbove && hasStartedCycle) {
        // Temperatura bajó por debajo de 0°C después de haber estado arriba
        // Esto completa un ciclo
        completeCycles += 1;
        isCurrentlyAbove = false;
        hasStartedCycle = false;
      }
    }

    // Verificar si hay un ciclo incompleto al final
    if (isCurrentlyAbove && hasStartedCycle) {
      completeCycles += 0.5; // Medio ciclo porque no completó la bajada
    }

    // Verificar si empezó por encima de 0°C (medio ciclo del día anterior)
    const firstTemp = parseFloat(temperatureData[0].external_temperature);
    if (firstTemp > 0) {
      // Buscar la primera bajada para confirmar medio ciclo inicial
      for (let i = 1; i < temperatureData.length; i++) {
        const temp = parseFloat(temperatureData[i].external_temperature);
        if (temp < 0) {
          completeCycles += 0.5; // Medio ciclo del día anterior
          break;
        }
      }
    }

    return completeCycles;
  };

  /**
   * Formatea la información de temperatura (tiempo y ciclos)
   *
   * @param {Object} timeData - Resultado de calculateTimeAboveZero
   * @param {number} cycles - Número de ciclos
   * @returns {JSX.Element} Elemento JSX con información formateada
   */
  const formatTemperatureInfo = (timeData, cycles) => {
    const timeText =
      timeData.minutes === 0
        ? "Sin temperaturas positivas"
        : `Tiempo por encima de 0°C: ${timeData.minutes} minutos (${timeData.percentage}%)`;

    const cyclesText = `Número de ciclos: ${cycles % 1 === 0 ? cycles : cycles.toFixed(1)
      }`;

    return (
      <div className="space-y-1">
        <div>{timeText}</div>
        <div>{cyclesText}</div>
      </div>
    );
  };

  /**
   * Verifica si una cámara debe mostrar la caja de información
   *
   * @param {number} channelId - ID del canal de la cámara
   * @returns {boolean} True si debe mostrar la caja, false si es Cámara 5
   */
  const shouldShowInfoBox = (channelId) => {
    // Excluir Cámara 5 basado en channel_id
    return channelId !== 92431;
  };

  // Estados de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderV2 title="Temperaturas Cámaras de Frío" />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-12 w-64 mx-auto mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderV2 title="Temperaturas Cámaras de Frío" />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Sin datos
  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderV2 title="Temperaturas Cámaras de Frío" />
        <div className="p-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Temperaturas Cámaras de Frío
            </h1>
            <div className="flex justify-center mb-6">
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="dd-MM-yyyy"
                className={cn(
                  "px-3 py-2 text-base",
                  "border border-gray-300 rounded-md",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  "transition-colors duration-200"
                )}
                locale="es"
                maxDate={today.current}
              />
            </div>
            <Alert>
              <AlertDescription>
                No hay datos disponibles para la fecha seleccionada.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Renderizado principal con datos
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
        <HeaderV2 title="Temperaturas Cámaras de Frío" />
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Premium Header with Animation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Temperaturas Cámaras de Frío
            </h1>
          </motion.div>

          {/* Enhanced Date Picker Section - Floating */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex justify-center mb-8 relative z-20"
          >
            <div className={cn(
              "inline-flex items-center gap-3 px-4 py-2",
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
                dateFormat="dd-MM-yyyy"
                className={cn(
                  "px-3 py-2 text-base",
                  "bg-transparent",
                  "border border-gray-300 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-[#6b9fd4] focus:border-transparent",
                  "transition-all duration-200",
                  "cursor-pointer hover:bg-gray-50/50"
                )}
                locale="es"
                maxDate={today.current}
              />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {data.map((deviceData, index) => {
              if (!deviceData.data || deviceData.data.length === 0) {
                return (
                  <motion.div
                    key={deviceData.channel_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                  >
                    <Card className={cn(
                      "h-full",
                      "bg-white/70 backdrop-blur-sm",
                      "border border-gray-200/50",
                      "shadow-sm hover:shadow-lg",
                      "transition-all duration-300"
                    )}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Cámara de Frío: {deviceData.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Alert>
                          <AlertDescription>
                            No hay datos para esta fecha
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              }

              const validData = deviceData.data
                .map((item) => ({
                  x: item.timestamp,
                  y: item.external_temperature !== null ?
                    Number(item.external_temperature) : null,
                }))
                .filter((point) => point.y !== null);

              const temperatures = validData.map((point) => point.y);
              const maxTemp = Math.max(...temperatures);
              const minTemp = Math.min(...temperatures);
              const lastTemp = temperatures[temperatures.length - 1];
              const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;

              // Enhanced chart data with gradient
              const chartData = {
                datasets: [
                  {
                    label: "Temperatura Sonda",
                    data: validData,
                    fill: true,
                    backgroundColor: (context) => {
                      const ctx = context.chart.ctx;
                      const gradient = ctx.createLinearGradient(0, 0, 0, 250);
                      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
                      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
                      return gradient;
                    },
                    borderColor: 'rgb(6, 182, 212)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: 'rgb(6, 182, 212)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                  },
                ],
              };

              // Usar parámetros específicos para cada gráfico
              const chartOptions = createChartOptions(deviceData.parametros, deviceData);

              const timeData = calculateTimeAboveZero(deviceData.data);
              const cycles = calculateTemperatureCycles(deviceData.data);

              return (
                <motion.div
                  key={deviceData.channel_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.08 }}
                  whileHover={{ y: -12, scale: 1.02 }}
                  className="h-full"
                >
                  <Card className={cn(
                    "h-full flex flex-col",
                    "bg-white/70 backdrop-blur-sm",
                    "border-2 border-gray-300/60",
                    "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
                    "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
                    "transition-all duration-300",
                    "group",
                    "rounded-xl"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg font-semibold text-gray-900">
                              {deviceData.name}
                            </CardTitle>
                            {/* Badge de tipo de umbral - Solo mostrar si existe type */}
                            {deviceData.parametros && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                  >
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "backdrop-blur-sm",
                                        "border-2 transition-all duration-300",
                                        "hover:scale-105 cursor-help",
                                        deviceData.parametros?.type === 'individual'
                                          ? "bg-gradient-to-r from-cyan-50/80 to-blue-50/80 border-cyan-300/60 text-cyan-700"
                                          : "bg-gradient-to-r from-gray-50/80 to-slate-50/80 border-gray-300/60 text-gray-700"
                                      )}
                                    >
                                      {deviceData.parametros?.type === 'individual' ? (
                                        <>
                                          <Settings className="h-3 w-3 mr-1" />
                                          Personalizado
                                        </>
                                      ) : (
                                        <>
                                          <Users className="h-3 w-3 mr-1" />
                                          Grupal
                                        </>
                                      )}
                                    </Badge>
                                  </motion.div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-xs bg-slate-900/95 text-white border-slate-700"
                                >
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {deviceData.parametros?.type === 'individual'
                                        ? "Umbrales Personalizados"
                                        : "Umbrales Grupales"
                                      }
                                    </p>
                                    <p className="text-xs text-gray-300">
                                      {deviceData.parametros?.type === 'individual'
                                        ? "Esta cámara usa umbrales personalizados configurados específicamente para ella."
                                        : `Esta cámara comparte umbrales con otras cámaras del mismo grupo.`
                                      }
                                    </p>
                                    <div className="pt-1 mt-1 border-t border-slate-700/50">
                                      <p className="text-xs">
                                        <span className="text-gray-400">Mínimo:</span> {deviceData.parametros?.minimo || -20}°C
                                      </p>
                                      <p className="text-xs">
                                        <span className="text-gray-400">Máximo:</span> {deviceData.parametros?.maximo || -15}°C
                                      </p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-2",
                              "bg-gradient-to-r from-cyan-50 to-blue-50",
                              "border-cyan-200/50 text-cyan-700"
                            )}
                          >
                            <Thermometer className="h-3 w-3 mr-1" />
                            {lastTemp.toFixed(1)}°C actual
                          </Badge>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {/* Botón de gestión de umbrales */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-8 p-0",
                                    "bg-gradient-to-br from-gray-50/50 to-blue-50/30",
                                    "hover:from-blue-100/60 hover:to-cyan-100/40",
                                    "border border-gray-200/50",
                                    "transition-all duration-200",
                                    "group/settings"
                                  )}
                                  onClick={() => {
                                    window.location.href = `/threshold-management?camera=${deviceData.channel_id}`;
                                  }}
                                >
                                  <Settings className="h-4 w-4 text-gray-600 group-hover/settings:text-blue-600 group-hover/settings:rotate-45 transition-all duration-300" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p>Gestionar umbrales</p>
                              </TooltipContent>
                            </Tooltip>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {(() => { const t = deviceData.data[deviceData.data.length - 1]?.timestamp; return t ? (typeof t === 'number' ? DateTime.fromMillis(t) : DateTime.fromISO(t)).setZone("America/Santiago").toFormat("HH:mm") : '--'; })()}
                          </div>
                        </div>
                      </div>

                      {/* Temperature Stats Bar */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="h-3 w-3 text-red-500" />
                            <span className="text-xs font-semibold text-red-600">
                              {maxTemp.toFixed(1)}°C
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Máx</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Activity className="h-3 w-3 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-600">
                              {avgTemp.toFixed(1)}°C
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Prom</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingDown className="h-3 w-3 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-600">
                              {minTemp.toFixed(1)}°C
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Mín</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-grow flex flex-col">
                      {/* Enhanced Chart Container */}
                      <div className={cn(
                        "relative h-64 mb-4 p-3",
                        "bg-gradient-to-br from-gray-50/50 to-blue-50/30",
                        "rounded-xl border border-gray-200/30"
                      )}>
                        <Line data={chartData} options={chartOptions} />
                      </div>

                      {/* Enhanced Download Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={() =>
                            handleDownload(deviceData.channel_id, deviceData.name)
                          }
                          className={cn(
                            "w-full",
                            "bg-gradient-to-r from-[#6b9fd4] to-[#5b8fc4]",
                            "hover:from-[#5b8fc4] hover:to-[#4b7fb4]",
                            "text-white font-medium",
                            "shadow-sm hover:shadow-md",
                            "transition-all duration-200"
                          )}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar CSV
                        </Button>
                      </motion.div>

                      {/* Enhanced Info Box - only show if not Cámara 5 */}
                      {shouldShowInfoBox(deviceData.channel_id) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className={cn(
                            "mt-4 p-4",
                            "bg-gradient-to-br from-blue-50/50 to-cyan-50/30",
                            "border border-blue-200/30 rounded-xl",
                            "transition-all duration-300 hover:shadow-sm"
                          )}
                        >
                          <div className="space-y-2">
                            {/* Time Above Zero */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="text-xs font-medium text-gray-700">
                                  Tiempo &gt; 0°C
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  timeData.minutes > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700"
                                )}
                              >
                                {timeData.minutes > 0
                                  ? `${timeData.minutes} min (${timeData.percentage}%)`
                                  : "Sin exposición"
                                }
                              </Badge>
                            </div>

                            {/* Temperature Cycles */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-cyan-600" />
                                <span className="text-xs font-medium text-gray-700">
                                  Ciclos
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className="bg-cyan-50 border-cyan-200 text-cyan-700"
                              >
                                {cycles % 1 === 0 ? cycles : cycles.toFixed(1)} ciclos
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default TemperaturaCamarasV2;