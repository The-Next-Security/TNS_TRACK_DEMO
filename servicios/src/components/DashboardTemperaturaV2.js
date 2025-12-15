/**
 * @fileoverview Dashboard de Temperatura V2 - Enhanced Premium UI
 * @description Componente que muestra las temperaturas actuales de diferentes dispositivos con indicadores
 * de conectividad y consumo eléctrico. Versión migrada usando componentes Shadcn/UI y Tailwind CSS.
 * Incluye glassmorphism, gradientes dinámicos, animaciones Framer Motion y efectos premium.
 * @version 2.1.0 - UI Enhancement
 */

import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import { motion } from "framer-motion";
import HeaderV2 from "./HeaderV2";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import { cn } from "../lib/utils";

// Importar las imágenes para los indicadores de conectividad WiFi
import signalWifiIcon from "../assets/images/Connection.gif";
import noSignalWifiIcon from "../assets/images/no-signal_wifi.png";

// Importar los iconos GIF para las categorías de consumo eléctrico
import iconoApagado from '../assets/images/consumo_electrico/electric_consumption_no_connectivity_blink_only.gif';
import iconoBajoConsumo from '../assets/images/consumo_electrico/electric_consumption_lightning_blink_green.gif';
import iconoConsumoMedio from '../assets/images/consumo_electrico/electric_consumption_lightning_blink_yellow.gif';
import iconoConsumoAlto from '../assets/images/consumo_electrico/electric_consumption_lightning_blink_red.gif';

// Mapeo de categorías a iconos
const CATEGORY_ICONS = {
    0: iconoApagado,
    1: iconoBajoConsumo,
    2: iconoConsumoMedio,
    3: iconoConsumoAlto
};

/**
 * Componente de visualización de display de 7 segmentos con efectos premium
 * @param {Object} props - Props del componente
 * @param {number} props.value - Valor numérico a mostrar
 * @param {boolean} props.isOutOfRange - Indica si la temperatura está fuera de rango
 * @returns {React.Element} Display de 7 segmentos con glow effects
 */
const SevenSegmentDisplay = ({ value, isOutOfRange = false }) => {
    const formattedValue = value.toFixed(1).padStart(5, " ");

    // Determinar color basado en si está fuera de umbrales de temperatura
    const getTemperatureColor = () => {
        // ROJO: Temperatura fuera de los umbrales min/max configurados
        if (isOutOfRange) {
            return {
                text: "text-red-500",
                glow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]",
                bg: "bg-gradient-to-br from-gray-900 via-black to-red-950/30"
            };
        }

        // VERDE: Temperatura dentro del rango permitido (minimo <= temp <= maximo)
        // Aplica para todas las cámaras según su grupo de parametrizaciones
        return {
            text: "text-green-400",
            glow: "drop-shadow-[0_0_8px_rgba(34,197,94,0.7)]",
            bg: "bg-gradient-to-br from-gray-900 via-black to-green-950/30"
        };
    };

    const colorScheme = getTemperatureColor();

    return (
        <div className={cn(
            "font-mono text-[2em] px-4 py-2 rounded-xl",
            "flex justify-center items-center text-center",
            "md:text-[1.8em] sm:text-[1.5em] sm:px-3 sm:py-1.5",
            "border-2",
            isOutOfRange ? "border-red-500/60" : "border-green-500/40",
            "shadow-lg",
            "transition-all duration-300",
            colorScheme.bg,
            colorScheme.text,
            colorScheme.glow,
            isOutOfRange && "animate-pulse-slow"
        )}>
            {formattedValue.split("").map((char, index) => (
                <span key={index} className="inline-block text-center font-bold tracking-normal">
                    {char}
                </span>
            ))}
        </div>
    );
};

/**
 * Componente principal del Dashboard de Temperatura V2
 * @description Muestra un grid de tarjetas con información de temperatura de diferentes dispositivos,
 * incluyendo indicadores de conectividad y consumo eléctrico
 * @returns {React.Element} Dashboard completo de temperatura
 */
