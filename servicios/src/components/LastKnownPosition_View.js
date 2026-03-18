/**
 * @fileoverview LastKnownPositionV2 - Componente de última posición conocida - Premium UI
 * @module LastKnownPositionV2
 * @requires mapbox-gl - Biblioteca para renderizado de mapas
 * @requires axios - Cliente HTTP para peticiones API
 * @requires luxon - Manejo de fechas y timestamps (Decisiones_Tecnicas §10)
 * @requires framer-motion - Animaciones premium
 * @requires react - React hooks y componentes
 *
 * @description
 * Componente que muestra la última posición GPS conocida de dispositivos en un mapa interactivo.
 * Características principales:
 * - Selección de dispositivos desde lista desplegable
 * - Visualización de posición en mapa MapBox con marcadores personalizados
 * - Indicador visual de actualización reciente (verde < 10 min, rojo > 10 min)
 * - Tabla de información detallada al hacer clic en marcador
 * - Auto-actualización de datos con botón de refresh
 * - Manejo de estados de carga y error
 * - Efectos premium: glassmorphism, animaciones, glow
 *
 * Migrado a Shadcn/UI v2.1 con componentes premium:
 * - Card para contenedores con glassmorphism
 * - Button para acciones con efectos
 * - Select para selección de dispositivos
 * - Alert para mensajes de error
 * - Badge para indicadores de estado con glow
 * - Skeleton para estados de carga mejorados
 * @version 2.1.0 - Premium UI Enhancement
 */

import "mapbox-gl/dist/mapbox-gl.css";

import React, { useState, useEffect, useRef } from "react";
import MapboxGL from "mapbox-gl";
import axios from "axios";
import { DateTime } from "luxon";
import { motion } from "framer-motion";
import HeaderV2 from "./Header_View";
import { cn } from "@/lib/utils";

// Shadcn/UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

/* MÓDULO FUTURO - Teltonika/Beacons: pendiente de desarrollo */

MapboxGL.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const defaultPosition = { lat: -33.4489, lng: -70.6693 };

/**
 * Componente principal de última posición conocida
 *
 * @component
 * @param {Object} props - Props del componente
 * @param {boolean} [props.showHeader=true] - Controla si se muestra el HeaderV2
 *
 * @example
 * // Con header
 * <LastKnownPositionV2 showHeader={true} />
 *
 * // Sin header (para embeber en otras vistas)
 * <LastKnownPositionV2 showHeader={false} />
 *
 * @returns {JSX.Element} Componente de última posición conocida con mapa interactivo
 */
