/**
 * HistoricalMovementsSearchV2.js - Migrado a Shadcn/UI v2.0
 *
 * Componente para búsqueda y visualización de movimientos históricos GPS
 * Permite seleccionar un dispositivo, fecha y rango de horas para visualizar
 * la ruta recorrida en un mapa interactivo con Mapbox
 *
 * @component
 * @requires mapbox-gl
 * @requires axios
 * @requires shadcn/ui
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import HeaderV2 from "./HeaderV2";
import markerIcon from "../assets/images/pinazul.png";
import "../utils/backButtonHandler.js";

// API Keys
const config = require("../config/jsons/config.json");
mapboxgl.accessToken = config.maps.api_key;

/**
 * HistoricalMovementsSearchV2 Component
 *
 * @returns {JSX.Element} Componente de búsqueda de movimientos históricos
 */
const HistoricalMovementsSearchV2 = () => {
  // Estados del componente
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState("");
  const [date, setDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [data, setData] = useState([]);
  const [map, setMap] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const today = useRef(new Date().toISOString().split("T")[0]);

  /**
   * Carga inicial de dispositivos disponibles
   * Se ejecuta al montar el componente
   */
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const result = await axios.get("/api/devices/devices");
        console.log("Fetched devices:", result.data);
        setDevices(result.data);
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };

    fetchDevices();
  }, []);

  /**
   * Maneja el envío del formulario de búsqueda
   * Valida datos y realiza la petición al backend
   *
   * @param {Event} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting form with values:", {
      device,
      date,
      startHour,
      endHour,
    });

    // Validación de fecha
    if (new Date(date) > new Date()) {
      setErrorMessage(
        "La fecha seleccionada no puede ser posterior a la fecha actual."
      );
      return;
    }

    // Validación de horas
    if (startHour >= endHour) {
      setErrorMessage("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }

    try {
      const result = await axios.get("/api/gps/historical-gps-data", {
        params: {
          device_id: device,
          date,
          startHour,
          endHour,
        },
      });
      console.log("Response data:", result.data);
      const validData = result.data.filter(
        (d) => d.latitude !== null && d.longitude !== null
      );
      setData(validData);
      if (validData.length > 0) {
        setErrorMessage("");
        plotRoute(validData);
      } else {
        setErrorMessage("Sin Datos para esa Búsqueda");
      }
    } catch (error) {
      console.error("Error fetching historical GPS data:", error);
      setErrorMessage("Error al buscar los datos GPS históricos");
    }
  };

  /**
   * Dibuja la ruta en el mapa con los datos GPS
   * Crea marcadores y líneas de ruta
   *
   * @param {Array} gpsData - Array de coordenadas GPS
   */
  const plotRoute = (gpsData) => {
    console.log("Plotting route with GPS data:", gpsData);

    if (map) {
      map.remove();
    }

    const mapInstance = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-70.6693, -33.4489],
      zoom: 10,
    });

    const nav = new mapboxgl.NavigationControl();
    mapInstance.addControl(nav, "top-right");

    // Estilizar los controles de navegación
    const navElement = nav._container;
    navElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    navElement.querySelectorAll("button").forEach((button) => {
      button.style.color = "red";
      button.style.backgroundColor = "rgba(0, 0, 0, 0.10)";
      button.style.border = "white";
    });
    navElement.querySelectorAll("svg").forEach((svg) => {
      svg.style.fill = "white";
    });

    setMap(mapInstance);

    const coordinates = gpsData.map((data) => [
      parseFloat(data.longitude),
      parseFloat(data.latitude),
    ]);

    console.log("Coordinates:", coordinates);

    if (coordinates.length > 0) {
      mapInstance.on("load", () => {
        mapInstance.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        });

        mapInstance.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#FF0000",
            "line-width": 6,
          },
        });

        coordinates.forEach((coord) => {
          new mapboxgl.Marker({ element: createCustomMarker() })
            .setLngLat(coord)
            .addTo(mapInstance);
        });

        // Ajustar la vista del mapa a los límites de las coordenadas
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        mapInstance.fitBounds(bounds, { padding: 50 });
      });
    } else {
      console.log("No coordinates to plot.");
    }
  };

  /**
   * Crea un marcador personalizado para el mapa
   *
   * @returns {HTMLElement} Elemento DOM del marcador
   */
  const createCustomMarker = () => {
    const marker = document.createElement("div");
    marker.style.backgroundImage = `url(${markerIcon})`;
    marker.style.width = "20px";
    marker.style.height = "24px";
    marker.style.backgroundSize = "100%";
    return marker;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderV2 title="Ubicación Exteriores Tiempo Real" />

      <div className="p-5">
        {/* Formulario de búsqueda */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Búsqueda de Movimientos Históricos</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selector de dispositivo */}
              <div className="w-full">
                <Label htmlFor="device-select">Dispositivo</Label>
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger id="device-select" className="w-full md:w-[300px]">
                    <SelectValue placeholder="Seleccione un dispositivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.device_asignado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selección de fecha y hora */}
              <div className="space-y-4 md:space-y-0 md:flex md:flex-col md:gap-4">
                {/* Selector de fecha */}
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="date-picker">Fecha</Label>
                  <Input
                    id="date-picker"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={today.current}
                    className="w-full md:w-auto"
                  />
                </div>

                {/* Selectores de hora */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="start-time">Hora de inicio</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="end-time">Hora de fin</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de búsqueda */}
              <Button
                type="submit"
                className={cn(
                  "w-full md:w-auto",
                  "bg-blue-600 hover:bg-blue-700",
                  "text-white font-medium"
                )}
              >
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Mensajes de error */}
        {errorMessage && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription className="font-semibold">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Mapa */}
        <Card className="mb-5">
          <CardContent className="p-0">
            <div
              id="map"
              className={cn(
                "w-full h-[500px]",
                "rounded-lg overflow-hidden"
              )}
            />
          </CardContent>
        </Card>

        {/* Tabla de resultados */}
        {data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Datos de Ubicación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className={cn(
                        "text-left p-3",
                        "bg-gray-50 font-semibold",
                        "border border-gray-200"
                      )}>
                        Hora
                      </th>
                      <th className={cn(
                        "text-left p-3",
                        "bg-gray-50 font-semibold",
                        "border border-gray-200"
                      )}>
                        Latitud
                      </th>
                      <th className={cn(
                        "text-left p-3",
                        "bg-gray-50 font-semibold",
                        "border border-gray-200"
                      )}>
                        Longitud
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 border border-gray-200">
                          {item.timestamp}
                        </td>
                        <td className="p-3 border border-gray-200">
                          {item.latitude}
                        </td>
                        <td className="p-3 border border-gray-200">
                          {item.longitude}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HistoricalMovementsSearchV2;