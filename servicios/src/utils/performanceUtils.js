// utils/performanceUtils.js
// Utilidades para optimizar el rendimiento del dashboard

/**
 * Debounce function para evitar llamadas excesivas
 */
export const debounce = (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
};

/**
 * Throttle function para limitar la frecuencia de ejecución
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Función para precargar imágenes críticas
 */
export const preloadImages = (imageUrls) => {
    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
};

/**
 * Monitor de performance simple
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.renderCount = 0;
    }

    startTimer(label) {
        this.metrics.set(label, performance.now());
    }

    endTimer(label) {
        const start = this.metrics.get(label);
        if (start) {
            const duration = performance.now() - start;
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            this.metrics.delete(label);
            return duration;
        }
        return 0;
    }

    incrementRender() {
        this.renderCount++;
        if (this.renderCount % 10 === 0) {
            console.log(`🔄 Renders: ${this.renderCount}`);
        }
    }

    logMemoryUsage() {
        if (performance.memory) {
            const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
            console.log(`💾 Memory: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
    }
}

/**
 * Validador de datos para evitar errores en runtime
 */
export const validateTemperatureData = (data) => {
    if (!Array.isArray(data)) {
        console.error('❌ Temperature data must be an array');
        return false;
    }

    const requiredFields = ['channel_id', 'name', 'external_temperature', 'external_temperature_timestamp'];

    return data.every((item, index) => {
        const missingFields = requiredFields.filter(field => !(field in item));
        if (missingFields.length > 0) {
            console.error(`❌ Item ${index} missing fields: ${missingFields.join(', ')}`);
            return false;
        }

        if (typeof item.external_temperature !== 'number' || isNaN(item.external_temperature)) {
            console.error(`❌ Item ${index} has invalid temperature: ${item.external_temperature}`);
            return false;
        }

        return true;
    });
};

/**
 * Función para sanitizar datos de entrada
 */
export const sanitizeTemperatureData = (rawData) => {
    if (!Array.isArray(rawData)) return [];

    return rawData
        .filter(item => item && typeof item === 'object')
        .map(item => ({
            channel_id: String(item.channel_id || ''),
            name: String(item.name || 'Sensor sin nombre').trim(),
            external_temperature: Number(item.external_temperature) || 0,
            is_currently_out_of_range: Number(item.is_currently_out_of_range) === 1 ? 1 : 0,
            external_temperature_timestamp: item.external_temperature_timestamp || new Date().toISOString()
        }))
        .filter(item => item.channel_id); // Filtrar items sin channel_id válido
};

/**
 * Cache manager simple para datos temporales
 */
export class CacheManager {
    constructor(defaultTTL = 30000) {
        this.cache = new Map();
        this.timers = new Map();
        this.defaultTTL = defaultTTL;
    }

    set(key, value, ttl = this.defaultTTL) {
        // Limpiar timer existente
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Guardar valor
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Configurar expiración
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);

        this.timers.set(key, timer);
    }

    get(key) {
        const item = this.cache.get(key);
        return item ? item.value : null;
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        return this.cache.delete(key);
    }

    clear() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            oldestEntry: Math.min(...Array.from(this.cache.values()).map(item => item.timestamp))
        };
    }
}

/**
 * Hook de desarrollo para debugging de renders
 */
export const useRenderLogger = (componentName, props = {}) => {
    if (process.env.NODE_ENV === 'development') {
        const renderCount = React.useRef(0);

        React.useEffect(() => {
            renderCount.current++;
            console.log(`🔄 ${componentName} render #${renderCount.current}`, props);
        });

        React.useEffect(() => {
            return () => {
                console.log(`🔚 ${componentName} unmounted after ${renderCount.current} renders`);
            };
        }, []);
    }
};

/**
 * Utilidad para detectar memory leaks en desarrollo
 */
export const useMemoryLeakDetector = (componentName) => {
    if (process.env.NODE_ENV === 'development') {
        React.useEffect(() => {
            const checkMemory = () => {
                if (performance.memory) {
                    const { usedJSHeapSize } = performance.memory;
                    const memoryMB = usedJSHeapSize / 1024 / 1024;

                    if (memoryMB > 100) { // Umbral de 100MB
                        console.warn(`⚠️ ${componentName}: High memory usage: ${memoryMB.toFixed(2)}MB`);
                    }
                }
            };

            const interval = setInterval(checkMemory, 10000); // Check every 10 seconds
            return () => clearInterval(interval);
        }, [componentName]);
    }
};

