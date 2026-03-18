/**
 * @file DefrostAnalysisV2.js
 * @description Componente de análisis de temperatura - Premium UI
 * Preserva 100% de la funcionalidad existente con efectos premium
 * @version 2.1.0 - Premium UI Enhancement
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import DatePicker from "react-datepicker";
import { motion } from "framer-motion";
import "react-datepicker/dist/react-datepicker.css";

// Shadcn/UI Components
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
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
 * Valida que el input sea un array válido
 * @param {any} input - Input a validar
 * @param {string} label - Etiqueta para logging
 * @returns {Array} Array validado o array vacío
 */
const validateArray = (input, label) => {
  if (!Array.isArray(input)) {
    console.error(`${label} no es un array válido:`, input);
    return [];
  }
  return input;
};

/**
 * Calcula estadísticas de temperatura
 * @param {Array} data - Array de registros con temperatura
 * @returns {Object} Objeto con estadísticas calculadas
 */
const calculateStats = (data) => {
  if (!data || data.length === 0) {
    return {
      promedio: 0,
      desv_std: 0,
      max: 0,
      min: 0,
      registros: 0,
    };
  }

  // Ensure data is an array of objects with 'temperature' property
  const temperatures = data
    .map((record) => parseFloat(record.temperature))
    .filter((temp) => !isNaN(temp));

  if (temperatures.length === 0) {
    return {
      promedio: 0,
      desv_std: 0,
      max: 0,
      min: 0,
      registros: 0,
    };
  }

  const promedio =
    temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
  const desv_std = Math.sqrt(
    temperatures.reduce((a, b) => a + Math.pow(b - promedio, 2), 0) /
      temperatures.length
  );

  return {
    promedio,
    desv_std,
    max: Math.max(...temperatures),
    min: Math.min(...temperatures),
    registros: temperatures.length,
  };
};

/**
 * Procesa datos de preview para comparación
 * @param {Array} currentData - Datos actuales
 * @param {Array} previousData - Datos anteriores
 * @returns {Object} Estadísticas procesadas
 */
const processPreview = (currentData, previousData) => {
  const validCurrentData = validateArray(currentData, "currentData");
  const validPreviousData = validateArray(previousData, "previousData");

  return {
    current: calculateStats(validCurrentData),
    previous: calculateStats(validPreviousData),
  };
};

/**
 * DefrostAnalysisV2 Component
 * Componente principal para análisis de temperatura con deshielo
 * Migrado a Shadcn/UI v2.0 preservando toda la funcionalidad
 */
