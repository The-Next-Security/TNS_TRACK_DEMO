/**
 * @fileoverview Dashboard Eléctrico V2 - Enhanced Premium UI
 * @description Componente que muestra el consumo eléctrico actual de diferentes dispositivos
 * con indicadores de categoría de consumo. Diseño consistente con DashboardTemperaturaV2
 * pero con diferenciadores visuales para electricidad (azul/cyan vs verde/rojo).
 * @version 2.0.0 - Redesign to match Temperature Dashboard
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DateTime } from 'luxon';
import { motion } from 'framer-motion';
import HeaderV2 from './Header_View';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '../lib/utils';
import PowerStatusIcon from './icons/PowerStatusIcons';

/**
 * Componente de visualización estilo display digital para consumo eléctrico
 * Similar al SevenSegmentDisplay de temperatura pero con tema eléctrico
 * @param {Object} props - Props del componente
 * @param {number} props.value - Valor de potencia en Watts
 * @param {number} props.category - Categoría de consumo (0-3)
 * @returns {React.Element} Display digital con efectos eléctricos
 */
const ElectricDisplay = ({ value, category = 0 }) => {
  const valueInKw = value / 1000;
  const formattedValue = valueInKw.toFixed(1).padStart(5, ' ');

  // Determinar color basado en la categoría de consumo
  const getElectricColor = () => {
    switch (category) {
      case 3: // Alto consumo
        return {
          text: 'text-red-400',
          glow: 'drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]',
          bg: 'bg-gradient-to-br from-gray-900 via-black to-red-950/30',
          border: 'border-red-500/60'
        };
      case 2: // Consumo medio
        return {
          text: 'text-yellow-400',
          glow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]',
          bg: 'bg-gradient-to-br from-gray-900 via-black to-yellow-950/30',
          border: 'border-yellow-500/60'
        };
      case 1: // Bajo consumo
        return {
          text: 'text-cyan-400',
          glow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
          bg: 'bg-gradient-to-br from-gray-900 via-black to-cyan-950/30',
          border: 'border-cyan-500/60'
        };
      default: // Apagado
        return {
          text: 'text-gray-500',
          glow: 'drop-shadow-[0_0_4px_rgba(107,114,128,0.5)]',
          bg: 'bg-gradient-to-br from-gray-900 via-black to-gray-950/30',
          border: 'border-gray-600/40'
        };
    }
  };

  const colorScheme = getElectricColor();

  return (
    <div className={cn(
      'font-mono text-[2em] px-4 py-2 rounded-xl',
      'flex justify-center items-center text-center',
      'md:text-[1.8em] sm:text-[1.5em] sm:px-3 sm:py-1.5',
      'border-2',
      colorScheme.border,
      'shadow-lg',
      'transition-all duration-300',
      colorScheme.bg,
      colorScheme.text,
      colorScheme.glow,
      category === 3 && 'animate-pulse-slow'
    )}>
      {formattedValue.split('').map((char, index) => (
        <span key={index} className="inline-block text-center font-bold tracking-normal">
          {char}
        </span>
      ))}
      <span className="ml-1 text-[0.6em] text-white/80">kW</span>
    </div>
  );
};

/**
 * Componente principal del Dashboard Eléctrico V2
 * @description Muestra un grid de tarjetas con información de consumo eléctrico,
 * siguiendo el estilo visual del dashboard de temperatura
 * @returns {React.Element} Dashboard completo de electricidad
 */