// tests/DashboardTemperatura.test.js
// Ejemplo de tests unitarios para el componente refactorizado

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import DashboardTemperatura from '../DashboardTemperatura';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock del componente Header
jest.mock('../Header', () => {
    return function MockHeader({ title }) {
        return <div data-testid="header">{title}</div>;
    };
});

// Datos de prueba
const mockTemperatureData = [
    {
        channel_id: 'CH_001',
        name: 'Cámara Fría 1',
        external_temperature: -2.5,
        is_currently_out_of_range: 0,
        external_temperature_timestamp: '2025-06-21T10:30:00Z'
    },
    {
        channel_id: 'CH_002',
        name: 'Congelador Principal',
        external_temperature: -18.8,
        is_currently_out_of_range: 1,
        external_temperature_timestamp: '2025-06-21T10:29:00Z'
    }
];

const mockElectricData = {
    success: true,
    data: [
        {
            location: 'Cámara Fría 1',
            activePower: 1500,
            deviceId: 'DEV_001'
        },
        {
            location: 'Congelador Principal',
            activePower: 2200,
            deviceId: 'DEV_002'
        }
    ]
};

const mockCategoryResponse = {
    success: true,
    data: { categoria: 2 }
};

describe('DashboardTemperatura', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders loading state initially', () => {
        mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Simular carga infinita

        render(<DashboardTemperatura />);

        expect(screen.getByText(/cargando datos de temperatura/i)).toBeInTheDocument();
    });

    test('renders temperature data correctly', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({ data: mockTemperatureData })
            .mockResolvedValueOnce({ data: mockElectricData })
            .mockResolvedValue({ data: mockCategoryResponse });

        render(<DashboardTemperatura />);

        await waitFor(() => {
            expect(screen.getByText('Cámara Fría 1')).toBeInTheDocument();
            expect(screen.getByText('Congelador Principal')).toBeInTheDocument();
        });

        // Verificar que se muestran las temperaturas
        expect(screen.getByText(/-2.5/)).toBeInTheDocument();
        expect(screen.getByText(/-18.8/)).toBeInTheDocument();
    });

    test('handles API errors gracefully', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network error'));

        render(<DashboardTemperatura />);

        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument();
        });

        // Verificar que hay un botón de reintentar
        const retryButton = screen.getByText(/reintentar/i);
        expect(retryButton).toBeInTheDocument();
    });

    test('retry functionality works', async () => {
        mockedAxios.get
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ data: mockTemperatureData })
            .mockResolvedValueOnce({ data: mockElectricData })
            .mockResolvedValue({ data: mockCategoryResponse });

        render(<DashboardTemperatura />);

        // Esperar el error
        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument();
        });

        // Hacer clic en reintentar
        const retryButton = screen.getByText(/reintentar/i);
        fireEvent.click(retryButton);

        // Esperar que se carguen los datos correctamente
        await waitFor(() => {
            expect(screen.getByText('Cámara Fría 1')).toBeInTheDocument();
        });
    });

    test('displays empty state when no data', async () => {
        mockedAxios.get.mockResolvedValue({ data: [] });

        render(<DashboardTemperatura />);

        await waitFor(() => {
            expect(screen.getByText(/no hay datos de temperatura disponibles/i)).toBeInTheDocument();
        });
    });

    test('formats temperature values correctly', async () => {
        const testData = [{
            ...mockTemperatureData[0],
            external_temperature: 23.456789
        }];

        mockedAxios.get
            .mockResolvedValueOnce({ data: testData })
            .mockResolvedValueOnce({ data: mockElectricData })
            .mockResolvedValue({ data: mockCategoryResponse });

        render(<DashboardTemperatura />);

        await waitFor(() => {
            // Verificar que la temperatura se muestra con 1 decimal
            expect(screen.getByText(/23\.5/)).toBeInTheDocument();
        });
    });

    test('handles responsive design', async () => {
        // Simular pantalla móvil
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 500,
        });

        mockedAxios.get
            .mockResolvedValueOnce({ data: mockTemperatureData })
            .mockResolvedValueOnce({ data: mockElectricData })
            .mockResolvedValue({ data: mockCategoryResponse });

        render(<DashboardTemperatura />);

        await waitFor(() => {
            expect(screen.getByText('Cámara Fría 1')).toBeInTheDocument();
        });

        // Verificar que usa formato móvil para fechas (Act: en lugar de Actualizado:)
        expect(screen.getByText(/Act:/)).toBeInTheDocument();
    });

    test('connectivity icons display correctly', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({ data: mockTemperatureData })
            .mockResolvedValueOnce({ data: mockElectricData })
            .mockResolvedValue({ data: mockCategoryResponse });

        render(<DashboardTemperatura />);

        await waitFor(() => {
            const connectedIcon = screen.getByAltText('Conectado');
            const disconnectedIcon = screen.getByAltText('Desconectado');

            expect(connectedIcon).toBeInTheDocument();
            expect(disconnectedIcon).toBeInTheDocument();
        });
    });

    test('category icons load correctly', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({ data: mockTemperatureData })
            .mockResolvedValueOnce({ data: mockElectricData })
            .mockResolvedValue({ data: mockCategoryResponse });

        render(<DashboardTemperatura />);

        await waitFor(() => {
            const consumptionIcons = screen.getAllByAltText(/consumo nivel/i);
            expect(consumptionIcons).toHaveLength(mockTemperatureData.length);
        });
    });
});

