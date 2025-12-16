// src/services/sms/smsService.js

const axios = require("axios");
const BaseAlertService = require("../baseAlertService"); // Hereda de BaseAlertService
const config = require("../../config/js_files/config-loader");
const moment = require("moment-timezone");

/**
 * Servicio centralizado para el envío de SMS a través de un módem remoto.
 * Hereda funcionalidades base de BaseAlertService.
 */
class SmsService extends BaseAlertService {
    constructor() {
        super(); // Llama al constructor de BaseAlertService
        this.axios = axios; // Usar la instancia importada
        this.config = null; // Se cargará en initialize
        this.timeZone = "America/Santiago"; // Se actualizará en initialize
        // Métricas y Cola se inicializan en BaseAlertService y aquí si es necesario
        this.metrics = { // Reinicializar métricas específicas si es necesario
            sentAlerts: 0,
            failedAlerts: 0,
            lastError: null,
            lastSuccessTime: null,
            queueStats: {
                added: 0,
                processed: 0,
                failed: 0
            }
        };
        this.messageQueue = { // Reinicializar cola específica si es necesario
            createdAt: new Date(),
            temperatureAlerts: [], // Cola específica para alertas de temperatura SMS
            lastProcessed: null,
        };
        // La inicialización se hará explícitamente
    }

    /**
     * Inicializa el servicio SMS.
     * Carga la configuración específica de SMS.
     */
    async initialize() {
        if (this.initialized) return;

        console.log("Inicializando SmsService...");
        try {
            // 0. Initialize base alert service (loads dynamic configuration from database)
            // Feature: 002-configurable-alert-schedules (T025)
            await super.initialize();

            // 1. Cargar Configuración específica de SMS
            const appConfig = config.getConfig(); // Obtener configuración general

            // --- Manejo de configuración con defaults y validación ---
            if (!appConfig.sms || !appConfig.sms.modem || !appConfig.sms.modem.url || !appConfig.sms.modem.host) {
                console.warn("⚠️ Configuración de SMS o del módem no encontrada/incompleta (url, host requeridos). Intentando usar valores por defecto o respaldo.");
                // Configuración mínima de respaldo/defecto
                this.config = {
                    modem: { url: null, apiPath: '/api', host: '192.168.8.1', timeout: 15000, retry: { maxRetries: 2, retryDelays: [10000, 7000], timeBetweenRecipients: 8000 } },
                    workingHours: { weekdays: { start: 8.5, end: 18.5 }, saturday: { start: 8.5, end: 14.5 } }, // Aún se necesita para lógica deprecada? Mejor quitarla.
                    timeZone: 'America/Santiago',
                    queue: { maxAgeHours: 24, maxSizePerBatch: 3 },
                    recipients: { default: [], disconnectionAlerts: [], temperatureAlerts: [], activacion: null, confirmacion: null }
                };
                // Intentar poblar desde la config cargada si alguna parte existe
                if (appConfig.sms) this.config = { ...this.config, ...appConfig.sms };
                if (appConfig.sms?.modem) this.config.modem = { ...this.config.modem, ...appConfig.sms.modem };
                // ELIMINADO: Ya no se carga workingHours aquí
                // if (appConfig.sms?.workingHours) this.config.workingHours = { ...this.config.workingHours, ...appConfig.sms.workingHours };
                if (appConfig.sms?.timeZone) this.config.timeZone = appConfig.sms.timeZone;
                if (appConfig.sms?.queue) this.config.queue = { ...this.config.queue, ...appConfig.sms.queue };
                if (appConfig.sms?.recipients) this.config.recipients = { ...this.config.recipients, ...appConfig.sms.recipients };

                if (!this.config.modem.url || !this.config.modem.host) {
                    throw new Error("Configuración crítica faltante: URL y Host del módem SMS deben estar definidos.");
                }

            } else {
                // Configuración encontrada, usarla
                this.config = appConfig.sms;
                // Asegurar valores por defecto si alguna sub-propiedad falta
                this.config.modem = {
                    url: this.config.modem?.url, // Requerido
                    apiPath: this.config.modem?.apiPath ?? '/api',
                    host: this.config.modem?.host, // Requerido
                    timeout: this.config.modem?.timeout ?? 15000,
                    retry: {
                        maxRetries: this.config.modem?.retry?.maxRetries ?? 2,
                        retryDelays: this.config.modem?.retry?.retryDelays ?? [10000, 7000],
                        timeBetweenRecipients: this.config.modem?.retry?.timeBetweenRecipients ?? 8000
                    },
                    ...(this.config.modem ?? {}) // Sobrescribir con lo existente
                };
                // ELIMINADO: Ya no se carga workingHours aquí
                // this.config.workingHours = { weekdays: { start: 8.5, end: 18.5 }, saturday: { start: 8.5, end: 14.5 }, ...(this.config.workingHours ?? {}) };
                this.config.timeZone = this.config.timeZone ?? 'America/Santiago';
                this.config.queue = { maxAgeHours: 24, maxSizePerBatch: 3, ...(this.config.queue ?? {}) };
                // Asegurar que recipients y default existen como arrays
                // Y que las listas específicas también lo sean
                this.config.recipients = { default: [], disconnectionAlerts: [], temperatureAlerts: [], activacion: null, confirmacion: null, ...(this.config.recipients ?? {}) };
                this.config.recipients.default = Array.isArray(this.config.recipients.default) ? this.config.recipients.default : [];
                this.config.recipients.temperatureAlerts = Array.isArray(this.config.recipients.temperatureAlerts) ? this.config.recipients.temperatureAlerts : [];
                this.config.recipients.disconnectionAlerts = Array.isArray(this.config.recipients.disconnectionAlerts) ? this.config.recipients.disconnectionAlerts : [];

                // Validar requeridos después de asegurar defaults
                if (!this.config.modem.url || !this.config.modem.host) {
                    throw new Error("Configuración crítica faltante post-procesamiento: URL y Host del módem SMS deben estar definidos.");
                }
            }
            // --- FIN Manejo Configuración ---

            this.timeZone = this.config.timeZone;

            // 3. Inicializar Timers de BaseAlertService
            super.initializeTimers();

            this.initialized = true;
            console.log("✅ SmsService inicializado correctamente.");
            console.log(`- URL Módem: ${this.config.modem.url}`);
            console.log(`- Host Módem: ${this.config.modem.host}`);
            console.log(`- Destinatarios Default SMS: ${this.config.recipients?.default?.length ?? 0}`);

        } catch (error) {
            console.error("❌ Error inicializando SmsService:", error.message);
            this.initialized = false;
            // throw error; // Opcional: relanzar si es crítico
        }
    }

