/**
 * Report Controller
 * Feature: 004-reportes-base-core (T017-T018)
 *
 * Handles API requests for report generation, templates, history, and downloads
 */

const reportGenerationService = require('../services/reports/reportGeneration_Service');
const emailService = require('../services/email/email_Service');
const emailValidator = require('../services/reports/emailValidator_Utils');
const path = require('path');
const fs = require('fs').promises;
const { DateTime } = require('luxon');
const configLoader = require('../config/js_files/configLoader_Config');

// Database configuration aligned with unified-config.json (same as services)
const dbConfigRaw = configLoader.getValue('database') || {};
const unifiedDbConfig = {
  host: dbConfigRaw.host,
  port: dbConfigRaw.port,
  user: dbConfigRaw.username,
  password: dbConfigRaw.password,
  database: dbConfigRaw.database
};

/**
 * POST /api/reportes/generar
 * Generate a new report manually
 */
async function generateReport(req, res) {
  try {
    console.log('[ReportController] Request body received:', JSON.stringify(req.body));

    const { reportType, startDate, endDate, deviceIds, includeComparative } = req.body;
    const userId = req.user?.userId;

    console.log('[ReportController] Extracted reportType:', reportType);

    // Validate required fields
    if (!reportType || !startDate || !endDate || !deviceIds) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: reportType, startDate, endDate, deviceIds'
      });
    }

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'deviceIds debe ser un array con al menos un dispositivo'
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Check max range (365 days)
    const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return res.status(400).json({
        success: false,
        error: 'El rango máximo permitido es de 365 días'
      });
    }

    // Special validation for consumption reports (T097)
    if (reportType === 'executive_consumption') {
      try {
        console.log('[ReportController] Validating consumption report with deviceIds:', deviceIds);
        
        // Convert all deviceIds to strings (Shelly IDs are strings, not numbers)
        const deviceIdsAsStrings = deviceIds.map(id => String(id));
        console.log('[ReportController] Converted deviceIds to strings:', deviceIdsAsStrings);
        
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection(unifiedDbConfig);

        // Verify all devices are Shelly devices (from sem_dispositivos table)
        const placeholders = deviceIdsAsStrings.map(() => '?').join(',');
        const query = `SELECT shelly_id FROM sem_dispositivos WHERE shelly_id IN (${placeholders}) AND activo = 1`;
        console.log('[ReportController] Executing query:', query);
        console.log('[ReportController] With params:', deviceIdsAsStrings);
        
        const [devices] = await connection.execute(query, deviceIdsAsStrings);
        await connection.end();
        
        console.log('[ReportController] Found devices:', devices.length, 'out of', deviceIdsAsStrings.length);

        if (devices.length !== deviceIdsAsStrings.length) {
          const foundIds = devices.map(d => d.shelly_id);
          const missingIds = deviceIdsAsStrings.filter(id => !foundIds.includes(id));
          console.warn('[ReportController] Missing devices:', missingIds);
          
          return res.status(400).json({
            success: false,
            error: `Solo se permiten dispositivos Shelly activos para reportes de consumo eléctrico. Dispositivos no válidos: ${missingIds.join(', ')}`
          });
        }

        // Verify tariff configuration exists
        const tariffConfig = configLoader.getValue('tariffs');
        if (!tariffConfig || !tariffConfig.punta || !tariffConfig.valle || !tariffConfig.fuera_punta) {
          console.warn('[ReportController] Tariff config missing, will use defaults');
        }

      } catch (error) {
        console.error('[ReportController] Error validating consumption report:', error);
        return res.status(500).json({
          success: false,
          error: 'Error validando dispositivos para reporte de consumo'
        });
      }
    }

    // Prepare configuration
    const config = {
      startDate,
      endDate,
      deviceIds,
      includeComparative: includeComparative === true
    };

    console.log(`[ReportController] User ${userId} generating report:`, config);

    // Generate report
    const result = await reportGenerationService.generateReport(reportType, config, userId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[ReportController] Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el reporte',
      details: error.message
    });
  }
}

/**
 * GET /api/reportes/plantillas
 * Get available report templates
 */