const DashboardElectricoV2 = () => {
  const [deviceData, setDeviceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [categorias, setCategorias] = useState({});

  useEffect(() => {
    fetchDeviceData();
    const intervalId = setInterval(fetchDeviceData, 60000);

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  /**
   * Obtiene los datos de consumo eléctrico desde la API
   * @async
   * @returns {Promise<void>}
   */
  const fetchDeviceData = async () => {
    try {
      console.log('[DashboardElectrico] 🔄 Iniciando fetchDeviceData...');
      setLoading(true);
      const response = await axios.get('/api/devices/latest-measurements');

      console.log('[DashboardElectrico] 📦 Response from /api/devices/latest-measurements:', {
        status: response.status,
        success: response.data.success,
        dataLength: Array.isArray(response.data.data) ? response.data.data.length : 0,
        data: response.data.data
      });

      if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('[DashboardElectrico] ✅ Datos válidos recibidos, actualizando deviceData...');
        setDeviceData(response.data.data);
        setError(null);
        await fetchCategorias(response.data.data);
      } else {
        console.warn('[DashboardElectrico] ⚠️ No hay datos disponibles o estructura incorrecta');
        setError('No hay datos disponibles');
      }
    } catch (error) {
      console.error('[DashboardElectrico] ❌ Error al cargar los datos:', error);
      setError('Error al cargar los datos');
    } finally {
      console.log('[DashboardElectrico] 🏁 fetchDeviceData completado, loading=false');
      setLoading(false);
    }
  };

  /**
   * Obtiene las categorías de consumo para cada dispositivo
   * @async
   * @param {Array} devices - Lista de dispositivos
   * @returns {Promise<void>}
   */
  const fetchCategorias = async (devices) => {
    try {
      console.log('[DashboardElectrico] 🔄 Iniciando fetchCategorias para', devices.length, 'dispositivos');
      const categoriasTemp = {};

      for (const device of devices) {
        if (!device.activePower || device.activePower === 0) {
          console.log(`[DashboardElectrico] ⚪ Dispositivo ${device.deviceId} (${device.location}) apagado, categoria=0`);
          categoriasTemp[device.deviceId] = 0;
          continue;
        }

        try {
          console.log(`[DashboardElectrico] 🔄 Obteniendo categoría para ${device.deviceId} (${device.location}) con potencia ${device.activePower}W`);
          const response = await axios.get('/api/consumo/categoria', {
            params: {
              valor: device.activePower,
              deviceId: device.deviceId
            }
          });

          console.log(`[DashboardElectrico] 📦 Response categoría para ${device.deviceId}:`, response.data);

          if (response.data && response.data.success && response.data.data) {
            categoriasTemp[device.deviceId] = response.data.data.categoria;
            console.log(`[DashboardElectrico] ✅ Categoría ${response.data.data.categoria} asignada a ${device.deviceId}`);
          } else {
            categoriasTemp[device.deviceId] = 0;
            console.warn(`[DashboardElectrico] ⚠️ Response inválida para ${device.deviceId}, usando categoria=0`);
          }
        } catch (deviceError) {
          console.error(`[DashboardElectrico] ❌ Error al obtener categoría para el dispositivo ${device.deviceId}:`, deviceError);
          categoriasTemp[device.deviceId] = 0;
        }
      }

      console.log('[DashboardElectrico] ✅ Categorías finales:', categoriasTemp);
      setCategorias(categoriasTemp);
    } catch (error) {
      console.error('[DashboardElectrico] ❌ Error general obteniendo categorías de consumo:', error);
      const defaultCategorias = {};
      devices.forEach(device => {
        defaultCategorias[device.deviceId] = 0;
      });
      setCategorias(defaultCategorias);
    }
  };

  /**
   * Formatea una fecha/timestamp según el dispositivo
   * @param {string|Date} timestamp - Timestamp a formatear
   * @returns {string} Fecha formateada
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Sin actualización';

    if (isMobile) {
      return DateTime.fromISO(timestamp).setZone('America/Santiago').toFormat('dd/MM HH:mm');
    } else {
      return DateTime.fromISO(timestamp).setZone('America/Santiago').toFormat('dd/MM/yyyy HH:mm');
    }
  };

  /**
   * Obtiene la categoría de consumo de un dispositivo
   * @param {string} deviceId - ID del dispositivo
   * @returns {number} Categoría (0-3)
   */
  const getCategory = (deviceId) => {
    return categorias[deviceId] !== undefined ? categorias[deviceId] : 0;
  };

  /**
   * Obtiene el nombre de la categoría
   * @param {number} category - Categoría (0-3)
   * @returns {string} Nombre de la categoría
   */
  const getCategoryName = (category) => {
    switch (category) {
      case 1: return 'Bajo Consumo';
      case 2: return 'Consumo Medio';
      case 3: return 'Alto Consumo';
      default: return 'Apagado';
    }
  };

  // Renderizado para estado de carga
  if (loading) {
    console.log('[DashboardElectrico] 🔄 Renderizando estado de carga...');
    return (
      <div className="p-5 bg-gray-50 min-h-screen w-full">
        <HeaderV2 title="Dashboard Eléctrico" />
        <div className="w-full max-w-[1200px] mx-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Renderizado para estado de error
  if (error) {
    console.error('[DashboardElectrico] ❌ Renderizando estado de error:', error);
    return (
      <div className="p-5 bg-gray-50 min-h-screen w-full">
        <HeaderV2 title="Dashboard Eléctrico" />
        <div className="w-full max-w-[1200px] mx-auto p-5">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  console.log('[DashboardElectrico] ✅ Renderizando dashboard con', deviceData.length, 'dispositivos');
  console.log('[DashboardElectrico] 📊 Estado actual:', {
    deviceDataLength: deviceData.length,
    categoriasKeys: Object.keys(categorias).length,
    categorias
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/20 sm:p-2.5">
      <HeaderV2 title="Dashboard Eléctrico" />

      <div className="w-full max-w-[1400px] mx-auto p-6 sm:p-3">
        {/* ============================================ */}
        {/* ELECTRIC GRID - Displays de consumo        */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-4">
          {deviceData.map((item, index) => {
            const category = getCategory(item.deviceId);
            const categoryName = getCategoryName(category);

            // Determinar esquema de color basado en categoría de consumo
            const getCardColorScheme = () => {
              switch (category) {
                case 3: // Alto consumo - ROJO
                  return {
                    border: 'border-red-500/50',
                    borderGradient: 'bg-gradient-to-br from-red-500/30 via-red-600/20 to-orange-500/30',
                    ring: 'ring-red-500/20',
                    shadow: 'shadow-red-500/20 hover:shadow-red-500/40'
                  };
                case 2: // Consumo medio - AMARILLO
                  return {
                    border: 'border-yellow-500/50',
                    borderGradient: 'bg-gradient-to-br from-yellow-400/30 via-yellow-500/20 to-orange-400/30',
                    ring: 'ring-yellow-500/20',
                    shadow: 'shadow-yellow-500/20 hover:shadow-yellow-500/40'
                  };
                case 1: // Bajo consumo - CYAN (diferenciador vs temperatura)
                  return {
                    border: 'border-cyan-500/50',
                    borderGradient: 'bg-gradient-to-br from-cyan-400/30 via-blue-500/20 to-cyan-600/30',
                    ring: 'ring-cyan-500/20',
                    shadow: 'shadow-cyan-500/20 hover:shadow-cyan-500/40'
                  };
                default: // Apagado - GRIS
                  return {
                    border: 'border-gray-600/40',
                    borderGradient: 'bg-gradient-to-br from-gray-500/20 via-gray-600/15 to-gray-700/20',
                    ring: 'ring-gray-500/15',
                    shadow: 'shadow-gray-500/15 hover:shadow-gray-500/30'
                  };
              }
            };

            const colorScheme = getCardColorScheme();

            return (
              <motion.div
                key={item.deviceId}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: 'easeOut'
                }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="w-full"
              >
                <Card
                  className={cn(
                    'relative overflow-hidden',
                    'bg-gradient-to-br from-gray-900 via-black to-gray-800',
                    'backdrop-blur-sm',
                    'border-2',
                    colorScheme.border,
                    'ring-1',
                    colorScheme.ring,
                    'shadow-2xl',
                    colorScheme.shadow,
                    'transition-all duration-300',
                    'group'
                  )}
                >
                  {/* Top accent gradient bar - ELÉCTRICO */}
                  <div className={cn(
                    'absolute top-0 left-0 right-0 h-1',
                    colorScheme.borderGradient
                  )} />

                  <CardContent className="p-4 flex flex-row items-center gap-3 sm:p-3 sm:gap-2">
                    {/* ============================================ */}
                    {/* LAYOUT HORIZONTAL: Icono | Info | Display   */}
                    {/* ============================================ */}

                    {/* ICONO ELÉCTRICO - Extremo izquierdo */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <PowerStatusIcon
                        category={category}
                        className="w-8 h-8 sm:w-7 sm:h-7"
                      />

                      {/* Indicador de alerta para consumo alto */}
                      {category === 3 && (
                        <div className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center">
                          <span className="text-lg animate-pulse">⚠️</span>
                        </div>
                      )}
                    </div>

                    {/* INFORMACIÓN - Centro izquierda */}
                    <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
                      {/* Nombre del dispositivo */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-sm font-semibold px-2.5 py-0.5 w-fit',
                          'bg-white/10 backdrop-blur-sm',
                          'border-white/20',
                          'text-white',
                          'sm:text-xs sm:px-2'
                        )}
                      >
                        {item.location}
                      </Badge>

                      {/* Categoría de consumo */}
                      <p className={cn(
                        'text-[0.7rem] font-medium sm:text-[0.65rem]',
                        category === 3 && 'text-red-400',
                        category === 2 && 'text-yellow-400',
                        category === 1 && 'text-cyan-400',
                        category === 0 && 'text-gray-500'
                      )}>
                        {categoryName}
                      </p>

                      {/* Timestamp */}
                      {item.lastUpdate && (
                        <p className="text-[0.7rem] text-gray-400 sm:text-[0.65rem]">
                          Act: {formatDate(item.lastUpdate)}
                        </p>
                      )}
                    </div>

                    {/* DISPLAY ELÉCTRICO - Derecha */}
                    <div className="flex-shrink-0">
                      <ElectricDisplay
                        value={item.activePower}
                        category={category}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardElectricoV2;
