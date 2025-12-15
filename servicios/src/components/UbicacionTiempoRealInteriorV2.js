/**
 * @fileoverview Componente de ubicación en tiempo real para interiores
 * Muestra la ubicación del personal dentro del almacén usando beacons BLE
 * Versión migrada a Shadcn/UI v2.0
 *
 * @component
 * @requires axios
 * @requires moment
 * @requires Shadcn/UI components
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment';
import { cn } from '../lib/utils';

// Componentes Shadcn/UI
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';

// Componentes custom y assets
import HeaderV2 from './HeaderV2';
import planoBase from '../assets/images/PLANO_STORAGE.jpg';
import personal1Icon from '../assets/images/forklift_orange_1.png';
import personal2Icon from '../assets/images/forklift_Blue_2.png';
import personal3Icon from '../assets/images/forklift_red_3.png';

/**
 * Componente principal para el seguimiento de ubicación en tiempo real en interiores
 *
 * @returns {JSX.Element} Componente renderizado
 */
const UbicacionTiempoRealInteriorV2 = () => {
  // Estados del componente - preservados exactamente como el original
  const [personal, setPersonal] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [devices, setDevices] = useState([]);
  const [latestSectors, setLatestSectors] = useState({});
  const [umbrales, setUmbrales] = useState(null);
  const [currentTime, setCurrentTime] = useState(moment());
  const [activeBeacons, setActiveBeacons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Hook useEffect para cargar datos iniciales
   */
  useEffect(() => {
    fetchData();
    fetchActiveBeacons();
  }, []);

  /**
   * Obtiene todos los datos necesarios del servidor
   * Incluye información del mapa, sectores y umbrales
   */
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mapInfo, sectorInfo, umbralesInfo] = await Promise.all([
        axios.get('/api/sectores/retrive_MapWithQuadrants_information'),
        axios.get('/api/beacons/latest-sectors'),
        axios.get('/api/config/teltonica/umbrales')
      ]);

      setPersonal(mapInfo.data.personal);
      setSectors(mapInfo.data.sectors);
      setDevices(mapInfo.data.devices);
      setUmbrales(umbralesInfo.data);

      const sectorMap = sectorInfo.data.sectors.reduce((acc, item) => {
        acc[item.device_id] = item;
        return acc;
      }, {});
      setLatestSectors(sectorMap);
      setCurrentTime(moment(sectorInfo.data.serverTime));
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtiene la lista de beacons activos
   */
  const fetchActiveBeacons = async () => {
    try {
      const response = await axios.get('/api/beacons/active-beacons');
      const activeBeaconIds = response.data.activeBeaconIds || [];
      console.log('Active Beacons:', activeBeaconIds);
      setActiveBeacons(activeBeaconIds);
    } catch (error) {
      console.error('Failed to fetch active beacons:', error);
    }
  };

  /**
   * Maneja la actualización manual de datos
   */
  const handleRefresh = () => {
    fetchData();
    fetchActiveBeacons();
  };

  /**
   * Obtiene el ícono correspondiente para cada personal
   * @param {string} imageName - Nombre del archivo de imagen
   * @returns {string|null} Ruta del ícono o null
   */
  const getPersonalIcon = (imageName) => {
    switch(imageName) {
      case 'Personal 1.png':
        return personal1Icon;
      case 'Personal 2.png':
        return personal2Icon;
      case 'Personal 3.png':
        return personal3Icon;
      default:
        return null;
    }
  };

  /**
   * Calcula el tiempo de permanencia en el sector actual
   * @param {string} timeSinceDetection - Tiempo desde la última detección
   * @returns {string} Tiempo formateado en HH:mm
   */
  const calculatePermanencia = (timeSinceDetection) => {
    if (!timeSinceDetection) return '00:00';
    return timeSinceDetection;
  };

  /**
   * Determina el color del semáforo según el tiempo transcurrido
   * @param {string} beacon_id - ID del beacon
   * @param {string} timestamp - Marca de tiempo de entrada
   * @returns {string} Clase CSS del semáforo (green, yellow, red o vacío)
   */
  const getSemaphoreClass = useCallback((beacon_id, timestamp) => {
    if (!timestamp || !umbrales) return '';
    const start = moment(timestamp, 'YYYY-MM-DD HH:mm:ss');
    const duration = moment.duration(currentTime.diff(start)).asMinutes();
    const { umbral_verde, umbral_amarillo } = umbrales;
    if (duration <= umbral_verde) {
      return 'green';
    } else if (duration > umbral_verde && duration <= umbral_amarillo) {
      return 'yellow';
    } else if (duration > umbral_amarillo) {
      return 'red';
    }
    return '';
  }, [umbrales, currentTime]);

  /**
   * Obtiene el texto descriptivo del estado del semáforo
   * @param {string} semaphoreClass - Clase del semáforo
   * @returns {string} Texto descriptivo del estado
   */
  const getSemaphoreText = (semaphoreClass) => {
    const texts = {
      green: 'On Time',
      yellow: 'Over Time',
      red: 'Past Deadline',
      '': 'N/A'
    };
    return texts[semaphoreClass];
  };

  /**
   * Define las posiciones de los sectores en el plano
   */
  const sectorPositions = {
    'Zona L3': { bottom: '80%', right: '55%', width: '2%' },
    'Farmacia': { bottom: '25%', right: '55%', width: '2%' },
    'Entrada': { bottom: '10%', right: '64%', width: '2%' },
    'CalleCentralNorte': { bottom: '73%', right: '45%', width: '2%' },
    'Frío 1234': { bottom: '58%', right: '30%', width: '4%' },
    'Entrada Poeta': { bottom: '38%', right: '64%', width: '2%' },
    'CalleCentralCentro': { bottom: '50%', right: '46%', width: '2%' }
  };

  /**
   * Calcula la posición ajustada para múltiples personas en el mismo sector
   * @param {string} sectorName - Nombre del sector
   * @param {number} index - Índice del personal en el sector
   * @returns {Object} Posición con estilos CSS
   */
  const getSectorPosition = (sectorName, index) => {
    const basePosition = sectorPositions[sectorName] || { bottom: '0%', right: '0%', width: '2%' };
    const offset = 5 * index;
    return {
      ...basePosition,
      bottom: `calc(${basePosition.bottom} - ${offset}px)`,
      right: `calc(${basePosition.right} - ${offset}px)`
    };
  };

  /**
   * Renderiza los íconos del personal en el plano
   * @returns {JSX.Element[]} Array de elementos img posicionados
   */
  const renderPersonnelIcons = () => {
    const sectorCounts = {};

    return personal.map((persona, index) => {
      const sectorInfo = latestSectors[persona.id_dispositivo_asignado] || {};
      const sectorName = sectorInfo.sector;
      if (!sectorCounts[sectorName]) {
        sectorCounts[sectorName] = 0;
      }
      const sectorPosition = getSectorPosition(sectorName, sectorCounts[sectorName]);
      sectorCounts[sectorName] += 1;
      console.log('Rendering persona:', persona.Nombre_Personal, 'Sector:', sectorName, 'Position:', sectorPosition);
      return (
        <img
          key={persona.id_personal}
          src={getPersonalIcon(persona.imagen_asignado)}
          alt={persona.Nombre_Personal}
          className="absolute"
          style={{ ...sectorPosition, width: sectorPosition.width }}
        />
      );
    });
  };

  /**
   * Obtiene la variante del Badge según el estado del semáforo
   * @param {string} semaphoreClass - Clase del semáforo
   * @returns {string} Variante del Badge de Shadcn
   */
  const getBadgeVariant = (semaphoreClass) => {
    switch(semaphoreClass) {
      case 'green':
        return 'default';
      case 'yellow':
        return 'secondary';
      case 'red':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderV2 title="Ubicación Tiempo Real Interiores" />

      <div className="container mx-auto px-4 py-6">
        {/* Botón de actualización */}
        <div className="flex justify-center mb-6">
          <Button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar Datos'}
          </Button>
        </div>

        {/* Mensaje de error si existe */}
        {error && (
          <Alert className="mb-6 max-w-4xl mx-auto" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabla de personal */}
        <Card className="mb-8 max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Estado del Personal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-blue-500 text-white">
                    <th className="px-4 py-3 text-center font-medium">Personal</th>
                    <th className="px-4 py-3 text-center font-medium">Nombre</th>
                    <th className="px-4 py-3 text-center font-medium">Sector</th>
                    <th className="px-4 py-3 text-center font-medium">Hora Entrada</th>
                    <th className="px-4 py-3 text-center font-medium">Permanencia (hh:mm)</th>
                    <th className="px-4 py-3 text-center font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8">
                        <div className="flex flex-col items-center gap-3">
                          <Skeleton className="h-8 w-32" />
                          <Skeleton className="h-8 w-48" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </td>
                    </tr>
                  ) : personal.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                        No hay personal registrado
                      </td>
                    </tr>
                  ) : (
                    personal.map((persona) => {
                      const sectorInfo = latestSectors[persona.id_dispositivo_asignado] || {};
                      const horaEntrada = sectorInfo.timestamp
                        ? moment(sectorInfo.timestamp, 'YYYY-MM-DD HH:mm:ss').format('HH:mm')
                        : '-';
                      const permanencia = calculatePermanencia(sectorInfo.timestamp);
                      const semaphoreClass = getSemaphoreClass(sectorInfo.beacon_id, sectorInfo.timestamp);
                      const semaphoreText = getSemaphoreText(semaphoreClass);

                      return (
                        <tr
                          key={persona.id_personal}
                          className={cn(
                            "border-b transition-colors",
                            "hover:bg-muted/50",
                            "even:bg-gray-50"
                          )}
                        >
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <img
                                src={getPersonalIcon(persona.imagen_asignado)}
                                alt={persona.Nombre_Personal}
                                className="h-9 w-auto rounded-full"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">
                            {persona.Nombre_Personal}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sectorInfo.sector || (
                              <span className="text-muted-foreground">Cargando...</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {horaEntrada}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sectorInfo.timeSinceDetection || '00:00'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant={getBadgeVariant(semaphoreClass)}
                              className={cn(
                                "font-bold",
                                semaphoreClass === 'green' && "bg-green-500 hover:bg-green-600 text-white",
                                semaphoreClass === 'yellow' && "bg-yellow-500 hover:bg-yellow-600 text-black",
                                semaphoreClass === 'red' && "bg-red-500 hover:bg-red-600 text-white"
                              )}
                            >
                              {semaphoreText}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Plano del almacén */}
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Mapa de Ubicación</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="relative w-full flex justify-center">
                <div className="relative inline-block" style={{ width: '60%' }}>
                  <img
                    src={planoBase}
                    alt="Plano de la Oficina"
                    className="w-full h-auto"
                  />
                  {renderPersonnelIcons()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UbicacionTiempoRealInteriorV2;