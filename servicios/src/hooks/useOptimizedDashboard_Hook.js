// hooks/useOptimizedDashboard.js
// Hooks personalizados para optimizar el rendimiento del dashboard

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';

// Caché simple en memoria para evitar requests duplicados
const dataCache = new Map();
const CACHE_DURATION = 30000; // 30 segundos

// Utilidad para crear una clave de caché
const createCacheKey = (url, params = {}) => {
    const paramString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return `${url}?${paramString}`;
};

// Utilidad para verificar si los datos en caché son válidos
const isCacheValid = (cacheEntry) => {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
};

/**
 * Hook optimizado para manejo de peticiones HTTP con caché y debounce
 */
export const useOptimizedRequest = (url, options = {}) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(0);

    const {
        debounceMs = 300,
        cacheEnabled = true,
        params = {},
        onSuccess,
        onError
    } = options;

    const abortControllerRef = useRef(null);
    const timeoutRef = useRef(null);

    const fetchData = useCallback(async (forceRefresh = false) => {
        // Cancelar petición anterior si existe
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Crear nueva instancia del abort controller
        abortControllerRef.current = new AbortController();

        const cacheKey = createCacheKey(url, params);

        // Verificar caché si está habilitado y no es refresh forzado
        if (cacheEnabled && !forceRefresh) {
            const cacheEntry = dataCache.get(cacheKey);
            if (isCacheValid(cacheEntry)) {
                setData(cacheEntry.data);
                setError(null);
                return cacheEntry.data;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.get(url, {
                params,
                signal: abortControllerRef.current.signal,
                timeout: 10000 // 10 segundos timeout
            });

            const responseData = response.data;

            // Guardar en caché
            if (cacheEnabled) {
                dataCache.set(cacheKey, {
                    data: responseData,
                    timestamp: Date.now()
                });
            }

            setData(responseData);
            setLastFetch(Date.now());

            if (onSuccess) {
                onSuccess(responseData);
            }

            return responseData;

        } catch (err) {
            if (err.name !== 'AbortError') {
                const errorMessage = err.response?.data?.message || err.message || 'Error en la petición';
                setError(errorMessage);

                if (onError) {
                    onError(err);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [url, params, cacheEnabled, onSuccess, onError]);

    const debouncedFetch = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            fetchData(...args);
        }, debounceMs);
    }, [fetchData, debounceMs]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        data,
        isLoading,
        error,
        fetchData,
        debouncedFetch,
        lastFetch
    };
};

/**
 * Hook para manejar intervalos optimizados con cleanup automático
 */
export const useOptimizedInterval = (callback, delay, dependencies = []) => {
    const savedCallback = useRef(callback);
    const intervalRef = useRef(null);

    // Actualizar callback sin reiniciar el intervalo
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay !== null) {
            intervalRef.current = setInterval(() => {
                savedCallback.current();
            }, delay);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [delay, ...dependencies]);

    const clearCurrentInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    return { clearInterval: clearCurrentInterval };
};

/**
 * Hook para manejo optimizado de datos de temperatura
 */
