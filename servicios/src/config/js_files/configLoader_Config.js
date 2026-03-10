// src/config/js_files/configLoader_Config.js
//
// Carga de configuración en dos fases:
//   Fase 1: Lee connection-config.json (síncrono) → credenciales DB
//   Fase 2: Consulta BD con pool temporal → construye config completa anidada
//
// USO OBLIGATORIO al arranque:
//   await configLoader.initialize();   // UNA vez antes de new Server()
//   configLoader.getConfig();          // síncono, usa caché de 5 min

const BaseConfigLoader = require('./baseConfigLoader_Config');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

// Mapeo id_tipo_parametro → tipo de dato para coerción de valores BD
const TIPO_MAP = {
  1: 'STRING',   // VARCHAR / texto libre
  2: 'BOOLEAN',  // true / false
  3: 'STRING',   // texto (reservado)
  4: 'JSON',     // Array o JSON object
  5: 'JSON',     // Recipients (JSON con arrays de teléfonos)
  6: 'FLOAT',    // Decimal (horas, ratios)
  7: 'INTEGER',  // Entero (puerto, intervalo ms, contador)
};

class ConfigLoader extends BaseConfigLoader {
  constructor() {
    super();
    this._initialized = false;
    this.config = null;
    this._connectionConfigPath = path.resolve(
      __dirname,
      '../jsons/connection-config.json'
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Inicialización completa en dos fases. Debe llamarse UNA vez al arranque,
   * ANTES de crear la instancia del servidor.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) {
      console.log('[ConfigLoader] initialize: ya inicializado, omitiendo.');
      return;
    }

    console.log('[ConfigLoader] initialize: iniciando carga de configuración...');

    // Fase 1: credenciales DB desde archivo local
    const connectionData = this._loadPhase1();

    // Fase 2: resto de la configuración desde BD
    await this._loadPhase2(connectionData);

    this._initialized = true;
    console.log(`✅ [ConfigLoader] Configuración lista (entorno: ${connectionData.envKey})`);
  }

  /**
   * Devuelve la configuración completa (síncrono).
   * Requiere que initialize() haya sido llamado previamente.
   * Si el caché expiró, lanza un reload asíncrono en background.
   * @returns {Object}
   */
  getConfig() {
    if (!this._initialized || !this.cachedConfig) {
      throw new Error(
        '[ConfigLoader] getConfig() llamado antes de initialize(). ' +
        'Ejecuta await configLoader.initialize() al inicio de server.js.'
      );
    }

    if (!this.isCacheValid()) {
      this._triggerBackgroundReload();
    }

    return this.cachedConfig;
  }

  /**
   * Recarga la configuración desde BD (async).
   * No afecta getConfig() hasta que la recarga completa.
   * @returns {Promise<Object>}
   */
  async reloadConfig() {
    console.log('[ConfigLoader] reloadConfig: recargando desde BD...');
    const connectionData = this._loadPhase1();
    await this._loadPhase2(connectionData);
    return this.cachedConfig;
  }

  /**
   * Devuelve solo las credenciales de conexión DB (del archivo local).
   * Útil para módulos que necesitan los datos de conexión directamente.
   * @returns {Object} { host, port, username, password, database, pool }
   */
  getConnectionConfig() {
    const connectionData = this._loadPhase1();
    return connectionData.dbCredentials;
  }