async function getTemplates(req, res) {
  const mysql = require('mysql2/promise');
  const configLoader = require('../config/js_files/configLoader_Config');

  try {
    const dbConfigRaw = configLoader.getValue('database');
    const connection = await mysql.createConnection({
      host: dbConfigRaw.host,
      port: dbConfigRaw.port,
      user: dbConfigRaw.username,
      password: dbConfigRaw.password,
      database: dbConfigRaw.database
    });

    const [rows] = await connection.execute(
      `SELECT p.id_plantilla,
              p.clave_plantilla,
              p.nombre,
              p.descripcion,
              t.nombre AS tipo_nombre,
              p.tiempo_estimado_segundos,
              p.max_dispositivos,
              p.max_dias,
              p.admite_comparativo
       FROM rep_plantillas p
       JOIN rep_tipo_reporte t ON p.id_tipo_reporte = t.id_tipo_reporte
       WHERE p.activo = 1
       ORDER BY p.nombre`
    );

    await connection.end();

    const templates = rows.map(row => ({
      id: row.id_plantilla,
      key: row.clave_plantilla,
      name: row.nombre,
      description: row.descripcion,
      type: row.tipo_nombre,
      estimatedTime: row.tiempo_estimado_segundos,
      maxDevices: row.max_dispositivos,
      maxDays: row.max_dias,
      supportsComparative: row.admite_comparativo === 1
    }));

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('[ReportController] Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plantillas de reportes'
    });
  }
}

/**
 * GET /api/reportes/historial
 * Get report history with filters and pagination
 */
async function getHistory(req, res) {
  try {
    const {
      type,
      startDate,
      endDate,
      search,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Filters
    const filters = {};
    if (type) filters.reportType = type;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (search) filters.search = search;
    if (status) filters.status = status;

    // Only show user's own reports unless admin
    if (userRole !== 'admin') {
      filters.generatedBy = userId;
    }

    // Pagination
    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100), // Max 100 per page
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc'
    };

    const result = await reportGenerationService.getReportHistory(filters, pagination);

    res.set('X-Total-Count', result.totalCount);
    res.set('X-Total-Pages', result.totalPages);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[ReportController] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener histórico de reportes'
    });
  }
}

/**
 * GET /api/reportes/descargar/:id
 * Download a generated report PDF
 */
