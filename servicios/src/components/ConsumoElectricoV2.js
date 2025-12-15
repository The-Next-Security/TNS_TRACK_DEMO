/**
 * @fileoverview Componente de Consumo Eléctrico V2 - Migrado a Shadcn/UI con UI Premium
 * @description Visualiza gráficos de consumo eléctrico con selección de fecha
 * Utiliza Chart.js para renderizar gráficos de línea temporales y permite
 * la descarga de datos en formato CSV
 * @version 2.1.0
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { es } from 'date-fns/locale';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Header from './HeaderV2';
import moment from 'moment-timezone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Download,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  Cpu
} from 'lucide-react';

// Componentes Shadcn/UI
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';

// Utilidad para combinar clases
import { cn } from '../lib/utils';

// Configuración de timezone y locale
moment.tz.setDefault('America/Santiago');
registerLocale('es', es);

// Registro de componentes de Chart.js
ChartJS.register(
  TimeScale,
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Colores para dispositivos con gradientes
const DEVICE_COLORS = [
  { primary: '#3b82f6', secondary: '#60a5fa', gradient: 'from-blue-500 to-blue-600' },
  { primary: '#8b5cf6', secondary: '#a78bfa', gradient: 'from-purple-500 to-purple-600' },
  { primary: '#10b981', secondary: '#34d399', gradient: 'from-emerald-500 to-emerald-600' },
  { primary: '#f59e0b', secondary: '#fbbf24', gradient: 'from-amber-500 to-amber-600' },
  { primary: '#ef4444', secondary: '#f87171', gradient: 'from-red-500 to-red-600' },
  { primary: '#06b6d4', secondary: '#22d3ee', gradient: 'from-cyan-500 to-cyan-600' }
];

/**
 * Componente ConsumoElectricoV2
 * @component
 * @description Componente principal para visualizar el consumo eléctrico
 * con gráficos interactivos y capacidad de descarga de datos
 * @returns {JSX.Element} Componente de consumo eléctrico
 */
