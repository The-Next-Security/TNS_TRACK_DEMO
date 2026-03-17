// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

// Importar Collectors y Servicios principales
const ShellyCollector = require("./collectors/shelly-collector");
const UbibotCollector = require("./collectors/ubibot-collector");
const databaseService = require("./src/services/database_Service");
const energyAveragesService = require("./src/services/energyAverages_Service");
const totalEnergyService = require("./src/services/totalEnergy_Service");

// Importar Rutas — Arquitectura de dominios de negocio (Issue #11)
const energiaRoutes = require('./src/routes/energia_Routes');
const temperaturaRoutes = require('./src/routes/temperatura_Routes');
const reportesRoutes = require('./src/routes/reportes_Routes');
const analisisRoutes = require('./src/routes/analisis_Routes');
const iaRoutes = require('./src/routes/ia_Routes');
const alertasRoutes = require('./src/routes/alertas_Routes');
const semConfigRoutes = require('./src/routes/semConfig_Routes');
const telConfigRoutes = require('./src/routes/telConfig_Routes');
const alertConfigRoutes = require('./src/routes/alertConfig_Routes');
const notifConfigRoutes = require('./src/routes/notifConfig_Routes');
const tariffConfigRoutes = require('./src/routes/tariffConfig_Routes');
const beaconsRoutes = require('./src/routes/beacons_Routes');
const sectoresRoutes = require('./src/routes/sectores_Routes');
// Rutas sin cambio de dominio
const usuariosRoutes = require('./src/routes/usuarios_Routes');
const personalRoutes = require('./src/routes/personal_Routes');
const gpsRoutes = require('./src/routes/gps_Routes');
const blindSpotRoutes = require('./src/routes/blindSpot_Routes');
const pushNotificationRoutes = require('./src/routes/pushNotification_Routes');

// Importar Config Loader (¡Importante!)
const configLoader = require('./src/config/js_files/configLoader_Config');

// Importar servicios de notificación (asegurarse de importar los correctos después de la refactorización)
const emailService = require("./src/services/email/email_Service");
const pushNotificationService = require("./src/services/push/pushNotification_Service");
const notificationController = require("./src/controllers/notification_Controller.js");
const ubibotController = require("./src/controllers/ubibot_Controller.js");
const notificationService = require("./src/services/notification_Service");
const ubibotService = require("./src/services/ubibot/ubibot_Service");
const shellyApiAdapter = require("./src/services/api/shellyApi_Adapter");
const mapboxApiAdapter = require("./src/services/api/mapboxApi_Adapter");
const openaiService = require("./src/services/openai_Service");
const ubibotServiceAdapter = require("./src/services/ubibot/ubibot_Adapter");
const usuariosController = require("./src/controllers/usuarios_Controller");
const authMiddleware = require("./src/middlewares/auth_Middleware");
const alertTrackingService = require("./src/services/alertTracking_Service");

// Importar job de agregación de métricas de alertas
const metricsAggregationJob = require('./src/jobs/metricsAggregation_Job');

// Importar job de limpieza de reportes expirados (Phase 5 - T045)
const reportCleanupJob = require('./src/jobs/reportCleanup_Job');

// Importar servicio de scheduler de reportes (Phase 4 - T030)
const reportSchedulerService = require('./src/services/reports/reportScheduler_Service');

class Server {
  /**
   * Initializes a new instance of the Server class.
   */
  constructor() {
    console.log("[Server] Constructor: Creando instancia del servidor...");
    this.app = express();
    // Considerar obtener el puerto de la config si es necesario: configLoader.getConfig().server?.port || 1337
    this.port = process.env.PORT || 1337;
    this.shellyCollector = new ShellyCollector();
    this.ubibotCollector = new UbibotCollector();
    this.services = {
      database: databaseService,
      energyAverages: energyAveragesService,
      totalEnergy: totalEnergyService,
      email: emailService,
    };
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    console.log("[Server] Constructor: Configuración básica completada.");
  }