export const useTemperatureData = () => {
    const [temperatureData, setTemperatureData] = useState([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const processTemperatureData = useCallback((rawData) => {
        if (!Array.isArray(rawData)) return [];

        return rawData.map(item => {
            // Validación y sanitización de datos más robusta
            const temperature = Number(item.external_temperature);
            const outOfRange = Number(item.is_currently_out_of_range);

            return {
                channel_id: item.channel_id,
                name: item.name || 'Sensor sin nombre',
                external_temperature: Number.isFinite(temperature) ? temperature : 0,
                is_currently_out_of_range: outOfRange === 1 ? 1 : 0,
                external_temperature_timestamp: item.external_temperature_timestamp
            };
        });
    }, []);

    const {
        data: rawData,
        isLoading,
        error,
        fetchData,
        lastFetch
    } = useOptimizedRequest('/api/ubibot/temperature-dashboard-data', {
        cacheEnabled: true,
        onSuccess: (data) => {
            if (Array.isArray(data) && data.length > 0) {
                const processed = processTemperatureData(data);
                setTemperatureData(processed);
            } else {
                setTemperatureData([]);
            }
            setIsInitialLoad(false);
        },
        onError: (err) => {
            console.error('Error fetching temperature data:', err);
            setIsInitialLoad(false);
        }
    });

    return {
        temperatureData,
        isLoading: isInitialLoad && isLoading,
        error,
        refreshData: fetchData,
        lastFetch
    };
};

/**
 * Hook para manejo optimizado de categorías de consumo con batching
 */
export const useConsumptionCategories = () => {
    const [categories, setCategories] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const requestQueueRef = useRef([]);
    const processingRef = useRef(false);

    const normalizeDeviceName = useCallback((name) =>
        name?.trim().toLowerCase().replace(/\s+/g, '') || '', []);

    // Procesamiento en lotes para mejorar rendimiento
    const processQueue = useCallback(async () => {
        if (processingRef.current || requestQueueRef.current.length === 0) {
            return;
        }

        processingRef.current = true;
        setIsLoading(true);

        try {
            const devices = requestQueueRef.current.splice(0); // Vaciar la cola

            // Obtener datos eléctricos una sola vez
            const electricResponse = await axios.get('/api/energia/dispositivos/ultimas-mediciones');

            if (!electricResponse.data?.success || !Array.isArray(electricResponse.data.data)) {
                return;
            }

            // Crear mapa de dispositivos eléctricos
            const electricDeviceMap = electricResponse.data.data.reduce((map, device) => {
                const normalizedName = normalizeDeviceName(device.location);
                map[normalizedName] = device;
                return map;
            }, {});

            // Crear todas las peticiones de categoría en paralelo
            const categoryRequests = devices.map(async (device) => {
                const normalizedName = normalizeDeviceName(device.name);
                const electricDevice = electricDeviceMap[normalizedName];

                if (!electricDevice?.activePower) {
                    return { channelId: device.channel_id, category: 0 };
                }

                try {
                    const response = await axios.get('/api/consumo/categoria', {
                        params: {
                            valor: electricDevice.activePower,
                            deviceId: electricDevice.deviceId
                        }
                    });

                    const category = response.data?.success ?
                        (response.data.data?.categoria || 0) : 0;

                    return { channelId: device.channel_id, category };
                } catch (error) {
                    console.error(`Error categoría para ${device.name}:`, error);
                    return { channelId: device.channel_id, category: 0 };
                }
            });

            // Esperar a que todas las peticiones se resuelvan
            const results = await Promise.allSettled(categoryRequests);

            const newCategories = {};
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    const { channelId, category } = result.value;
                    newCategories[channelId] = category;
                }
            });

            setCategories(prevCategories => ({
                ...prevCategories,
                ...newCategories
            }));

        } catch (error) {
            console.error('Error procesando categorías:', error);
        } finally {
            setIsLoading(false);
            processingRef.current = false;
        }
    }, [normalizeDeviceName]);

    const fetchCategories = useCallback((temperatureDevices) => {
        if (!temperatureDevices?.length) return;

        // Agregar dispositivos a la cola
        requestQueueRef.current.push(...temperatureDevices);

        // Procesar la cola de forma asíncrona
        setTimeout(processQueue, 100);
    }, [processQueue]);

    return {
        categories,
        isLoading,
        fetchCategories
    };
};

/**
 * Hook para detectar cambios de responsividad con debounce
 */
export const useResponsive = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setIsMobile(window.innerWidth <= breakpoint);
            }, 150); // Debounce de 150ms
        };

        window.addEventListener('resize', handleResize, { passive: true });

        return () => {
            window.removeEventListener('resize', handleResize);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [breakpoint]);

    return isMobile;
};

/**
 * Hook para manejar estados de error con retry automático
 */
export const useErrorHandler = (retryLimit = 3, retryDelay = 1000) => {
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimeoutRef = useRef(null);

    const handleError = useCallback((err, retryCallback) => {
        setError(err);

        if (retryCount < retryLimit && retryCallback) {
            retryTimeoutRef.current = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                retryCallback();
            }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        }
    }, [retryCount, retryLimit, retryDelay]);

    const clearError = useCallback(() => {
        setError(null);
        setRetryCount(0);
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    return {
        error,
        retryCount,
        canRetry: retryCount < retryLimit,
        handleError,
        clearError
    };
};

/**
 * Hook para manejar visibilidad de la página (para pausar actualizaciones cuando no está visible)
 */
export const usePageVisibility = () => {
    const [isVisible, setIsVisible] = useState(!document.hidden);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isVisible;
};

/**
 * Hook principal que combina toda la lógica optimizada del dashboard
 */
export const useDashboardOptimized = () => {
    const { temperatureData, isLoading: tempLoading, error: tempError, refreshData } = useTemperatureData();
    const { categories, isLoading: categoriesLoading, fetchCategories } = useConsumptionCategories();
    const isMobile = useResponsive();
    const isPageVisible = usePageVisibility();
    const { error, handleError, clearError } = useErrorHandler();

    // Configurar actualización automática solo cuando la página es visible
    const { clearInterval } = useOptimizedInterval(
        () => {
            if (isPageVisible) {
                refreshData().catch(err => handleError(err, refreshData));
            }
        },
        isPageVisible ? 60000 : null, // 1 minuto si está visible, null si no
        [isPageVisible, refreshData, handleError]
    );

    // Obtener categorías cuando cambien los datos de temperatura
    useEffect(() => {
        if (temperatureData.length > 0) {
            fetchCategories(temperatureData);
        }
    }, [temperatureData, fetchCategories]);

    // Limpiar error cuando se recuperen los datos
    useEffect(() => {
        if (temperatureData.length > 0 && error) {
            clearError();
        }
    }, [temperatureData, error, clearError]);

    const isLoading = tempLoading && temperatureData.length === 0;
    const hasError = (tempError || error) && temperatureData.length === 0;
    const errorMessage = tempError || error?.message || 'Error desconocido';

    return {
        temperatureData,
        categories,
        isMobile,
        isLoading,
        hasError,
        errorMessage,
        isPageVisible,
        isUpdating: categoriesLoading,
        refreshData: () => refreshData(),
        clearError
    };
};