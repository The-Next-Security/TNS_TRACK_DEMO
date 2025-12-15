/**
 * PersonSearchV2.js - Componente de Búsqueda Histórica de Ubicación Interiores
 * Migrado a Shadcn/UI v2.0
 *
 * @module PersonSearchV2
 * @description Componente para búsqueda histórica de ubicación de personal en interiores.
 * Permite filtrar por dispositivo, fecha y rango horario, mostrando información de
 * permanencia en cada sector con indicadores visuales de estado (semáforo).
 *
 * @features
 * - Búsqueda por dispositivo y rango de fecha/hora
 * - Visualización de plano de sectores
 * - Tabla de resultados con información de permanencia
 * - Sistema de semáforo (verde/amarillo/rojo) según umbrales configurables
 * - Identificación visual de sectores mediante colores
 * - Soporte para múltiples íconos de personal
 *
 * @dependencies
 * - React hooks (useState, useEffect, useRef)
 * - axios para peticiones HTTP
 * - Shadcn/UI components
 * - HeaderV2 component
 * - Imágenes de recursos locales
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import HeaderV2 from "./HeaderV2";
import { cn } from "../lib/utils";

// Shadcn UI Components
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// Import images
import personal1Icon from "../assets/images/forklift_orange_1.png";
import personal2Icon from "../assets/images/forklift_Blue_2.png";
import personal3Icon from "../assets/images/forklift_red_3.png";
import planoSectores from "../assets/images/PLANO_STORAGE_Zonas.jpg";

/**
 * Componente principal de búsqueda histórica de personal
 *
 * @component
 * @returns {JSX.Element} Interfaz de búsqueda con tabla de resultados
 */