  /**
   * Configures middleware for the application.
   */
  setupMiddleware() {
    console.log("[Server] setupMiddleware: Configurando middleware...");
    const corsOptions = {
      // Ajustar origins según sea necesario para producción
      origin: ["http://localhost:3000", "http://localhost:8080", "https://tns.thenextsecurity.cl" ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    };
    this.app.use(cors(corsOptions));
    this.app.use(express.json()); // Para parsear JSON bodies
    this.app.use(cookieParser());

    // 🔥 Logging básico de requests (ANTES de todo para capturar TODAS las requests)
    this.app.use((req, res, next) => {
      console.log(`[1] [Request] 🔥 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`); // Usar originalUrl
      next();
    });

    // Header Content-Type para rutas API (ya se hace en setupRoutes implícitamente con express.json,
    // pero mantener si hay alguna razón específica)
    this.app.use("/api", (req, res, next) => {
      res.header("Content-Type", "application/json");
      next();
    });

    // Servir archivos estáticos desde 'public'
    console.log("[Server] setupMiddleware: Sirviendo estáticos desde 'public'");
    this.app.use(express.static(path.join(__dirname, "public")));
    this.app.use("/TNSTrack", express.static(path.join(__dirname, "public")));

    // Configuración de CSP
    this.setupContentSecurityPolicy();
    console.log("[Server] setupMiddleware: Middleware configurado.");
  }

  /**
   * Configures the Content Security Policy (CSP).
   * @private
   */
  setupContentSecurityPolicy() {
    // Considerar políticas CSP más específicas y menos permisivas para producción
    // 'unsafe-inline' y 'unsafe-eval' pueden ser riesgosos.
    // Podrías usar hashes o nonces para scripts si es posible.
    this.app.use((req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;" // Añadir style-src y img-src
      );
      next();
    });
  }

