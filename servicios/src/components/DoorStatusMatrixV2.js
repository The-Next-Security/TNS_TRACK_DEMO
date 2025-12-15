/**
 * DoorStatusMatrixV2.js - Migrado a Shadcn/UI v2.0
 *
 * Componente de matriz de estado de puertas por Reefer con visualización
 * en tiempo real, gráficos interactivos y gestión de temperatura.
 *
 * @module DoorStatusMatrixV2
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
} from "recharts";
import "react-datepicker/dist/react-datepicker.css";
import dayjs from "dayjs";

// Componentes Shadcn/UI
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import HeaderV2 from "./HeaderV2";

/**
 * Componente principal de matriz de estado de puertas
 *
 * @component
 * @returns {JSX.Element} Interfaz de visualización de estado de puertas
 */
const DoorStatusMatrixV2 = () => {
  // ============================================
  // Estado del Componente
  // ============================================

  /** @type {[Array, Function]} Datos de estado de puertas */
  const [data, setData] = useState([]);

  /** @type {[Array, Function]} Lista de sectores disponibles */
  const [sectors, setSectors] = useState([]);

  /** @type {[Date, Function]} Fecha seleccionada para visualización */
  const [selectedDate, setSelectedDate] = useState(new Date());

  /** @type {[Array, Function]} Datos para el gráfico de torta */
  const [pieChartData, setPieChartData] = useState([]);

  /** @type {[Array, Function]} Datos para el gráfico de línea */
  const [lineChartData, setLineChartData] = useState([]);

  /** @type {[string|null, Function]} Sector actualmente seleccionado */
  const [selectedSector, setSelectedSector] = useState(null);

  /** @type {[Object, Function]} Intervalo de tiempo seleccionado */
  const [selectedInterval, setSelectedInterval] = useState({
    start: dayjs().set("hour", 8).set("minute", 0),
    end: dayjs().set("hour", 9).set("minute", 0),
  });

  /** @type {[Object, Function]} Datos de temperatura por sector */
  const [temperatureData, setTemperatureData] = useState({});

  // ============================================
  // Constantes de Colores
  // ============================================

  const LINE_COLOR = "#8A2BE2"; // Violeta para la línea del gráfico
  const DOOR_OPEN_COLOR = "#af4c4f"; // Rojo para puerta abierta
  const DOOR_CLOSED_COLOR = "#26b43bcf"; // Verde para puerta cerrada
  const COLORS = [DOOR_OPEN_COLOR, DOOR_CLOSED_COLOR];

  // ============================================
  // Effects - Ciclo de Vida
  // ============================================

  /**
   * Effect: Actualizar datos cuando cambia la fecha seleccionada
   */
  useEffect(() => {
    fetchDataForSelectedDate(selectedDate);
    fetchTemperatureData(selectedDate);
  }, [selectedDate]);

  /**
   * Effect: Actualizar gráfico de línea cuando cambian los parámetros
   */
  useEffect(() => {
    if (data.length > 0 && selectedSector) {
      const startDate = dayjs(selectedDate)
        .set("hour", selectedInterval.start.hour())
        .set("minute", selectedInterval.start.minute());
      const endDate = dayjs(selectedDate)
        .set("hour", selectedInterval.end.hour())
        .set("minute", selectedInterval.end.minute());
      processLineChartData(data, startDate, endDate);
    }
  }, [selectedInterval, data, selectedDate, selectedSector]);

  // ============================================
  // Funciones de Obtención de Datos
  // ============================================

  /**
   * Obtiene datos de temperatura para el rango de fecha seleccionado
   *
   * @async
   * @param {Date} date - Fecha para obtener datos
   * @returns {Promise<void>}
   */
  const fetchTemperatureData = async (date) => {
    const startDate = dayjs(date).startOf("day").format("YYYY-MM-DD");
    const endDate = dayjs(date).endOf("day").format("YYYY-MM-DD");

    try {
      const response = await axios.get("/api/ubibot/temperature-range-data", {
        params: { startDate, endDate },
      });

      // Organizar los datos por sector y timestamp
      const tempsByTime = {};
      response.data.forEach((device) => {
        if (!tempsByTime[device.name]) {
          tempsByTime[device.name] = [];
        }
        device.data.forEach((reading) => {
          tempsByTime[device.name].push({
            timestamp: dayjs(reading.timestamp),
            temperature: reading.external_temperature,
          });
        });
        // Ordenar las lecturas por timestamp
        tempsByTime[device.name].sort(
          (a, b) => a.timestamp.valueOf() - b.timestamp.valueOf()
        );
      });

      setTemperatureData(tempsByTime);
    } catch (error) {
      console.error("Error fetching temperature data:", error);
    }
  };

  /**
   * Encuentra la temperatura más cercana para un sector y tiempo específicos
   *
   * @param {string} sector - Nombre del sector
   * @param {number} hour - Hora del día
   * @param {number} endMinute - Minuto final del intervalo
   * @returns {number|null} Temperatura encontrada o null
   */
  const findClosestTemperature = (sector, hour, endMinute) => {
    if (!temperatureData[sector] || temperatureData[sector].length === 0) {
      return null;
    }

    const targetTime = dayjs(selectedDate).hour(hour).minute(endMinute);

    // Encontrar la lectura más cercana al final del intervalo de 10 minutos
    let closestReading = temperatureData[sector].reduce((closest, current) => {
      const currentDiff = Math.abs(
        current.timestamp.valueOf() - targetTime.valueOf()
      );
      const closestDiff = Math.abs(
        closest.timestamp.valueOf() - targetTime.valueOf()
      );
      return currentDiff < closestDiff ? current : closest;
    });

    // Si la diferencia es mayor a 30 minutos, retornar null
    const diffInMinutes = Math.abs(
      closestReading.timestamp.diff(targetTime, "minute")
    );
    if (diffInMinutes > 30) {
      return null;
    }

    return closestReading.temperature;
  };

  /**
   * Obtiene datos de estado de puertas para la fecha seleccionada
   *
   * @async
   * @param {Date} date - Fecha para obtener datos
   * @returns {Promise<void>}
   */
  const fetchDataForSelectedDate = async (date) => {
    const startDate = dayjs(date).startOf("day").format("YYYY-MM-DD HH:mm:ss");
    const endDate = dayjs(date).endOf("day").format("YYYY-MM-DD HH:mm:ss");

    try {
      const response = await axios.get("/api/beacons/door-status", {
        params: { startDate, endDate },
      });
      const fetchedData = response.data;
      console.log("Fetched data:", fetchedData);

      const uniqueSectors = [
        ...new Set(fetchedData.map((item) => item.sector)),
      ];
      setSectors(uniqueSectors);
      if (!selectedSector && uniqueSectors.length > 0) {
        setSelectedSector(uniqueSectors[0]);
      }
      setData(fetchedData);

      processChartData(fetchedData);
      setSelectedInterval({
        start: dayjs(date).set("hour", 8).set("minute", 0),
        end: dayjs(date).set("hour", 8).set("minute", 30),
      });
    } catch (error) {
      console.error("Error fetching door status:", error);
    }
  };

  // ============================================
  // Procesamiento de Datos para Gráficos
  // ============================================

  /**
   * Procesa datos para el gráfico de torta
   *
   * @param {Array} fetchedData - Datos obtenidos del servidor
   */
  const processChartData = (fetchedData) => {
    const openCount = fetchedData.filter((d) => d.magnet_status === 0).length;
    const closedCount = fetchedData.filter((d) => d.magnet_status === 1).length;
    const total = openCount + closedCount;
    setPieChartData([
      {
        name: "Abierto",
        value: openCount,
        percentage: ((openCount / total) * 100).toFixed(2),
      },
      {
        name: "Cerrado",
        value: closedCount,
        percentage: ((closedCount / total) * 100).toFixed(2),
      },
    ]);
  };

  /**
   * Procesa datos para el gráfico de línea temporal
   *
   * @param {Array} fetchedData - Datos obtenidos
   * @param {dayjs.Dayjs} startDate - Fecha de inicio
   * @param {dayjs.Dayjs} endDate - Fecha de fin
   */
  const processLineChartData = (fetchedData, startDate, endDate) => {
    const chartData = [];
    let currentTime = dayjs(startDate);
    const endTime = dayjs(endDate);

    const relevantData = fetchedData
      .filter(
        (d) =>
          d.sector === selectedSector &&
          dayjs(d.timestamp).isAfter(startDate) &&
          dayjs(d.timestamp).isBefore(endTime)
      )
      .sort(
        (a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf()
      );

    if (relevantData.length === 0) {
      setLineChartData([]);
      return;
    }

    let lastValidStatus = relevantData[0].magnet_status;
    let potentialChangeStart = null;
    let currentStatus = lastValidStatus;

    while (currentTime.isBefore(endTime) || currentTime.isSame(endTime)) {
      const currentTimeStr = currentTime.format("HH:mm");
      const entriesAtThisTime = relevantData.filter(
        (d) => dayjs(d.timestamp).format("HH:mm") === currentTimeStr
      );

      if (entriesAtThisTime.length > 0) {
        const newStatus =
          entriesAtThisTime[entriesAtThisTime.length - 1].magnet_status;

        if (newStatus !== currentStatus) {
          if (!potentialChangeStart) {
            potentialChangeStart = currentTime;
          } else if (currentTime.diff(potentialChangeStart, "minute") >= 2) {
            lastValidStatus = newStatus;
            currentStatus = newStatus;
            potentialChangeStart = null;
          }
        } else {
          potentialChangeStart = null;
        }
      }

      chartData.push({
        time: currentTimeStr,
        status: currentStatus === 0 ? 2 : 1,
      });

      currentTime = currentTime.add(1, "minute");
    }

    setLineChartData(chartData);
  };

  // ============================================
  // Manejadores de Eventos
  // ============================================

  /**
   * Maneja el cambio de fecha en el DatePicker
   *
   * @param {Date} date - Nueva fecha seleccionada
   */
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  /**
   * Maneja el click en una celda de la matriz
   *
   * @param {number} hour - Hora seleccionada
   * @param {number} minute - Minuto de inicio
   * @param {string} sector - Sector seleccionado
   */
  const handleCellClick = (hour, minute, sector) => {
    const start = dayjs(selectedDate).set("hour", hour).set("minute", minute);
    const end = start.add(10, "minute");
    setSelectedInterval({ start, end });
    setSelectedSector(sector);
  };

  /**
   * Obtiene la clase CSS según el estado de la puerta
   *
   * @param {number} status - Estado de la puerta (0: abierto, 1: cerrado)
   * @returns {string} Clases de Tailwind correspondientes
   */
  const getColorClass = (status) => {
    return status === 1
      ? "bg-green-500/80 text-white"
      : "bg-red-600/80 text-white";
  };

  // ============================================
  // Renderizado de la Matriz
  // ============================================

  /**
   * Crea la matriz de visualización de estados por sector y tiempo
   *
   * @returns {JSX.Element[]} Array de filas de la tabla
   */
  const createMatrix = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minuteRanges = ["10:00", "00:20", "00:30", "00:40", "00:50", "00:59"];

    return sectors.map((sector) => {
      const sectorData = data.filter((d) => d.sector === sector);
      return (
        <tr key={sector} className="border-b">
          <td className="border-r bg-blue-50 font-medium px-4 py-2 text-center">
            {sector}
          </td>
          <td className="border-r p-0">
            <table className="w-full h-full border-collapse">
              <tbody>
                {minuteRanges.map((range, index) => (
                  <tr key={index}>
                    <td className="text-xs text-gray-600 px-2 py-1 text-center border-b last:border-b-0">
                      {range}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
          {hours.map((hour) => (
            <td key={hour} className="border-r p-0">
              <table className="w-full h-full border-collapse">
                <tbody>
                  {minuteRanges.map((_, minuteIndex) => {
                    const startMinute = minuteIndex * 10;
                    const endMinute = startMinute + 10;
                    const trameData = sectorData.filter((d) => {
                      const entryTime = dayjs(d.timestamp);
                      return (
                        entryTime.hour() === hour &&
                        entryTime.minute() >= startMinute &&
                        entryTime.minute() < endMinute
                      );
                    });
                    const lastEntry =
                      trameData.length > 0
                        ? trameData.reduce((prev, current) =>
                            dayjs(current.timestamp).isAfter(
                              dayjs(prev.timestamp)
                            )
                              ? current
                              : prev
                          )
                        : null;

                    // Obtener la temperatura más cercana al final del intervalo
                    const temperature = findClosestTemperature(
                      sector,
                      hour,
                      endMinute
                    );

                    return (
                      <tr key={minuteIndex}>
                        <td
                          className={cn(
                            "h-10 w-full cursor-pointer text-center",
                            "border-b last:border-b-0",
                            "transition-all duration-200",
                            "hover:opacity-80 hover:scale-105",
                            lastEntry && getColorClass(lastEntry.magnet_status)
                          )}
                          onClick={() =>
                            handleCellClick(hour, startMinute, sector)
                          }
                        >
                          {lastEntry && (
                            <div className="text-sm font-medium">
                              {temperature !== null
                                ? Math.round(temperature)
                                : "--"}
                              °C
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </td>
          ))}
        </tr>
      );
    });
  };

  const matrix = createMatrix();

  // ============================================
  // Renderizado Principal
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderV2 title="Estado de Puertas por Reefer" />

      <div className="container mx-auto px-4 py-6">
        {/* Título y Subtítulo */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Estado de Puertas por Reefer
          </h1>
          <p className="text-gray-600">
            al término de cada tramo de tiempo
          </p>
        </div>

        {/* Controles */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              {/* Date Picker */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Fecha:
                </label>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  dateFormat="yyyy-MM-dd"
                  className={cn(
                    "px-3 py-2 border rounded-md",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
              </div>

              {/* Leyendas */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-600/80 rounded"></div>
                  <span className="text-sm text-gray-700">Puerta Abierta</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500/80 rounded"></div>
                  <span className="text-sm text-gray-700">Puerta Cerrada</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matriz de Estados */}
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-blue-500 text-white">
                    <th className="border px-4 py-3 text-sm font-semibold w-32">
                      Sector
                    </th>
                    <th className="border px-4 py-3 text-sm font-semibold w-24">
                      Minutos hasta
                    </th>
                    {Array.from({ length: 24 }, (_, i) => (
                      <th key={i} className="border px-2 py-3 text-sm font-semibold w-12">
                        {`${i.toString().padStart(2, "0")}:00`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{matrix}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Torta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Resumen de Estados</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <PieChart width={400} height={300}>
                <Pie
                  data={pieChartData}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </CardContent>
          </Card>

          {/* Gráfico de Línea */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Estado de la Puerta del Tramo de Tiempo
              </CardTitle>
              <p className="text-center text-sm text-gray-600 mt-2">
                Escoja tramo en la matriz
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={lineChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="time"
                    interval="preserveStartEnd"
                    tick={{ fill: "#666", fontSize: 12 }}
                    axisLine={{ stroke: "#666" }}
                    tickLine={{ stroke: "#666" }}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      value === 2 ? "Abierto" : value === 1 ? "Cerrado" : ""
                    }
                    domain={[0.5, 2.5]}
                    ticks={[1, 2]}
                    tick={{ fill: "#666", fontSize: 12 }}
                    axisLine={{ stroke: "#666" }}
                    tickLine={{ stroke: "#666" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div
                            className={cn(
                              "bg-white p-3 rounded shadow-lg",
                              "border border-gray-200"
                            )}
                          >
                            <p className="text-sm font-medium">{`Tiempo: ${data.time}`}</p>
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                data.status === 2
                                  ? "text-red-600"
                                  : "text-green-600"
                              )}
                            >
                              {`Estado: ${
                                data.status === 2 ? "Abierto" : "Cerrado"
                              }`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    content={() => (
                      <div className="flex justify-center mt-4 gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">●</span>
                          <span className="text-sm">Abierto</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">●</span>
                          <span className="text-sm">Cerrado</span>
                        </div>
                      </div>
                    )}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="status"
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: LINE_COLOR }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="status"
                    stroke={LINE_COLOR}
                    fill={LINE_COLOR}
                    fillOpacity={0.3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoorStatusMatrixV2;