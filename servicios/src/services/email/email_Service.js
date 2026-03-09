// src/services/email/emailService.js

const sgMail = require("@sendgrid/mail");
const BaseAlertService = require("../baseAlert_Service"); // Hereda de BaseAlertService
const configLoader = require("../../config/js_files/configLoader_Config");
const moment = require("moment-timezone");

/**
 * Servicio centralizado para el envío de correos electrónicos utilizando SendGrid.
 * Hereda funcionalidades base de BaseAlertService.
 * Implementa recarga dinámica de destinatarios para alertas.
 */
class EmailService extends BaseAlertService {
  constructor() {
    super(); // Llama al constructor de BaseAlertService
    this.sgMail = sgMail; // Usar la instancia importada
    this.config = null; // Config específica de email (cargada en initialize)
    this.fromEmail = null;
    // Fallbacks cargados al inicio
    this.defaultRecipientsFallback = [];
    this.bccRecipientsFallback = [];
    this.emergencyRecipientFallback = null; // Almacenar también el de emergencia
    this.timeZone = "America/Santiago"; // Default, se actualizará en initialize
    this.appName = "Sistema de Monitoreo";
    this.companyName = "The Next Security";
    this.lastEmailSentResult = { success: null, type: null, time: null };
  }

  /**
   * Inicializa el servicio de Email.
   * Carga la configuración inicial (incluyendo fallbacks) y configura SendGrid.
   */
  async initialize() {
    if (this.initialized) return;

    console.log("Inicializando EmailService...");
    try {
      // 0. Initialize base alert service (loads dynamic configuration from database)
      // Feature: 002-configurable-alert-schedules (T025)
      await super.initialize();

      // 1. Cargar Configuración específica de Email
      const appConfig = configLoader.getConfig(); // Obtener configuración general

      if (!appConfig.email || !appConfig.email.SENDGRID_API_KEY) {
        throw new Error("Configuración de email o SENDGRID_API_KEY no encontrada.");
      }
      this.config = appConfig.email; // Guardar solo la sección de email

      // Validar formato de API Key
      if (!this.config.SENDGRID_API_KEY.startsWith("SG.")) {
        console.warn("⚠️ La API Key de SendGrid no parece tener el formato correcto (debe empezar con 'SG.').");
      }

      this.appName = appConfig.appInfo?.appName || this.appName;
      this.companyName = appConfig.appInfo?.companyName || this.companyName;
      this.timeZone = appConfig.alertSystem?.timeZone || this.timeZone;
      this.fromEmail = this.config.email_contacto?.from_verificado;

      // Cargar fallbacks iniciales
      this.defaultRecipientsFallback = Array.isArray(this.config.email_contacto?.destinatarios)
        ? this.config.email_contacto.destinatarios
        : [];
      this.bccRecipientsFallback = Array.isArray(this.config.bccRecipients)
        ? this.config.bccRecipients
        : [];
      this.emergencyRecipientFallback = typeof this.config.emergency_recipient === 'string'
        ? this.config.emergency_recipient
        : null;

      // Advertencias si los fallbacks o configuraciones críticas faltan
      if (!this.fromEmail) {
        console.warn("⚠️ Email remitente (from_verificado) no configurado en email.email_contacto.");
      }
      if (this.defaultRecipientsFallback.length === 0) {
        console.warn("⚠️ Lista de destinatarios por defecto (email.email_contacto.destinatarios) está vacía o no configurada. Se usará como fallback.");
      } else {
        console.log(`EmailService: Fallback Destinatarios TO inicializado: ${this.defaultRecipientsFallback.join(', ')}`);
      }
      if (this.bccRecipientsFallback.length === 0) {
        console.warn("⚠️ Lista bccRecipients (fallback) está vacía o no configurada en email.");
      } else {
        console.log(`EmailService: Fallback Destinatarios BCC inicializado: ${this.bccRecipientsFallback.join(', ')}`);
      }
      if (!this.emergencyRecipientFallback) {
        console.error("❌ Configuración CRÍTICA faltante: 'emergency_recipient' no definido en la sección 'email'. No habrá fallback de emergencia.");
      } else {
        console.log(`EmailService: Destinatario de emergencia configurado: ${this.emergencyRecipientFallback}`);
      }


      // 2. Configurar SendGrid API Key
      this.sgMail.setApiKey(this.config.SENDGRID_API_KEY);
      console.log("EmailService: SendGrid API Key configurada.");

      // 3. Inicializar Timers (llamando al método de BaseAlertService)
      // BaseAlertService maneja sus propios timers si existen
      // super.initializeTimers(); // Descomentar si BaseAlertService tiene timers

      this.initialized = true;
      console.log("✅ EmailService inicializado correctamente.");

    } catch (error) {
      console.error("❌ Error CRÍTICO inicializando EmailService:", error.message);
      this.initialized = false; // Marcar como no inicializado en caso de error
      throw error; // Re-lanzar error crítico para detener arranque si es necesario
    }
  }

