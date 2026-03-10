// src/services/database-service.js
const mysql = require('mysql2/promise');
const config = require('../config/js_files/configLoader_Config');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.connected = false;
    this.config = null;
  }

  /**
   * Inicializa el servicio de base de datos creando el pool de conexiones
   * @returns {Promise<boolean>} - true si la inicialización fue exitosa
   */
  async initialize() {
    try {
      // Cargar configuración
      this.config = config.getConfig().database;
      console.log(`Inicializando conexión a base de datos: ${this.config.host}:${this.config.port}/${this.config.database}`);

      // Crear pool de conexiones
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: this.config.pool.max_size || 10,
        queueLimit: 0
      });

      // Probar conexión
      const connection = await this.pool.getConnection();
      connection.release();

      this.connected = true;
      console.log('✅ Conexión a base de datos establecida correctamente');
      return true;
    } catch (error) {
      this.connected = false;
      console.error('❌ Error al inicializar conexión a base de datos:', error.message);
      return false;
    }
  }

  /**
   * Prueba la conexión a la base de datos
   * @returns {Promise<boolean>} - true si la conexión es exitosa
   */
  async testConnection() {
    if (!this.pool) {
      console.warn('⚠️ El pool de conexiones no ha sido inicializado');
      return false;
    }

    try {
      const connection = await this.pool.getConnection();
      connection.release();
      return true;
    } catch (error) {
      console.error('❌ Error al probar conexión a base de datos:', error.message);
      return false;
    }
  }

  /**
   * Obtiene una conexión del pool
   * @returns {Promise<Object>} - Conexión a la base de datos
   */
  async getConnection() {
    if (!this.pool) {
      throw new Error('El pool de conexiones no ha sido inicializado');
    }
    return await this.pool.getConnection();
  }

  /**
   * Libera una conexión de vuelta al pool
   * @param {Object} connection - Conexión a liberar
   */
  async releaseConnection(connection) {
    if (connection) {
      connection.release();
    }
  }

  /**
   * Cierra el pool de conexiones a la base de datos
   * @returns {Promise<boolean>} - true si se cerró correctamente
   */
  async close() {
    if (!this.pool) {
      return true; // No hay nada que cerrar
    }

    try {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      console.log('✅ Conexión a base de datos cerrada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error al cerrar conexión a base de datos:', error.message);
      return false;
    }
  }

  /**
   * Ejecuta una consulta SQL
   * @param {string} sql - Consulta SQL
   * @param {Array} params - Parámetros para la consulta
   * @returns {Promise<Array>} - Resultados de la consulta
   */
  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('El pool de conexiones no ha sido inicializado');
    }

    try {
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Error en consulta SQL:', error.message);
      throw error;
    }
  }

  /**
   * Ejecuta una consulta SQL en una transacción
   * @param {Function} callback - Función que recibe la conexión y ejecuta operaciones
   * @returns {Promise<any>} - Resultado de la transacción
   */
  async transaction(callback) {
    if (!this.pool) {
      throw new Error('El pool de conexiones no ha sido inicializado');
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Recarga la configuración y reinicia la conexión a la base de datos
   * @returns {Promise<boolean>} - true si la reinicialización fue exitosa
   */
  async reloadConfig() {
    try {
      // Cerrar conexión actual si existe
      if (this.pool) {
        await this.close();
      }

      // Recargar configuración
      config.reloadConfig();

      // Reinicializar con nueva configuración
      return await this.initialize();
    } catch (error) {
      console.error('❌ Error al recargar configuración de base de datos:', error.message);
      return false;
    }
  }

  /**
   * Cambia el entorno de la base de datos (desarrollo/producción) y reinicia la conexión
   * @param {number} envIndex - 0 para desarrollo, 1 para producción
   * @returns {Promise<boolean>} - true si el cambio fue exitoso
   */
  async switchEnvironment(envIndex) {
    try {
      // Cerrar conexión actual si existe
      if (this.pool) {
        await this.close();
      }

      // Cambiar entorno
      config.changeEnvironment(envIndex);

      // Reinicializar con nueva configuración
      return await this.initialize();
    } catch (error) {
      console.error(`❌ Error al cambiar a entorno ${envIndex}:`, error.message);
      return false;
    }
  }

  /**
   * Inserta datos de estado del dispositivo en la base de datos
   * @param {Object} data - Datos del dispositivo a insertar
   * @returns {Promise<Object>} - Resultado de la inserción
   */
  async insertDeviceStatus(data) {
    if (!this.pool) {
      throw new Error('El pool de conexiones no ha sido inicializado');
    }

    // Validación básica de la estructura de datos
    if (!data || !data.device_status) {
      throw new Error("Estructura de datos del dispositivo inválida");
    }

    // Definir resultados por defecto para manejar errores
    let result = {
      success: false,
      message: "No se procesaron los datos",
      insertedRows: 0
    };

    try {
      // Utilizar una transacción para garantizar la integridad de los datos
      return await this.transaction(async (connection) => {
        const deviceStatus = data.device_status;
        const deviceId = deviceStatus.id || 'unknown';
        const timestamp = new Date();
        const emData = deviceStatus["em:0"] || {};
        const tempData = deviceStatus["temperature:0"] || {};

        // Verificar si el dispositivo existe en sem_dispositivos
        const [deviceCheck] = await connection.query(
          "SELECT 1 FROM sem_dispositivos WHERE shelly_id = ?",
          [deviceId]
        );

        // Si el dispositivo no existe, simplemente registrar el evento y continuar
        if (deviceCheck.length === 0) {
          console.log(`Dispositivo ${deviceId} no encontrado en la base de datos. No se almacenarán mediciones.`);
          return {
            success: false,
            message: `Dispositivo ${deviceId} no encontrado en la base de datos`,
            deviceId: deviceId,
            timestamp: timestamp
          };
        }

        // Determinar calidad de lectura — mapear a ENUM('NORMAL', 'ESTIMADO', 'INVALIDO')
        // enrichData() produce: 'GOOD', 'SUSPECT', 'BAD'
        let calidadLectura = 'NORMAL';
        if (deviceStatus.reading_quality) {
          switch (deviceStatus.reading_quality) {
            case 'GOOD':
              calidadLectura = 'NORMAL';
              break;
            case 'SUSPECT':
              calidadLectura = 'ESTIMADO';
              break;
            case 'BAD':
              calidadLectura = 'INVALIDO';
              break;
            default:
              calidadLectura = 'NORMAL';
          }
        }

        // Insertar mediciones para cada fase
        const phases = ['A', 'B', 'C', 'TOTAL'];
        let insertedRows = 0;

        for (const phase of phases) {
          let voltaje = 0;
          let corriente = 0;
          let potenciaActiva = 0;
          let potenciaAparente = 0;
          let factorPotencia = 0;
          let energia_activa = 0;

          // Asignar valores según la fase
          switch (phase) {
            case 'A':
              voltaje = parseFloat(emData.a_voltage || 0);
              corriente = parseFloat(emData.a_current || 0);
              potenciaActiva = parseFloat(emData.a_act_power || 0);
              potenciaAparente = parseFloat(emData.a_aprt_power || 0);
              factorPotencia = parseFloat(emData.a_pf || 0);
              break;
            case 'B':
              voltaje = parseFloat(emData.b_voltage || 0);
              corriente = parseFloat(emData.b_current || 0);
              potenciaActiva = parseFloat(emData.b_act_power || 0);
              potenciaAparente = parseFloat(emData.b_aprt_power || 0);
              factorPotencia = parseFloat(emData.b_pf || 0);
              break;
            case 'C':
              voltaje = parseFloat(emData.c_voltage || 0);
              corriente = parseFloat(emData.c_current || 0);
              potenciaActiva = parseFloat(emData.c_act_power || 0);
              potenciaAparente = parseFloat(emData.c_aprt_power || 0);
              factorPotencia = parseFloat(emData.c_pf || 0);
              break;
            case 'TOTAL':
              // Para el total, promedio de voltajes y suma de corrientes
              voltaje = (
                parseFloat(emData.a_voltage || 0) +
                parseFloat(emData.b_voltage || 0) +
                parseFloat(emData.c_voltage || 0)
              ) / 3;
              corriente = parseFloat(emData.total_current || 0);
              potenciaActiva = parseFloat(emData.total_act_power || 0);
              potenciaAparente = parseFloat(emData.total_aprt_power || 0);
              factorPotencia = parseFloat(emData.total_pf || 0);
              energia_activa = parseFloat(emData.total_act_energy || 0);
              break;
          }

          // Crear objeto de medición
          const medicion = {
            shelly_id: deviceId,
            timestamp_utc: timestamp,
            timestamp_local: timestamp,
            fase: phase,
            voltaje: voltaje,
            corriente: corriente,
            potencia_activa: potenciaActiva,
            potencia_aparente: potenciaAparente,
            factor_potencia: factorPotencia,
            frecuencia: parseFloat(emData.freq || 50),
            energia_activa: energia_activa,
            energia_reactiva: 0, // No disponible directamente en la API Shelly
            calidad_lectura: calidadLectura,
          };

          // Insertar medición
          const [insertResult] = await connection.query(
            "INSERT INTO sem_mediciones SET ?",
            medicion
          );

          insertedRows += insertResult.affectedRows;
        }

        return {
          success: true,
          message: "Datos de dispositivo insertados correctamente",
          deviceId: deviceId,
          timestamp: timestamp,
          insertedRows: insertedRows
        };
      });
    } catch (error) {
      console.error("Error en insertDeviceStatus:", error);
      return {
        success: false,
        message: `Error al insertar datos: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Valida un valor de voltaje
   * @param {number} voltage - Valor de voltaje
   * @returns {string} - Estado de la validación (NORMAL, ALERTA, ERROR)
   */
  validateVoltage(voltage) {
    const minVoltage = 198; // 220V -10%
    const maxVoltage = 242; // 220V +10%

    if (voltage === null || voltage === undefined || voltage === 0) {
      return "ERROR";
    }

    if (voltage >= minVoltage && voltage <= maxVoltage) {
      return "NORMAL";
    }

    if (voltage > 0 && (voltage < minVoltage || voltage > maxVoltage)) {
      return "ALERTA";
    }

    return "ERROR";
  }

  /**
   * Valida un valor de corriente
   * @param {number} current - Valor de corriente
   * @returns {string} - Estado de la validación (NORMAL, ALERTA, ERROR)
   */
  validateCurrent(current) {
    if (current === null || current === undefined) {
      return "ERROR";
    }

    if (current >= 0 && current <= 100) {
      return "NORMAL";
    }

    if (current > 100) {
      return "ALERTA";
    }

    return "ERROR";
  }

  /**
   * Valida un factor de potencia
   * @param {number} pf - Factor de potencia
   * @returns {string} - Estado de la validación (NORMAL, ALERTA, ERROR)
   */
  validatePowerFactor(pf) {
    if (pf === null || pf === undefined) {
      return "ERROR";
    }

    if (Math.abs(pf) >= 0.93) {
      return "NORMAL";
    }

    if (Math.abs(pf) >= 0.85) {
      return "ALERTA";
    }

    return "ERROR";
  }

  /**
   * Solicita reset de contraseña guardando token en gen_password_reset
   * @param {string} email - Email del usuario
   * @param {string} resetToken - Token hasheado con SHA-256 (NO el token plano)
   * @param {Date} resetTokenExpiry - Objeto Date con la fecha de expiración (se inserta como DATETIME en MySQL)
   * @returns {Promise<Object|null>} - Objeto con datos del usuario o null si no existe
   */
  async requestPasswordReset(email, resetToken, resetTokenExpiry) {
    if (!this.pool) {
      throw new Error('El pool de conexiones no ha sido inicializado');
    }

    if (!email || !resetToken || !resetTokenExpiry) {
      throw new Error('Parámetros requeridos: email, resetToken, resetTokenExpiry');
    }

    try {
      return await this.transaction(async (connection) => {
        // 1. Verificar que el usuario existe y está activo
        const [users] = await connection.query(
          'SELECT id_usuario, email FROM gen_usuario WHERE email = ? AND activo = 1',
          [email]
        );

        if (users.length === 0) {
          return null; // Usuario no encontrado (evitar timing attack en capa superior)
        }

        const user = users[0];

        // 2. Eliminar tokens anteriores del usuario
        await connection.query(
          'DELETE FROM gen_password_reset WHERE id_usuario = ?',
          [user.id_usuario]
        );

        // 3. Insertar nuevo token en gen_password_reset
        const [insertResult] = await connection.query(
          'INSERT INTO gen_password_reset (id_usuario, token, fecha_expiracion) VALUES (?, ?, ?)',
          [user.id_usuario, resetToken, resetTokenExpiry]
        );

        if (insertResult.affectedRows === 0) {
          throw new Error('No se pudo guardar el token de reset');
        }

        console.log(`✅ Token de reset generado para usuario (${email})`);

        return {
          success: true,
          userId: user.id_usuario,
          email: user.email
        };
      });
    } catch (error) {
      console.error('❌ Error en requestPasswordReset:', error.message);
      throw error;
    }
  }

  /**
   * Resetea contraseña verificando token y expiración
   * @param {string|null} userId - No usado, mantener por compatibilidad
   * @param {string} newPasswordHash - Contraseña nueva (ya hasheada con bcrypt)
   * @param {string} resetToken - Token de reset (plano)
   * @param {any} unused - No usado, mantener por compatibilidad
   * @returns {Promise<Object|null>} - Objeto con resultado o null si token inválido
   */
  async resetPassword(userId, newPasswordHash, resetToken, unused) {
    if (!this.pool) {
      throw new Error('El pool de conexiones no ha sido inicializado');
    }

    if (!resetToken || !newPasswordHash) {
      throw new Error('Token y nueva contraseña son requeridos');
    }

    try {
      return await this.transaction(async (connection) => {
        // 1. Buscar usuario con token válido y no expirado (comparación en MySQL con NOW())
        const [users] = await connection.query(
          `SELECT g.id_usuario, g.email
           FROM gen_password_reset pr
           JOIN gen_usuario g ON g.id_usuario = pr.id_usuario AND g.activo = 1
           WHERE pr.token = ? AND pr.fecha_expiracion > NOW()`,
          [resetToken]
        );

        if (users.length === 0) {
          return null; // Token inválido o expirado
        }

        const user = users[0];

        // 2. Actualizar contraseña e incrementar token_version para invalidar sesiones activas
        const [updateResult] = await connection.query(
          `UPDATE gen_usuario
           SET password = ?,
               token_version = token_version + 1
           WHERE id_usuario = ?`,
          [newPasswordHash, user.id_usuario]
        );

        if (updateResult.affectedRows === 0) {
          throw new Error('No se pudo actualizar la contraseña');
        }

        // 3. Eliminar el token usado
        await connection.query(
          'DELETE FROM gen_password_reset WHERE id_usuario = ?',
          [user.id_usuario]
        );

        console.log(`✅ Contraseña reseteada para usuario (${user.email})`);

        return {
          success: true,
          userId: user.id_usuario,
          email: user.email
        };
      });
    } catch (error) {
      console.error('❌ Error en resetPassword:', error.message);
      throw error;
    }
  }
}

module.exports = new DatabaseService();