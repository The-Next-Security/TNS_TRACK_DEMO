/**
 * @file DefrostAnalysisV2.js
 * @description Componente de análisis de temperatura migrado a Shadcn/UI v2.0
 * Preserva 100% de la funcionalidad existente con una interfaz modernizada
 * @version 2.0.0
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment-timezone";
import DatePicker from "react-datepicker";
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
import HeaderV2 from "./HeaderV2";
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
      const response = await axios.get("/api/ubibot/temperature-devices");
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
    if (moment(selectedDate).isoWeekday() !== 7) {
      alert("La fecha seleccionada debe ser un domingo.");
      console.error("Fecha seleccionada no es domingo:", selectedDate);
      return;
    }

    setLoading(true);
    try {
      // Log the date sent to the API
      const formattedDate = moment(selectedDate).format("YYYY-MM-DD");
      console.log(
        "Fecha enviada a la API para analisis diario:",
        formattedDate
      );

      // Análisis diario (domingo)
      const responseDaily = await axios.get("/api/ubibot/defrost-analysis-data", {
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
        "/api/ubibot/weekly-defrost-analysis-data",
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
      const formattedDate = moment(selectedDate).format("DDMMYYYY");
      const defaultFileName = `Temperature_Analysis_${selectedCameraName.replace(
        /\s+/g,
        "_"
      )}_${formattedDate}.pdf`;

      const response = await axios.post(
        "/api/ubibot/generate-defrost-report",
        {
          channelId: selectedCamera,
          date: moment(selectedDate).format("YYYY-MM-DD"),
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
      moment(selectedDate).isoWeekday() !== 7
    ) {
      alert("Por favor seleccione una cámara y un domingo");
      return;
    }

    setLoading(true);
    try {
      // Log the date sent to the API
      const formattedDate = moment(selectedDate).format("YYYY-MM-DD");
      console.log(
        "Fecha enviada a la API para analisis semanal:",
        formattedDate
      );
      const response = await axios.get("/api/ubibot/weekly-defrost-analysis-data", {
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
      const formattedDate = moment(selectedDate).format("DDMMYYYY");
      console.log(
        "DefrostAnalysis.js - Sending data to generate weekly report:"
      );
      console.log("  Channel ID:", selectedCamera);
      console.log("  Date:", moment(selectedDate).format("YYYY-MM-DD"));
      const defaultFileName = `Weekly_Temperature_Analysis_${selectedCameraName.replace(
        /\s+/g,
        "_"
      )}_${formattedDate}.pdf`;
      const response = await axios.post(
        "/api/ubibot/generate-weekly-defrost-report",
        {
          channelId: selectedCamera,
          date: moment(selectedDate).format("YYYY-MM-DD"),
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
    <div className={cn(
      "w-full min-h-screen",
      "bg-gradient-to-b from-gray-50 to-gray-100"
    )}>
      <HeaderV2 title="Análisis de Temperatura" />

      {/* Controls Section */}
      <div className={cn(
        "flex flex-col items-center",
        "gap-4 w-full max-w-4xl",
        "mx-auto p-6"
      )}>
        <Card className="w-full">
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
                <label className="text-sm font-medium text-gray-700">
                  Cámara
                </label>
                <Select
                  value={selectedCamera}
                  onValueChange={setSelectedCamera}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
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
                <label className="text-sm font-medium text-gray-700">
                  Fecha (Domingo)
                </label>
                <DatePicker
                  selected={selectedDate}
                  onChange={setSelectedDate}
                  filterDate={(date) => moment(date).day() === 0}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Seleccionar Domingo"
                  className={cn(
                    "w-full px-3 py-2",
                    "border border-gray-300 rounded-md",
                    "focus:outline-none focus:ring-2",
                    "focus:ring-blue-500 focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
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
                    "transition-colors duration-200"
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
      </div>

      {/* Daily Preview Section */}
      {preview && (
        <div className="max-w-6xl mx-auto px-6 pb-6">
          <Card>
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
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-blue-900">
                      Domingo {moment(selectedDate).format("DD/MM/YYYY")}
                    </CardTitle>
                    <Badge className="w-fit bg-blue-600">
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

                {/* Previous Sunday Data */}
                <Card className="border-gray-200 bg-gray-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-gray-700">
                      Domingo {moment(selectedDate).subtract(7, "days").format("DD/MM/YYYY")}
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
              </div>

              {/* Generate Report Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleGenerateReport}
                  disabled={loading}
                  size="lg"
                  className={cn(
                    "bg-green-600 hover:bg-green-700",
                    "text-white font-medium",
                    "px-8"
                  )}
                >
                  Generar Informe PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Preview Section */}
      {weeklyPreview && (
        <div className="max-w-6xl mx-auto px-6 pb-6">
          <Card className="border-t-4 border-t-indigo-500">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Análisis Semanal</CardTitle>
                <Badge className="text-sm bg-indigo-600">
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
                <Card className="border-indigo-200 bg-indigo-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-indigo-900">
                      Semana del {moment(selectedDate).subtract(6, "days").format("DD/MM/YYYY")}
                      {" al "}{moment(selectedDate).format("DD/MM/YYYY")}
                    </CardTitle>
                    <Badge className="w-fit bg-indigo-600">
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

                {/* Previous Week Data */}
                <Card className="border-gray-200 bg-gray-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-gray-700">
                      Semana del {moment(selectedDate).subtract(13, "days").format("DD/MM/YYYY")}
                      {" al "}{moment(selectedDate).subtract(7, "days").format("DD/MM/YYYY")}
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
              </div>

              {/* Generate Weekly Report Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleGenerateWeeklyReport}
                  disabled={loading}
                  size="lg"
                  className={cn(
                    "bg-indigo-600 hover:bg-indigo-700",
                    "text-white font-medium",
                    "px-8"
                  )}
                >
                  Generar Informe Semanal PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State - when no analysis has been performed */}
      {!preview && !weeklyPreview && !loading && (
        <div className="max-w-4xl mx-auto px-6">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTitle className="text-blue-900">
              Información
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              Seleccione una cámara y un domingo para comenzar el análisis de temperatura.
              El sistema analizará los datos del día seleccionado y generará comparativas
              con el domingo anterior.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default DefrostAnalysisV2;