    /**
     * Verifica si el servicio SMS está correctamente configurado.
     * @returns {boolean} True si está listo para enviar SMS.
     */
    isConfigured() {
        // Asegurar que config y las listas de recipients necesarias existan
        const recipientsConfig = this.config?.recipients;
        const configured = this.initialized &&
            this.config?.modem?.url && // URL es necesaria
            this.config?.modem?.host && // Host es necesario (para las cabeceras)
            recipientsConfig && // Asegurar que el objeto recipients existe
            Array.isArray(recipientsConfig.default) && // Asegurar que default es un array
            Array.isArray(recipientsConfig.temperatureAlerts) && // Asegurar que temp es array
            Array.isArray(recipientsConfig.disconnectionAlerts); // Asegurar que disc es array

        if (!configured && this.initialized) {
            console.warn("SmsService está inicializado pero no completamente configurado.");
            if (!this.config?.modem?.url) console.warn("- URL del módem faltante.");
            if (!this.config?.modem?.host) console.warn("- Host del módem faltante.");
            if (!recipientsConfig) console.warn("- Sección 'recipients' faltante en config SMS.");
            else {
                if (!Array.isArray(recipientsConfig.default)) console.warn("- 'recipients.default' no es un array.");
                if (!Array.isArray(recipientsConfig.temperatureAlerts)) console.warn("- 'recipients.temperatureAlerts' no es un array.");
                if (!Array.isArray(recipientsConfig.disconnectionAlerts)) console.warn("- 'recipients.disconnectionAlerts' no es un array.");
            }
        }
        return configured;
    }




