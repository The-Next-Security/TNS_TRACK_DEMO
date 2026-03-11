/**
 * @fileoverview IntelligenciaDatosTemperaturaV2 - Componente migrado a Shadcn/UI v2.0
 *
 * @description
 * Componente para la visualización y análisis de datos de temperatura de sondas externas.
 * Permite seleccionar dispositivos, rangos de fechas y visualizar gráficos de temperatura.
 * Incluye funcionalidad de exportación de datos a CSV.
 *
 * @requires react
 * @requires axios
 * @requires react-chartjs-2
 * @requires chart.js
 * @requires react-datepicker
 * @requires luxon
 *
 * @author Sistema de Monitoreo TNS
 * @version 2.0.0
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "chartjs-adapter-luxon";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { DateTime } from "luxon";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Activity, Download, BarChart3, Thermometer } from "lucide-react";

// Shadcn UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Components
import HeaderV2 from "./Header_View";

// Registrar locale en español
registerLocale("es", es);

// Constantes de configuración
const today = new Date();
const minDate = new Date();
minDate.setDate(minDate.getDate() - 45);

// Registrar componentes de Chart.js
ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Colores para las líneas del gráfico
const LINE_COLORS = [
  "rgba(75,192,192,1)",
  "rgba(255,99,132,1)",
  "rgba(54, 162, 235, 1)",
  "rgba(255, 206, 86, 1)",
  "rgba(153, 102, 255, 1)",
  "rgba(255, 159, 64, 1)",
];

/**
 * IntelligenciaDatosTemperaturaV2 Component
 *
 * @component
 * @returns {JSX.Element} Componente de inteligencia de datos de temperatura
 */
