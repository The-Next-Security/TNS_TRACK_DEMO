/**
 * @fileoverview LastKnownPositionV2 - Componente de última posición conocida migrado a Shadcn/UI
 * @module LastKnownPositionV2
 * @requires mapbox-gl - Biblioteca para renderizado de mapas
 * @requires axios - Cliente HTTP para peticiones API
 * @requires moment - Manejo de fechas y timestamps
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
 *
 * Migrado a Shadcn/UI v2.0 con componentes:
 * - Card para contenedores
 * - Button para acciones
 * - Select para selección de dispositivos
 * - Alert para mensajes de error
 * - Badge para indicadores de estado
 * - Skeleton para estados de carga
 */

import "mapbox-gl/dist/mapbox-gl.css";

import React, { useState, useEffect, useRef } from "react";
import MapboxGL from "mapbox-gl";
import axios from "axios";
import moment from "moment";
import HeaderV2 from "./HeaderV2";
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
        const response = await axios.get("/api/devices/devices");
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
        const currentTime = moment().valueOf();
        const tenMinutesAgo = moment().subtract(10, "minutes").valueOf();
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

        const formattedTime = moment(position.timestamp).format(
          "DD-MM-YYYY, HH:mm:ss"
        );

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
    <div className="min-h-screen bg-background">
      {showHeader && <HeaderV2 title="Ubicación Exteriores Tiempo Real" />}

      {/* Error Alert usando Shadcn Alert */}
      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Device Selection Card - Reemplaza device-selection-popup */}
      <Card className={cn(
        "absolute z-50",
        "top-24 left-1/2 -translate-x-1/2",
        "w-80 shadow-lg"
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
            <SelectTrigger className="w-full">
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
            className="w-full"
            variant={isLoading ? "secondary" : "default"}
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

      {/* Map Container - Preservando estilo original */}
      <div
        id="map"
        className={cn(
          "h-[800px] w-full",
          showHeader ? "mt-[150px]" : "mt-0"
        )}
      />

      {/* No Data Message */}
      {selectedDeviceId && positions.length === 0 && !error && (
        <Alert className="mx-4 mt-4">
          <AlertDescription>
            Sin datos disponibles para el dispositivo seleccionado.
          </AlertDescription>
        </Alert>
      )}

      {/* Position Information Table - Migrada a Card con estilos Tailwind */}
      {showTable && selectedPosition && (
        <Card className="mx-4 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Información de Última Posición
              <Badge
                variant={selectedPosition.isRecent ? "default" : "destructive"}
                className={cn(
                  selectedPosition.isRecent
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
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
                      "bg-secondary text-secondary-foreground",
                      "font-semibold"
                    )}>
                      Información
                    </th>
                    <th className={cn(
                      "text-left p-3",
                      "bg-secondary text-secondary-foreground",
                      "font-semibold"
                    )}>
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={cn(
                    "border-b",
                    selectedPosition.isRecent
                      ? "bg-green-50 dark:bg-green-950/20"
                      : "bg-red-50 dark:bg-red-950/20"
                  )}>
                    <td className="p-3 font-medium">Última Actualización</td>
                    <td className="p-3">{selectedPosition.time}</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">Latitud</td>
                    <td className="p-3 font-mono">{selectedPosition.lat.toFixed(6)}</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">Longitud</td>
                    <td className="p-3 font-mono">{selectedPosition.lng.toFixed(6)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton para mejorar UX */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center">
          <Card className="w-64">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default LastKnownPositionV2;