    /**
     * Verifica la conexión con el módem (método simple, puede requerir ajustes).
     * @returns {Promise<boolean>} True si la conexión parece exitosa.
     */
    async checkModemConnection() {
        if (!this.isConfigured()) return false;
        try {
            const { url, apiPath, timeout } = this.config.modem;
            if (!url) throw new Error("URL del módem no configurada");
            const targetUrl = `${url}${apiPath}/status`; // Asume endpoint /status
            console.log(`Verificando conexión a: ${targetUrl}`);
            const response = await this.axios.get(targetUrl, { timeout: timeout || 5000 });
            return response.status === 200; // Adaptar según respuesta real
        } catch (error) {
            if (error.code) {
                console.error(`Error de conexión (${error.code}) verificando módem: ${error.message}`);
            } else {
                console.error("Error verificando conexión del módem:", error.message);
            }
            return false;
        }
    }

    /**
     * Obtiene las cabeceras básicas para solicitar el token.
     * @returns {Object} Cabeceras básicas.
     */
    getBasicHeaders() {
        return { Accept: "*/*", "X-Requested-With": "XMLHttpRequest" };
    }

    /**
     * Obtiene un nuevo token y ID de sesión del módem.
     * @returns {Promise<{sessionId: string, token: string}>}
     * @throws {Error} Si falla la obtención del token.
     */
    async getToken() {
        if (!this.isConfigured()) throw new Error("Servicio SMS no configurado");
        const { url, apiPath, timeout } = this.config.modem;
        if (!url) throw new Error("URL del módem no configurada para obtener token");
        try {
            const targetUrl = `${url}${apiPath}/webserver/SesTokInfo`;
            const response = await this.axios.get(targetUrl, { headers: this.getBasicHeaders(), timeout: timeout || 5000 });
            const responseText = response.data;
            if (typeof responseText !== 'string') {
                throw new Error('Respuesta inesperada del módem al obtener token (no es string)');
            }
            const sessionIdMatch = responseText.match(/<SesInfo>(.*?)<\/SesInfo>/);
            const tokenMatch = responseText.match(/<TokInfo>(.*?)<\/TokInfo>/);
            if (!sessionIdMatch || !tokenMatch) throw new Error("No se pudo obtener token/sesión (respuesta inválida o vacía)");
            return { sessionId: sessionIdMatch[1].replace("SessionID=", ""), token: tokenMatch[1] };
        } catch (error) {
            console.error(`Error obteniendo token desde ${this.config.modem.url}:`, error.message);
            throw error; // Relanzar para manejo superior
        }
    }

    /**
      * Obtiene token y construye las cabeceras EXACTAS requeridas para send-sms.
      * @returns {Promise<{headers: Object, sessionId: string, token: string}>} Cabeceras y tokens.
      * @throws {Error} Si falla la obtención del token o falta configuración.
      */
    async verifyAndRefreshToken() {
        if (!this.isConfigured()) throw new Error("Servicio SMS no configurado");
        try {
            const { sessionId, token } = await this.getToken(); // Ya maneja error si falla
            const { url, host } = this.config.modem;
            if (!url) throw new Error("URL del módem no configurada para construir cabeceras");
            if (!host) throw new Error("Host del módem no configurado para construir cabeceras");

            const headers = {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': `SessionID=${sessionId}`,
                'Host': host,
                'Origin': url,
                'Referer': `${url}/html/smsinbox.html`,
                'X-Requested-With': 'XMLHttpRequest',
                '__RequestVerificationToken': token
            };

            // console.log(`[SmsService] Cabeceras construidas para envío: Host=${headers.Host}, Origin=${headers.Origin}, Referer=${headers.Referer}, Token=${token ? token.substring(0, 5) + '...' : 'N/A'}, SessionID=${sessionId ? sessionId.substring(0, 5) + '...' : 'N/A'}`);

            return { headers, sessionId, token };

        } catch (error) {
            console.error("Fallo final al verificar/refrescar token y construir cabeceras.");
            throw error; // Relanzar
        }
    }

