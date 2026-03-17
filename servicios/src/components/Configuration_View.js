/**
 * ConfigurationV2.js - Componente de Configuración Migrado a Shadcn/UI v2.0
 *
 * @module ConfigurationV2
 * @description Panel de configuración de parámetros del sistema con gestión completa
 * de sectores, umbrales de semáforo y límites de temperatura.
 * Versión migrada a Shadcn/UI preservando 100% de la funcionalidad original.
 *
 * @requires React
 * @requires axios
 * @requires Shadcn/UI Components
 *
 * @author Sistema de Gestión TNS
 * @version 2.0.0
 * @since 2025-01-03
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HeaderV2 from './Header_View';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Componente principal de configuración del sistema
 *
 * @component
 * @description Gestiona la configuración de parámetros de sectores, umbrales de semáforo
 * y límites de temperatura. Incluye:
 * - Tiempos mínimos y máximos de permanencia por sector
 * - Umbrales verde, amarillo y rojo para semáforo
 * - Límites mínimos y máximos de temperatura
 *
 * @example
 * // Uso básico
 * <ConfigurationV2 />
 *
 * @returns {JSX.Element} Panel de configuración completo
 */
const ConfigurationV2 = () => {
  /**
   * Estado: Lista de sectores disponibles
   * @type {Array<{id: number, nombre: string}>}
   */
  const [sectors, setSectors] = useState([]);

  /**
   * Estado: Configuración actual del sistema
   * @type {Object}
   * @property {string} umbralVerde - Umbral verde en minutos
   * @property {string} umbralAmarillo - Umbral amarillo en minutos
   * @property {string} umbralRojo - Umbral rojo en minutos
   * @property {string} umbralTemperaturaMinimo - Temperatura mínima en °C
   * @property {string} umbralTemperaturaMaximo - Temperatura máxima en °C
   * @property {Object} [beacon_${id}_minTiempoPermanencia] - Tiempo mínimo por beacon
   * @property {Object} [beacon_${id}_maxTiempoPermanencia] - Tiempo máximo por beacon
   */
  const [config, setConfig] = useState({
    umbralVerde: '',
    umbralAmarillo: '',
    umbralRojo: '',
    umbralTemperaturaMinimo: '',
    umbralTemperaturaMaximo: '',
  });

  /**
   * Estado: Indicador de carga
   * @type {boolean}
   */
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Estado: Indica si el endpoint de umbrales de temperatura está deshabilitado (501)
   * @type {boolean}
   */
  const [umbralesDeshabilitados, setUmbralesDeshabilitados] = useState(false);

  /**
   * Estado: Mensaje de feedback al usuario
   * @type {{type: 'success'|'error'|null, message: string}}
   */
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  /**
   * Effect: Carga inicial de sectores y configuración
   * Se ejecuta una sola vez al montar el componente
   */
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        setSectors([]);
      } catch (error) {
        console.error('Error initializing sectors:', error);
      }
    };

    const fetchConfiguration = async () => {
      try {
        const configResponse = await axios.get('/api/config/teltonica/parametros');

        const configData = configResponse.data.reduce((acc, cur) => {
          acc[`beacon_${cur.beacon_id}_minTiempoPermanencia`] = cur.min_tiempo_permanencia;
          acc[`beacon_${cur.beacon_id}_maxTiempoPermanencia`] = cur.max_tiempo_permanencia;
          acc.umbralVerde = cur.umbral_verde;
          acc.umbralAmarillo = cur.umbral_amarillo;
          acc.umbralRojo = cur.umbral_rojo;
          return acc;
        }, {});

        // Cargar umbrales de temperatura de forma independiente — puede retornar 501 (Issue #32)
        try {
          const tempResponse = await axios.get('/api/config/teltonica/temperatura-umbrales');
          const tempData = tempResponse.data;
          configData.umbralTemperaturaMinimo = tempData.minimo;
          configData.umbralTemperaturaMaximo = tempData.maximo;
        } catch (tempError) {
          if (tempError.response?.status === 501) {
            setUmbralesDeshabilitados(true);
            console.info('[Configuration] Umbrales de temperatura deshabilitados temporalmente (Issue #32)');
          } else {
            throw tempError;
          }
        }

        setConfig(configData);
      } catch (error) {
        console.error('Error fetching configuration:', error);
        setFeedback({
          type: 'error',
          message: 'Error al cargar la configuración. Por favor, recargue la página.'
        });
      }
    };

    fetchSectors();
    fetchConfiguration();
  }, []);

  /**
   * Maneja los cambios en los campos del formulario
   *
   * @param {Event} e - Evento de cambio del input
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
    // Limpiar feedback cuando el usuario hace cambios
    if (feedback.message) {
      setFeedback({ type: null, message: '' });
    }
  };

  /**
   * Maneja el envío del formulario y guarda la configuración
   *
   * @param {Event} e - Evento de submit del formulario
   * @async
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback({ type: null, message: '' });

    const configuraciones = sectors.map(sector => ({
      beacon_id: sector.id,
      min_tiempo_permanencia: config[`beacon_${sector.id}_minTiempoPermanencia`] || 0,
      max_tiempo_permanencia: config[`beacon_${sector.id}_maxTiempoPermanencia`] || 0,
      umbral_verde: config.umbralVerde || 0,
      umbral_amarillo: config.umbralAmarillo || 0,
      umbral_rojo: config.umbralRojo || 0,
    }));

    const temperaturaUmbrales = {
      minimo: config.umbralTemperaturaMinimo,
      maximo: config.umbralTemperaturaMaximo,
    };

    try {
      const requests = [axios.post('/api/config/teltonica/parametros', configuraciones)];
      // Omitir POST de temperatura si el endpoint está deshabilitado (Issue #32)
      if (!umbralesDeshabilitados) {
        requests.push(axios.post('/api/config/teltonica/temperatura-umbrales', temperaturaUmbrales));
      }
      await Promise.all(requests);
      setFeedback({
        type: 'success',
        message: 'Configuración guardada exitosamente.'
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      setFeedback({
        type: 'error',
        message: 'Error guardando la configuración. Por favor, intente nuevamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderV2 title="Configuración" />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Feedback Alert */}
          {feedback.message && (
            <Alert
              className={cn(
                "mb-6",
                feedback.type === 'success' && "border-green-500 bg-green-50",
                feedback.type === 'error' && "border-red-500 bg-red-50"
              )}
            >
              <AlertDescription
                className={cn(
                  feedback.type === 'success' && "text-green-800",
                  feedback.type === 'error' && "text-red-800"
                )}
              >
                {feedback.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Parámetros de Sector */}
          <Card>
            <CardHeader>
              <CardTitle>Parámetros de Sector</CardTitle>
              <CardDescription>
                Configure los tiempos de permanencia mínimos y máximos para cada sector
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {sectors.map((sector) => (
                <div key={sector.id} className="space-y-4 pb-4 border-b last:border-0">
                  <h3 className="text-lg font-semibold text-foreground">
                    {sector.nombre}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`beacon_${sector.id}_minTiempoPermanencia`}>
                        Tiempo Mínimo de Permanencia (minutos)
                      </Label>
                      <Input
                        id={`beacon_${sector.id}_minTiempoPermanencia`}
                        type="number"
                        name={`beacon_${sector.id}_minTiempoPermanencia`}
                        value={config[`beacon_${sector.id}_minTiempoPermanencia`] || ''}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`beacon_${sector.id}_maxTiempoPermanencia`}>
                        Tiempo Máximo de Permanencia (minutos)
                      </Label>
                      <Input
                        id={`beacon_${sector.id}_maxTiempoPermanencia`}
                        type="number"
                        name={`beacon_${sector.id}_maxTiempoPermanencia`}
                        value={config[`beacon_${sector.id}_maxTiempoPermanencia`] || ''}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Umbrales de Semáforo */}
          <Card>
            <CardHeader>
              <CardTitle>Umbrales de Semáforo</CardTitle>
              <CardDescription>
                Defina los límites de tiempo para cada estado del semáforo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="umbralVerde">
                    Umbral Verde (minutos)
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full"></div>
                    <Input
                      id="umbralVerde"
                      type="number"
                      name="umbralVerde"
                      value={config.umbralVerde}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="umbralAmarillo">
                    Umbral Amarillo (minutos)
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <Input
                      id="umbralAmarillo"
                      type="number"
                      name="umbralAmarillo"
                      value={config.umbralAmarillo}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="umbralRojo">
                    Umbral Rojo (minutos)
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
                    <Input
                      id="umbralRojo"
                      type="number"
                      name="umbralRojo"
                      value={config.umbralRojo}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Umbrales de Temperatura */}
          <Card>
            <CardHeader>
              <CardTitle>Umbrales de Temperatura</CardTitle>
              <CardDescription>
                Configure los límites de temperatura del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {umbralesDeshabilitados ? (
                <p className="text-sm text-muted-foreground italic">
                  Configuración de temperatura temporalmente no disponible. Pendiente actualización del sistema (Issue #32).
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="umbralTemperaturaMinimo">
                      Temperatura Mínima (°C)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
                        ❄️
                      </span>
                      <Input
                        id="umbralTemperaturaMinimo"
                        type="number"
                        name="umbralTemperaturaMinimo"
                        value={config.umbralTemperaturaMinimo}
                        onChange={handleChange}
                        placeholder="0"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="umbralTemperaturaMaximo">
                      Temperatura Máxima (°C)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500">
                        🔥
                      </span>
                      <Input
                        id="umbralTemperaturaMaximo"
                        type="number"
                        name="umbralTemperaturaMaximo"
                        value={config.umbralTemperaturaMaximo}
                        onChange={handleChange}
                        placeholder="0"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botón de Guardar */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className={cn(
                "min-w-[200px]",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Guardando...
                </span>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigurationV2;