function PersonSearchV2() {
  // Estado para la selección de fecha y hora
  const [selectedDay, setSelectedDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Estado para resultados y datos
  const [searchResults, setSearchResults] = useState([]);
  const [umbrales, setUmbrales] = useState({});
  const [devices, setDevices] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Ref para fecha actual
  const today = useRef(new Date().toISOString().split("T")[0]);

  /**
   * Hook para cargar datos iniciales (umbrales, dispositivos, personal)
   */
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const response = await axios.get("/api/config/umbrales");
        setUmbrales(response.data);
      } catch (error) {
        console.error("Error fetching thresholds:", error);
      }
    };
    fetchThresholds();

    const fetchDevices = async () => {
      try {
        const response = await axios.get("/api/devices/devices");
        setDevices(response.data);
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };
    fetchDevices();

    const fetchPersonal = async () => {
      try {
        const response = await axios.get("/api/personal/personal");
        setPersonal(response.data);
      } catch (error) {
        console.error("Error fetching personal:", error);
      }
    };
    fetchPersonal();
  }, []);

  /**
   * Obtiene los resultados de búsqueda desde el API
   */
  const fetchSearchResults = async () => {
    const startDateTime = `${selectedDay}T${startTime}:00`;
    const endDateTime = `${selectedDay}T${endTime}:00`;

    try {
      const response = await axios.get("/api/beacons/beacon-entries-exits", {
        params: {
          startDate: startDateTime,
          endDate: endDateTime,
          device_id: selectedDeviceId,
        },
      });
      console.log("Data received:", response.data);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  };

  /**
   * Limpia los resultados de búsqueda
   */
  const clearSearchResults = () => {
    setSearchResults([]);
  };

  /**
   * Maneja el cambio de dispositivo seleccionado
   * @param {string} value - El valor del dispositivo seleccionado (cuando viene de Shadcn Select)
   * @param {Event} e - El evento (cuando viene de un select HTML nativo - para mantener compatibilidad)
   */
  const handleDeviceChange = (value) => {
    // Si es un evento (retrocompatibilidad), obtener el value del target
    const deviceId = value?.target ? value.target.value : value;
    setSelectedDeviceId(deviceId);
    clearSearchResults();
  };

  /**
   * Maneja la acción de búsqueda con validaciones
   */
  const handleSearch = () => {
    const startDateTime = new Date(`${selectedDay}T${startTime}`);
    const endDateTime = new Date(`${selectedDay}T${endTime}`);
    const currentDate = new Date();

    if (new Date(selectedDay) > currentDate) {
      alert("La fecha seleccionada no puede ser posterior a la fecha actual.");
      return;
    }

    if (endDateTime <= startDateTime) {
      alert("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }

    fetchSearchResults();
  };

  /**
   * Formatea una fecha timestamp para visualización
   *
   * @param {string} timestamp - Timestamp a formatear
   * @returns {string} Fecha formateada o "N/A"
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  /**
   * Obtiene información del sector según el ID del beacon
   *
   * @param {string} beaconId - ID del beacon
   * @returns {Object} Objeto con texto y className del sector
   */
  const getSector = (beaconId) => {
    switch (beaconId) {
      case "0C403019-61C7-55AA-B7EA-DAC30C720055":
        return { text: "E/S Bodega", className: "bg-[#c1ff72] text-black" };
      case "E9EB8F18-61C7-55AA-9496-3AC30C720055":
        return { text: "Farmacia", className: "bg-[#ea9bdd] text-black" };
      case "F7826DA6-BC5B-71E0-893E-4B484D67696F":
        return { text: "Zona L3", className: "bg-[#ffcccb] text-black" };
      case "F7826DA6-BC5B-71E0-893E-6D424369696F":
        return { text: "Calle Central Norte", className: "bg-[#cbfffe] text-black" };
      case "F7826DA6-BC5B-71E0-893E-54654370696F":
        return { text: "Frío 1234", className: "bg-[#f5ffcb] text-black" };
      case "F7826DA6-BC5B-71E0-893E-5A4B6C31454D":
        return { text: "Entrada Poeta", className: "bg-[#ffcccb] text-black" };
      case "F7826DA6-BC5B-71E0-893E-594C35615774":
        return { text: "CalleCentralSur", className: "bg-[#cbfffe] text-black" };
      case "F7826DA6-BC5B-71E0-893E-30334571386D":
        return {
          text: "CalleCentralCentro",
          className: "bg-[#cbfffe] text-black",
        };
      default:
        return { text: "Unknown", className: "bg-gray-200 text-black" };
    }
  };

  /**
   * Calcula el tiempo de permanencia entre entrada y salida
   *
   * @param {string} entrada - Timestamp de entrada
   * @param {string} salida - Timestamp de salida
   * @returns {string} Tiempo formateado en horas y minutos
   */
  const calculatePermanence = (entrada, salida) => {
    const start = new Date(entrada);
    const end = salida ? new Date(salida) : new Date();
    const duration = end - start;

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  /**
   * Obtiene la clase CSS del semáforo según tiempo de permanencia
   *
   * @param {number} permanenceMinutes - Minutos de permanencia
   * @returns {string} Clase CSS para el semáforo
   */
  const getSemaphoreClass = (permanenceMinutes) => {
    if (permanenceMinutes <= umbrales.umbral_verde) {
      return "green";
    } else if (
      permanenceMinutes > umbrales.umbral_verde &&
      permanenceMinutes <= umbrales.umbral_amarillo
    ) {
      return "yellow";
    } else if (permanenceMinutes > umbrales.umbral_amarillo) {
      return "red";
    }

    return "";
  };

  /**
   * Obtiene el ícono de personal según el nombre de imagen
   *
   * @param {string} imageName - Nombre del archivo de imagen
   * @returns {string|null} URL de la imagen o null
   */
  const getPersonalIcon = (imageName) => {
    switch (imageName) {
      case "Personal 1.png":
        return personal1Icon;
      case "Personal 2.png":
        return personal2Icon;
      case "Personal 3.png":
        return personal3Icon;
      default:
        return null;
    }
  };

  /**
   * Obtiene información del personal por ID de dispositivo
   *
   * @param {string} deviceId - ID del dispositivo
   * @returns {Object} Información del personal (nombre e imagen)
   */
  const getPersonalInfo = (deviceId) => {
    const person = personal.find((p) => p.id_dispositivo_asignado === deviceId);
    if (person) {
      return {
        name: person.Nombre_Personal,
        image: getPersonalIcon(person.imagen_asignado),
      };
    }
    return {
      name: "Unknown",
      image: null,
    };
  };

  /**
   * Obtiene el variant de Badge según el estado del semáforo
   *
   * @param {string} semaphoreClass - Clase del semáforo
   * @returns {string} Variant para el Badge
   */
  const getBadgeVariant = (semaphoreClass) => {
    switch (semaphoreClass) {
      case "green":
        return "default";
      case "yellow":
        return "secondary";
      case "red":
        return "destructive";
      default:
        return "outline";
    }
  };

  /**
   * Obtiene el texto del estado según el semáforo
   *
   * @param {string} semaphoreClass - Clase del semáforo
   * @returns {string} Texto descriptivo del estado
   */
  const getStatusText = (semaphoreClass) => {
    switch (semaphoreClass) {
      case "green":
        return "On Time";
      case "yellow":
        return "Over Time";
      case "red":
        return "Past Deadline";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderV2 title="Busqueda Histórica Ubicación Interiores" />

      <div className="container mx-auto p-5">
        {/* Plano de Sectores */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex justify-center">
              <img
                src={planoSectores}
                alt="Plano Sectores"
                className="w-full h-auto max-w-[600px] rounded-lg shadow-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Panel de Búsqueda */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Parámetros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selección de Dispositivo */}
            <div className="w-full max-w-md mx-auto">
              <Label htmlFor="device-select" className="mb-2 block">
                Dispositivo
              </Label>
              <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                <SelectTrigger id="device-select" className="w-full">
                  <SelectValue placeholder="Seleccionar Dispositivo..." />
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

            {/* Selección de Fecha y Hora */}
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex-1 min-w-[200px] max-w-[250px]">
                <Label htmlFor="day-input" className="mb-2 block">
                  Seleccionar Día:
                </Label>
                <Input
                  id="day-input"
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  max={today.current}
                  className="w-full"
                />
              </div>

              <div className="flex-1 min-w-[150px] max-w-[200px]">
                <Label htmlFor="start-time" className="mb-2 block">
                  Hora Inicio:
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex-1 min-w-[150px] max-w-[200px]">
                <Label htmlFor="end-time" className="mb-2 block">
                  Hora Fin:
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime}
                  className="w-full"
                />
              </div>
            </div>

            {/* Botón de Búsqueda */}
            <div className="flex justify-center">
              <Button
                onClick={handleSearch}
                className="px-8"
                size="lg"
              >
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Resultados */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#6b9fd4] text-white">
                      <th className="border border-gray-300 p-2 text-left">Imagen</th>
                      <th className="border border-gray-300 p-2 text-left">Nombre</th>
                      <th className="border border-gray-300 p-2 text-left">Sector</th>
                      <th className="border border-gray-300 p-2 text-left">Desde Detección</th>
                      <th className="border border-gray-300 p-2 text-left">Permanencia</th>
                      <th className="border border-gray-300 p-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((result, index) => {
                      const sector = getSector(result.beaconId);
                      const permanence = calculatePermanence(
                        result.entrada,
                        result.salida
                      );
                      const permanenceMinutes =
                        (new Date(result.salida ? result.salida : new Date()) -
                          new Date(result.entrada)) /
                        (1000 * 60);
                      const semaphoreClass = getSemaphoreClass(permanenceMinutes);
                      const personalInfo = getPersonalInfo(selectedDeviceId);

                      return (
                        <tr
                          key={index}
                          className={cn(
                            "border-b border-gray-200",
                            index % 2 === 1 && "bg-gray-50"
                          )}
                        >
                          <td className="border border-gray-300 p-2">
                            <div className="flex justify-center items-center">
                              {personalInfo.image && (
                                <img
                                  src={personalInfo.image}
                                  alt={personalInfo.name}
                                  className="max-w-[50px] max-h-[50px] object-contain"
                                />
                              )}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2">
                            {personalInfo.name}
                          </td>
                          <td className={cn("border border-gray-300 p-2", sector.className)}>
                            {sector.text}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {formatDate(result.entrada)}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {permanence}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Badge
                              variant={getBadgeVariant(semaphoreClass)}
                              className={cn(
                                semaphoreClass === "green" && "bg-[#4CAF50] text-white",
                                semaphoreClass === "yellow" && "bg-[#dada2d] text-black",
                                semaphoreClass === "red" && "bg-[#be4a4a] text-white"
                              )}
                            >
                              {getStatusText(semaphoreClass)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PersonSearchV2;