  /**
   * Obtiene un valor específico usando notación de punto.
   * @param {string} dotPath - Ejemplo: "jwt.secret"
   * @returns {*} El valor o undefined si no existe
   */
  getValue(dotPath) {
    if (!dotPath || typeof dotPath !== 'string') return undefined;
    try {
      const cfg = this.getConfig();
      return dotPath
        .split('.')
        .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), cfg);
    } catch {
      return undefined;
    }
  }

  /**
   * Verifica si existe un valor en la ruta especificada.
   * @param {string} dotPath
   * @returns {boolean}
   */
  hasConfig(dotPath) {
    return this.getValue(dotPath) !== undefined;
  }

  /**
   * Devuelve información del entorno activo.
   * @returns {{ current: number, name: string }}
   */
  getCurrentEnvironment() {
    const cfg = this.getConfig();
    return cfg.environment || { current: 0, name: 'development' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FASE 1
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lee connection-config.json de forma síncrona.
   * @returns {{ envIndex: number, envKey: string, dbCredentials: Object }}
   * @private
   */
  _loadPhase1() {
    if (!fs.existsSync(this._connectionConfigPath)) {
      throw new Error(
        `[ConfigLoader] Fase 1: archivo de conexión no encontrado en ${this._connectionConfigPath}. ` +
        'Crea servicios/src/config/jsons/connection-config.json con las credenciales BD.'
      );
    }

    const raw = fs.readFileSync(this._connectionConfigPath, 'utf8');
    const parsed = JSON.parse(raw);

    const envIndex = parsed.environment ?? 0;
    const envKey = envIndex === 0 ? 'development' : 'production';

    const dbCredentials = parsed[envKey];
    if (!dbCredentials) {
      throw new Error(
        `[ConfigLoader] Fase 1: no se encontró la clave "${envKey}" en connection-config.json.`
      );
    }

    console.log(`[ConfigLoader] Fase 1: credenciales DB cargadas (entorno: ${envKey})`);
    return { envIndex, envKey, dbCredentials };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FASE 2
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Conecta a BD con pool temporal y carga toda la configuración.
   * @param {{ envIndex, envKey, dbCredentials }} connectionData
   * @private
   */
  async _loadPhase2({ envIndex, envKey, dbCredentials }) {
    console.log('[ConfigLoader] Fase 2: consultando configuración en BD...');

    const tempPool = mysql.createPool({
      host: dbCredentials.host,
      port: dbCredentials.port,
      user: dbCredentials.user || dbCredentials.username,
      password: dbCredentials.password,
      database: dbCredentials.database,
      connectionLimit: 2,
      waitForConnections: true,
    });

    try {
      const [rows] = await tempPool.execute(`
        SELECT
          p.ruta_completa,
          v.valor,
          p.id_tipo_parametro
        FROM gen_cofiguracion_parametros p
        JOIN gen_cofiguracion_valores v
          ON p.id_cofiguracion_parametros = v.id_cofiguracion_parametros
        WHERE p.activo = 1
          AND v.activo = 1
        ORDER BY p.id_cofiguracion_parametros
      `);

      console.log(`[ConfigLoader] Fase 2: ${rows.length} parámetros cargados desde BD.`);

      // Construir objeto anidado desde filas planas
      const bdConfig = this._buildNestedConfig(rows);

      // Agregar aliases de compatibilidad para servicios que usan paths anteriores
      this._applyCompatibilityAliases(bdConfig);

      // Combinar: credenciales DB (Fase 1) + resto de config (BD)
      this.config = {
        ...bdConfig,
        database: dbCredentials,    // credenciales desde connection-config.json
        environment: {
          current: envIndex,
          name: envKey,
        },
      };

      // Validar campos críticos
      this.validateConfig();

      // Actualizar caché
      this.cachedConfig = this.config;
      this.lastLoadTime = Date.now();

    } catch (err) {
      const msg = [
        err.message || '(sin mensaje)',
        err.code && `code: ${err.code}`,
        err.sqlMessage && `sqlMessage: ${err.sqlMessage}`,
        err.errno != null && `errno: ${err.errno}`,
        err.sqlState && `sqlState: ${err.sqlState}`,
      ].filter(Boolean).join(' | ');
      console.error('[ConfigLoader] Fase 2: error al consultar BD:', msg);
      const rich = new Error(`[ConfigLoader] Fase 2: ${msg}`);
      rich.originalError = err;
      throw rich;
    } finally {
      await tempPool.end();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FASE D — buildNestedConfig
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Convierte un array de filas BD en un objeto anidado.
   * Ejemplo: ruta_completa='jwt.secret', valor='abc' → { jwt: { secret: 'abc' } }
   * @param {Array<{ruta_completa: string, valor: string, id_tipo_parametro: number}>} rows
   * @returns {Object}
   * @private
   */
  _buildNestedConfig(rows) {
    const result = {};

    for (const { ruta_completa, valor, id_tipo_parametro } of rows) {
      const parts = ruta_completa.split('.');
      let current = result;

      // Navegar/crear nodos intermedios
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      // Asignar valor final con coerción de tipo
      current[parts[parts.length - 1]] = this._coerceValue(valor, id_tipo_parametro);
    }

    return result;
  }

  /**
   * Coerce un valor string de BD al tipo JS apropiado según id_tipo_parametro.
   * @param {string|null} valor
   * @param {number} tipoId
   * @returns {*}
   * @private
   */
  _coerceValue(valor, tipoId) {
    if (valor === null || valor === undefined) return null;

    const tipoDato = TIPO_MAP[tipoId] || 'STRING';

    switch (tipoDato) {
      case 'INTEGER':
        return parseInt(valor, 10);
      case 'FLOAT':
        return parseFloat(valor);
      case 'BOOLEAN':
        return valor === 'true' || valor === '1';
      case 'JSON':
        try {
          return JSON.parse(valor);
        } catch {
          console.warn(`[ConfigLoader] _coerceValue: no se pudo parsear JSON para valor "${valor}"`);
          return valor;
        }
      default: // STRING
        return valor;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPATIBILIDAD CON PATHS ANTERIORES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Agrega aliases para servicios que usan los paths de unified-config.json.
   * Solo aplica a los casos donde el path en BD difiere del path anterior.
   *
   * NOTA: Eliminar estos aliases a medida que se migren los servicios.
   * @param {Object} cfg - Objeto de config construido desde BD
   * @private
   */
  _applyCompatibilityAliases(cfg) {
    // email.sendgrid_api_key → email.SENDGRID_API_KEY
    if (cfg.email?.sendgrid_api_key !== undefined) {
      cfg.email.SENDGRID_API_KEY = cfg.email.sendgrid_api_key;
    }

    // ubibot.account_key → ubibot.accountKey
    if (cfg.ubibot?.account_key !== undefined) {
      cfg.ubibot.accountKey = cfg.ubibot.account_key;
    }

    // ubibot.token_file → ubibot.tokenFile
    if (cfg.ubibot?.token_file !== undefined) {
      cfg.ubibot.tokenFile = cfg.ubibot.token_file;
    }

    // ubibot.excluded_channels → ubibot.excludedChannels (si algún servicio lo usa)
    if (cfg.ubibot?.excluded_channels !== undefined) {
      cfg.ubibot.excludedChannels = cfg.ubibot.excluded_channels;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valida que los campos críticos estén presentes.
   * Solo valida lo que es imprescindible para el arranque.
   * @throws {Error} Si falta algún campo requerido
   */
  validateConfig() {
    const cfg = this.config;
    if (!cfg) {
      throw new Error('[ConfigLoader] validateConfig: config no está cargada.');
    }

    // ── Base de datos (Fase 1 — connection-config.json)
    const db = cfg.database;
    if (!db || !db.host || !db.port || !db.database || !db.username) {
      throw new Error(
        '[ConfigLoader] Configuración de base de datos incompleta ' +
        '(requiere host, port, database, username en connection-config.json)'
      );
    }

    // ── JWT Secret (crítico — sin esto la autenticación falla)
    if (!cfg.jwt?.secret) {
      throw new Error('[ConfigLoader] Falta jwt.secret en la BD (id=2). ¿Ejecutaste 04_valores_reales.sql?');
    }

    // ── Email API Key (crítico para notificaciones)
    if (!cfg.email?.SENDGRID_API_KEY) {
      console.warn('[ConfigLoader] ⚠️  Falta email.sendgrid_api_key (id=11). Notificaciones por email deshabilitadas.');
    }

    // ── Shelly Cloud API (advertencia — no bloquea arranque)
    if (!cfg.api?.shelly_cloud?.url) {
      console.warn('[ConfigLoader] ⚠️  Falta api.shelly_cloud.url (id=29). Colector Shelly deshabilitado.');
    }

    console.log('[ConfigLoader] validateConfig: validación completada.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Dispara recarga de caché en background sin bloquear getConfig().
   * @private
   */
  _triggerBackgroundReload() {
    this.reloadConfig()
      .then(() => console.log('[ConfigLoader] Caché renovado en background.'))
      .catch(err => console.error('[ConfigLoader] Error en recarga background:', err.message));
  }

  /**
   * Implementación requerida por BaseConfigLoader.
   * En este loader, la carga real se hace en initialize() y reloadConfig().
   * @returns {Object}
   */
  loadConfiguration() {
    return this.getConfig();
  }
}

// Exporta una única instancia (Singleton)
module.exports = new ConfigLoader();