const ConsumoElectricoV2 = () => {
  /**
   * @typedef {Object} DeviceData
   * @property {string} location - Ubicación del dispositivo
   * @property {Array<{timestamp: string, potencia_kw: number}>} data - Datos de consumo
   */

  /** @type {[Object.<string, DeviceData>, Function]} Estado para almacenar datos de consumo */
  const [data, setData] = useState({});

  /** @type {[boolean, Function]} Estado de carga de datos */
  const [loading, setLoading] = useState(false);

  /** @type {[Date, Function]} Fecha seleccionada - inicializada con fecha actual */
  const [selectedDate, setSelectedDate] = useState(moment().toDate());

  /** @type {[boolean, Function]} Controla la visualización de gráficos */
  const [showCharts, setShowCharts] = useState(false);

  /** @type {[string|null, Function]} Estado para mensajes de error */
  const [error, setError] = useState(null);

  /** @type {React.MutableRefObject<Date>} Referencia a la fecha máxima seleccionable */
  const today = useRef(moment().tz('America/Santiago').endOf('day').toDate());

  /**
   * Effect hook para cargar datos cuando cambia la fecha seleccionada
   */
  useEffect(() => {
    if(selectedDate){
      fetchConsumptionData(selectedDate);
    }
  }, [selectedDate]);

  /**
   * Obtiene los datos de consumo eléctrico del servidor
   * @async
   * @param {Date} date - Fecha para la cual obtener los datos
   * @returns {Promise<void>}
   */
  const fetchConsumptionData = async (date) => {
    setLoading(true);
    setShowCharts(true);
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const response = await axios.get(`/api/devices/consumption/${formattedDate}`);
      setData(response.data.data);
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error fetching electric consumption data:", error);
      setLoading(false);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    }
  };

  /**
   * Maneja el cambio de fecha en el DatePicker
   * @param {Date} date - Nueva fecha seleccionada
   */
  const handleDateChange = (date) => {
    if (moment(date).isSameOrBefore(moment(), 'day')) {
      setSelectedDate(date);
      setLoading(true);
    } else {
      alert("No se puede seleccionar una fecha futura.");
    }
  };

  /**
   * Descarga los datos de consumo en formato CSV
   * @async
   * @param {string} shellyId - ID del dispositivo Shelly
   * @param {string} deviceName - Nombre del dispositivo para el archivo
   * @returns {Promise<void>}
   */
  const handleDownload = async (shellyId, deviceName) => {
    try {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      const response = await axios.get(`/api/devices/download/${shellyId}/${formattedDate}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${deviceName}_consumo_electrico.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error al descargar los datos:", error);
      setError('Error al descargar los datos. Por favor, intente nuevamente.');
    }
  };

  /**
   * Calcula estadísticas de consumo para un dispositivo
   * @param {Array} deviceData - Datos del dispositivo
   * @returns {Object} Estadísticas calculadas
   */
  const calculateStats = (deviceData) => {
    if (!deviceData || deviceData.length === 0) return null;

    const consumos = deviceData.map(item => parseFloat(item.potencia_kw));
    const total = consumos.reduce((a, b) => a + b, 0);
    const max = Math.max(...consumos);
    const min = Math.min(...consumos);
    const avg = total / consumos.length;

    // Calcular consumo total en kWh (asumiendo datos cada 15 minutos)
    const totalKwh = total * 0.25; // 15 minutos = 0.25 horas

    return { total: totalKwh, max, min, avg };
  };

  /**
   * Obtiene el color para un dispositivo basado en su índice
   * @param {number} index - Índice del dispositivo
   * @returns {Object} Objeto con colores del dispositivo
   */
  const getDeviceColor = (index) => {
    return DEVICE_COLORS[index % DEVICE_COLORS.length];
  };

  /**
   * Configuración de opciones para los gráficos de Chart.js con estilo premium
   * @param {Object} color - Objeto con colores del dispositivo
   * @returns {Object} Opciones de configuración para Chart.js
   */
  const createChartOptions = (color) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          stepSize: 2,
          displayFormats: {
            hour: 'HH:mm'
          }
        },
        adapters: {
          date: {
            locale: es,
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
          font: {
            size: 11
          },
          color: '#94a3b8'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Potencia (kW)',
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
          callback: function(value) {
            return value.toFixed(2) + ' kW';
          },
          font: {
            size: 11
          },
          color: '#94a3b8'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(100, 116, 139, 0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(tooltipItems) {
            return moment(tooltipItems[0].parsed.x).format('DD/MM/YYYY HH:mm');
          },
          label: function(context) {
            return `Potencia: ${context.parsed.y.toFixed(3)} kW`;
          }
        }
      }
    }
  });

  // Calcular estadísticas globales
  const calculateGlobalStats = () => {
    if (Object.keys(data).length === 0) return null;

    let totalConsumption = 0;
    let maxConsumption = 0;
    let deviceCount = 0;

    Object.values(data).forEach(device => {
      const stats = calculateStats(device.data);
      if (stats) {
        totalConsumption += stats.total;
        maxConsumption = Math.max(maxConsumption, stats.max);
        deviceCount++;
      }
    });

    return {
      total: totalConsumption,
      max: maxConsumption,
      devices: deviceCount,
      avgPerDevice: deviceCount > 0 ? totalConsumption / deviceCount : 0
    };
  };

  const globalStats = calculateGlobalStats();

  // Renderizado condicional: Estado de carga
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
        <Header title="Consumo Eléctrico" />
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-12 w-96 mx-auto mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Skeleton className="h-96 w-full rounded-xl" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizado condicional: Estado de error
  if (error) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
        <Header title="Consumo Eléctrico" />
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        </div>
      </div>
    );
  }

  // Renderizado principal: Mostrar gráficos con datos
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
      <Header title="Consumo Eléctrico" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Premium Header with Animation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Consumo Eléctrico
            </h1>
            <p className="text-gray-600">Monitoreo de consumo energético por dispositivo</p>
          </motion.div>

          {/* Enhanced Date Picker Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className={cn(
              "inline-flex items-center gap-3 px-4 py-2",
              "bg-white/70 backdrop-blur-sm",
              "border border-gray-200/50",
              "rounded-xl shadow-sm",
              "transition-all duration-300 hover:shadow-md"
            )}>
              <Calendar className="h-5 w-5 text-blue-600" />
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="dd-MM-yyyy"
                className={cn(
                  "px-3 py-2 text-base",
                  "bg-transparent",
                  "border border-gray-300 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  "transition-all duration-200",
                  "cursor-pointer hover:bg-gray-50/50"
                )}
                locale="es"
                maxDate={today.current}
                placeholderText="Seleccione una fecha"
              />
            </div>
          </motion.div>

          {/* Global Statistics Cards */}
          {globalStats && showCharts && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              {/* Total Consumption */}
              <div className={cn(
                "bg-white/70 backdrop-blur-sm",
                "border border-gray-200/50",
                "rounded-xl p-4",
                "shadow-sm hover:shadow-md",
                "transition-all duration-300"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Consumo Total</p>
                    <p className="text-lg font-bold text-gray-900">
                      {globalStats.total.toFixed(2)} kWh
                    </p>
                  </div>
                </div>
              </div>

              {/* Peak Power */}
              <div className={cn(
                "bg-white/70 backdrop-blur-sm",
                "border border-gray-200/50",
                "rounded-xl p-4",
                "shadow-sm hover:shadow-md",
                "transition-all duration-300"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Potencia Máxima</p>
                    <p className="text-lg font-bold text-gray-900">
                      {globalStats.max.toFixed(2)} kW
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Devices */}
              <div className={cn(
                "bg-white/70 backdrop-blur-sm",
                "border border-gray-200/50",
                "rounded-xl p-4",
                "shadow-sm hover:shadow-md",
                "transition-all duration-300"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Cpu className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Dispositivos</p>
                    <p className="text-lg font-bold text-gray-900">{globalStats.devices}</p>
                  </div>
                </div>
              </div>

              {/* Average per Device */}
              <div className={cn(
                "bg-white/70 backdrop-blur-sm",
                "border border-gray-200/50",
                "rounded-xl p-4",
                "shadow-sm hover:shadow-md",
                "transition-all duration-300"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Promedio/Disp.</p>
                    <p className="text-lg font-bold text-gray-900">
                      {globalStats.avgPerDevice.toFixed(2)} kWh
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* No Data Alert */}
          {showCharts && Object.keys(data).length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              <Alert className="border-amber-200/50 bg-amber-50/50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  No hay datos disponibles para la fecha seleccionada.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Device Charts Grid */}
          {showCharts && Object.keys(data).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {Object.entries(data).map(([shellyId, deviceData], index) => {
                  const color = getDeviceColor(index);
                  const stats = calculateStats(deviceData.data);

                  const chartData = {
                    labels: deviceData.data.map(item => moment(item.timestamp).toDate()),
                    datasets: [
                      {
                        label: 'Potencia',
                        data: deviceData.data.map(item => ({
                          x: moment(item.timestamp).toDate(),
                          y: parseFloat(item.potencia_kw)
                        })),
                        backgroundColor: (context) => {
                          const ctx = context.chart.ctx;
                          const gradient = ctx.createLinearGradient(0, 0, 0, 250);
                          gradient.addColorStop(0, color.primary + '33');
                          gradient.addColorStop(1, color.primary + '05');
                          return gradient;
                        },
                        borderColor: color.primary,
                        borderWidth: 2,
                        fill: true,
                        tension: 0,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointBackgroundColor: color.primary,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                      }
                    ]
                  };

                  return (
                    <motion.div
                      key={shellyId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.08 }}
                      whileHover={{ y: -4 }}
                      className="h-full"
                    >
                      <Card className={cn(
                        "h-full flex flex-col",
                        "bg-white/70 backdrop-blur-sm",
                        "border border-gray-200/50",
                        "shadow-sm hover:shadow-xl",
                        "transition-all duration-300",
                        "group"
                      )}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg font-semibold text-gray-900">
                                {deviceData.location}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "mt-2",
                                  `bg-gradient-to-r ${color.gradient}`,
                                  "text-white border-none"
                                )}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                {stats?.avg.toFixed(2)} kW promedio
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                Último: {moment(deviceData.data[deviceData.data.length - 1]?.timestamp).format("HH:mm")}
                              </div>
                            </div>
                          </div>

                          {/* Device Stats Bar */}
                          {stats && (
                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-red-500" />
                                  <span className="text-xs font-semibold text-red-600">
                                    {stats.max.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">Máx kW</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Activity className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs font-semibold text-gray-600">
                                    {stats.total.toFixed(1)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">Total kWh</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <TrendingDown className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs font-semibold text-blue-600">
                                    {stats.min.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">Mín kW</p>
                              </div>
                            </div>
                          )}
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col">
                          {/* Enhanced Chart Container */}
                          <div className={cn(
                            "relative h-64 mb-4 p-3",
                            "bg-gradient-to-br from-gray-50/50 to-blue-50/30",
                            "rounded-xl border border-gray-200/30"
                          )}>
                            <Bar data={chartData} options={createChartOptions(color)} />
                          </div>

                          {/* Enhanced Download Button */}
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              onClick={() => handleDownload(shellyId, deviceData.location)}
                              className={cn(
                                "w-full",
                                `bg-gradient-to-r ${color.gradient}`,
                                "hover:opacity-90",
                                "text-white font-medium",
                                "shadow-sm hover:shadow-md",
                                "transition-all duration-200"
                              )}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar CSV
                            </Button>
                          </motion.div>

                          {/* Energy Cost Estimation */}
                          {stats && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className={cn(
                                "mt-4 p-3",
                                "bg-gradient-to-br from-green-50/50 to-emerald-50/30",
                                "border border-green-200/30 rounded-xl",
                                "text-center"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">
                                  Costo estimado
                                </span>
                                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                                  ${(stats.total * 120).toFixed(0)} CLP
                                </Badge>
                              </div>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsumoElectricoV2;