async function downloadReport(req, res) {
  const mysql = require('mysql2/promise');

  try {
    const reportId = parseInt(req.params.id);
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de reporte inválido'
      });
    }

    // Log which DB config will be used (without password)
    console.log('[ReportController] Using DB config for download:', {
      host: unifiedDbConfig.host,
      port: unifiedDbConfig.port,
      user: unifiedDbConfig.user,
      database: unifiedDbConfig.database
    });

    // Get report from database using unified configuration
    const connection = await mysql.createConnection(unifiedDbConfig);

    const [rows] = await connection.execute(
      `SELECT ruta_archivo, nombre_reporte, estado_generacion, id_usuario, fecha_expiracion
       FROM rep_reportes_generados
       WHERE id_reporte_generado = ?`,
      [reportId]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reporte no encontrado'
      });
    }

    const report = rows[0];

    // Check permissions (users can only download their own reports unless admin)
    if (userRole !== 'admin' && report.id_usuario !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para descargar este reporte'
      });
    }

    // Check if expired
    if (report.fecha_expiracion) {
      return res.status(410).json({
        success: false,
        error: 'Archivo expirado - no disponible',
        expiredAt: report.fecha_expiracion
      });
    }

    // Check generation status
    if (report.estado_generacion !== 'completado') {
      return res.status(400).json({
        success: false,
        error: `Reporte no disponible. Estado: ${report.estado_generacion}`
      });
    }

    // Build file path
    const storagePath = process.env.REPORTS_STORAGE_PATH || '../storage/reports';
    const absolutePath = path.resolve(__dirname, '../../', storagePath, report.ruta_archivo);

    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch (error) {
      console.error('[ReportController] File not found:', absolutePath);
      return res.status(404).json({
        success: false,
        error: 'Archivo de reporte no encontrado en el servidor'
      });
    }

    // Mark as downloaded (only on first download)
    try {
      const connection2 = await mysql.createConnection(unifiedDbConfig);
      await connection2.execute(
        `UPDATE rep_reportes_generados
         SET fecha_descarga = COALESCE(fecha_descarga, NOW())
         WHERE id_reporte_generado = ?`,
        [reportId]
      );
      await connection2.end();
    } catch (updateError) {
      console.error('[ReportController] Error updating fecha_descarga:', updateError);
      // Don't fail the download if this update fails
    }

    // Stream file to response
    const fileName = `${report.nombre_reporte.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = require('fs').createReadStream(absolutePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('[ReportController] Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: 'Error al descargar el reporte'
    });
  }
}

/**
 * POST /api/reportes/enviar-email
 * Send a generated report via email
 * Feature: 004-reportes-base-core (T070)
 */
async function sendEmail(req, res) {
  const mysql = require('mysql2/promise');

  try {
    const { reportId, recipients, subject, message } = req.body;
    const userId = req.user?.userId;

    console.log(`[ReportController/SendEmail] Request from user ${userId} for report ${reportId}`);

    // Validate email request using emailValidator
    const validationResult = emailValidator.validateEmailRequest({
      recipients,
      subject: subject || 'Reporte',
      message: message || null,
      reportId: parseInt(reportId)
    });

    if (!validationResult.valid) {
      console.warn(`[ReportController/SendEmail] Validation failed: ${validationResult.error}`);
      return res.status(400).json({
        success: false,
        error: validationResult.error
      });
    }

    const validatedData = validationResult.validated;

    // Get report from database using unified config
    const connection = await mysql.createConnection(unifiedDbConfig);

    try {
      const [rows] = await connection.execute(
        `SELECT
          ruta_archivo,
          nombre_reporte,
          tamanio_bytes,
          fecha_inicio_periodo,
          fecha_fin_periodo,
          id_plantilla,
          config_reporte
         FROM rep_reportes_generados
         WHERE id_reporte_generado = ? AND estado_generacion = 'completado'`,
        [reportId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Reporte no encontrado o no completado'
        });
      }

      const report = rows[0];

      // Check file size (max 25MB for email - SendGrid limit is 30MB)
      const maxSizeBytes = 25 * 1024 * 1024; // 25MB
      if (report.tamanio_bytes && report.tamanio_bytes > maxSizeBytes) {
        return res.status(400).json({
          success: false,
          error: `El reporte es demasiado grande para enviar por email (${(report.tamanio_bytes / (1024 * 1024)).toFixed(2)}MB). Máximo permitido: 25MB. Por favor descarga el archivo directamente.`
        });
      }

      // Get template info for report type
      const [templateRows] = await connection.execute(
        `SELECT t.nombre AS tipo_nombre
         FROM rep_plantillas p
         JOIN rep_tipo_reporte t ON p.id_tipo_reporte = t.id_tipo_reporte
         WHERE p.id_plantilla = ?`,
        [report.id_plantilla]
      );

      const reportType = templateRows.length > 0 ? templateRows[0].tipo_nombre : null;

      // Build file path
      const reportsConfig = configLoader.getValue('reports') || {};
      const storagePath = reportsConfig.storage_path || '../storage/reports';
      const pdfPath = path.resolve(__dirname, '../../', storagePath, report.ruta_archivo);

      // Verify file exists
      try {
        await fs.access(pdfPath);
      } catch (error) {
        console.error(`[ReportController/SendEmail] PDF file not found: ${pdfPath}`);
        return res.status(404).json({
          success: false,
          error: 'Archivo de reporte no encontrado en el servidor'
        });
      }

      // Prepare report metadata for enhanced email template
      const reportMetadata = {
        reportName: report.nombre_reporte,
        periodStart: DateTime.fromJSDate(report.fecha_inicio_periodo).toFormat('dd/MM/yyyy'),
        periodEnd: DateTime.fromJSDate(report.fecha_fin_periodo).toFormat('dd/MM/yyyy'),
        reportType: reportType
      };

      // Send email using enhanced template
      const emailSubject = validatedData.subject || `Reporte: ${report.nombre_reporte}`;
      const success = await emailService.sendReportEmail(
        validatedData.recipients,
        emailSubject,
        validatedData.message,
        pdfPath,
        reportMetadata
      );

      if (success) {
        console.log(`[ReportController/SendEmail] ✅ Email sent successfully for report ${reportId} to ${validatedData.recipients.length} recipient(s)`);

        // Optional: Log delivery to database (T069)
        // await connection.execute(
        //   `INSERT INTO email_delivery_log (report_id, recipients, subject, custom_message, delivery_status, sent_by)
        //    VALUES (?, ?, ?, ?, 'sent', ?)`,
        //   [reportId, JSON.stringify(validatedData.recipients), emailSubject, validatedData.message, userId]
        // );

        return res.json({
          success: true,
          sentCount: validatedData.recipients.length,
          recipients: validatedData.recipients,
          reportName: report.nombre_reporte
        });
      } else {
        console.error(`[ReportController/SendEmail] ❌ Failed to send email for report ${reportId}`);

        return res.status(500).json({
          success: false,
          error: 'Error al enviar el email. Revisa los logs del servidor para más detalles.'
        });
      }

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('[ReportController/SendEmail] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al enviar el reporte por email',
      details: error.message
    });
  }
}

module.exports = {
  generateReport,
  getTemplates,
  getHistory,
  downloadReport,
  sendEmail
};
