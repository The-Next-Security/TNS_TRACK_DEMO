/**
 * @file TemperaturePowerAnalysisV2.js
 * @description Componente de análisis de temperatura y potencia migrado a Shadcn/UI v2.0
 * Preserva 100% de la funcionalidad existente con una interfaz modernizada
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import DatePicker from 'react-datepicker';
import { DateTime } from 'luxon';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Thermometer,
  Database,
  AlertTriangle,
  Clock
} from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import "react-toastify/dist/ReactToastify.css";

// Shadcn/UI Components
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// Components & Utilities
import HeaderV2 from "./Header_View";
import { cn } from "../lib/utils";

/**
 * Componente personalizado para el tooltip del gráfico con diseño premium
 * @param {Object} props - Props del componente
 * @param {boolean} props.active - Si el tooltip está activo
 * @param {Array} props.payload - Datos del punto
 * @param {string} props.label - Etiqueta del punto
 * @returns {JSX.Element|null} Componente de tooltip
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-slate-700/50">
      <p className="font-semibold text-white mb-2">
        <Clock className="inline h-3 w-3 mr-1" />
        {label}
      </p>
      <div className="space-y-1">
        <p className="text-purple-400 flex items-center gap-1">
          <Thermometer className="h-3 w-3" />
          Temperatura: {payload[0]?.value?.toFixed(1)}°C
        </p>
        <p className="text-emerald-400 flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Potencia: {payload[1]?.value?.toFixed(2)} kW
        </p>
      </div>
    </div>
  );
};

/**
 * Componente principal de análisis de temperatura y potencia
 * Muestra la correlación entre temperatura externa y consumo de potencia
 * @returns {JSX.Element} Componente TemperaturePowerAnalysisV2
 */