  // --- (isConfigured, _sendMail sin cambios funcionales) ---
  isConfigured() {
    // ... (sin cambios)
    const configured = this.initialized &&
      this.config &&
      this.config.SENDGRID_API_KEY &&
      this.config.SENDGRID_API_KEY.startsWith("SG.") && // Verificar formato básico
      this.fromEmail; // Asegurar que el remitente está definido

    if (!configured && this.initialized) {
      // Loguear detalles si está inicializado pero no configurado
      console.warn("EmailService está inicializado pero no completamente configurado.");
      if (!this.config?.SENDGRID_API_KEY?.startsWith("SG.")) console.warn("- API Key inválida o faltante.");
      if (!this.fromEmail) console.warn("- Email remitente (from_verificado) faltante.");
    }
    return configured;
  }
  async _sendMail(message) {
    // ... (sin cambios)
    if (!this.isConfigured()) {
      console.error("EmailService no está configurado para enviar correos.");
      this.metrics.failedAlerts++; // Actualizar métrica directamente aquí si el servicio no está listo
      this.metrics.lastError = "Servicio no configurado";
      return false;
    }
    if (!message.from) { message.from = this.fromEmail; }
    if (!message.to || (Array.isArray(message.to) && message.to.length === 0)) {
      console.error("Error: No se especificaron destinatarios 'to' para el correo.");
      return false; // Indicar fallo por falta de destinatarios principales
    }
    const recipientsLog = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    const bccRecipientsLog = message.bcc && Array.isArray(message.bcc) ? message.bcc.join(', ') : 'Ninguno';
    if (!message.text && !message.html) {
      console.warn("Advertencia: El correo no tiene contenido 'text' ni 'html'. Se enviará vacío.");
      message.text = ' ';
    } else if (!message.text) {
      message.text = this._stripHtml(message.html || ' ');
    }
    try {
      const sendId = `SEND-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      console.log(`📮 [${sendId}] LLAMANDO SendGrid API...`);
      console.log(`📮 [${sendId}] Subject: "${message.subject}"`);
      console.log(`📮 [${sendId}] TO: ${recipientsLog}`);
      console.log(`📮 [${sendId}] BCC: ${bccRecipientsLog}`);
      await this.sgMail.send(message);
      console.log(`✅ [${sendId}] SendGrid API exitoso - Correo "${message.subject}" enviado.`);
      this.lastEmailSentResult = { success: true, type: message.subject, time: new Date() };
      return true;
    } catch (error) {
      console.error(`Error al enviar correo "${message.subject}" vía SendGrid:`, error.message);
      this.lastEmailSentResult = { success: false, type: message.subject, time: new Date(), error: error.message };
      this.metrics.lastError = `SendGrid Error: ${error.message}`;
      if (error.response && error.response.body && error.response.body.errors) {
        console.error("SendGrid Response Errors:", JSON.stringify(error.response.body.errors));
      } else if (error.response) {
        console.error("SendGrid Response Status:", error.response.statusCode);
        console.error("SendGrid Response Body:", error.response.body);
      }
      return false;
    }
  }


  /**
   * Obtiene dinámicamente los destinatarios TO y BCC desde la configuración,
   * aplicando fallbacks si es necesario.
   * @private
   * @param {string} logContext - Contexto para los logs (ej. 'TempAlert', 'DisconnAlert').
   * @returns {Promise<{toRecipients: string[], bccRecipients: string[], usedFallback: boolean, usedEmergency: boolean}>}
   */
  async _getDynamicRecipients(logContext) {
    let toRecipients = [];
    let bccRecipients = [];
    let usedFallback = false;
    let usedEmergency = false;
    let emergencyRecipient = null; // Leer dinámicamente también

    try {
      // 1. Intentar leer destinatarios TO dinámicos
      const dynamicTo = configLoader.getValue('email.email_contacto.destinatarios');
      if (Array.isArray(dynamicTo) && dynamicTo.length > 0) {
        toRecipients = dynamicTo;
        console.log(`[EmailService/${logContext}] Destinatarios TO cargados dinámicamente: ${toRecipients.join(', ')}`);
      } else {
        console.warn(`[EmailService/${logContext}] Destinatarios TO dinámicos no válidos o vacíos. Usando fallback...`);
        toRecipients = this.defaultRecipientsFallback; // Usar fallback cargado en initialize
        usedFallback = true;
      }

      // 2. Intentar leer destinatarios BCC dinámicos
      const dynamicBcc = configLoader.getValue('email.bccRecipients');
      if (Array.isArray(dynamicBcc) && dynamicBcc.length > 0) {
        bccRecipients = dynamicBcc;
        console.log(`[EmailService/${logContext}] Destinatarios BCC cargados dinámicamente: ${bccRecipients.join(', ')}`);
      } else {
        // Advertir si no hay BCC dinámico, pero usar fallback
        console.warn(`[EmailService/${logContext}] Destinatarios BCC dinámicos no válidos o vacíos. Usando fallback BCC...`);
        bccRecipients = this.bccRecipientsFallback; // Usar fallback BCC
        // No marcar usedFallback=true solo por el BCC, el flag es más para el TO
      }

      // 3. Verificar si TO está vacío DESPUÉS del fallback inicial
      if (!Array.isArray(toRecipients) || toRecipients.length === 0) {
        console.error(`[EmailService/${logContext}] ERROR CRÍTICO: Lista de destinatarios TO vacía incluso después de usar fallback. Intentando destinatario de emergencia.`);
        usedFallback = true; // Definitivamente se usó el fallback (y falló)

        // Intentar leer destinatario de emergencia dinámicamente
        emergencyRecipient = configLoader.getValue('email.emergency_recipient');

        if (typeof emergencyRecipient === 'string' && emergencyRecipient.includes('@')) {
          console.log(`[EmailService/${logContext}] Usando destinatario de emergencia: ${emergencyRecipient}`);
          toRecipients = [emergencyRecipient]; // Usar como único destinatario TO
          bccRecipients = []; // NO usar BCC en caso de emergencia
          usedEmergency = true;
        } else {
          // Si incluso el de emergencia falla, intentar el fallback de emergencia cargado al inicio
          if (this.emergencyRecipientFallback) {
            console.warn(`[EmailService/${logContext}] Destinatario de emergencia dinámico inválido. Usando fallback de emergencia: ${this.emergencyRecipientFallback}`);
            toRecipients = [this.emergencyRecipientFallback];
            bccRecipients = [];
            usedEmergency = true;
          } else {
            console.error(`[EmailService/${logContext}] ERROR FATAL: Sin destinatarios TO válidos Y sin destinatario de emergencia configurado/válido. NO SE PUEDE ENVIAR.`);
            toRecipients = []; // Asegurar lista vacía
            bccRecipients = [];
          }
        }
      }

    } catch (error) {
      console.error(`[EmailService/${logContext}] Error obteniendo/validando destinatarios dinámicos: ${error.message}. Intentando fallback completo.`);
      toRecipients = this.defaultRecipientsFallback;
      bccRecipients = this.bccRecipientsFallback;
      usedFallback = true;
      // Re-verificar si TO quedó vacío después de este catch
      if (!Array.isArray(toRecipients) || toRecipients.length === 0) {
        console.error(`[EmailService/${logContext}] Fallback inicial también vacío tras error. Intentando emergencia.`);
        emergencyRecipient = this.emergencyRecipientFallback; // Usar el fallback guardado
        if (emergencyRecipient) {
          console.log(`[EmailService/${logContext}] Usando fallback de emergencia tras error: ${emergencyRecipient}`);
          toRecipients = [emergencyRecipient];
          bccRecipients = [];
          usedEmergency = true;
        } else {
          console.error(`[EmailService/${logContext}] ERROR FATAL: Sin destinatarios TO válidos y sin fallback de emergencia tras error. NO SE PUEDE ENVIAR.`);
          toRecipients = []; bccRecipients = [];
        }
      }
    }

    return { toRecipients, bccRecipients, usedFallback, usedEmergency };
  }


  /**
   * Procesa una alerta genérica de la cola.
   * Utiliza los destinatarios del objeto 'alert' si existen, si no, usa el fallback.
   */
  async processAlert(alert) {
    if (!this.initialized) { /* ... (manejo error inicialización) ... */ return; }

    console.log(`Procesando alerta de email simple tipo: ${alert.type}`);
    let emailRecipients;
    let usedSource = 'objeto alert';

    // Determinar destinatarios
    if (Array.isArray(alert.recipients) && alert.recipients.length > 0) {
      emailRecipients = alert.recipients;
    } else {
      emailRecipients = this.defaultRecipientsFallback; // Usar fallback
      usedSource = 'fallback this.defaultRecipientsFallback';
      if (!Array.isArray(emailRecipients) || emailRecipients.length === 0) {
        console.warn(`[EmailService/processAlert] Destinatarios no provistos en alerta y fallback vacío para tipo ${alert.type}. Intentando emergencia.`);
        const emergency = this.emergencyRecipientFallback || configLoader.getValue('email.emergency_recipient');
        if (emergency) {
          console.log(`[EmailService/processAlert] Usando destinatario de emergencia: ${emergency}`);
          emailRecipients = [emergency];
          usedSource = 'emergencia';
        } else {
          console.error(`[EmailService/processAlert] Sin destinatarios válidos ni de emergencia para tipo ${alert.type}. No se puede enviar.`);
          this.metrics.failedAlerts++; this.metrics.lastError = `Sin destinatarios (ni emergencia) para ${alert.type}`;
          return;
        }
      }
    }
    console.log(`[EmailService/processAlert] Usando destinatarios de: ${usedSource}`);

    try {
      const { type, data } = alert;
      const { subject, htmlContent, plainText } = this.generateEmailContent(type, data);

      const msg = { to: emailRecipients, subject, text: plainText, html: htmlContent };
      // Nota: processAlert genérico no añade BCC automáticamente.

      const success = await this._sendMail(msg);

      if (success) { this.metrics.sentAlerts++; this.metrics.lastSuccessTime = new Date(); }
      else { this.metrics.failedAlerts++; console.warn(`Fallo al enviar alerta simple tipo ${type}`); }

    } catch (error) {
      console.error(`Error general procesando alerta de email simple (tipo ${alert.type}):`, error);
      this.metrics.failedAlerts++;
      this.metrics.lastError = `Error procesando ${alert.type}: ${error.message}`;
    }
  }

  /**
   * Envía email de restablecimiento de contraseña
   * @param {string} email - Email del destinatario
   * @param {string} resetToken - Token de reset (no usado directamente, viene en resetUrl)
   * @param {string} resetUrl - URL completa para restablecer contraseña
   * @returns {Promise<boolean>} - true si se envió exitosamente
   */
  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    if (!email || !resetUrl) {
      console.error("EmailService: Correo o URL de restablecimiento no proporcionados");
      return false;
    }

    console.log(`📧 Preparando email de reset para: ${email}`);
    console.log(`🔗 URL de reset: ${resetUrl}`);
    console.log(`📱 AppName: ${this.appName}, CompanyName: ${this.companyName}`);

    const subject = `${this.appName} - Restablecimiento de Contraseña`;
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
                <h2 style="color: #333; border-bottom: 1px solid #e1e1e1; padding-bottom: 10px;">Restablecimiento de Contraseña</h2>
                <p>Se ha solicitado un restablecimiento de contraseña para tu cuenta en <strong>${this.appName}</strong>.</p>
                <p>Para continuar con el proceso, haz clic en el siguiente enlace:</p>
                <p style="margin: 20px 0;">
                <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Restablecer Contraseña
                </a>
                </p>
                <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                <p>Este enlace expirará en 1 hora por seguridad.</p>
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e1e1e1; font-size: 12px; color: #777;">
                <p>Este es un mensaje automático del sistema de ${this.companyName}. Por favor no responda a este correo.</p>
                </div>
            </div>
        `;
    const text = this._stripHtml(html);

    console.log(`📝 HTML length: ${html.length} caracteres`);
    console.log(`📝 Text length: ${text.length} caracteres`);
    console.log(`📝 Primera parte del HTML: ${html.substring(0, 150)}...`);

    const success = await this._sendMail({ to: email, subject, text, html });
    if (success) {
      this.recordEmailSuccess(subject, 1);
      console.log(`✅ Email de reset enviado exitosamente a ${email}`);
    } else {
      this.recordEmailError(subject, this.metrics.lastError || "Error desconocido");
      console.error(`❌ Falló envío de email de reset a ${email}`);
    }
    return success;
  }

  /**
   * Envía email de confirmación de contraseña restablecida
   * @param {string} email - Email del destinatario
   * @returns {Promise<boolean>} - true si se envió exitosamente
   */
  async sendPasswordResetConfirmationEmail(email) {
    if (!email) {
      console.error("EmailService: Correo no proporcionado para confirmación.");
      return false;
    }
    const subject = `${this.appName} - Contraseña restablecida con éxito`;
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
                <h2 style="color: #333; border-bottom: 1px solid #e1e1e1; padding-bottom: 10px;">Contraseña Restablecida</h2>
                <p>Su contraseña ha sido restablecida exitosamente.</p>
                <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <p style="margin: 0; color: #856404;">
                        <strong>⚠️ Aviso de seguridad:</strong> Si usted no realizó este cambio de contraseña,
                        por favor contacte con el equipo de <strong>${this.companyName}</strong> de inmediato,
                        ya que su cuenta podría estar comprometida.
                    </p>
                </div>
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e1e1e1; font-size: 12px; color: #777;">
                    <p>Este es un mensaje automático del sistema de ${this.companyName}. Por favor no responda a este correo.</p>
                </div>
            </div>
        `;
    const text = this._stripHtml(html);

    const success = await this._sendMail({ to: email, subject, text, html });
    if (success) {
      this.recordEmailSuccess(subject, 1);
    } else {
      this.recordEmailError(subject, this.metrics.lastError || "Error desconocido");
    }
    return success;
  }


  // --- Métodos de Alerta con Lógica de Destinatarios Dinámicos ---

  /**
   * Envía alertas de temperatura usando destinatarios dinámicos.
   * @param {Array<Object>} channelsInAlert - Array con datos de canales en alerta.
   * @param {Array|null} [recipients=null] - **DEPRECADO**.
   * @param {boolean} [forceSend=false] - Indica si se debe forzar el envío.
   * @returns {Promise<boolean>} true si el intento principal (con BCC) fue exitoso.
   */
  async sendTemperatureRangeAlertsEmail(channelsInAlert, recipients = null, forceSend = false) {
    const callId = `EMAIL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    console.log(`\n📧 [${callId}] sendTemperatureRangeAlertsEmail() INICIADO`);
    console.log(`📧 [${callId}] Timestamp: ${new Date().toISOString()}`);
    console.log(`📧 [${callId}] Canales recibidos: ${channelsInAlert?.length || 0}`);

    if (!forceSend) {
      console.warn(`[EmailService/TempAlert][${callId}] Llamada sin forceSend=true. Asumiendo validación externa.`);
    }
    if (!channelsInAlert || channelsInAlert.length === 0) {
      console.log(`[EmailService/TempAlert][${callId}] No hay canales en alerta de temperatura para reportar.`);
      return false;
    }
    if (recipients !== null) {
      console.warn(`[EmailService/TempAlert][${callId}] Argumento 'recipients' deprecado, usando config/fallback.`);
    }

    // **** OBTENER DESTINATARIOS DINÁMICOS ****
    const { toRecipients, bccRecipients, usedFallback, usedEmergency } = await this._getDynamicRecipients('TempAlert');

    if (toRecipients.length === 0) {
      console.error("[EmailService/TempAlert] No se pudieron determinar destinatarios válidos (ni siquiera emergencia). Abortando envío.");
      // No contar como fallo de envío SendGrid, sino fallo de configuración/lógica previa
      this.metrics.lastError = "Sin destinatarios TO válidos para TempAlert";
      return false; // No intentar enviar
    }
    if (usedEmergency) {
      console.warn(`[EmailService/TempAlert] ¡¡¡ENVIANDO A DESTINATARIO DE EMERGENCIA!!! (${toRecipients.join(', ')})`);
    } else if (usedFallback) {
      console.warn(`[EmailService/TempAlert] Usando destinatarios TO de fallback (${toRecipients.join(', ')})`);
    }

    const formattedDateTime = moment().tz(this.timeZone).format("DD-MM HH:mm");
    const subject = `Alerta Horaria de Temperatura - ${formattedDateTime}`;
    const { html, text } = this._formatTemperatureAlertContent(channelsInAlert); // Formato sin cambios

    let attempt1Success = false;
    // ... (Lógica de intento 1 con BCC y fallbacks A/B SIN CAMBIOS, pero usando las listas `toRecipients` y `bccRecipients` obtenidas arriba) ...
    try { // Intento 1
      console.log("[EmailService/TempAlert] Iniciando Intento 1 (con BCC)...");
      const msgAttempt1 = { to: toRecipients, subject, text, html };
      // Añadir BCC solo si la lista no está vacía Y NO estamos en modo emergencia
      if (!usedEmergency && bccRecipients && bccRecipients.length > 0) {
        msgAttempt1.bcc = bccRecipients;
      } else if (usedEmergency) {
        console.warn("[EmailService/TempAlert] Omitiendo BCC debido a envío de emergencia.");
      } else {
        console.log("[EmailService/TempAlert] Lista BCC está vacía o no aplica, enviando sin BCC en Intento 1.");
      }
      attempt1Success = await this._sendMail(msgAttempt1);
      if (attempt1Success) {
        console.log("[EmailService/TempAlert] Intento 1 (con BCC/emergencia) EXITOSO.");
        this.recordEmailSuccess(subject + (usedEmergency ? " (EMERGENCIA)" : (msgAttempt1.bcc ? " (con BCC)" : "")), toRecipients.length + (msgAttempt1.bcc ? msgAttempt1.bcc.length : 0));
        this.metrics.sentAlerts++; this.metrics.lastSuccessTime = new Date(); return true;
      } else {
        console.warn("[EmailService/TempAlert] Intento 1 (con BCC/emergencia) falló (reportado por _sendMail como false). Procediendo a fallback (si aplica)...");
        this.metrics.failedAlerts++;
      }
    } catch (error) {
      console.error("[EmailService/TempAlert] Intento 1 (con BCC/emergencia) falló con EXCEPCIÓN. Procediendo a fallback (si aplica)...");
      this.metrics.failedAlerts++;
    }

    // --- Fallback (Solo si attempt1Success es false Y NO se usó emergencia en el intento 1) ---
    if (!attempt1Success && !usedEmergency) {
      console.log("[EmailService/TempAlert] Ejecutando Fallback (envío sin BCC)...");
      // Fallback A: Enviar solo a destinatarios principales (ya obtenidos)
      try {
        console.log("[EmailService/TempAlert] Fallback A: Enviando solo a destinatarios principales...");
        const msgFallbackA = { to: toRecipients, subject, text, html };
        if (await this._sendMail(msgFallbackA)) { console.log("[EmailService/TempAlert] Fallback A EXITOSO."); }
        else { console.error("[EmailService/TempAlert] Fallback A FALLÓ."); this.recordEmailError(subject + " (Fallback Principales)", this.metrics.lastError || "Error desconocido en Fallback A"); }
      } catch (error) { console.error("[EmailService/TempAlert] Fallback A falló con EXCEPCIÓN:", error.message); this.recordEmailError(subject + " (Fallback Principales)", error.message); }

      // Fallback B: Enviar copia a "BCC" como destinatarios TO (si había BCC original)
      if (bccRecipients && bccRecipients.length > 0) {
        try {
          console.log("[EmailService/TempAlert] Fallback B: Enviando copia a 'BCC' como destinatarios TO...");
          const msgFallbackB = { to: bccRecipients, subject, text, html };
          if (await this._sendMail(msgFallbackB)) { console.log("[EmailService/TempAlert] Fallback B EXITOSO."); }
          else { console.error("[EmailService/TempAlert] Fallback B FALLÓ."); this.recordEmailError(subject + " (Fallback BCC como TO)", this.metrics.lastError || "Error desconocido en Fallback B"); }
        } catch (error) { console.error("[EmailService/TempAlert] Fallback B falló con EXCEPCIÓN:", error.message); this.recordEmailError(subject + " (Fallback BCC como TO)", error.message); }
      } else { console.log("[EmailService/TempAlert] Fallback B omitido: Lista BCC estaba vacía."); }
    } else if (!attempt1Success && usedEmergency) {
      console.error("[EmailService/TempAlert] El envío al destinatario de EMERGENCIA también falló.");
    }

    return attempt1Success; // Retornar éxito del intento original
  }


  /**
   * Envía alertas de desconexión usando destinatarios dinámicos.
   * @param {Array} disconnectedChannels - Array de objetos con información de los canales.
   * @param {Array|null} [recipients=null] - **DEPRECADO**.
   * @returns {Promise<boolean>} true si el intento principal (con BCC) fue exitoso.
   */
  async sendDisconnectedSensorsEmail(disconnectedChannels, recipients = null) {
    if (!disconnectedChannels || disconnectedChannels.length === 0) {
      console.log("[EmailService/DisconnAlert] No hay canales desconectados para reportar.");
      return false;
    }
    if (recipients !== null) {
      console.warn("[EmailService/DisconnAlert] Argumento 'recipients' deprecado, usando config/fallback.");
    }

    // **** OBTENER DESTINATARIOS DINÁMICOS ****
    const { toRecipients, bccRecipients, usedFallback, usedEmergency } = await this._getDynamicRecipients('DisconnAlert');

    if (toRecipients.length === 0) {
      console.error("[EmailService/DisconnAlert] No se pudieron determinar destinatarios válidos (ni siquiera emergencia). Abortando envío.");
      this.metrics.lastError = "Sin destinatarios TO válidos para DisconnAlert";
      return false;
    }
    if (usedEmergency) {
      console.warn(`[EmailService/DisconnAlert] ¡¡¡ENVIANDO A DESTINATARIO DE EMERGENCIA!!! (${toRecipients.join(', ')})`);
    } else if (usedFallback) {
      console.warn(`[EmailService/DisconnAlert] Usando destinatarios TO de fallback (${toRecipients.join(', ')})`);
    }

    const formattedDateTime = moment().tz(this.timeZone).format("DD-MM HH:mm");
    const subject = `Alerta de Conexión / Desconexión - ${formattedDateTime}`;
    const { html, text } = this._formatDisconnectionAlertContent(disconnectedChannels);

    let attempt1Success = false;
    // ... (Lógica de intento 1 con BCC y fallbacks A/B idéntica a la de temperatura, usando las listas obtenidas) ...
    try { // Intento 1
      console.log("[EmailService/DisconnAlert] Iniciando Intento 1 (con BCC/emergencia)...");
      const msgAttempt1 = { to: toRecipients, subject, text, html };
      if (!usedEmergency && bccRecipients && bccRecipients.length > 0) { msgAttempt1.bcc = bccRecipients; }
      else if (usedEmergency) { console.warn("[EmailService/DisconnAlert] Omitiendo BCC debido a envío de emergencia."); }
      else { console.log("[EmailService/DisconnAlert] Lista BCC está vacía o no aplica, enviando sin BCC en Intento 1."); }
      attempt1Success = await this._sendMail(msgAttempt1);
      if (attempt1Success) {
        console.log("[EmailService/DisconnAlert] Intento 1 (con BCC/emergencia) EXITOSO.");
        this.recordEmailSuccess(subject + (usedEmergency ? " (EMERGENCIA)" : (msgAttempt1.bcc ? " (con BCC)" : "")), toRecipients.length + (msgAttempt1.bcc ? msgAttempt1.bcc.length : 0));
        this.metrics.sentAlerts++; this.metrics.lastSuccessTime = new Date(); return true;
      } else {
        console.warn("[EmailService/DisconnAlert] Intento 1 (con BCC/emergencia) falló (reportado por _sendMail como false). Procediendo a fallback (si aplica)...");
        this.metrics.failedAlerts++;
      }
    } catch (error) {
      console.error("[EmailService/DisconnAlert] Intento 1 (con BCC/emergencia) falló con EXCEPCIÓN. Procediendo a fallback (si aplica)...");
      this.metrics.failedAlerts++;
    }
    if (!attempt1Success && !usedEmergency) { // Fallback
      console.log("[EmailService/DisconnAlert] Ejecutando Fallback (envío sin BCC)...");
      try { // Fallback A
        console.log("[EmailService/DisconnAlert] Fallback A: Enviando solo a destinatarios principales...");
        const msgFallbackA = { to: toRecipients, subject, text, html };
        if (await this._sendMail(msgFallbackA)) console.log("[EmailService/DisconnAlert] Fallback A EXITOSO.");
        else { console.error("[EmailService/DisconnAlert] Fallback A FALLÓ."); this.recordEmailError(subject + " (Fallback Principales)", this.metrics.lastError || "Error desconocido en Fallback A"); }
      } catch (error) { console.error("[EmailService/DisconnAlert] Fallback A falló con EXCEPCIÓN:", error.message); this.recordEmailError(subject + " (Fallback Principales)", error.message); }
      if (bccRecipients && bccRecipients.length > 0) { // Fallback B
        try {
          console.log("[EmailService/DisconnAlert] Fallback B: Enviando copia a 'BCC' como destinatarios TO...");
          const msgFallbackB = { to: bccRecipients, subject, text, html };
          if (await this._sendMail(msgFallbackB)) console.log("[EmailService/DisconnAlert] Fallback B EXITOSO.");
          else { console.error("[EmailService/DisconnAlert] Fallback B FALLÓ."); this.recordEmailError(subject + " (Fallback BCC como TO)", this.metrics.lastError || "Error desconocido en Fallback B"); }
        } catch (error) { console.error("[EmailService/DisconnAlert] Fallback B falló con EXCEPCIÓN:", error.message); this.recordEmailError(subject + " (Fallback BCC como TO)", error.message); }
      } else { console.log("[EmailService/DisconnAlert] Fallback B omitido: Lista BCC estaba vacía."); }
    } else if (!attempt1Success && usedEmergency) {
      console.error("[EmailService/DisconnAlert] El envío al destinatario de EMERGENCIA también falló.");
    }

    return attempt1Success;
  }

  // --- (_formatTemperatureAlertContent, _formatDisconnectionAlertContent, _stripHtml sin cambios) ---
  _formatTemperatureAlertContent(channelsInAlert) { /* ... (sin cambios) ... */
    const formattedTime = moment().tz(this.timeZone).format("DD/MM/YYYY HH:mm:ss");
    let htmlRows = "";
    let textContent = `Alerta Horaria: ${channelsInAlert.length} canales con temperaturas fuera de límites persistentes.\nFecha: ${formattedTime}\n\nDetalles:\n`;
    channelsInAlert.forEach((channel) => {
      const name = channel?.channelName || 'N/A'; const avgTemp = channel?.averageTemperature; const status = channel?.status || 'Indeterminado';
      const minThreshold = channel?.minThreshold; const maxThreshold = channel?.maxThreshold;
      const avgTempFormatted = avgTemp !== undefined ? avgTemp.toFixed(1) + '°C' : 'N/A';
      const minFormatted = minThreshold !== undefined ? minThreshold.toFixed(1) + '°C' : 'N/A'; // Añadir .toFixed(1) si son decimales
      const maxFormatted = maxThreshold !== undefined ? maxThreshold.toFixed(1) + '°C' : 'N/A'; // Añadir .toFixed(1) si son decimales
      const statusColor = status === "Baja" ? "#0000FF" : (status === "Alta" ? "#FF0000" : "#000000");
      textContent += `- ${name}: Promedio ${avgTempFormatted} (${status}). Rango: [${minFormatted} - ${maxFormatted}]\n`;
      htmlRows += `<tr><td style="padding: 8px; border: 1px solid #ddd;">${name}</td><td style="padding: 8px; border: 1px solid #ddd;">${avgTempFormatted}</td><td style="padding: 8px; border: 1px solid #ddd; color: ${statusColor}; font-weight: bold;">${status}</td><td style="padding: 8px; border: 1px solid #ddd;">${minFormatted} / ${maxFormatted}</td></tr>`;
    });
    const html = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;"><h2 style="color: #D32F2F; border-bottom: 1px solid #e1e1e1; padding-bottom: 10px;">Alerta Horaria de Temperatura</h2><p>Se han detectado <strong>${channelsInAlert.length} canales</strong> con temperaturas promedio consistentemente fuera de los límites establecidos en la última ventana horaria analizada.</p><p>Fecha y hora de la alerta: ${formattedTime}</p><table style="width: 100%; border-collapse: collapse; margin-top: 20px;"><thead style="background-color: #f2f2f2;"><tr><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Canal</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Temp. Promedio</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Estado</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Rango Permitido</th></tr></thead><tbody>${htmlRows}</tbody></table><p style="margin-top: 20px; font-style: italic;">Esta alerta se genera automáticamente. No conteste a este correo electronico.</p><p style="margin-top: 5px; font-size: 10px; color: #999;">Generado por: ${this.appName} - ${this.companyName}</p></div>`;
    return { html, text: textContent };
  }
  _formatDisconnectionAlertContent(disconnectedChannels) { /* ... (sin cambios) ... */
    const formattedTime = moment().tz(this.timeZone).format("DD/MM/YYYY HH:mm:ss");
    let htmlRows = "";
    let textContent = `Alerta Conexión/Desconexión: ${disconnectedChannels.length} canales con cambios de estado reportados.\nFecha: ${formattedTime}\n\nDetalles:\n`;
    disconnectedChannels.forEach(channel => {
      const name = channel.name || 'N/A';
      const status = channel.finalStatus || 'Indeterminado';
      const statusColor = status === 'CONECTADO' ? '#4CAF50' : '#D32F2F'; // Verde o Rojo
      const horaDesc = channel.horaDesconexion || 'N/A';
      const horaRec = channel.horaReconexion || 'N/A';
      textContent += `- ${name}: Estado Final ${status}. Desc: ${horaDesc}, Rec: ${horaRec}\n`;
      htmlRows += `<tr><td style="padding: 8px; border: 1px solid #ddd;">${name}</td><td style="padding: 8px; border: 1px solid #ddd; color: ${statusColor}; font-weight: bold;">${status}</td><td style="padding: 8px; border: 1px solid #ddd;">${horaDesc}</td><td style="padding: 8px; border: 1px solid #ddd;">${horaRec}</td></tr>`;
    });
    const html = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;"><h2 style="color: #FFA000; border-bottom: 1px solid #e1e1e1; padding-bottom: 10px;">Alerta de Conexión / Desconexión</h2><p>Se han detectado <strong>${disconnectedChannels.length} canales</strong> con cambios de estado recientes.</p><p>Fecha y hora de la alerta: ${formattedTime}</p><table style="width: 100%; border-collapse: collapse; margin-top: 20px;"><thead style="background-color: #f2f2f2;"><tr><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Canal</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Estado Final</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Hora Desconexión</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Hora Reconexión</th></tr></thead><tbody>${htmlRows}</tbody></table><p style="margin-top: 20px; font-style: italic;">Esta alerta se genera automáticamente. No conteste a este correo electronico.</p><p style="margin-top: 5px; font-size: 10px; color: #999;">Generado por: ${this.appName} - ${this.companyName}</p></div>`;
    return { html, text: textContent };
  }
  _stripHtml(html) { /* ... (sin cambios) ... */ return html ? html.replace(/<[^>]*>?/gm, '').replace(/ /g, ' ').trim() : ''; }


  // --- (recordEmailSuccess, recordEmailError, generateEmailContent sin cambios funcionales) ---
  recordEmailSuccess(subject, recipientCount) { /* ... (sin cambios) ... */ const time = new Date().toLocaleTimeString(); console.log(`Métrica Éxito: Correo "${subject}" enviado (Destinatarios: ${recipientCount}) a las ${time}`); }
  recordEmailError(subject, errorMessage) { /* ... (sin cambios) ... */ console.error(`Métrica Error: Falló envío de "${subject}" - ${errorMessage}`); }
  generateEmailContent(type, data) { /* ... (sin cambios) ... */
    let subject = "Alerta del Sistema"; let htmlContent = `<p>Alerta tipo: ${type}</p><p>Datos: ${JSON.stringify(data)}</p>`; let plainText = `Alerta tipo: ${type}\nDatos: ${JSON.stringify(data)}`;
    switch (type) {
      case "temperature": const formattedTemp = this._formatTemperatureAlertContent([data]); subject = `Alerta de Temperatura - ${data?.channelName || 'Dispositivo desconocido'}`; htmlContent = formattedTemp.html; plainText = formattedTemp.text; break;
      case "disconnection": const formattedDisc = this._formatDisconnectionAlertContent([data]); subject = `Alerta de Conexión - ${data?.name || data?.channelName || 'Dispositivo desconocido'}`; htmlContent = formattedDisc.html; plainText = formattedDisc.text; break;
    } return { subject, htmlContent, plainText };
  }

  /**
   * Generates professional HTML template for report emails
   * Feature: 004-reportes-base-core (T067)
   *
   * @param {Object} params - Template parameters
   * @param {string} params.reportName - Name of the report
   * @param {string} params.periodStart - Start date of report period (formatted)
   * @param {string} params.periodEnd - End date of report period (formatted)
   * @param {string} [params.customMessage] - Optional custom message
   * @param {string} [params.fileName] - PDF filename
   * @param {string} [params.reportType] - Type of report (executive_temperature, etc)
   * @returns {Object} - { html, text } email content
   */
  generateReportEmailHTML(params) {
    const {
      reportName,
      periodStart,
      periodEnd,
      customMessage,
      fileName,
      reportType
    } = params;

    const reportTypeDisplay = reportType === 'executive_temperature'
      ? 'Reporte Ejecutivo de Temperatura'
      : 'Reporte';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; border-radius: 8px 8px 0 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="120" style="vertical-align: middle;">
                          <img src="cid:tnstrack_logo" alt="TNS Track" style="width: 100px; height: auto; display: block;" />
                        </td>
                        <td style="vertical-align: middle; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                            ${this.appName}
                          </h1>
                          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                            ${reportTypeDisplay}
                          </p>
                        </td>
                        <td width="120" style="vertical-align: middle; text-align: right;">
                          <img src="cid:company_logo" alt="TNS" style="width: 100px; height: auto; display: block; margin-left: auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">

                    <!-- Report Title -->
                    <h2 style="margin: 0 0 24px 0; color: #1a202c; font-size: 20px; font-weight: 600;">
                      ${reportName}
                    </h2>

                    <!-- Report Period Info -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7fafc; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                      <tr>
                        <td>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #718096; font-size: 14px; display: block; margin-bottom: 4px;">📅 Período del Reporte</span>
                                <span style="color: #2d3748; font-size: 16px; font-weight: 500;">
                                  ${periodStart} - ${periodEnd}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Custom Message (if provided) -->
                    ${customMessage ? `
                    <div style="padding: 16px; background-color: #edf2f7; border-left: 4px solid #667eea; border-radius: 4px; margin-bottom: 24px;">
                      <p style="margin: 0; color: #2d3748; font-size: 14px; line-height: 1.6;">
                        ${customMessage}
                      </p>
                    </div>
                    ` : ''}

                    <!-- Default Message -->
                    ${!customMessage ? `
                    <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                      El reporte solicitado ha sido generado exitosamente y se adjunta en formato PDF a este correo electrónico.
                    </p>
                    ` : ''}

                    <!-- Attachment Info -->
                    ${fileName ? `
                    <div style="border: 2px dashed #cbd5e0; border-radius: 6px; padding: 16px; text-align: center; margin-top: 24px;">
                      <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
                        📎 Archivo Adjunto
                      </p>
                      <p style="margin: 0; color: #2d3748; font-size: 15px; font-weight: 500;">
                        ${fileName}
                      </p>
                    </div>
                    ` : ''}

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f7fafc; padding: 30px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 8px 0; color: #2d3748; font-size: 14px; font-weight: 500;">
                            ${this.companyName}
                          </p>
                          <p style="margin: 0 0 16px 0; color: #718096; font-size: 12px;">
                            Reporte generado automáticamente por ${this.appName}
                          </p>
                          <p style="margin: 0; color: #a0aec0; font-size: 11px; font-style: italic;">
                            Este es un mensaje automático. Por favor no responda a este correo.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Plain text version
    const text = `
${this.appName} - ${reportTypeDisplay}

${reportName}

Período del Reporte: ${periodStart} - ${periodEnd}

${customMessage || 'El reporte solicitado ha sido generado exitosamente y se adjunta en formato PDF a este correo electrónico.'}

${fileName ? `Archivo adjunto: ${fileName}` : ''}

---
${this.companyName}
Reporte generado automáticamente por ${this.appName}
Este es un mensaje automático. Por favor no responda a este correo.
    `.trim();

    return { html, text };
  }

  /**
   * Sends a report email with PDF attachment
   * Feature: 004-reportes-base-core (T010)
   *
   * @param {Array<string>} recipients - Email addresses to send to
   * @param {string} subject - Email subject line
   * @param {string} message - Custom message body (optional)
   * @param {string} pdfPath - Absolute path to PDF file
   * @param {Object} [reportMetadata] - Optional report metadata for enhanced template
   * @returns {Promise<boolean>} - true if sent successfully
   */
  async sendReportEmail(recipients, subject, message, pdfPath, reportMetadata = null) {
    const fs = require('fs').promises;
    const path = require('path');

    // Validate inputs
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      console.error('[EmailService/ReportEmail] No recipients provided');
      return false;
    }

    if (!subject || !pdfPath) {
      console.error('[EmailService/ReportEmail] Subject or PDF path missing');
      return false;
    }

    try {
      // Verify PDF file exists
      try {
        await fs.access(pdfPath);
      } catch (error) {
        console.error(`[EmailService/ReportEmail] PDF file not found: ${pdfPath}`);
        return false;
      }

      // Check PDF file size (SendGrid limit: 30MB, using 25MB as safe buffer)
      const stats = await fs.stat(pdfPath);
      const fileSizeBytes = stats.size;
      const maxSizeBytes = 25 * 1024 * 1024; // 25MB

      if (fileSizeBytes > maxSizeBytes) {
        const sizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
        console.error(`[EmailService/ReportEmail] PDF too large: ${sizeMB}MB (max: 25MB)`);
        throw new Error(`El archivo es demasiado grande (${sizeMB}MB). El límite para envío por email es 25MB.`);
      }

      // Read PDF file as base64
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');
      const fileName = path.basename(pdfPath);

      // Read logo images as base64 for embedded attachments
      const logoTnsTrackPath = path.join(__dirname, '../../assets/images/TNS Track White.png');
      const logoCompanyPath = path.join(__dirname, '../../assets/images/tns_logo_blanco.png');

      let logoTnsTrackBase64 = null;
      let logoCompanyBase64 = null;

      try {
        const logoTnsTrackBuffer = await fs.readFile(logoTnsTrackPath);
        logoTnsTrackBase64 = logoTnsTrackBuffer.toString('base64');
      } catch (error) {
        console.warn(`[EmailService/ReportEmail] TNS Track logo not found at ${logoTnsTrackPath}`);
      }

      try {
        const logoCompanyBuffer = await fs.readFile(logoCompanyPath);
        logoCompanyBase64 = logoCompanyBuffer.toString('base64');
      } catch (error) {
        console.warn(`[EmailService/ReportEmail] Company logo not found at ${logoCompanyPath}`);
      }

      // Generate email content using enhanced template if metadata provided
      let htmlBody, plainText;

      if (reportMetadata) {
        const emailContent = this.generateReportEmailHTML({
          reportName: reportMetadata.reportName || subject,
          periodStart: reportMetadata.periodStart || 'N/A',
          periodEnd: reportMetadata.periodEnd || 'N/A',
          customMessage: message,
          fileName: fileName,
          reportType: reportMetadata.reportType || null
        });
        htmlBody = emailContent.html;
        plainText = emailContent.text;
      } else {
        // Fallback to simple template
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
            <h2 style="color: #333; border-bottom: 1px solid #e1e1e1; padding-bottom: 10px;">${this.appName} - Reporte Generado</h2>
            ${message ? `<p>${message}</p>` : '<p>Se adjunta el reporte solicitado en formato PDF.</p>'}
            <p style="margin-top: 20px;">
              <strong>Archivo adjunto:</strong> ${fileName}
            </p>
            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e1e1e1; font-size: 12px; color: #777;">
              <p>Reporte generado automáticamente por ${this.appName}</p>
              <p>${this.companyName}</p>
              <p style="margin-top: 10px; font-style: italic;">Este es un mensaje automático. Por favor no responda a este correo.</p>
            </div>
          </div>
        `;
        plainText = message || 'Se adjunta el reporte solicitado en formato PDF.';
      }

      // Prepare email message with attachment
      const attachments = [
        {
          content: pdfBase64,
          filename: fileName,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ];

      // Add embedded logo images if available
      if (logoTnsTrackBase64) {
        attachments.push({
          content: logoTnsTrackBase64,
          filename: 'tnstrack_logo.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'tnstrack_logo'
        });
      }

      if (logoCompanyBase64) {
        attachments.push({
          content: logoCompanyBase64,
          filename: 'company_logo.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'company_logo'
        });
      }

      const emailMessage = {
        to: recipients,
        subject: subject,
        text: plainText,
        html: htmlBody,
        attachments: attachments
      };

      console.log(`[EmailService/ReportEmail] Sending report "${fileName}" to: ${recipients.join(', ')}`);

      // Send email using existing _sendMail method
      const success = await this._sendMail(emailMessage);

      if (success) {
        console.log(`[EmailService/ReportEmail] ✅ Report email sent successfully to ${recipients.length} recipient(s)`);
        this.recordEmailSuccess(subject, recipients.length);
      } else {
        console.error(`[EmailService/ReportEmail] ❌ Failed to send report email`);
        this.recordEmailError(subject, this.metrics.lastError || 'Unknown error');
      }

      return success;

    } catch (error) {
      console.error('[EmailService/ReportEmail] Error sending report email:', error.message);
      this.recordEmailError(subject, error.message);
      return false;
    }
  }

}

module.exports = new EmailService(); // Exportar instancia única