const IntelligenciaDatosTemperaturaV2 = () => {
  // Estados del componente
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");

  /**
   * Efecto para cargar dispositivos al montar el componente
   */
  useEffect(() => {
    fetchDevices();
  }, []);

  /**
   * Obtiene la lista de dispositivos disponibles desde la API
   *
   * @async
   * @function fetchDevices
   */
  const fetchDevices = async () => {
    try {
      const response = await axios.get("/api/ubibot/temperature-devices");
      setDevices(response.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
      setError(
        "Error al cargar los dispositivos. Por favor, intente nuevamente."
      );
    }
  };

  /**
   * Calcula la diferencia en días entre dos fechas
   *
   * @function getDaysDifference
   * @param {Date} date1 - Primera fecha
   * @param {Date} date2 - Segunda fecha
   * @returns {number} Diferencia en días
   */
  const getDaysDifference = (date1, date2) => {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Obtiene datos de temperatura para el rango de fechas seleccionado
   *
   * @async
   * @function fetchTemperatureData
   */
  const fetchTemperatureData = async () => {
    if (!startDate || !endDate || !selectedDevice) {
      setError("Por favor, seleccione un dispositivo y un rango de fechas.");
      return;
    }

    const today = new Date();
    if (startDate > today || endDate > today) {
      setError("No se pueden seleccionar fechas futuras.");
      return;
    }

    // Validación de 45 días
    const daysDifference = getDaysDifference(startDate, endDate);
    if (daysDifference > 45) {
      setError(
        "Si desea datos de mas de 45 días de antigüedad, contacte a The Next Security"
      );
      return;
    }

    // Validar que la fecha de inicio no sea más antigua que 45 días desde hoy
    const daysFromToday = getDaysDifference(startDate, today);
    if (daysFromToday > 45) {
      setError(
        "Si desea datos de mas de 45 días de antigüedad, contacte a The Next Security"
      );
      return;
    }

    try {
      setLoading(true);
      const startFormatted = DateTime.fromJSDate(startDate).toFormat("yyyy-MM-dd");
      const endFormatted = DateTime.fromJSDate(endDate).toFormat("yyyy-MM-dd");
      console.log(
        "Fetching data for dates:",
        startFormatted,
        endFormatted,
        "and device:",
        selectedDevice
      );
      const response = await axios.get("/api/ubibot/temperature-range-data", {
        params: {
          startDate: startFormatted,
          endDate: endFormatted,
          deviceId: selectedDevice,
        },
      });
      console.log("Datos recibidos:", response.data);
      const device = devices.find(
        (device) => device.channel_id == selectedDevice
      );
      setData([
        {
          channel_id: selectedDevice,
          name: device?.name,
          data: response.data.map((item) => ({
            timestamp: item.timestamp,
            external_temperature: item.external_temperature,
          })),
        },
      ]);
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error fetching temperature data:", error);
      setLoading(false);
      setError("Error al cargar los datos. Por favor, intente nuevamente.");
    }
  };

  /**
   * Maneja el cambio de fecha de inicio
   *
   * @function handleStartDateChange
   * @param {Date} date - Nueva fecha de inicio
   */
  const handleStartDateChange = (date) => {
    setStartDate(date);
  };

  /**
   * Maneja el cambio de fecha de fin
   *
   * @function handleEndDateChange
   * @param {Date} date - Nueva fecha de fin
   */
  const handleEndDateChange = (date) => {
    setEndDate(date);
  };

  /**
   * Maneja el cambio de dispositivo seleccionado
   *
   * @function handleDeviceChange
   * @param {string} value - ID del dispositivo seleccionado
   */
  const handleDeviceChange = (value) => {
    setSelectedDevice(value);
  };

  /**
   * Genera contenido CSV para exportación de datos
   *
   * @function generateCSV
   * @param {Object} deviceData - Datos del dispositivo a exportar
   * @returns {string} Contenido CSV formateado
   */
  const generateCSV = (deviceData) => {
    const headers = "Device Name;Fecha;Hora;External Temperature\n";
    const rows = deviceData?.data
      ?.map((item) => {
        // Convertir el timestamp a los formatos requeridos
        const date = new Date(item?.timestamp);

        // Formato fecha: dd-mm-aa
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = String(date.getFullYear()).slice(-2);
        const formattedDate = `${day}-${month}-${year}`;

        // Formato hora: HH:MM
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const formattedTime = `${hours}:${minutes}`;

        // Convertir el separador decimal de punto a coma
        const temperature = item?.external_temperature
          ?.toString()
          .replace(".", ",");

        return `"${deviceData?.name}";${formattedDate};${formattedTime};${temperature}`;
      })
      .join("\n");

    return headers + rows;
  };

  /**
   * Maneja la descarga del archivo CSV con datos de temperatura
   *
   * @function handleDownload
   * @param {string} channelId - ID del canal del dispositivo
   * @param {string} deviceName - Nombre del dispositivo
   */
  const handleDownload = (channelId, deviceName) => {
    const deviceData = data?.find((item) => item?.channel_id === channelId);
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
   * Configuración de opciones para el gráfico de Chart.js
   */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 15,
        left: 10,
        right: 10
      }
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "hour",
          stepSize: 3,
          displayFormats: {
            hour: "dd/MM/yyyy HH:mm",
          },
        },
        adapters: {
          date: {
            locale: 'es',
          },
        },
        title: {
          display: true,
          text: "Fecha y Hora",
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        title: {
          display: true,
          text: "Temperatura Sonda (°C)",
        },
        ticks: {
          callback: function (value) {
            return value.toFixed(1);
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "top",
        padding: 5
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          title: function (tooltipItems) {
            const x = tooltipItems[0].parsed.x;
            const dt = typeof x === 'number' ? DateTime.fromMillis(x) : DateTime.fromJSDate(x);
            return dt.setZone('America/Santiago').toFormat("dd/MM/yyyy HH:mm:ss");
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
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20">
      <HeaderV2 title="Inteligencia de Datos de Temperatura" />

      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Título Premium - Estilo ConsumoTotalDiarioV2 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Inteligencia de Datos de Temperatura
            </h1>
          </motion.div>

        <Card className="shadow-lg">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Análisis de Temperatura
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 bg-white">
            {/* Controles de filtrado - Estilo Premium ConsumoTotalDiarioV2 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex justify-center mb-8 relative z-20"
            >
              <div className="flex flex-col md:flex-row items-center gap-4">
                {/* Selector de dispositivo - Estilo Premium */}
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
                    <Select value={selectedDevice} onValueChange={handleDeviceChange}>
                      <SelectTrigger className="border-0 bg-transparent focus:ring-0 focus:ring-offset-0 h-auto p-0">
                        <SelectValue placeholder="Seleccione un dispositivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((device) => (
                          <SelectItem
                            key={device.channel_id}
                            value={device.channel_id.toString()}
                          >
                            {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Picker Inicio - Estilo Premium */}
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
                    selected={startDate}
                    onChange={handleStartDateChange}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="Fecha de inicio"
                    className={cn(
                      "px-3 py-2 text-base",
                      "bg-transparent",
                      "border border-gray-300 rounded-lg",
                      "focus:outline-none focus:ring-2 focus:ring-[#6b9fd4] focus:border-transparent",
                      "transition-all duration-200",
                      "cursor-pointer hover:bg-gray-50/50"
                    )}
                    locale="es"
                    maxDate={new Date()}
                    minDate={minDate}
                  />
                </div>

                {/* Date Picker Fin - Estilo Premium */}
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
                    selected={endDate}
                    onChange={handleEndDateChange}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    maxDate={new Date()}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="Fecha de fin"
                    className={cn(
                      "px-3 py-2 text-base",
                      "bg-transparent",
                      "border border-gray-300 rounded-lg",
                      "focus:outline-none focus:ring-2 focus:ring-[#6b9fd4] focus:border-transparent",
                      "transition-all duration-200",
                      "cursor-pointer hover:bg-gray-50/50"
                    )}
                    locale="es"
                  />
                </div>
              </div>
            </motion.div>

            {/* Botón de búsqueda */}
            <div className="flex justify-center mb-6">
              <Button
                onClick={fetchTemperatureData}
                className="w-full max-w-sm bg-blue-500 hover:bg-blue-600"
                size="default"
              >
                Buscar Datos
              </Button>
            </div>

            {/* Mensajes de error */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Estado de carga */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full max-w-4xl" />
                <div className="text-gray-600">Cargando datos...</div>
              </div>
            )}

            {/* Visualización de gráficos - Estilo Premium */}
            {!loading && data && data.length > 0 && (
              <AnimatePresence mode="wait">
                <div className="grid gap-6 mt-8">
                  {data?.map((deviceData, index) => {
                    const chartData = {
                      labels: deviceData?.data?.map(
                        (item) => new Date(item?.timestamp)
                      ),
                      datasets: [
                        {
                          label: deviceData?.name,
                          data: deviceData?.data?.map((item) => ({
                            x: new Date(item?.timestamp),
                            y: item?.external_temperature,
                          })),
                          fill: false,
                          borderColor: LINE_COLORS[index % LINE_COLORS.length],
                          backgroundColor: LINE_COLORS[index % LINE_COLORS.length],
                          tension: 0.4,
                          borderWidth: 3,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                          pointBackgroundColor: LINE_COLORS[index % LINE_COLORS.length],
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: LINE_COLORS[index % LINE_COLORS.length],
                          pointHoverBorderWidth: 3,
                        },
                      ],
                    };

                    return (
                      <motion.div
                        key={deviceData?.channel_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
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
                                <Thermometer className="h-5 w-5 text-blue-600" />
                              </div>
                              Cámara de Frío:{" "}
                              <span
                                className="bg-gradient-to-r bg-clip-text text-transparent"
                                style={{
                                  backgroundImage: `linear-gradient(to right, ${LINE_COLORS[index % LINE_COLORS.length]}, ${LINE_COLORS[index % LINE_COLORS.length]}dd)`
                                }}
                              >
                                {deviceData?.name}
                              </span>
                            </CardTitle>

                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() =>
                                  handleDownload(deviceData?.channel_id, deviceData?.name)
                                }
                                className={cn(
                                  "bg-gradient-to-r from-green-600 to-emerald-600",
                                  "hover:from-green-700 hover:to-emerald-700",
                                  "text-white shadow-md hover:shadow-lg",
                                  "transition-all duration-200",
                                  "font-semibold"
                                )}
                                size="sm"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Exportar CSV
                              </Button>
                            </motion.div>
                          </CardHeader>

                          <CardContent className="px-6 pb-6">
                            <div className={cn(
                              "relative",
                              "p-3 md:p-6 rounded-xl",
                              "bg-gradient-to-br from-gray-50/60 to-blue-50/30",
                              "border border-gray-200/40"
                            )}>
                              <div className="h-[500px] relative w-full">
                                <Line data={chartData} options={chartOptions} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default IntelligenciaDatosTemperaturaV2;