const TemperaturePowerAnalysisV2 = () => {
  // Estado del componente - preservado exactamente igual que el original
  const [data, setData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  /**
   * Obtiene las ubicaciones disponibles desde el backend
   * @async
   */
  const fetchLocations = useCallback(async () => {
    try {
      const response = await axios.get('/api/analisis/temperatura-potencia/ubicaciones');
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Error al cargar las ubicaciones');
      toast.error('Error al cargar las ubicaciones');
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  /**
   * Selecciona automáticamente el reefer "b" (channel 92521) al cargar las ubicaciones
   */
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      // Buscar la ubicación que tiene el channel 92521 (reefer "b")
      const reeferB = locations.find(loc =>
        loc.channels && loc.channels.some(channel => channel.id === 92521)
      );

      if (reeferB) {
        setSelectedLocation(reeferB.id.toString());
      } else {
        // Si no encuentra el channel específico, tomar el primer elemento
        setSelectedLocation(locations[0].id.toString());
      }
    }
  }, [locations, selectedLocation]);

  /**
   * Procesa los datos recibidos del backend
   * @param {Array} rawData - Datos sin procesar del backend
   * @returns {Array} Datos procesados para el gráfico
   */
  const processData = useCallback((rawData) => {
    return rawData.map(item => ({
      ...item,
      time: DateTime.fromISO(item.intervalo_tiempo).setZone('America/Santiago').toFormat('HH:mm'),
      promedio_temperatura_externa: parseFloat(item.promedio_temperatura_externa),
      promedio_potencia_kw: parseFloat(item.promedio_potencia_kw)
    }));
  }, []);

  /**
   * Obtiene los datos de análisis del backend
   * @async
   */
  const fetchData = useCallback(async () => {
    if (!selectedLocation || !selectedDate) {
      toast.warning('Por favor seleccione una ubicación y fecha');
      return;
    }

    setLoading(true);
    setError(null);
    setData([]);
    setShowChart(false);

    try {
      const location = locations.find(loc => loc.id === parseInt(selectedLocation));
      const formattedDate = DateTime.fromJSDate(selectedDate).toFormat('yyyy-MM-dd');

      const response = await axios.get(
        `/api/analisis/temperatura-potencia/${formattedDate}`,
        {
          params: {
            ubicacion: selectedLocation,
            channelId: location?.channels[0]?.id
          }
        }
      );

      const processedData = processData(response.data);
      setData(processedData);
      setShowChart(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error.response?.data?.error || 'Error al obtener los datos';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, selectedDate, locations, processData]);

  /**
   * Carga automática de datos cuando se establece la ubicación inicial
   */
  useEffect(() => {
    // Cargar los datos automáticamente solo cuando:
    // 1. Tenemos una ubicación seleccionada
    // 2. Tenemos una fecha seleccionada (que ya está definida por defecto)
    // 3. No se ha realizado la carga inicial todavía
    if (selectedLocation && selectedDate && !initialLoadDone) {
      fetchData();
      setInitialLoadDone(true);
    }
  }, [selectedLocation, selectedDate, initialLoadDone, fetchData]);

  // Calculate statistics for display
  const calculateStats = () => {
    if (!data || data.length === 0) return null;

    const temps = data.map(d => d.promedio_temperatura_externa).filter(t => !isNaN(t));
    const powers = data.map(d => d.promedio_potencia_kw).filter(p => !isNaN(p));

    return {
      avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
      maxTemp: Math.max(...temps),
      minTemp: Math.min(...temps),
      avgPower: powers.reduce((a, b) => a + b, 0) / powers.length,
      maxPower: Math.max(...powers),
      minPower: Math.min(...powers),
      correlation: calculateCorrelation(temps, powers)
    };
  };

  const calculateCorrelation = (x, y) => {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const correlation = (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return isNaN(correlation) ? 0 : correlation;
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <HeaderV2 />

      <div className="w-full px-2 sm:px-3 md:px-4 py-4 md:py-6">
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
            Análisis de Temperatura y Potencia
          </h1>
        </motion.div>

        {/* Main Card with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <Card className={cn(
            "w-full",
            "shadow-xl",
            "bg-white/70 backdrop-blur-sm",
            "border border-gray-200/50"
          )}>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Enhanced Controls Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  "p-4 rounded-xl",
                  "bg-gradient-to-br from-white/50 to-gray-50/30",
                  "border border-gray-200/30"
                )}
              >
                <div className="flex flex-col md:flex-row gap-4 items-end justify-center">
                  {/* Location Selector with Icon */}
                  <div className="w-full md:w-64 space-y-2">
                    <Label htmlFor="location-select" className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      Ubicación:
                    </Label>
                    <Select
                      value={selectedLocation}
                      onValueChange={setSelectedLocation}
                      disabled={loading}
                    >
                      <SelectTrigger
                        id="location-select"
                        className={cn(
                          "w-full",
                          "bg-white/70 backdrop-blur-sm",
                          "border-gray-300/50",
                          "hover:bg-white/90 transition-colors",
                          loading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <SelectValue placeholder="Seleccionar Ubicación" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id.toString()}>
                            {loc.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Picker with Icon */}
                  <div className="w-full md:w-64 space-y-2">
                    <Label htmlFor="date-picker" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      Fecha:
                    </Label>
                    <DatePicker
                      id="date-picker"
                      selected={selectedDate}
                      onChange={setSelectedDate}
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                      placeholderText="Seleccionar fecha"
                      className={cn(
                        "w-full px-3 py-2 rounded-md",
                        "bg-white/70 backdrop-blur-sm",
                        "border border-gray-300/50",
                        "hover:bg-white/90",
                        "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                        "transition-all duration-200",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={loading}
                    />
                  </div>

                  {/* Enhanced Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={fetchData}
                      disabled={loading || !selectedLocation || !selectedDate}
                      className={cn(
                        "w-full md:w-auto min-w-[150px]",
                        "bg-gradient-to-r from-purple-600 to-cyan-600",
                        "hover:from-purple-700 hover:to-cyan-700",
                        "text-white font-medium",
                        "shadow-md hover:shadow-lg",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                      )}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Cargando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Obtener Datos
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Alert variant="destructive" className="w-full">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading Skeleton with Premium Style */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Skeleton className="h-96 w-full rounded-xl bg-gradient-to-br from-gray-100 to-gray-200/50" />
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-24 rounded-xl bg-gradient-to-br from-purple-100/50 to-purple-200/30" />
                    <Skeleton className="h-24 rounded-xl bg-gradient-to-br from-cyan-100/50 to-cyan-200/30" />
                    <Skeleton className="h-24 rounded-xl bg-gradient-to-br from-green-100/50 to-green-200/30" />
                  </div>
                </motion.div>
              )}

              {/* Chart and Data Section */}
              <AnimatePresence mode="wait">
                {showChart && data.length > 0 && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* Statistics Cards */}
                    {stats && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 md:mb-6">
                        {/* Temperature Stats */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          whileHover={{ y: -12, scale: 1.02 }}
                          className={cn(
                            "p-4 rounded-xl",
                            "bg-gradient-to-br from-purple-50 to-purple-100/50",
                            "border-2 border-purple-300/60",
                            "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
                            "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
                            "transition-all duration-300"
                          )}>
                          <div className="flex items-center gap-2 mb-2">
                            <Thermometer className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-medium text-gray-600">Temp. Promedio</span>
                          </div>
                          <p className="text-xl font-bold text-purple-700">
                            {stats.avgTemp.toFixed(1)}°C
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs bg-white/50">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {stats.maxTemp.toFixed(1)}°
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white/50">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              {stats.minTemp.toFixed(1)}°
                            </Badge>
                          </div>
                        </motion.div>

                        {/* Power Stats */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          whileHover={{ y: -12, scale: 1.02 }}
                          className={cn(
                            "p-4 rounded-xl",
                            "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
                            "border-2 border-emerald-300/60",
                            "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
                            "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
                            "transition-all duration-300"
                          )}>
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-medium text-gray-600">Potencia Prom.</span>
                          </div>
                          <p className="text-xl font-bold text-emerald-700">
                            {stats.avgPower.toFixed(2)} kW
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs bg-white/50">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {stats.maxPower.toFixed(2)}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white/50">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              {stats.minPower.toFixed(2)}
                            </Badge>
                          </div>
                        </motion.div>

                        

                        {/* Data Points */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.35 }}
                          whileHover={{ y: -12, scale: 1.02 }}
                          className={cn(
                            "p-4 rounded-xl",
                            "bg-gradient-to-br from-amber-50 to-amber-100/50",
                            "border-2 border-amber-300/60",
                            "shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
                            "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.1),inset_0_-3px_6px_rgba(0,0,0,0.08)]",
                            "transition-all duration-300"
                          )}>
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-medium text-gray-600">Puntos de Datos</span>
                          </div>
                          <p className="text-xl font-bold text-amber-700">
                            {data.length}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1 bg-white/50">
                            24h de análisis
                          </Badge>
                        </motion.div>
                      </div>
                    )}

                    {/* Enhanced Chart Container */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className={cn(
                        "p-3 sm:p-4 md:p-6",
                        "bg-gradient-to-br from-white/50 to-gray-50/30",
                        "border border-gray-200/30",
                        "shadow-lg",
                        "w-full"
                      )}>
                        <div className="h-64 sm:h-80 md:h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                              <defs>
                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05}/>
                                </linearGradient>
                                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                              <XAxis
                                dataKey="time"
                                label={{ value: 'Hora', position: 'bottom', offset: 0, style: { fill: '#6b7280' } }}
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                stroke="#e5e7eb"
                              />
                              <YAxis
                                yAxisId="left"
                                label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                stroke="#e5e7eb"
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                label={{ value: 'Potencia (kW)', angle: 90, position: 'insideRight', style: { fill: '#6b7280' } }}
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                stroke="#e5e7eb"
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="rect"
                                formatter={(value) => (
                                  <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>
                                )}
                              />
                              <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="promedio_temperatura_externa"
                                stroke="#a855f7"
                                strokeWidth={2}
                                fill="url(#colorTemp)"
                                name="Temperatura (°C)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#a855f7' }}
                              />
                              <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="promedio_potencia_kw"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#colorPower)"
                                name="Potencia (kW)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#10b981' }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </motion.div>

                    {/* Enhanced Data Table */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className={cn(
                        "w-full",
                        "bg-white/70 backdrop-blur-sm",
                        "border border-gray-200/50",
                        "shadow-lg"
                      )}>
                        <CardHeader className="p-3 sm:p-4 md:pb-3 border-b border-gray-200/50">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                              Datos Detallados
                            </CardTitle>
                            <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-cyan-50 text-xs sm:text-sm">
                              {data.length} registros
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
                                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                      <span className="hidden sm:inline">Fecha y hora</span>
                                      <span className="sm:hidden">Hora</span>
                                    </div>
                                  </th>
                                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <Thermometer className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                                      <span className="hidden sm:inline">Temperatura (°C)</span>
                                      <span className="sm:hidden">Temp.</span>
                                    </div>
                                  </th>
                                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                                      <span className="hidden sm:inline">Potencia (kW)</span>
                                      <span className="sm:hidden">Pot.</span>
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.map((row, index) => (
                                  <motion.tr
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.01 }}
                                    className={cn(
                                      "border-b border-gray-100/50 transition-all duration-200",
                                      "hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-cyan-50/30",
                                      index % 2 === 0 && "bg-gray-50/30"
                                    )}
                                  >
                                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700">
                                      {row.intervalo_tiempo}
                                    </td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                                      <span className="font-medium text-purple-600 bg-purple-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm">
                                        {row.promedio_temperatura_externa?.toFixed(2) || '-'}
                                      </span>
                                    </td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                                      <span className="font-medium text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm">
                                        {row.promedio_potencia_kw?.toFixed(3) || '-'}
                                      </span>
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* No Data Message */}
              {showChart && data.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className="w-full border-amber-200/50 bg-amber-50/50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900">
                      No se encontraron datos para la fecha y ubicación seleccionadas.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default TemperaturePowerAnalysisV2;