  /**
   * Configura las rutas del servidor.
   */
  setupRoutes() {
    console.log("[Server] setupRoutes: Configurando rutas...");
    // Las rutas ya se importaron arriba

    // ✅ Función helper para montar rutas en ambos paths (raíz y /TNSTrack)
    const mountApiRoute = (path, router) => {
      this.app.use(path, router);
      this.app.use(`/TNSTrack${path}`, router); // También bajo /TNSTrack para producción
    };

    // Dominios de negocio — nueva arquitectura (Issue #11)
    mountApiRoute('/api/energia', energiaRoutes);
    mountApiRoute('/api/temperatura', temperaturaRoutes);
    mountApiRoute('/api/reportes', reportesRoutes);
    mountApiRoute('/api/analisis', analisisRoutes);
    mountApiRoute('/api/ia', iaRoutes);
    mountApiRoute('/api/alertas', alertasRoutes);
    // Configuración: 5 routers bajo el mismo prefijo /api/config
    mountApiRoute('/api/config', semConfigRoutes);
    mountApiRoute('/api/config', telConfigRoutes);
    mountApiRoute('/api/config', alertConfigRoutes);
    mountApiRoute('/api/config', notifConfigRoutes);
    mountApiRoute('/api/config', tariffConfigRoutes);
    // Módulos futuros Teltonika (stub 501)
    mountApiRoute('/api/beacons', beaconsRoutes);
    mountApiRoute('/api/sectores', sectoresRoutes);
    // Rutas sin cambio de dominio
    mountApiRoute('/api/usuarios', usuariosRoutes);
    mountApiRoute('/api/personal', personalRoutes);
    mountApiRoute('/api/gps', gpsRoutes);
    mountApiRoute('/api/blindspot', blindSpotRoutes);
    mountApiRoute('/api/push', pushNotificationRoutes);
    const authRoutes = require('./src/routes/auth_Routes');
    mountApiRoute('/api/auth', authRoutes);

    console.log("[Server] setupRoutes: Rutas API montadas (en / y /TNSTrack).");

    // Servir archivos estáticos (ya configurado en setupMiddleware, pero redundante no daña)
    this.app.use(express.static(path.join(__dirname, "public")));

    // Ruta específica para /TNSTrack (SPA entry point)
    this.app.get("/TNSTrack", (req, res) => {
      console.log("[Server] Sirviendo /TNSTrack -> index.html");
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    // Ruta específica para /TNSTrack/* (subrutas de la SPA)
    // Express 5.x requiere nombres explícitos en wildcards
    this.app.get("/TNSTrack/*path", (req, res) => {
      console.log(`[Server] Sirviendo ${req.url} -> index.html`);
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    // Catch-all route para SPA (React Router) - ¡Debe ser el último middleware de rutas!
    // NOTA: Express 5.x requiere nombres explícitos en wildcards ("/*path" en vez de "*")
    // Ref: https://github.com/pillarjs/path-to-regexp/blob/master/History.md#800--2024-01-01
    this.app.get("/*path", (req, res, next) => {
      // Si la petición busca explícitamente un archivo estático conocido o una ruta API, no enviar index.html
      if (req.url.startsWith("/api/") || req.url.includes('.') || req.url.startsWith("/static/")) { // Ajustar patrones según necesidad
        return next(); // Pasar al siguiente middleware (probablemente un 404 si no coincide nada más)
      }
      // Para cualquier otra ruta GET, enviar el index.html para que React Router maneje el frontend routing
      console.log(`[Server] Catch-all: Sirviendo index.html para la ruta ${req.url}`);
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
    console.log("[Server] setupRoutes: Rutas configuradas (incluyendo catch-all).");
  }

  /**
   * Configura el manejo de errores global.
   * @private
   */
  setupErrorHandling() {
    // Middleware de manejo de errores (debe definirse DESPUÉS de todas las rutas)
    this.app.use((err, req, res, next) => {
      // Loguear el error completo en el servidor
      console.error("💥 [Error Handler] Error no controlado:", err.stack || err);

      const status = err.statusCode || err.status || 500;
      const isKnown = !!(err.statusCode || err.status);

      res.status(status).json({
        error: err.name || (isKnown ? "Error" : "Internal Server Error"),
        message: err.message || "Ocurrió un error inesperado en el servidor.",
      });
    });
    console.log("[Server] setupErrorHandling: Manejador de errores global configurado.");
  }

  // handleAsyncRoute no parece usarse, se podría eliminar o implementar en las rutas si es necesario.
  // getServiceStatus podría actualizarse para incluir estado de Email/SMS si se añaden a this.services

  /**
   * Initializes all services and collectors necessary for the server.
   */
  async initializeServices() {
    console.log("⏳ [Server] Inicializando servicios..."); // Log 10

    try {
      // 1. Inicializar DatabaseService
      console.log("  [Server] Inicializando DatabaseService..."); // Log 11
      await this.services.database.initialize();
      const dbConnected = await this.services.database.testConnection();
      if (!dbConnected) {
        // El initialize ya debería haber lanzado error, pero doble chequeo
        throw new Error("Fallo al conectar con la base de datos tras inicialización.");
      }
      console.log("  [Server] DatabaseService inicializado y conectado."); // Log 12

      // 3. Inicializar otros servicios que dependen de la BBDD o config
      console.log("  [Server] Inicializando EnergyAveragesService...");
      await this.services.energyAverages.initialize();
      console.log("  [Server] EnergyAveragesService inicializado.");

      console.log("  [Server] Inicializando TotalEnergyService...");
      await this.services.totalEnergy.initialize();
      console.log("  [Server] TotalEnergyService inicializado.");

      // 4. Inicializar EmailService (usa la instancia importada)
      console.log("  [Server] Inicializando EmailService..."); // Log 13
      await emailService.initialize(); // Asume que initialize es async o devuelve Promise
      if (!emailService.initialized) { // Chequeo adicional
        console.warn("  [Server] EmailService no se inicializó correctamente (ver logs anteriores).");
        // Decidir si continuar o lanzar error
        // throw new Error("Fallo al inicializar EmailService");
      } else {
        console.log("  [Server] EmailService inicializado."); // Log 14
      }

      // 5b. Inicializar PushNotificationService (usa la instancia importada)
      console.log("  [Server] Inicializando PushNotificationService...");
      try {
        await pushNotificationService.initialize(); // Asume que initialize es async o devuelve Promise
        if (!pushNotificationService.initialized) { // Chequeo adicional
          console.warn("  [Server] PushNotificationService no se inicializó correctamente (ver logs anteriores).");
          // No lanzar error - push notifications no es crítico para el funcionamiento del servidor
        } else {
          console.log("  [Server] PushNotificationService inicializado.");
        }
      } catch (pushError) {
        console.error("  [Server] ⚠️ Error al inicializar PushNotificationService:", pushError);
        // No lanzar error - push notifications no es crítico para el funcionamiento del servidor
        console.warn("  [Server] El servidor continuará sin push notifications.");
      }

      // 6. Inicializar Collectors (pueden depender de config o servicios)
      // console.log("  [Server] Iniciando ShellyCollector...");
      // await this.shellyCollector.start();
      // console.log("  [Server] ShellyCollector iniciado.");

      console.log("  [Server] Iniciando UbibotCollector...");
      this.ubibotCollector.init();
      await this.ubibotCollector.start();
      console.log("  [Server] UbibotCollector iniciado.");

      console.log("  [Server] Inicializando NotificationController...");
      try {
        // Asumiendo que notificationController es la instancia singleton importada
        await notificationController.initialize();
        // Verificar si el controlador tiene un flag 'initialized' si se implementa
        if (!notificationController.initialized) {
          throw new Error("NotificationController no se inicializó correctamente (flag).");
        }
        console.log("  [Server] NotificationController inicializado.");
      } catch (controllerError) {
        console.error("  [Server] ¡Fallo CRÍTICO al inicializar NotificationController!", controllerError);
        throw controllerError; // Relanzar para detener el arranque
      }

      // 7. Inicializar job de agregación de métricas de alertas
      console.log("  [Server] Iniciando MetricsAggregationJob...");
      try {
        metricsAggregationJob.start();
        console.log("  [Server] MetricsAggregationJob iniciado (cron: minuto 5 de cada hora).");
      } catch (jobError) {
        console.error("  [Server] ⚠️ Error al iniciar MetricsAggregationJob:", jobError);
        // No lanzar error - el job no es crítico para el funcionamiento del servidor
        console.warn("  [Server] El servidor continuará sin agregación automática de métricas.");
      }

      // 8. Inicializar scheduler de reportes (Phase 4 - T030)
      console.log("  [Server] Cargando schedules activos de reportes...");
      try {
        await reportSchedulerService.loadActiveSchedules();
        console.log("  [Server] Report Scheduler inicializado correctamente.");
      } catch (schedulerError) {
        console.error("  [Server] ⚠️ Error al cargar schedules de reportes:", schedulerError);
        // No lanzar error - el scheduler no es crítico para el funcionamiento del servidor
        console.warn("  [Server] El servidor continuará sin reportes programados automáticos.");
      }

      // 9. Inicializar job de limpieza de reportes expirados (Phase 5 - T045)
      console.log("  [Server] Iniciando ReportCleanupJob...");
      try {
        reportCleanupJob.start();
        console.log("  [Server] ReportCleanupJob iniciado (cron: diario 02:00 AM).");
      } catch (cleanupError) {
        console.error("  [Server] ⚠️ Error al iniciar ReportCleanupJob:", cleanupError);
        // No lanzar error - el job no es crítico para el funcionamiento del servidor
        console.warn("  [Server] El servidor continuará sin limpieza automática de reportes.");
      }

      console.log("✅ [Server] Todos los servicios y colectores inicializados."); // Mover este log aquí
    } catch (error) {
      // Captura cualquier error durante la inicialización de CUALQUIER servicio/collector
      console.error("❌ [Server] Error CRÍTICO durante la inicialización de servicios:", error.message);
      console.error(error.stack); // Loguear stack trace para depuración
      // Relanzar para que lo capture el catch de start() y detenga la aplicación
      throw error;
    }
  }

  /**
   * Inicializa los servicios y arranca el servidor Express.
   */
  async start() {
    console.log("[Server] start: Iniciando secuencia de arranque...");
    try {
      // Llama a la inicialización de servicios y colectores
      await this.initializeServices();

      // Arrancar el listener HTTP solo si la inicialización fue exitosa
      this.server = this.app.listen(this.port, () => {
        // Usar console.info o similar para logs importantes
        console.info(`🚀 Servidor Express escuchando en http://localhost:${this.port}`);
      });

      // Configurar cierre ordenado
      process.on("SIGTERM", () => this.shutdown('SIGTERM')); // Pasar la señal
      process.on("SIGINT", () => this.shutdown('SIGINT')); // Pasar la señal

    } catch (error) {
      // Captura errores de initializeServices
      console.error("💥 [Server] Error FATAL al iniciar el servidor (fallo en inicialización). La aplicación se detendrá.");
      // No necesitamos loguear error.message aquí porque initializeServices ya lo hizo.
      process.exit(1); // Salir con código de error
    }
  }

  /**
   * Cierre ordenado del servidor y sus componentes.
   */
  async shutdown(signal) {
    console.log(`\n⏳ [Server] Recibida señal ${signal}. Iniciando cierre ordenado...`);
    try {
      // 1. Detener servidor HTTP para no aceptar nuevas conexiones
      if (this.server) {
        await new Promise((resolve, reject) => {
          this.server.close((err) => {
            if (err) {
              console.error("  [Server] Error al cerrar servidor HTTP:", err);
              return reject(err);
            }
            console.log("  ✅ [Server] Servidor HTTP detenido.");
            resolve();
          });
          // Añadir un timeout por si close() se queda colgado
          setTimeout(() => reject(new Error("Timeout al cerrar servidor HTTP")), 5000);
        });
      }

      // 2. Detener colectores y jobs
      console.log("  [Server] Deteniendo colectores...");
      if (this.shellyCollector?.stop) this.shellyCollector.stop(); // Usar optional chaining
      console.log("  ✅ [Server] ShellyCollector detenido.");
      if (this.ubibotCollector?.stop) this.ubibotCollector.stop();
      console.log("  ✅ [Server] UbibotCollector detenido.");

      console.log("  [Server] Deteniendo MetricsAggregationJob...");
      if (metricsAggregationJob?.stop) metricsAggregationJob.stop();
      console.log("  ✅ [Server] MetricsAggregationJob detenido.");

      console.log("  [Server] Deteniendo ReportCleanupJob...");
      if (reportCleanupJob?.stop) reportCleanupJob.stop();
      console.log("  ✅ [Server] ReportCleanupJob detenido.");

      // 3. Cerrar conexión a base de datos
      console.log("  [Server] Cerrando conexión a base de datos...");
      if (this.services.database?.close) { // Usar optional chaining
        await this.services.database.close();
        console.log("  ✅ [Server] Conexión a base de datos cerrada.");
      }


      // 4. (Opcional) Detener otros servicios si tienen lógica de cleanup
      // if (emailService?.stop) await emailService.stop();

      console.log("🏁 [Server] Cierre ordenado completado.");
      process.exit(0); // Salir sin error

    } catch (error) {
      console.error("❌ [Server] Error durante el cierre ordenado:", error);
      process.exit(1); // Salir con error si el cierre falla
    }
  }
}

// --- Arranque del Servidor ---
async function boot() {
  // Fase 1+2: cargar configuración desde connection-config.json + BD
  // DEBE ejecutarse antes de instanciar Server (los servicios usan configLoader.getConfig())
  console.log("[Init] Cargando configuración desde BD...");
  await configLoader.initialize();

  // Módulos que dependen de config: inicializar tras configLoader.initialize()
  ubibotController.init();
  notificationService.init();
  notificationController.init();
  ubibotService.init();
  shellyApiAdapter.init();
  mapboxApiAdapter.init();
  openaiService.init();
  await ubibotServiceAdapter.init();
  reportCleanupJob.init();
  usuariosController.init();
  reportSchedulerService.init();
  authMiddleware.init();
  alertTrackingService.init();

  console.log("[Init] Creando instancia del servidor...");
  const server = new Server();
  console.log("[Init] Llamando a server.start()...");
  await server.start();

  // Exportar para posibles pruebas o uso programático
  module.exports = {
    server,
    app: server.app,
  };
}

boot().catch((err) => {
  const details = [
    err.message,
    err.code && `[code: ${err.code}]`,
    err.sqlMessage && `[sqlMessage: ${err.sqlMessage}]`,
    err.errno != null && `[errno: ${err.errno}]`,
  ].filter(Boolean).join(' ');
  console.error("💥 [Init] Error fatal al arrancar la aplicación:", details);
  console.error(err.stack);
  process.exit(1);
});