const DefrostAnalysisV2 = () => {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weeklyPreview, setWeeklyPreview] = useState(null);

  useEffect(() => {
    fetchCameras();
  }, []);

  /**
   * Obtiene la lista de cámaras disponibles
   */
  const fetchCameras = async () => {
    try {
      const response = await axios.get("/api/temperatura/dispositivos");
      setCameras(response.data);
    } catch (error) {
      console.error("Error fetching cameras:", error);
    }
  };

  /**
   * Maneja el análisis diario y semanal
   */
  const handleAnalyze = async () => {
    if (!selectedCamera || !selectedDate) {
      alert("Por favor seleccione una cámara y una fecha válida.");
      return;
    }

    // Validar que la fecha seleccionada sea domingo
    if (DateTime.fromJSDate(selectedDate).weekday !== 7) {
      alert("La fecha seleccionada debe ser un domingo.");
      console.error("Fecha seleccionada no es domingo:", selectedDate);
      return;
    }

    setLoading(true);
    try {
      // Log the date sent to the API
      const formattedDate = DateTime.fromJSDate(selectedDate).toFormat("yyyy-MM-dd");
      console.log(
        "Fecha enviada a la API para analisis diario:",
        formattedDate
      );

      // Análisis diario (domingo)
      const responseDaily = await axios.get("/api/reportes/descongelamiento/analisis", {
        params: {
          channelId: selectedCamera,
          date: formattedDate,
        },
      });

      if (
        !responseDaily.data ||
        !responseDaily.data.currentData ||
        !responseDaily.data.previousData
      ) {
        throw new Error("Invalid data format for daily analysis");
      }
      console.log("DefrostAnalysis.js - Daily Analysis - Received data");
      if (
        responseDaily.data.currentData &&
        responseDaily.data.currentData.length > 0
      ) {
        console.log(
          "   First record current data:",
          responseDaily.data.currentData[0].timestamp
        );
        console.log(
          "   Last record current data:",
          responseDaily.data.currentData[
            responseDaily.data.currentData.length - 1
          ].timestamp
        );
      }
      if (
        responseDaily.data.previousData &&
        responseDaily.data.previousData.length > 0
      ) {
        console.log(
          "   First record previous data:",
          responseDaily.data.previousData[0].timestamp
        );
        console.log(
          "   Last record previous data:",
          responseDaily.data.previousData[
            responseDaily.data.previousData.length - 1
          ].timestamp
        );
      }

      const processedDailyPreview = processPreview(
        responseDaily.data.currentData,
        responseDaily.data.previousData
      );
      setPreview(processedDailyPreview);

      // Análisis semanal
      const responseWeekly = await axios.get(
        "/api/reportes/descongelamiento/analisis-semanal",
        {
          params: {
            channelId: selectedCamera,
            date: formattedDate,
          },
        }
      );

      if (
        !responseWeekly.data ||
        !responseWeekly.data.currentData ||
        !responseWeekly.data.previousData
      ) {
        throw new Error("Invalid data format for weekly analysis");
      }

      console.log("DefrostAnalysis.js - Weekly Analysis - Received data");
      if (
        responseWeekly.data.currentData &&
        responseWeekly.data.currentData.length > 0
      ) {
        console.log(
          "   First record current data:",
          responseWeekly.data.currentData[0].timestamp
        );
        console.log(
          "   Last record current data:",
          responseWeekly.data.currentData[
            responseWeekly.data.currentData.length - 1
          ].timestamp
        );
      }
      if (
        responseWeekly.data.previousData &&
        responseWeekly.data.previousData.length > 0
      ) {
        console.log(
          "   First record previous data:",
          responseWeekly.data.previousData[0].timestamp
        );
        console.log(
          "   Last record previous data:",
          responseWeekly.data.previousData[
            responseWeekly.data.previousData.length - 1
          ].timestamp
        );
      }

      const processedWeeklyPreview = processPreview(
        responseWeekly.data.currentData,
        responseWeekly.data.previousData
      );
      setWeeklyPreview(processedWeeklyPreview);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al analizar los datos");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Genera reporte PDF diario
   */
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const selectedCameraName =
        cameras.find((c) => c.channel_id === selectedCamera)?.name || "Unknown";
      const formattedDate = DateTime.fromJSDate(selectedDate).toFormat("ddMMyyyy");
      const defaultFileName = `Temperature_Analysis_${selectedCameraName.replace(
        /\s+/g,
        "_"
      )}_${formattedDate}.pdf`;

      const response = await axios.post(
        "/api/reportes/descongelamiento/generar",
        {
          channelId: selectedCamera,
          date: DateTime.fromJSDate(selectedDate).toFormat("yyyy-MM-dd"),
        },
        {
          responseType: "blob",
          timeout: 30000,
        }
      );

      const contentDisposition = response.headers["content-disposition"];
      const matches = /filename="(.+)"/.exec(contentDisposition);
      const serverFileName = matches?.[1] || defaultFileName;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", serverFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generando el informe. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el análisis semanal
   * @deprecated Esta función parece estar duplicada con handleAnalyze
   */
  const handleWeeklyAnalyze = async () => {
    if (
      !selectedCamera ||
      !selectedDate ||
      DateTime.fromJSDate(selectedDate).weekday !== 7
    ) {
      alert("Por favor seleccione una cámara y un domingo");
      return;
    }

    setLoading(true);
    try {
      // Log the date sent to the API
      const formattedDate = DateTime.fromJSDate(selectedDate).toFormat("yyyy-MM-dd");
      console.log(
        "Fecha enviada a la API para analisis semanal:",
        formattedDate
      );
      const response = await axios.get("/api/reportes/descongelamiento/analisis-semanal", {
        params: {
          channelId: selectedCamera,
          date: formattedDate,
        },
      });

      if (
        !response.data ||
        !response.data.currentData ||
        !response.data.previousData
      ) {
        throw new Error("Invalid data format");
      }
      console.log("DefrostAnalysis.js - Weekly Preview - Received data");
      if (response.data.currentData && response.data.currentData.length > 0) {
        console.log(
          "First record current data:",
          response.data.currentData[0].timestamp
        );
        console.log(
          "Last record current data:",
          response.data.currentData[response.data.currentData.length - 1]
            .timestamp
        );
      }
      if (response.data.previousData && response.data.previousData.length > 0) {
        console.log(
          "First record previous data:",
          response.data.previousData[0].timestamp
        );
        console.log(
          "Last record previous data:",
          response.data.previousData[response.data.previousData.length - 1]
            .timestamp
        );
      }

      const processedPreview = processPreview(
        response.data.currentData,
        response.data.previousData
      );
      setWeeklyPreview(processedPreview);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al analizar los datos semanales");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Genera reporte PDF semanal
   */
  const handleGenerateWeeklyReport = async () => {
    try {
      setLoading(true);
      const selectedCameraName =
        cameras.find((c) => c.channel_id === selectedCamera)?.name || "Unknown";
      const formattedDate = DateTime.fromJSDate(selectedDate).toFormat("ddMMyyyy");
      console.log(
        "DefrostAnalysis.js - Sending data to generate weekly report:"
      );
      console.log("  Channel ID:", selectedCamera);
      console.log("  Date:", DateTime.fromJSDate(selectedDate).toFormat("yyyy-MM-dd"));
      const defaultFileName = `Weekly_Temperature_Analysis_${selectedCameraName.replace(
        /\s+/g,
        "_"
      )}_${formattedDate}.pdf`;
      const response = await axios.post(
        "/api/reportes/descongelamiento/generar-semanal",
        {
          channelId: selectedCamera,
          date: DateTime.fromJSDate(selectedDate).toFormat("yyyy-MM-dd"),
        },
        {
          responseType: "blob",
          timeout: 30000,
        }
      );
      const contentDisposition = response.headers["content-disposition"];
      const matches = /filename="(.+)"/.exec(contentDisposition);
      const serverFileName = matches?.[1] || defaultFileName;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", serverFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating weekly report:", error);
      alert(
        "Error generando el informe semanal. Por favor intente nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Componente de estadística individual
   */
  const StatItem = ({ label, value, unit = "°C" }) => (
    <div className={cn(
      "flex justify-between items-center",
      "p-3 rounded-md",
      "bg-gray-50 hover:bg-gray-100",
      "transition-colors duration-200"
    )}>
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-900">
        {unit === "count" ? value : `${value}${unit}`}
      </span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "w-full min-h-screen relative",
        "bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100",
        "dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900"
      )}
    >
      {/* Patrón de grid sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Contenido */}
      <div className="relative z-10">
        <HeaderV2 title="Análisis de Temperatura" />

        {/* Controls Section */}
        <div className={cn(
          "flex flex-col items-center",
          "gap-4 w-full max-w-4xl",
          "mx-auto p-6"
        )}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-full"
          >
            <Card className={cn(
              "w-full",
              "bg-white/80 dark:bg-gray-800/80",
              "backdrop-blur-md",
              "border border-white/20 dark:border-gray-700/30",
              "shadow-xl hover:shadow-2xl",
              "transition-all duration-300"
            )}>
              <CardHeader>
                <CardTitle>Configuración del Análisis</CardTitle>
                <CardDescription>
                  Seleccione una cámara y un domingo para realizar el análisis de temperatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "grid gap-4",
                  "md:grid-cols-3 md:gap-6"
                )}>
                  {/* Camera Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cámara
                    </label>
                    <Select
                      value={selectedCamera}
                      onValueChange={setSelectedCamera}
                      disabled={loading}
                    >
                      <SelectTrigger className={cn(
                        "w-full",
                        "focus:ring-2 focus:ring-[#6B9FD4]/50",
                        "transition-all duration-200"
                      )}>
                        <SelectValue placeholder="Seleccionar Cámara" />
                      </SelectTrigger>
                      <SelectContent>
                        {cameras.map((camera) => (
                          <SelectItem
                            key={camera.channel_id}
                            value={camera.channel_id}
                          >
                            {camera.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fecha (Domingo)
                    </label>
                    <DatePicker
                      selected={selectedDate}
                      onChange={setSelectedDate}
                      filterDate={(date) => DateTime.fromJSDate(date).weekday === 7}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Seleccionar Domingo"
                      className={cn(
                        "w-full px-3 py-2",
                        "border border-gray-300 rounded-md",
                        "focus:outline-none focus:ring-2",
                        "focus:ring-[#6B9FD4]/50 focus:border-transparent",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                      )}
                      disabled={loading}
                    />
                  </div>

                  {/* Analyze Button */}
                  <div className="flex items-end">
                    <Button
                      onClick={handleAnalyze}
                      disabled={loading || !selectedCamera || !selectedDate}
                      className={cn(
                        "w-full",
                        "bg-green-600 hover:bg-green-700",
                        "text-white font-medium",
                        "shadow-md shadow-green-600/30",
                        "hover:shadow-lg hover:shadow-green-600/40",
                        "hover:scale-105",
                        "transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      )}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded-full animate-spin" />
                          Analizando...
                        </span>
                      ) : (
                        "Analizar"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Daily Preview Section */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="max-w-6xl mx-auto px-6 pb-6"
          >
            <Card className={cn(
              "bg-white/80 dark:bg-gray-800/80",
              "backdrop-blur-md",
              "border border-white/20 dark:border-gray-700/30",
              "shadow-xl",
              "transition-all duration-300"
            )}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">Vista Previa Diaria</CardTitle>
                  <Badge variant="outline" className="text-sm">
                    Análisis Diario
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "grid gap-6",
                  "lg:grid-cols-2"
                )}>
                  {/* Current Sunday Data */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card className={cn(
                      "border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50",
                      "dark:from-blue-900/20 dark:to-cyan-900/20",
                      "shadow-lg hover:shadow-xl",
                      "hover:shadow-blue-500/20",
                      "transition-all duration-300"
                    )}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                          Domingo {DateTime.fromJSDate(selectedDate).toFormat("dd/MM/yyyy")}
                        </CardTitle>
                        <Badge className={cn(
                          "w-fit bg-blue-600",
                          "drop-shadow-[0_0_6px_rgba(37,99,235,0.6)]"
                        )}>
                          Semana Actual
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <StatItem
                          label="Temperatura Promedio"
                          value={preview.current.promedio.toFixed(2)}
                        />
                        <StatItem
                          label="Desviación Estándar"
                          value={preview.current.desv_std.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Máxima"
                          value={preview.current.max.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Mínima"
                          value={preview.current.min.toFixed(2)}
                        />
                        <StatItem
                          label="Total de Registros"
                          value={preview.current.registros}
                          unit="count"
                        />
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Previous Sunday Data */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <Card className={cn(
                      "border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50",
                      "dark:from-gray-800/30 dark:to-slate-800/30",
                      "shadow-lg hover:shadow-xl",
                      "hover:shadow-gray-400/20",
                      "transition-all duration-300"
                    )}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-gray-700 dark:text-gray-300">
                          Domingo {DateTime.fromJSDate(selectedDate).minus({ days: 7 }).toFormat("dd/MM/yyyy")}
                        </CardTitle>
                        <Badge variant="secondary" className="w-fit">
                          Semana Anterior
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <StatItem
                          label="Temperatura Promedio"
                          value={preview.previous.promedio.toFixed(2)}
                        />
                        <StatItem
                          label="Desviación Estándar"
                          value={preview.previous.desv_std.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Máxima"
                          value={preview.previous.max.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Mínima"
                          value={preview.previous.min.toFixed(2)}
                        />
                        <StatItem
                          label="Total de Registros"
                          value={preview.previous.registros}
                          unit="count"
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Generate Report Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="mt-6 flex justify-center"
                >
                  <Button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    size="lg"
                    className={cn(
                      "bg-green-600 hover:bg-green-700",
                      "text-white font-medium",
                      "px-8",
                      "shadow-md shadow-green-600/30",
                      "hover:shadow-lg hover:shadow-green-600/40",
                      "hover:scale-105",
                      "transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    )}
                  >
                    Generar Informe PDF
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Weekly Preview Section */}
        {weeklyPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="max-w-6xl mx-auto px-6 pb-6"
          >
            <Card className={cn(
              "border-t-4 border-t-indigo-500",
              "bg-white/80 dark:bg-gray-800/80",
              "backdrop-blur-md",
              "border border-white/20 dark:border-gray-700/30",
              "shadow-xl",
              "transition-all duration-300"
            )}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">Análisis Semanal</CardTitle>
                  <Badge className={cn(
                    "text-sm bg-indigo-600",
                    "drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]"
                  )}>
                    Vista Semanal
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "grid gap-6",
                  "lg:grid-cols-2"
                )}>
                  {/* Current Week Data */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <Card className={cn(
                      "border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50",
                      "dark:from-indigo-900/20 dark:to-purple-900/20",
                      "shadow-lg hover:shadow-xl",
                      "hover:shadow-indigo-500/20",
                      "transition-all duration-300"
                    )}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-indigo-900 dark:text-indigo-100">
                          Semana del {DateTime.fromJSDate(selectedDate).minus({ days: 6 }).toFormat("dd/MM/yyyy")}
                          {" al "}{DateTime.fromJSDate(selectedDate).toFormat("dd/MM/yyyy")}
                        </CardTitle>
                        <Badge className={cn(
                          "w-fit bg-indigo-600",
                          "drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]"
                        )}>
                          Semana Actual
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <StatItem
                          label="Temperatura Promedio"
                          value={weeklyPreview.current.promedio.toFixed(2)}
                        />
                        <StatItem
                          label="Desviación Estándar"
                          value={weeklyPreview.current.desv_std.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Máxima"
                          value={weeklyPreview.current.max.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Mínima"
                          value={weeklyPreview.current.min.toFixed(2)}
                        />
                        <StatItem
                          label="Total de Registros"
                          value={weeklyPreview.current.registros}
                          unit="count"
                        />
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Previous Week Data */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <Card className={cn(
                      "border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50",
                      "dark:from-gray-800/30 dark:to-slate-800/30",
                      "shadow-lg hover:shadow-xl",
                      "hover:shadow-gray-400/20",
                      "transition-all duration-300"
                    )}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-gray-700 dark:text-gray-300">
                          Semana del {DateTime.fromJSDate(selectedDate).minus({ days: 13 }).toFormat("dd/MM/yyyy")}
                          {" al "}{DateTime.fromJSDate(selectedDate).minus({ days: 7 }).toFormat("dd/MM/yyyy")}
                        </CardTitle>
                        <Badge variant="secondary" className="w-fit">
                          Semana Anterior
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <StatItem
                          label="Temperatura Promedio"
                          value={weeklyPreview.previous.promedio.toFixed(2)}
                        />
                        <StatItem
                          label="Desviación Estándar"
                          value={weeklyPreview.previous.desv_std.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Máxima"
                          value={weeklyPreview.previous.max.toFixed(2)}
                        />
                        <StatItem
                          label="Temperatura Mínima"
                          value={weeklyPreview.previous.min.toFixed(2)}
                        />
                        <StatItem
                          label="Total de Registros"
                          value={weeklyPreview.previous.registros}
                          unit="count"
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Generate Weekly Report Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="mt-6 flex justify-center"
                >
                  <Button
                    onClick={handleGenerateWeeklyReport}
                    disabled={loading}
                    size="lg"
                    className={cn(
                      "bg-indigo-600 hover:bg-indigo-700",
                      "text-white font-medium",
                      "px-8",
                      "shadow-md shadow-indigo-600/30",
                      "hover:shadow-lg hover:shadow-indigo-600/40",
                      "hover:scale-105",
                      "transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    )}
                  >
                    Generar Informe Semanal PDF
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty State - when no analysis has been performed */}
        {!preview && !weeklyPreview && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="max-w-4xl mx-auto px-6"
          >
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                Información
              </AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Seleccione una cámara y un domingo para comenzar el análisis de temperatura.
                El sistema analizará los datos del día seleccionado y generará comparativas
                con el domingo anterior.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default DefrostAnalysisV2;