// tests/performanceUtils.test.js
// Tests para las utilidades de performance

import {
    debounce,
    throttle,
    validateTemperatureData,
    sanitizeTemperatureData,
    CacheManager
} from '../utils/performanceUtils';

describe('Performance Utils', () => {
    describe('debounce', () => {
        jest.useFakeTimers();

        test('delays function execution', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 1000);

            debouncedFn();
            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1000);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        test('cancels previous calls', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 1000);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            jest.advanceTimersByTime(1000);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('throttle', () => {
        jest.useFakeTimers();

        test('limits function execution rate', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 1000);

            throttledFn();
            throttledFn();
            throttledFn();

            expect(mockFn).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(1000);
            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(2);
        });
    });

    describe('validateTemperatureData', () => {
        test('validates correct data structure', () => {
            const validData = [
                {
                    channel_id: 'CH_001',
                    name: 'Test Sensor',
                    external_temperature: 25.5,
                    external_temperature_timestamp: '2025-06-21T10:30:00Z'
                }
            ];

            expect(validateTemperatureData(validData)).toBe(true);
        });

        test('rejects invalid data', () => {
            const invalidData = [
                {
                    channel_id: 'CH_001',
                    name: 'Test Sensor'
                    // Faltan campos requeridos
                }
            ];

            expect(validateTemperatureData(invalidData)).toBe(false);
        });

        test('rejects non-array input', () => {
            expect(validateTemperatureData({})).toBe(false);
            expect(validateTemperatureData(null)).toBe(false);
            expect(validateTemperatureData('string')).toBe(false);
        });
    });

    describe('sanitizeTemperatureData', () => {
        test('sanitizes and cleans data', () => {
            const dirtyData = [
                {
                    channel_id: 'CH_001',
                    name: '  Test Sensor  ',
                    external_temperature: '25.5',
                    is_currently_out_of_range: '1'
                },
                {
                    channel_id: null,
                    name: '',
                    external_temperature: 'invalid'
                },
                null,
                undefined
            ];

            const result = sanitizeTemperatureData(dirtyData);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                channel_id: 'CH_001',
                name: 'Test Sensor',
                external_temperature: 25.5,
                is_currently_out_of_range: 1,
                external_temperature_timestamp: expect.any(String)
            });
        });
    });

    describe('CacheManager', () => {
        let cache;

        beforeEach(() => {
            cache = new CacheManager(1000);
            jest.useFakeTimers();
        });

        afterEach(() => {
            cache.clear();
            jest.useRealTimers();
        });

        test('stores and retrieves values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
            expect(cache.has('key1')).toBe(true);
        });

        test('expires values after TTL', () => {
            cache.set('key1', 'value1', 500);
            expect(cache.get('key1')).toBe('value1');

            jest.advanceTimersByTime(600);
            expect(cache.get('key1')).toBe(null);
            expect(cache.has('key1')).toBe(false);
        });

        test('clears all values', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            expect(cache.getStats().size).toBe(2);

            cache.clear();
            expect(cache.getStats().size).toBe(0);
        });

        test('deletes specific keys', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            cache.delete('key1');
            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(true);
        });
    });
});