function LastKnownPositionV2({ showHeader = true }) {
  // ============= STATE MANAGEMENT =============
  // Preservando todo el estado original del componente
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Referencias para mapa y marcadores
  const mapRef = useRef(null);
  const markersRef = useRef({});

  // ============= EFFECTS & API CALLS =============
  /**
   * Effect: Carga inicial de dispositivos disponibles
   * Se ejecuta solo una vez al montar el componente
   */
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get("/api/energia/dispositivos/legacy");
        console.log("Fetched devices:", response.data);
        setDevices(response.data);
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };

    fetchDevices();
  }, []);

  /**
   * Obtiene la última posición conocida del dispositivo seleccionado
   * Preserva toda la lógica original de validación de tiempo
   *
   * @async
   * @function fetchLastKnownPosition
   */
  const fetchLastKnownPosition = async () => {
    setIsLoading(true);
    setError(null);
    setShowTable(false);
    setSelectedPosition(null);
    try {
      const endpoint = "/api/gps/last-known-position";
      const params = { ident: selectedDeviceId };
      const response = await axios.get(endpoint, { params });

      if (response.data) {
        console.log("Response data:", response.data);

        // Lógica preservada: determinar si la posición es reciente (< 10 minutos)
        const currentTime = DateTime.now().toMillis();
        const tenMinutesAgo = DateTime.now().minus({ minutes: 10 }).toMillis();
        const isRecent =
          response.data.unixTimestamp > tenMinutesAgo &&
          response.data.unixTimestamp <= currentTime;

        setPositions([
          {
            ...response.data,
            isRecent,
            latitude: response.data.latitude || defaultPosition.lat,
            longitude: response.data.longitude || defaultPosition.lng,
            timestamp: response.data.unixTimestamp,
          },
        ]);
      } else {
        setPositions([]);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("Error: No data available");
        setError("No data available");
      } else {
        console.error("Failed to fetch last known position:", error);
        setError("Server Error");
      }
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Effect: Auto-actualización cuando cambia el dispositivo seleccionado
   */
  useEffect(() => {
    if (selectedDeviceId) {
      fetchLastKnownPosition();
    }
  }, [selectedDeviceId]);

  /**
   * Effect: Inicialización del mapa Mapbox
   * Preserva configuración original del mapa
   */
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = new MapboxGL.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: [defaultPosition.lng, defaultPosition.lat],
        zoom: 15,
      });
    }
  }, []);

  /**
   * Effect: Gestión de marcadores en el mapa
   * Preserva toda la lógica de marcadores, popups y eventos
   */
  useEffect(() => {
    // Limpiar marcadores existentes
    Object.keys(markersRef.current).forEach((key) => {
      markersRef.current[key].remove();
      delete markersRef.current[key];
    });

    if (positions.length > 0 && mapRef.current) {
      positions.forEach((position) => {
        const lat = parseFloat(position.latitude);
        const lng = parseFloat(position.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          console.error("Invalid coordinates:", { lat, lng });
          return;
        }

        // Crear marcador personalizado si no existe
        if (!markersRef.current[position.ident]) {
          const el = document.createElement("div");
          el.className = "custom-marker";
          el.style.backgroundColor = position.isRecent ? "green" : "red";
          el.style.width = "20px";
          el.style.height = "20px";
          el.style.borderRadius = "50%";
          el.style.border = "2px solid white";
          markersRef.current[position.ident] = new MapboxGL.Marker(el);
        }

        const marker = markersRef.current[position.ident];
        marker.setLngLat([lng, lat]).addTo(mapRef.current);

        const ts = position.timestamp;
        const formattedTime = typeof ts === "number"
          ? DateTime.fromMillis(ts).setZone("America/Santiago").toFormat("dd-MM-yyyy, HH:mm:ss")
          : DateTime.fromISO(ts).setZone("America/Santiago").toFormat("dd-MM-yyyy, HH:mm:ss");

        // Popup con información de posición
        const popup = new MapboxGL.Popup({ offset: 25 }).setHTML(
          `<div style="background-color: ${
            position.isRecent ? "lightgreen" : "lightcoral"
          }; padding: 10px;">
            <strong>Time:</strong> ${formattedTime}<br/>
            <strong>Lat:</strong> ${lat.toFixed(6)}<br/>
            <strong>Lng:</strong> ${lng.toFixed(6)}
           </div>`
        );

        marker.setPopup(popup).togglePopup();

        // Event listener para mostrar tabla de información
        marker.getElement().addEventListener("click", () => {
          setSelectedPosition({
            time: formattedTime,
            lat,
            lng,
            isRecent: position.isRecent,
          });
          setShowTable(true);
        });

        mapRef.current.setCenter([lng, lat]);
      });
    }
  }, [positions, selectedDeviceId]);

  // ============= RENDER =============
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "min-h-screen w-full relative",
        "bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100",
        "dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900"
      )}
    >
      {/* Patrón de grid sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Contenido */}
      <div className="relative z-10">
        {showHeader && <HeaderV2 title="Ubicación Exteriores Tiempo Real" />}

        {/* Error Alert usando Shadcn Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="mx-4 mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Device Selection Card - Con blur fuerte */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className={cn(
            "absolute z-50",
            "top-24 left-1/2 -translate-x-1/2",
            "w-80",
            "bg-white/90 dark:bg-gray-800/90",
            "backdrop-blur-lg",
            "border border-white/30 dark:border-gray-700/40",
            "shadow-2xl shadow-[#6B9FD4]/20",
            "transition-all duration-300"
          )}>
            <CardHeader>
              <CardTitle>Seleccionar Dispositivo</CardTitle>
              <CardDescription>
                Elige un dispositivo para ver su última posición conocida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedDeviceId}
                onValueChange={(value) => {
                  setSelectedDeviceId(value);
                  setError(null);
                  setShowTable(false);
                }}
              >
                <SelectTrigger className={cn(
                  "w-full",
                  "focus:ring-2 focus:ring-[#6B9FD4]/50",
                  "transition-all duration-200"
                )}>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.device_asignado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={fetchLastKnownPosition}
                disabled={!selectedDeviceId || isLoading}
                className={cn(
                  "w-full",
                  "bg-[#6B9FD4] hover:bg-[#5A8DC4]",
                  "text-white font-medium",
                  "shadow-md shadow-[#6B9FD4]/30",
                  "hover:shadow-lg hover:shadow-[#6B9FD4]/40",
                  "hover:scale-105",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                )}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">⟳</span>
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Datos"
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Map Container - Con fade-in */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          id="map"
          className={cn(
            "h-[800px] w-full",
            "rounded-lg overflow-hidden",
            showHeader ? "mt-[150px]" : "mt-0"
          )}
        />

        {/* No Data Message */}
        {selectedDeviceId && positions.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="mx-4 mt-4">
              <AlertDescription>
                Sin datos disponibles para el dispositivo seleccionado.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Position Information Table - Con glassmorphism */}
        {showTable && selectedPosition && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className={cn(
              "mx-4 mt-6",
              "bg-white/80 dark:bg-gray-800/80",
              "backdrop-blur-md",
              "border border-white/20 dark:border-gray-700/30",
              "shadow-xl",
              "transition-all duration-300"
            )}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Información de Última Posición
                  <Badge
                    variant={selectedPosition.isRecent ? "default" : "destructive"}
                    className={cn(
                      "font-bold transition-all duration-200",
                      selectedPosition.isRecent ? [
                        "bg-green-500 hover:bg-green-600 text-white",
                        "drop-shadow-[0_0_8px_rgba(34,197,94,0.7)]",
                        "hover:drop-shadow-[0_0_12px_rgba(34,197,94,0.9)]"
                      ] : [
                        "bg-red-500 hover:bg-red-600 text-white",
                        "drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]",
                        "hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]"
                      ]
                    )}
                  >
                    {selectedPosition.isRecent ? "Actualización Reciente" : "Actualización Antigua"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className={cn(
                          "text-left p-3",
                          "bg-gradient-to-r from-[#6B9FD4] to-[#5A8DC4]",
                          "text-white",
                          "font-semibold"
                        )}>
                          Información
                        </th>
                        <th className={cn(
                          "text-left p-3",
                          "bg-gradient-to-r from-[#6B9FD4] to-[#5A8DC4]",
                          "text-white",
                          "font-semibold"
                        )}>
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={cn(
                        "border-b transition-all duration-200",
                        "hover:bg-muted/50",
                        selectedPosition.isRecent
                          ? "bg-green-50/50 dark:bg-green-950/20"
                          : "bg-red-50/50 dark:bg-red-950/20"
                      )}>
                        <td className="p-3 font-medium">Última Actualización</td>
                        <td className="p-3">{selectedPosition.time}</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-all duration-200">
                        <td className="p-3 font-medium">Latitud</td>
                        <td className="p-3 font-mono">{selectedPosition.lat.toFixed(6)}</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-all duration-200">
                        <td className="p-3 font-medium">Longitud</td>
                        <td className="p-3 font-mono">{selectedPosition.lng.toFixed(6)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading Skeleton mejorado */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center"
          >
            <Card className={cn(
              "w-64",
              "bg-white/90 dark:bg-gray-800/90",
              "backdrop-blur-md",
              "border border-white/20 dark:border-gray-700/30",
              "shadow-xl"
            )}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Skeleton className={cn(
                    "h-4 w-full",
                    "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200",
                    "dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
                  )} />
                  <Skeleton className={cn(
                    "h-4 w-3/4",
                    "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200",
                    "dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
                  )} />
                  <Skeleton className={cn(
                    "h-4 w-1/2",
                    "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200",
                    "dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
                  )} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default LastKnownPositionV2;