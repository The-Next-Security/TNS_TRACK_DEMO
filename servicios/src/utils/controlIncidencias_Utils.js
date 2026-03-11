// Dependencias requeridas
const mysql = require("mysql2/promise");
const configLoader = require("../config/js_files/configLoader_Config");
const { DateTime } = require('luxon');
const axios = require('axios');

// Configuración global
let io;
const RSSI_THRESHOLD = -90;
const INTERVALO_ENTRE_SMS = 35;
const COOLDOWN_PERIODO = 35; // segundos para nueva inserción
const MODEM_URL = 'http://192.168.8.1';

const beaconCooldowns = new Map();

// Pool creado en primer uso (tras configLoader.initialize())
let pool = null;
function getPool() {
  if (!pool) {
    const db = configLoader.getConfig().database;
    const user = db.user || db.username;
    pool = mysql.createPool({
      host: db.host,
      user,
      password: db.password,
      database: db.database,
      port: db.port || 3306,
      waitForConnections: true,
      connectionLimit: db.pool?.max_size || 10,
      queueLimit: 0,
    });
  }
  return pool;
}

// Función de inicialización de Socket.IO
function init(socketIo) {
  io = socketIo;
}

// Funciones de utilidad
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Funciones del módem SMS
async function getToken() {
  try {
    const response = await axios.get(`${MODEM_URL}/api/webserver/SesTokInfo`, {
      headers: {
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    const responseText = response.data;
    const sessionIdMatch = responseText.match(/<SesInfo>(.*?)<\/SesInfo>/);
    const tokenMatch = responseText.match(/<TokInfo>(.*?)<\/TokInfo>/);
    
    if (!sessionIdMatch || !tokenMatch) {
      throw new Error('No se pudo obtener el token y la sesión');
    }

    return {
      sessionId: sessionIdMatch[1].replace('SessionID=', ''),
      token: tokenMatch[1]
    };
  } catch (error) {
    console.error('Error obteniendo token:', error.message);
    throw error;
  }
}

async function checkModemConnection() {
  try {
    await axios.get(`${MODEM_URL}/api/monitoring/status`);
    console.log('Conexión con el módem establecida');
    return true;
  } catch (error) {
    console.error('Error conectando con el módem:', error.message);
    throw new Error('No se pudo establecer conexión con el módem');
  }
}

async function sendSMS(phoneNumber, message) {
  try {
    const { sessionId, token } = await getToken();
    console.log('Credenciales obtenidas:', { token: token.substring(0, 5) + '...', sessionId: sessionId.substring(0, 5) + '...' });

    const headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': `SessionID=${sessionId}`,
      'Host': '192.168.8.1',
      'Origin': MODEM_URL,
      'Referer': `${MODEM_URL}/html/smsinbox.html`,
      'X-Requested-With': 'XMLHttpRequest',
      '__RequestVerificationToken': token
    };

    const smsData = 
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<request>\n` +
      `  <Index>-1</Index>\n` +
      `  <Phones>\n` +
      `    <Phone>${phoneNumber}</Phone>\n` +
      `  </Phones>\n` +
      `  <Sca></Sca>\n` +
      `  <Content>${message}</Content>\n` +
      `  <Length>${message.length}</Length>\n` +
      `  <Reserved>1</Reserved>\n` +
      `  <Date>${new Date().toISOString().replace('T', ' ').split('.')[0]}</Date>\n` +
      `</request>`;

    console.log('Enviando SMS con payload:', smsData);

    const response = await axios({
      method: 'post',
      url: `${MODEM_URL}/api/sms/send-sms`,
      data: smsData,
      headers: headers,
      transformRequest: [(data) => data],
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });

    if (response.data.includes('<response>OK</response>')) {
      console.log('SMS enviado exitosamente');
      return true;
    } else {
      console.log('Respuesta del servidor:', response.data);
      if (response.data.includes('<error>')) {
        const errorCode = response.data.match(/<code>(\d+)<\/code>/);
        const errorMessage = response.data.match(/<message>(.*?)<\/message>/);
        throw new Error(`Error SMS - Código: ${errorCode ? errorCode[1] : 'Desconocido'}, Mensaje: ${errorMessage ? errorMessage[1] : 'Sin mensaje'}`);
      }
      throw new Error('Error desconocido al enviar SMS');
    }
  } catch (error) {
    console.error('Error en sendSMS:', error.message);
    throw error;
  }
}
async function enviarCorreoIncidencia(asunto, mensaje) {
  const emailConfig = configLoader.getConfig().email || {};
  const FROM_EMAIL = emailConfig.email_contacto?.from_verificado;
  const TO_EMAILS = Array.isArray(emailConfig.email_contacto?.destinatarios) ? emailConfig.email_contacto.destinatarios : [];
  const apiKey = emailConfig.SENDGRID_API_KEY;

  if (!apiKey || !FROM_EMAIL || TO_EMAILS.length === 0) {
    console.warn('control_incidencias: email no configurado, omitiendo envío');
    return false;
  }

  const data = {
    personalizations: [{ to: TO_EMAILS.map(email => ({ email })) }],
    from: { email: FROM_EMAIL },
    subject: asunto,
    content: [{ 
      type: 'text/plain', 
      value: mensaje
    }]
  };

  try {
    const response = await axios.post('https://api.sendgrid.com/v3/mail/send', data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Correo enviado exitosamente');
    return true;
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    if (error.response) {
      console.error('Datos de respuesta:', error.response.data);
      console.error('Estado de respuesta:', error.response.status);
    }
    throw error;
  }
}
// Funciones de procesamiento de incidencias
async function procesarPosibleIncidencia(device_name, ble_beacons, timestamp, event_enum, din2_value) {
  try {
    console.log(`[DEBUG] Iniciando procesamiento - Device: ${device_name}`);
    console.log(`[DEBUG] ble_beacons: ${JSON.stringify(ble_beacons)}`);
    
    // Primero verificamos si el dispositivo es blind spot
    const esBlindSpot = await comprobarBlindSpot(device_name, 1);
    console.log(`[DEBUG] ¿Es blind spot?: ${esBlindSpot}`);
    
    if (!esBlindSpot) {
      console.log(`[DEBUG] El dispositivo ${device_name} no es blind spot - Terminando`);
      return;
    }

    // Primero procesamos los beacons si existen
    const hayBeacons = comprobarBleBeacons(ble_beacons);
    console.log(`[DEBUG] ¿Hay beacons?: ${hayBeacons}`);

    if (hayBeacons) {
      console.log('[DEBUG] Procesando beacons encontrados');
      const beaconList = typeof ble_beacons === 'string' ? JSON.parse(ble_beacons) : ble_beacons;
      
      // Procesar cada beacon de manera independiente
      for (const beacon of beaconList) {
        console.log(`[DEBUG] Verificando beacon: ${beacon.id}, RSSI: ${beacon.rssi}`);
        const beaconEsBlindSpot = await comprobarBlindSpot(beacon.id, 2);
        if (beaconEsBlindSpot && beacon.rssi > RSSI_THRESHOLD) {
          // Verificar cooldown para inserción y SMS
          const cooldownKey = `${device_name}-${beacon.id}`;
          
          if (!beaconCooldowns.has(cooldownKey)) {
            // Insertar incidencia para este beacon específico
            await insertarIncidencia(device_name, beacon.id);
            // Enviar SMS
            await enviarSMSIncidencia(device_name, beacon.id);
            
            // Establecer el cooldown
            beaconCooldowns.set(cooldownKey, DateTime.now());
            
            // Establecer el timeout para eliminar el cooldown
            setTimeout(() => {
              beaconCooldowns.delete(cooldownKey);
              console.log(`[DEBUG] Cooldown eliminado para ${cooldownKey}`);
            }, COOLDOWN_PERIODO * 1000);
          } else {
            console.log(`[DEBUG] Cooldown activo para ${cooldownKey} - Skip inserción y SMS`);
          }
        }
      }
    }

  } catch (error) {
    console.error('[ERROR] Error en procesarPosibleIncidencia:', error);
  }
}

async function procesarBeacon(device_name, beacon) {
  try {
    const beaconEsBlindSpot = await comprobarBlindSpot(beacon.id, 2);
    
    if (!beaconEsBlindSpot) {
      return;
    }

    const cooldownKey = `${device_name}-${beacon.id}`;
    
    if (beacon.rssi <= RSSI_THRESHOLD) {
      if (beaconCooldowns.has(cooldownKey)) {
        beaconCooldowns.delete(cooldownKey);
      }
      return;
    }

    if (beaconCooldowns.has(cooldownKey)) {
      return;
    }

    await insertarIncidencia(device_name, beacon.id);
    await enviarSMSIncidencia(device_name, beacon.id);
    
    beaconCooldowns.set(cooldownKey, DateTime.now());

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error en procesarBeacon:`, error);
  }
}

async function insertarIncidencia(dispositivo, detector_id) {
  const connection = await getPool().getConnection();
  try {
    // Determinar el tipo de detección
    const tipoDeteccion = detector_id === 'SENSOR_DIN2' ? 'sensor' : 'beacon';
    
    // Insertar en incidencias_blindspot con el nuevo campo
    const queryIncidencia = `
      INSERT INTO incidencias_blindspot 
      (id_dispositivo, beacon_id, hora_entrada, tipo_deteccion) 
      VALUES (?, ?, NOW(), ?)
    `;
    await connection.query(queryIncidencia, [
      dispositivo, 
      detector_id,
      tipoDeteccion
    ]);

    // Insertar en historico_llamadas_blindspot con información adicional
    const queryHistorico = `
      INSERT INTO historico_llamadas_blindspot 
      (dispositivo, mac_address, timestamp, estado_llamada, tipo_deteccion) 
      VALUES (?, ?, NOW(), 'iniciada', ?)
    `;
    await connection.query(queryHistorico, [
      dispositivo, 
      detector_id,
      tipoDeteccion
    ]);

    if (io) {
      io.emit('nueva_incidencia', { 
        mensaje: 'Nueva incidencia registrada', 
        dispositivo, 
        detector_id,
        tipo_deteccion: tipoDeteccion,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error(`Error en insertarIncidencia:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

async function enviarSMSIncidencia(dispositivo, detector_id) {
  try {
    const puedeEnviarSMS = await verificarTiempoUltimoSMS(dispositivo, detector_id);
    if (!puedeEnviarSMS) {
      console.log(`No se puede enviar SMS aún para ${dispositivo} - Debe esperar el intervalo`);
      return;
    }

    const connection = await getPool().getConnection();
    try {
      const [deviceInfo] = await connection.query(
        'SELECT device_asignado FROM devices WHERE id = ?',
        [dispositivo]
      );

      // Preparar mensaje según tipo de detección
      let mensajePersonalizado;
      if (detector_id === 'SENSOR_DIN2') {
        const sector = deviceInfo[0]?.device_asignado || 'Desconocido';
        mensajePersonalizado = `¡Alerta! Detección de presencia no identificada en el sector: ${sector}`;
      } else {
        const [beaconInfo] = await connection.query(
          'SELECT ubicacion FROM beacons WHERE id = ?',
          [detector_id]
        );
        const sector = deviceInfo[0]?.device_asignado || 'Desconocido';
        const individuo = beaconInfo[0]?.ubicacion || 'Desconocido';
        mensajePersonalizado = `Intrusion en el sector: ${sector} por el individuo ${individuo}`;
      }

      // Verificar conexión con el módem
      await checkModemConnection();
      await delay(1000);

      const smsConfig = configLoader.getConfig().sms || {};
      const dest = smsConfig.sms_destinatarios || {};
      const activacion = dest.activacion || {};
      const confirmacion = dest.confirmacion || {};
      const alertas = Array.isArray(dest.alertas) ? dest.alertas : [];

      if (activacion.numero) {
        await sendSMS(activacion.numero, activacion.mensaje || 'Activación');
        console.log("SMS de activación enviado exitosamente");
      }
      await delay(2000);

      if (confirmacion.numero) {
        await sendSMS(confirmacion.numero, confirmacion.mensaje || 'Confirmación');
        console.log("SMS de confirmación enviado exitosamente");
      }
      await delay(5000);

      for (const numero of alertas) {
        try {
          await sendSMS(numero, mensajePersonalizado);
          console.log(`SMS de alerta enviado exitosamente a ${numero}`);
          await delay(10000);
        } catch (smsError) {
          console.error(`Error enviando SMS a ${numero}:`, smsError);
          continue; // Continuar con el siguiente número en caso de error
        }
      }

      // Enviar correo electrónico
      await enviarCorreoIncidencia(
        "Incidencia Intrusión detectada",
        `${mensajePersonalizado}\n\nFecha y hora: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}`
      );
      console.log("Correo electrónico enviado exitosamente");

      // Registrar SMS exitoso
      const query = `
        INSERT INTO historico_sms_blindspot 
        (dispositivo, mac_address, timestamp, estado_sms, tipo_deteccion) 
        VALUES (?, ?, NOW(), 'enviado', ?)
      `;
      await connection.query(query, [
          dispositivo, 
          detector_id, 
          detector_id === 'SENSOR_DIN2' ? 'sensor' : 'beacon'
        ]);
  
        await actualizarUltimoSMS(dispositivo, detector_id);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error en enviarSMSIncidencia:', error);
      const connection = await getPool().getConnection();
      try {
        const query = `
          INSERT INTO historico_sms_blindspot 
          (dispositivo, mac_address, timestamp, estado_sms, error, tipo_deteccion) 
          VALUES (?, ?, NOW(), 'error', ?, ?)
        `;
        await connection.query(query, [
          dispositivo, 
          detector_id, 
          error.message,
          detector_id === 'SENSOR_DIN2' ? 'sensor' : 'beacon'
        ]);
      } finally {
        connection.release();
      }
      throw error;
    }
  }
  
  async function verificarTiempoUltimoSMS(dispositivo, beacon_id) {
    const query = `
      SELECT ultimo_sms
      FROM ultimo_sms_blindspot
      WHERE id_dispositivo = ? AND beacon_id = ?
    `;
    const connection = await getPool().getConnection();
    try {
      const [results] = await connection.query(query, [dispositivo, beacon_id]);
      if (results.length === 0) return true;
      
      const ultimoSMS = DateTime.fromISO(String(results[0].ultimo_sms));
      const ahora = DateTime.now();
      const diferencia = ahora.diff(ultimoSMS, 'seconds').seconds;
      console.log(`Tiempo transcurrido desde último SMS: ${diferencia} segundos`);
      return diferencia >= INTERVALO_ENTRE_SMS;
    } finally {
      connection.release();
    }
  }
  
  async function actualizarUltimoSMS(dispositivo, beacon_id) {
    const query = `
      INSERT INTO ultimo_sms_blindspot (id_dispositivo, beacon_id, ultimo_sms)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE ultimo_sms = NOW()
    `;
    const connection = await getPool().getConnection();
    try {
      await connection.query(query, [dispositivo, beacon_id]);
      console.log("Se insertó o actualizó en ultimo_sms_blindspot");
    } finally {
      connection.release();
    }
  }
  
  async function comprobarBlindSpot(inputToCheck, caso) {
    let sentenciaSQL = "SELECT esBlind_spot FROM";
    let query = caso === 1 
      ? `${sentenciaSQL} devices WHERE id = ?`
      : `${sentenciaSQL} beacons WHERE id = ?`;
    
    const connection = await getPool().getConnection();
    try {
      const [results] = await connection.query(query, [inputToCheck]);
      const esBlindSpot = results[0]?.esBlind_spot === 1;
      console.log(`Resultado de comprobarBlindSpot para ${inputToCheck}: ${esBlindSpot}`);
      return esBlindSpot;
    } finally {
      connection.release();
    }
  }
  
  function comprobarBleBeacons(inputToCheck) {
    if (typeof inputToCheck === "string") {
      return inputToCheck !== "[]";
    }
    return inputToCheck.length > 0;
  }
  
  // Exportación del módulo
  module.exports = { init, procesarPosibleIncidencia };