    /**
      * Formatea un número de teléfono al formato internacional (+).
      * @param {string|number} phone - Número de teléfono.
      * @returns {string|null} Número formateado o null si es inválido.
      */
    formatPhoneNumber(phone) {
        if (!phone) return null;
        let formatted = phone.toString().replace(/\s+/g, "");
        if (!formatted.startsWith("+")) formatted = "+" + formatted;
        // Podría añadir validación de longitud o patrón si es necesario
        return formatted;
    }

    /**
      * Prepara el payload XML para enviar SMS (sin declaración XML).
      * @param {string} phoneNumber - Número de teléfono formateado.
      * @param {string} message - Mensaje a enviar.
      * @returns {string} Payload XML.
      */
    prepareSmsXml(phoneNumber, message) {
        const escapedMessage = (message || '')
            .replace(/&/g, '&') // Debe ser & pero si el modem lo espera así...
            .replace(/</g, '<') // <
            .replace(/>/g, '>') // >
            .replace(/"/g, '"') // "
            .replace(/'/g, '\''); // '

        return `<request>
<Index>-1</Index>
<Phones><Phone>${phoneNumber}</Phone></Phones>
<Sca></Sca>
<Content>${escapedMessage}</Content>
<Length>${escapedMessage.length}</Length>
<Reserved>1</Reserved>
<Date>${new Date().toISOString().replace("T", " ").split(".")[0]}</Date>
</request>`;
    }

    /**
     * Extrae un mensaje de error legible de la respuesta XML del módem.
     * @param {string} responseData - Respuesta XML como string.
     * @returns {string|null} Mensaje de error extraído o parte de la respuesta.
     */
    extractErrorFromResponse(responseData) {
        if (!responseData || typeof responseData !== 'string') return null;
        try {
            const codeMatch = responseData.match(/<code>(.*?)<\/code>/);
            const messageMatch = responseData.match(/<message>(.*?)<\/message>/);
            if (codeMatch && messageMatch) return `Código: ${codeMatch[1]}, Mensaje: ${messageMatch[1]}`;
            if (codeMatch) return `Código: ${codeMatch[1]}`;
            if (messageMatch) return messageMatch[1];
            if (responseData.includes('Unauthorized') || responseData.includes('forbidden')) return 'Error de autenticación/autorización';
            if (responseData.includes('timeout')) return 'Timeout';
        } catch (e) { /* Ignorar error de parseo */ }
        return responseData.substring(0, 100) + (responseData.length > 100 ? '...' : '');
    }

    /**
     * Método interno para enviar SMS a un destinatario con lógica de reintentos.
     * Utiliza las cabeceras y el formato correctos.
     * @param {string} destinatario - Número de teléfono.
     * @param {string} message - Mensaje.
     * @param {number} [retryAttempt=0] - Número de intento actual.
     * @returns {Promise<boolean>} True si el envío fue exitoso.
     * @private
     */
    async _sendSingleSmsWithRetry(destinatario, message, retryAttempt = 0) {
        const formattedPhone = this.formatPhoneNumber(destinatario);
        if (!formattedPhone) {
            console.error("Número de teléfono inválido para _sendSingleSmsWithRetry:", destinatario);
            return false;
        }

        const { retry, url, apiPath, timeout } = this.config.modem;
        const maxRetries = retry?.maxRetries ?? 2;
        const retryDelays = retry?.retryDelays ?? [10000, 7000];
        const effectiveTimeout = timeout || 15000;

        if (!url || !apiPath) {
            console.error("URL o apiPath del módem no configurada en _sendSingleSmsWithRetry");
            return false;
        }

        try {
            if (retryAttempt > 0) {
                const waitTime = retryDelays[retryAttempt - 1] || 5000;
                console.log(`Reintento SMS ${retryAttempt}/${maxRetries} para ${formattedPhone} tras ${waitTime}ms`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }

            const { headers } = await this.verifyAndRefreshToken(); // Obtener cabeceras frescas
            const smsData = this.prepareSmsXml(formattedPhone, message);
            const targetUrl = `${url}${apiPath}/sms/send-sms`;

            console.log(`Intentando enviar SMS a ${formattedPhone} (Intento ${retryAttempt + 1}) URL: ${targetUrl}`);

            const response = await this.axios({
                method: "post", url: targetUrl, data: smsData, headers: headers,
                transformRequest: [(data) => data],
                validateStatus: (status) => status >= 200 && status < 500, // Aceptar errores 4xx
                timeout: effectiveTimeout,
            });

            if (response.data && typeof response.data === 'string' && response.data.includes("<response>OK</response>")) {
                console.log(`Éxito enviando SMS a ${formattedPhone} (Intento ${retryAttempt + 1})`);
                return true; // ÉXITO
            }

            const errorMsg = this.extractErrorFromResponse(response.data) || `Respuesta inesperada (Status ${response.status})`;
            console.warn(`Respuesta NO OK o inesperada del módem para ${formattedPhone} (Intento ${retryAttempt + 1}): ${errorMsg}`);

            const shouldRetryBasedOnError = response.data?.includes("<code>113018</code>"); // Error de token
            if (shouldRetryBasedOnError && retryAttempt < maxRetries) {
                console.log(`Reintentando debido a posible error de token/sesión (113018)`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Espera corta
                return this._sendSingleSmsWithRetry(destinatario, message, retryAttempt + 1);
            }

            this.metrics.lastError = `Fallo envío a ${formattedPhone}: ${errorMsg}`;
            return false; // FALLO

        } catch (error) {
            console.error(`Error en _sendSingleSmsWithRetry para ${formattedPhone} (Intento ${retryAttempt + 1}):`, error.message);
            if (error.response) { console.error(' -> Detalles error Axios:', error.response.status, error.response.data?.substring(0, 200)); }
            else if (error.request) { console.error(' -> No se recibió respuesta del módem.'); }
            else { console.error(' -> Error configurando la petición Axios.'); }

            const isNetworkError = error.code && ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code);
            if (isNetworkError && retryAttempt < maxRetries) {
                return this._sendSingleSmsWithRetry(destinatario, message, retryAttempt + 1);
            } else {
                this.metrics.lastError = `Fallo (catch) envío a ${formattedPhone}: ${error.message}`;
                return false; // FALLO
            }
        }
    }

    // --- Métodos Públicos de Envío MODIFICADOS ---

    /**
     * Envía un SMS a una lista combinada de destinatarios (específicos + default), manejando métricas.
     * @param {string} message - Mensaje a enviar.
     * @param {Array|null} [specificRecipients=null] - Lista de destinatarios específicos para este envío.
     * @param {boolean} [forceSend=false] - **IMPORTANTE**: Indica si se debe forzar el envío (ignorar chequeo horario interno, que ya no existe). Debe ser true si la llamada viene del controlador que ya validó el horario.
     * @returns {Promise<{success: boolean, sentCount: number, failedCount: number, reason?: string, recipients?: Object, timestamp: Date}>} Resultado del envío.
     */
    async sendSMS(message, specificRecipients = null, forceSend = false) {
        if (!this.isConfigured()) {
            console.error("SmsService no configurado.");
            return { success: false, sentCount: 0, failedCount: 0, reason: "not_configured", timestamp: new Date() };
        }

        // ** ELIMINADO: Chequeo de horario laboral **
        // Advertencia si no se fuerza (igual que en EmailService)
        if (!forceSend) {
            console.warn("SmsService.sendSMS llamada sin forceSend=true. El controlador debería haber validado el horario laboral.");
            // Continuar asumiendo que el controlador sabe.
        }

        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.error("Mensaje SMS inválido.");
            return { success: false, sentCount: 0, failedCount: 0, reason: "invalid_message", timestamp: new Date() };
        }

        // Obtener listas específicas y default (asegurando que sean arrays)
        const safeSpecificRecipients = Array.isArray(specificRecipients) ? specificRecipients : [];
        const defaultRecipientsList = this.config.recipients?.default || [];

        // Combinar listas y eliminar duplicados y inválidos
        const combinedRecipients = [
            ...new Set([...safeSpecificRecipients, ...defaultRecipientsList])
        ].filter(phone => phone && typeof phone === 'string' && phone.trim() !== ''); // Filtrar inválidos

        if (combinedRecipients.length === 0) {
            console.error("No hay destinatarios SMS válidos combinados (específicos + default).");
            return { success: false, sentCount: 0, failedCount: 0, reason: "no_valid_recipients", timestamp: new Date() };
        }

        const results = { success: true, sentCount: 0, failedCount: 0, recipients: {}, timestamp: new Date() };
        console.log(`Enviando SMS a ${combinedRecipients.length} destinatarios únicos (Específicos + Default)...`);
        console.log(` -> Lista combinada: ${combinedRecipients.join(', ')}`);
        const timeBetween = this.config.modem.retry?.timeBetweenRecipients ?? 8000;

        for (const destinatario of combinedRecipients) {
            const sent = await this._sendSingleSmsWithRetry(destinatario, message);
            if (sent) {
                results.sentCount++; results.recipients[destinatario] = "enviado";
                this.metrics.sentAlerts++; this.metrics.lastSuccessTime = new Date();
            } else {
                results.failedCount++; results.recipients[destinatario] = "fallido";
                results.success = false; this.metrics.failedAlerts++;
            }
            // Esperar entre destinatarios
            if (combinedRecipients.indexOf(destinatario) < combinedRecipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, timeBetween));
            }
        }
        console.log(`Resultado envío SMS: ${results.sentCount} enviados, ${results.failedCount} fallidos.`);
        return results;
    }

    /**
     * Envía un SMS de alerta de temperatura a los destinatarios configurados (específicos + default).
     * @param {Array<Object>} channelsInAlert - Array con datos de canales en alerta { channelId, channelName, averageTemperature, status, minThreshold, maxThreshold }.
     * @param {Array|null} [recipients=null] - **DEPRECADO**, se usarán los de config. Pasar null.
     * @param {boolean} [forceSend=true] - **IMPORTANTE**: Indica si se debe forzar el envío. Debe ser true desde el controlador.
     * @returns {Promise<Object>} Resultado del envío de sendSMS.
     */
    async sendTemperatureAlert(channelsInAlert, recipients = null, forceSend = true) {
        if (!this.isConfigured()) return { success: false, reason: 'not_configured' };
        if (!channelsInAlert || channelsInAlert.length === 0) return { success: false, reason: 'no_alerts' };
        if (recipients !== null) console.warn("SmsService.sendTemperatureAlert: El argumento 'recipients' está deprecado, se usarán los destinatarios de la configuración.");

        // Obtener la lista específica para temperatura desde la configuración
        const temperatureRecipientsList = this.config.recipients?.temperatureAlerts || [];

        // Formatear el mensaje consolidado (usando averageTemperature)
        let message = `TEMPERATURA: ${channelsInAlert.length} sensor${channelsInAlert.length > 1 ? 'es' : ''} fuera de rango. `;
        const maxSizePerBatch = this.config.queue?.maxSizePerBatch || 3;
        const detailLimit = Math.min(maxSizePerBatch, channelsInAlert.length);
        for (let i = 0; i < detailLimit; i++) {
            const alert = channelsInAlert[i];
            // **** USAR PROMEDIO y channelName ****
            const tempFormatted = alert.averageTemperature?.toFixed(1) ?? 'N/A';
            message += `${alert.channelName}: ${tempFormatted}°C. `;
        }
        if (channelsInAlert.length > detailLimit) message += `Y ${channelsInAlert.length - detailLimit} más. `;
        message += `${moment().tz(this.timeZone).format("DD/MM HH:mm")}`;

        // Llamar a sendSMS, pasándole la lista específica de temperatura y el flag forceSend
        return await this.sendSMS(message, temperatureRecipientsList, forceSend);
    }

    /**
      * Envía un SMS de alerta de desconexión a los destinatarios configurados (específicos + default).
      * @param {Array} disconnectedChannels - Array de objetos de alerta formateados.
      * @param {Array|null} [recipients=null] - **DEPRECADO**, se usarán los de config. Pasar null.
      * @param {boolean} [forceSend=true] - **IMPORTANTE**: Forzar envío (las alertas de desconexión no suelen depender del horario).
      * @returns {Promise<Object>} Resultado del envío de sendSMS.
      */
    async sendDisconnectionAlert(disconnectedChannels, recipients = null, forceSend = true) {
        if (!this.isConfigured()) return { success: false, reason: 'not_configured' };
        if (!disconnectedChannels || disconnectedChannels.length === 0) return { success: false, reason: 'no_channels' };
        if (recipients !== null) console.warn("SmsService.sendDisconnectionAlert: El argumento 'recipients' está deprecado, se usarán los destinatarios de la configuración.");

        // Obtener la lista específica para desconexión desde la configuración
        const disconnectionRecipientsList = this.config.recipients?.disconnectionAlerts || [];

        // Formatear mensaje consolidado (sin cambios)
        let message = `CONEXION: ${disconnectedChannels.length} sensor${disconnectedChannels.length > 1 ? 'es' : ''} con eventos. `;
        const maxSizePerBatch = this.config.queue?.maxSizePerBatch || 3;
        const detailLimit = Math.min(maxSizePerBatch, disconnectedChannels.length);
        for (let i = 0; i < detailLimit; i++) {
            const channel = disconnectedChannels[i];
            const status = channel?.finalStatus === "DESCONECTADO" ? "DESCONECT" : "CONECTADO";
            message += `${channel.name}: ${status}. `;
        }
        if (disconnectedChannels.length > detailLimit) message += `Y ${disconnectedChannels.length - detailLimit} más. `;
        message += `${moment().tz(this.timeZone).format("DD/MM HH:mm")}`;

        // Llamar a sendSMS, pasándole la lista específica de desconexión y el flag forceSend
        return await this.sendSMS(message, disconnectionRecipientsList, forceSend);
    }

    // --- Métodos de Manejo de Cola (Ajustados para usar forceSend) ---

    /**
     * Añade una alerta de temperatura a la cola interna.
     */
    addTemperatureAlertToQueue(channelName, temperature, timestamp, minThreshold, maxThreshold) {
        // (Sin cambios funcionales, pero los datos encolados ahora son menos relevantes si no se usan)
        // Podríamos considerar si esta cola sigue siendo útil o si debe eliminarse también.
        // Por ahora, la mantenemos pero su procesamiento debe ser revisado.
        if (!channelName || isNaN(temperature)) {
            console.error('Datos de alerta de temperatura inválidos para encolar.');
            return false;
        }
        this.cleanupStaleAlerts();
        // La estructura encolada debería coincidir con la esperada por sendTemperatureAlert ahora
        // pero processTemperatureAlertQueue ya no se llama desde el flujo principal.
        // DECISIÓN: Marcar esta cola como potencialmente obsoleta.
        console.warn("SMS Service: La cola de alertas de temperatura puede estar obsoleta con la nueva lógica horaria.");
        this.messageQueue.temperatureAlerts.push({ channelName, averageTemperature: temperature, /* otros campos si son necesarios */ queuedAt: new Date() });
        this.metrics.queueStats.added++;
        console.log(`SMS Service: Alerta temp para ${channelName} encolada (${this.messageQueue.temperatureAlerts.length} en cola) - COLA OBSOLETA?`);
        return true;
    }

    /**
     * Limpia alertas antiguas de la cola.
     */
    cleanupStaleAlerts() {
        // (Sin cambios funcionales)
        const maxAgeHours = this.config.queue?.maxAgeHours ?? 24;
        const now = new Date();
        const ageLimit = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);
        const initialLength = this.messageQueue.temperatureAlerts.length;
        this.messageQueue.temperatureAlerts = this.messageQueue.temperatureAlerts.filter(a => a.queuedAt > ageLimit);
        const removedCount = initialLength - this.messageQueue.temperatureAlerts.length;
        if (removedCount > 0) console.log(`SMS Service: Limpieza de cola, ${removedCount} alertas antiguas eliminadas.`);
    }

    /**
      * Procesa la cola de alertas de temperatura, enviándolas como un batch.
      * **NOTA:** Esta función probablemente ya no sea llamada o necesaria con la nueva lógica horaria.
      * @param {boolean} [forceSend=false] - Forzar envío.
      * @returns {Promise<Object>} Resultado del procesamiento.
      */
    async processTemperatureAlertQueue(forceSend = false) {
        console.warn("SMS Service: processTemperatureAlertQueue llamado, pero puede ser obsoleto con la lógica horaria.");
        const queue = this.messageQueue.temperatureAlerts;
        if (queue.length === 0) return { success: true, processed: 0 };

        // ** ELIMINADO: Chequeo horario **

        const alertsToProcess = [...queue]; // Usar los datos encolados
        this.messageQueue.temperatureAlerts = []; // Vaciar cola

        // Llamar a sendTemperatureAlert con los datos de la cola (que podrían no tener el formato completo ahora)
        // Esto requiere que addTemperatureAlertToQueue guarde la estructura correcta si se sigue usando.
        const result = await this.sendTemperatureAlert(alertsToProcess, null, forceSend); // Pasar el flag

        if (result.success) {
            const processedCount = alertsToProcess.length;
            this.messageQueue.lastProcessed = new Date();
            this.metrics.queueStats.processed += processedCount;
            console.log(`SMS Service: Cola (obsoleta?) procesada, ${result.sentCount} SMS enviados (${processedCount} alertas).`);
            return { success: true, processed: processedCount };
        } else {
            this.metrics.queueStats.failed += alertsToProcess.length;
            console.error("SMS Service: Error al procesar cola de alertas SMS (obsoleta?):", result);
            console.warn(" -> Alertas no procesadas NO fueron re-encoladas automáticamente.");
            return { success: false, processed: 0, error: result };
        }
    }

    // --- Métodos Heredados / Otros ---

    /**
     * Procesa una alerta genérica (ajustada para usar forceSend).
     */
    async processAlert(alert) {
        if (!this.isConfigured()) {
            return { success: false, reason: 'not_configured' };
        }

        const shouldForce = alert.forceSend === true; // Determinar si se debe forzar

        if (alert.type === 'queued_temperature') {
            // Procesa la cola (obsoleta?), pasando el flag forceSend
            return this.processTemperatureAlertQueue(shouldForce);
        } else if (alert.type === 'temperature' && alert.data) {
            // Procesa alerta individual de temperatura, pasando el flag forceSend
            // Asume que alert.data tiene el formato { channelName, averageTemperature, ... }
            return this.sendTemperatureAlert([alert.data], null, shouldForce);
        } else if (alert.type === 'disconnection' && alert.data) {
            // Procesa alerta individual de desconexión, siempre forzando
            return this.sendDisconnectionAlert([alert.data], null, true);
        } else {
            console.warn(`SmsService: Tipo de alerta no manejado en processAlert: ${alert.type}`);
            // Intento genérico si hay mensaje, pasando el flag forceSend
            if (alert.data?.message) {
                return this.sendSMS(alert.data.message, alert.recipients, shouldForce);
            }
        }
        return { success: false, reason: 'unhandled_type' };
    }

    /**
     * Obtiene las métricas actuales del servicio.
     */
    getMetrics() {
        const baseMetrics = super.getMetrics ? super.getMetrics() : {};
        return {
            ...baseMetrics,
            service: "sms",
            queuedAlerts: this.messageQueue?.temperatureAlerts?.length ?? 0,
            lastProcessedQueue: this.messageQueue?.lastProcessed,
            sentAlerts: this.metrics.sentAlerts,
            failedAlerts: this.metrics.failedAlerts,
            lastError: this.metrics.lastError,
            lastSuccessTime: this.metrics.lastSuccessTime,
            queueStats: this.metrics.queueStats,
            initialized: this.initialized,
            configLoaded: !!(this.config?.modem?.url && this.config?.modem?.host), // Check config critical parts
            timestamp: new Date()
        };
    }

    /**
     * Reinicia el estado del servicio.
     */
    reset() {
        if (super.reset) super.reset();
        this.metrics = { sentAlerts: 0, failedAlerts: 0, lastError: null, lastSuccessTime: null, queueStats: { added: 0, processed: 0, failed: 0 } };
        this.messageQueue = { createdAt: new Date(), temperatureAlerts: [], lastProcessed: null };
        this.initialized = false;
        this.initialize(); // Re-inicializar
        console.log("SmsService: Servicio reiniciado.");
        return true;
    }

}

module.exports = new SmsService(); // Exportar instancia única