const DashboardTemperaturaV2 = () => {
    const [temperatureData, setTemperatureData] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [categorias, setCategorias] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTemperatureData();
        const intervalId = setInterval(fetchTemperatureData, 60000);

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
     * Obtiene los datos de temperatura desde la API
     * @async
     * @returns {Promise<void>}
     */
    const fetchTemperatureData = async() => {
        try {
            setError(null);
            const response = await axios.get("/api/ubibot/temperature-dashboard-data");
            if (Array.isArray(response.data) && response.data.length > 0) {
                // Formatear los datos de temperatura
                const formattedData = response.data.map((item) => {
                    // Primero convertir temperatura a float
                    const temperature = parseFloat(item.external_temperature);

                    // Asegurar que is_currently_out_of_range sea siempre 0 o 1
                    let outOfRange;

                    // Validación rigurosa para garantizar valores numéricos correctos
                    if (item.is_currently_out_of_range === null || item.is_currently_out_of_range === undefined) {
                        outOfRange = 0; // Valor por defecto si es null o undefined
                    } else if (typeof item.is_currently_out_of_range === 'string') {
                        // Si es string, convertir a número y asegurar que sea 0 o 1
                        outOfRange = item.is_currently_out_of_range === '0' ? 0 : (item.is_currently_out_of_range === '1' ? 1 : 0);
                    } else {
                        // Para cualquier otro caso, convertir a número y luego a 0 o 1
                        outOfRange = Number(item.is_currently_out_of_range) === 1 ? 1 : 0;
                    }

                    // Convertir explícitamente a entero para evitar problemas de tipo
                    const parsedOutOfRange = parseInt(outOfRange, 10);

                    return {
                        ...item,
                        external_temperature: isNaN(temperature) ? 0 : temperature,
                        is_currently_out_of_range: parsedOutOfRange
                    };
                });

                setTemperatureData(formattedData);
                setIsLoading(false);

                // Una vez que tenemos los datos, obtener las categorías de consumo
                fetchCategoriasPorNombre(formattedData);
            }
        } catch (error) {
            console.error("Error fetching temperature data:", error);
            setError("Error al cargar los datos de temperatura");
            setIsLoading(false);
        }
    };

    /**
     * Obtiene las categorías de consumo eléctrico para cada dispositivo
     * @async
     * @param {Array} devices - Lista de dispositivos de temperatura
     * @returns {Promise<void>}
     */
    const fetchCategoriasPorNombre = async(devices) => {
        try {
            // Conseguir primero los datos eléctricos para obtener el shelly_id
            const electricData = await axios.get('/api/devices/latest-measurements');

            if (!electricData.data.success || !Array.isArray(electricData.data.data)) {
                console.warn('No se pudieron obtener datos eléctricos para las categorías');
                return;
            }

            // Crear un mapa de nombres a dispositivos eléctricos
            const electricDeviceMap = {};
            electricData.data.data.forEach(device => {
                // Normalizar los nombres para correspondencia
                const normalizedName = device.location.trim().toLowerCase().replace(/\s+/g, '');
                electricDeviceMap[normalizedName] = device;
            });

            const categoriasTemp = {};

            // Para cada dispositivo de temperatura, buscar el dispositivo eléctrico correspondiente
            for (const device of devices) {
                if (!device.name) continue;

                // Normalizar el nombre para la búsqueda
                const normalizedName = device.name.trim().toLowerCase().replace(/\s+/g, '');
                const electricDevice = electricDeviceMap[normalizedName];

                // Si no encontramos un dispositivo eléctrico correspondiente, usar categoría 0 (apagado)
                if (!electricDevice) {
                    categoriasTemp[device.channel_id] = 0;
                    continue;
                }

                // Si el dispositivo no tiene potencia activa, asignarle categoría 0 (apagado)
                if (!electricDevice.activePower || electricDevice.activePower === 0) {
                    categoriasTemp[device.channel_id] = 0;
                    continue;
                }

                // Consultar la API para obtener la categoría
                try {
                    const response = await axios.get('/api/consumo/categoria', {
                        params: {
                            valor: electricDevice.activePower,
                            deviceId: electricDevice.deviceId
                        }
                    });

                    if (response.data && response.data.success && response.data.data) {
                        categoriasTemp[device.channel_id] = response.data.data.categoria;
                    } else {
                        categoriasTemp[device.channel_id] = 0; // Valor por defecto: apagado
                    }
                } catch (deviceError) {
                    console.error(`Error al obtener categoría para el dispositivo ${device.name}:`, deviceError);
                    categoriasTemp[device.channel_id] = 0; // Valor por defecto: apagado
                }
            }

            setCategorias(categoriasTemp);
        } catch (error) {
            console.error('Error general obteniendo categorías de consumo:', error);
            // En caso de error, no actualizamos las categorías
        }
    };

    /**
     * Formatea una fecha/timestamp según el dispositivo
     * @param {string|Date} timestamp - Timestamp a formatear
     * @returns {string} Fecha formateada
     */
    const formatDate = (timestamp) => {
        if (!timestamp) return "";

        if (isMobile) {
            // Formato abreviado para móviles
            return moment(timestamp).format("DD/MM HH:mm");
        } else {
            // Formato completo para escritorio
            return moment(timestamp).format("DD/MM/YYYY HH:mm");
        }
    };

    /**
     * Obtiene el icono correspondiente a la categoría de consumo
     * @param {string|number} channelId - ID del canal del dispositivo
     * @returns {string} URL del icono a mostrar
     */
    const getCategoryIcon = (channelId) => {
        const categoria = categorias[channelId] !== undefined ? categorias[channelId] : 0;
        return CATEGORY_ICONS[categoria] || CATEGORY_ICONS[0]; // Usar icono de apagado por defecto
    };

    // Renderizado condicional para estado de carga
    if (isLoading) {
        return (
            <div className="p-5 bg-gray-50 min-h-screen w-full">
                <HeaderV2 title="Temperatura Actual" />
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

    // Renderizado condicional para estado de error
    if (error) {
        return (
            <div className="p-5 bg-gray-50 min-h-screen w-full">
                <HeaderV2 title="Temperatura Actual" />
                <div className="w-full max-w-[1200px] mx-auto p-5">
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20 sm:p-2.5">
            <HeaderV2 title="Temperatura Actual" />

            <div className="w-full max-w-[1400px] mx-auto p-6 sm:p-3">
                {/* ============================================ */}
                {/* TEMPERATURE GRID - Displays de 7 segmentos  */}
                {/* ============================================ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-4">
                    {temperatureData.map((item, index) => {
                        // TEMPERATURA: Fuera de umbrales min/max (para color del display)
                        const isOutOfRange = item.is_temperature_out_of_range == 1;

                        // CONECTIVIDAD: WiFi online/offline (para icono de señal)
                        const isOffline = item.is_currently_out_of_range == 1;

                        const categoria = categorias[item.channel_id] !== undefined ? categorias[item.channel_id] : 0;

                        // Determinar esquema de color basado en umbrales de temperatura
                        const getCardColorScheme = () => {
                            // ROJO: Temperatura fuera de rango (< minimo O > maximo)
                            if (isOutOfRange) {
                                return {
                                    border: "border-red-500/50",
                                    borderGradient: "bg-gradient-to-br from-red-500/30 via-red-600/20 to-orange-500/30",
                                    ring: "ring-red-500/20",
                                    shadow: "shadow-red-500/20 hover:shadow-red-500/40"
                                };
                            }

                            // VERDE: Temperatura dentro de rango permitido (minimo <= temp <= maximo)
                            // Funciona para ambos grupos: param_id 7 y param_id 8
                            return {
                                border: "border-green-500/40",
                                borderGradient: "bg-gradient-to-br from-green-400/20 via-emerald-500/15 to-green-600/20",
                                ring: "ring-green-500/15",
                                shadow: "shadow-green-500/15 hover:shadow-green-500/30"
                            };
                        };

                        const colorScheme = getCardColorScheme();

                        return (
                            <motion.div
                                key={item.channel_id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.08,
                                    ease: "easeOut"
                                }}
                                whileHover={{ scale: 1.02, y: -4 }}
                                className="w-full"
                            >
                                <Card
                                    className={cn(
                                        "relative overflow-hidden",
                                        "bg-gradient-to-br from-gray-900 via-black to-gray-800",
                                        "backdrop-blur-sm",
                                        "border-2",
                                        colorScheme.border,
                                        "ring-1",
                                        colorScheme.ring,
                                        "shadow-2xl",
                                        colorScheme.shadow,
                                        "transition-all duration-300",
                                        "group"
                                    )}
                                >
                                    {/* Top accent gradient bar */}
                                    <div className={cn(
                                        "absolute top-0 left-0 right-0 h-1",
                                        colorScheme.borderGradient
                                    )} />

                                    <CardContent className="p-4 flex flex-row items-center gap-3 sm:p-3 sm:gap-2">
                                        {/* ============================================ */}
                                        {/* LAYOUT HORIZONTAL: Iconos | Info | Display  */}
                                        {/* ============================================ */}

                                        {/* ICONOS - Extremo izquierdo */}
                                        <div className="flex flex-col gap-2 flex-shrink-0">
                                            {/* Signal indicator - Basado en CONECTIVIDAD WiFi */}
                                            <img
                                                src={isOffline ? noSignalWifiIcon : signalWifiIcon}
                                                alt={isOffline ? "Sin señal WiFi" : "WiFi conectado"}
                                                className="w-5 h-5 sm:w-4 sm:h-4 object-contain"
                                                title={isOffline ? "Dispositivo fuera de línea" : "Recibiendo datos"}
                                            />

                                            {/* Power consumption indicator - GIF animado */}
                                            <img
                                                src={getCategoryIcon(item.channel_id)}
                                                alt="Consumo eléctrico"
                                                className="w-5 h-5 sm:w-4 sm:h-4 object-contain"
                                                title={
                                                    categoria === 3 ? "Alto consumo" :
                                                    categoria === 2 ? "Consumo medio" :
                                                    categoria === 1 ? "Bajo consumo" :
                                                    "Sin consumo / Apagado"
                                                }
                                            />
                                        </div>

                                        {/* INFORMACIÓN - Centro izquierda */}
                                        <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
                                            {/* Nombre del dispositivo */}
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-sm font-semibold px-2.5 py-0.5 w-fit",
                                                    "bg-white/10 backdrop-blur-sm",
                                                    "border-white/20",
                                                    "text-white",
                                                    "sm:text-xs sm:px-2"
                                                )}
                                            >
                                                {item.name}
                                            </Badge>

                                            {/* Timestamp */}
                                            {item.external_temperature_timestamp && (
                                                <p className="text-[0.7rem] text-gray-400 sm:text-[0.65rem]">
                                                    Act: {formatDate(item.external_temperature_timestamp)}
                                                </p>
                                            )}
                                        </div>

                                        {/* DISPLAY - Derecha */}
                                        <div className="flex-shrink-0">
                                            <SevenSegmentDisplay
                                                value={item.external_temperature}
                                                isOutOfRange={isOutOfRange}
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

export default DashboardTemperaturaV2;