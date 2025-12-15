// analyticsService.js
// Servicio centralizado para tracking de analytics con PostHog
// Captura eventos de usuario, device info y session data

import posthog from 'posthog-js';

/**
 * Servicio de Analytics para TNS Track Dashboard
 *
 * Eventos trackeados:
 * - user_login: Login exitoso
 * - routine_selected: Selección de routine desde SelectRoutine
 * - user_logout: Cierre de sesión
 * - error_occurred: Errores de aplicación
 *
 * Device info capturado automáticamente por PostHog:
 * - $os, $os_version (Windows/MacOS/iOS/Android)
 * - $browser, $browser_version (Chrome/Firefox/Safari/Edge)
 * - $device_type (Desktop/Mobile/Tablet)
 * - $screen_width, $screen_height (resolución de pantalla)
 * - $viewport_width, $viewport_height (tamaño del viewport)
 */
class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.config = null;
  }

  /**
   * Cargar configuración desde archivo JSON
   * @returns {Promise<Object>} Configuración de PostHog y Clarity
   */
  async loadConfig() {
    try {
      const response = await fetch('/storage/config/jsons/posthog-config.json');
      if (!response.ok) {
        throw new Error(`Error cargando config: ${response.status}`);
      }
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('[Analytics] Error cargando configuración:', error);
      // Config por defecto en caso de error
      this.config = {
        posthog: {
          enabled: false
        }
      };
      return this.config;
    }
  }

  /**
   * Inicializar PostHog con configuración
   * Debe llamarse al inicio de la aplicación (App.js)
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      console.log('[Analytics] Ya está inicializado');
      return;
    }

    try {
      await this.loadConfig();

      if (!this.config.posthog.enabled) {
        console.log('[Analytics] PostHog deshabilitado en configuración');
        return;
      }

      posthog.init(
        this.config.posthog.apiKey,
        {
          api_host: this.config.posthog.apiHost,
          ...this.config.posthog.options,
          // Callback ejecutado cuando PostHog termina de inicializarse
          loaded: (posthog_instance) => {
            console.log('[Analytics] PostHog loaded callback ejecutado');
          }
        }
      );

      this.initialized = true;
      console.log('[Analytics] ✅ PostHog inicializado correctamente');
    } catch (error) {
      console.error('[Analytics] ❌ Error inicializando PostHog:', error);
    }
  }

  /**
   * Verificar si el servicio está habilitado
   * @returns {boolean}
   */
  isEnabled() {
    return this.initialized && this.config?.posthog?.enabled;
  }

  /**
   * Identificar usuario en PostHog
   * Debe llamarse después de login exitoso
   * @param {string|number} userId - ID único del usuario
   * @param {Object} userData - Datos adicionales del usuario
   * @param {string} userData.email - Email del usuario
   * @param {string} [userData.name] - Nombre del usuario
   */
  identifyUser(userId, userData = {}) {
    if (!this.isEnabled()) return;

    try {
      posthog.identify(userId.toString(), {
        email: userData.email,
        name: userData.name || userData.email.split('@')[0],
        ...userData
      });
      console.log('[Analytics] Usuario identificado:', userId);
    } catch (error) {
      console.error('[Analytics] Error identificando usuario:', error);
    }
  }

  /**
   * Trackear evento de login exitoso
   * Captura automáticamente: OS, navegador, resolución, device type
   */
  trackLogin() {
    if (!this.isEnabled()) return;

    try {
      posthog.capture('user_login', {
        timestamp: new Date().toISOString(),
        // PostHog captura automáticamente:
        // $os, $os_version, $browser, $browser_version,
        // $device_type, $screen_width, $screen_height,
        // $viewport_width, $viewport_height
      });
      console.log('[Analytics] Login trackeado');
    } catch (error) {
      console.error('[Analytics] Error trackeando login:', error);
    }
  }

  /**
   * Trackear acceso a una routine
   * @param {string} routineName - Nombre de la routine (ej: "Dashboard Eléctrico")
   * @param {string} routePath - Ruta de la routine (ej: "/dashboard-electrico")
   */
  trackRoutineAccess(routineName, routePath) {
    if (!this.isEnabled()) return;

    try {
      posthog.capture('routine_selected', {
        routine_name: routineName,
        routine_path: routePath,
        timestamp: new Date().toISOString(),
      });

      // Agregar como super property para eventos siguientes
      posthog.register({
        current_routine: routineName,
      });

      console.log('[Analytics] Routine trackeada:', routineName);
    } catch (error) {
      console.error('[Analytics] Error trackeando routine:', error);
    }
  }

  /**
   * Trackear salida de una routine (opcional)
   * @param {string} routineName - Nombre de la routine
   */
  trackRoutineExit(routineName) {
    if (!this.isEnabled()) return;

    try {
      posthog.capture('routine_exited', {
        routine_name: routineName,
        timestamp: new Date().toISOString(),
      });

      // Remover super property
      posthog.unregister('current_routine');

      console.log('[Analytics] Salida de routine trackeada:', routineName);
    } catch (error) {
      console.error('[Analytics] Error trackeando salida de routine:', error);
    }
  }

  /**
   * Trackear logout
   * PostHog calculará automáticamente la duración de la sesión
   */
  trackLogout() {
    if (!this.isEnabled()) return;

    try {
      posthog.capture('user_logout', {
        timestamp: new Date().toISOString(),
      });

      // Limpiar identificación del usuario
      posthog.reset();

      console.log('[Analytics] Logout trackeado');
    } catch (error) {
      console.error('[Analytics] Error trackeando logout:', error);
    }
  }

  /**
   * Trackear errores de aplicación
   * @param {string} errorMessage - Mensaje del error
   * @param {Object} errorContext - Contexto adicional del error
   */
  trackError(errorMessage, errorContext = {}) {
    if (!this.isEnabled()) return;

    try {
      posthog.capture('error_occurred', {
        error_message: errorMessage,
        error_context: errorContext,
        timestamp: new Date().toISOString(),
      });
      console.log('[Analytics] Error trackeado:', errorMessage);
    } catch (error) {
      console.error('[Analytics] Error trackeando error:', error);
    }
  }

  /**
   * Trackear evento personalizado
   * @param {string} eventName - Nombre del evento
   * @param {Object} properties - Propiedades del evento
   */
  trackEvent(eventName, properties = {}) {
    if (!this.isEnabled()) return;

    try {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
      console.log('[Analytics] Evento personalizado trackeado:', eventName);
    } catch (error) {
      console.error('[Analytics] Error trackeando evento:', error);
    }
  }

  /**
   * Obtener información del dispositivo actual
   * (Para debugging o uso manual)
   * @returns {Object} Device info
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      online: navigator.onLine,
    };
  }
}

// Exportar instancia singleton
export default new AnalyticsService();
