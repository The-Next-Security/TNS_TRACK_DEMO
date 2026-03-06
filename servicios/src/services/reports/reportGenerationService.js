/**
 * Report Generation Service (Orchestration)
 * Feature: 004-reportes-base-core (T016)
 *
 * Orchestrates the complete report generation workflow:
 * 1. Fetch data from database
 * 2. Calculate KPIs and statistics
 * 3. Generate HTML from template
 * 4. Convert HTML to PDF
 * 5. Save to storage
 * 6. Create database record
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;
const temperatureAggregationService = require('./aggregation/temperatureAggregationService');
const alertsAggregationService = require('./aggregation/alertsAggregationService');
const consumptionAggregationService = require('./aggregation/consumptionAggregationService'); // Phase 9 (T096)
const reportAnalyticsService = require('./reportAnalyticsService');
const pdfGeneratorService = require('./pdfGeneratorService');
const executiveTemperatureTemplate = require('./templates/executiveTemperatureTemplate');
const executiveAlertsTemplate = require('./templates/executiveAlertsTemplate');
const executiveConsumptionTemplate = require('./templates/executiveConsumptionTemplate'); // Phase 9 (T096)
const configLoader = require('../../config/js_files/config-loader');

let _dbConfig = null;
let _storagePath = null;
function getDbConfig() {
  if (!_dbConfig) {
    const raw = configLoader.getValue('database');
    _dbConfig = {
      host: raw.host,
      port: raw.port,
      user: raw.username,
      password: raw.password,
      database: raw.database
    };
  }
  return _dbConfig;
}
function getStoragePath() {
  if (_storagePath == null) {
    _storagePath = configLoader.getValue('reports_module_config.reports_storage_path') || '../storage/reports';
  }
  return _storagePath;
}

/**
 * Generate a complete temperature report
 *
 * @param {string} reportType - Type of report (e.g., 'executive_temperature')
 * @param {Object} config - Report configuration
 * @param {string} config.startDate - Start date (YYYY-MM-DD)
 * @param {string} config.endDate - End date (YYYY-MM-DD)
 * @param {Array<number>} config.deviceIds - Device IDs to include
 * @param {boolean} config.includeComparative - Include comparative analysis
 * @param {number} userId - ID of user generating the report
 * @returns {Promise<Object>} Generated report metadata
 */
async function generateReport(reportType, config, userId) {
  const startTime = Date.now();
  let connection;

  console.log(`[ReportGeneration] Starting report generation: ${reportType}`);
  console.log(`[ReportGeneration] Config:`, config);

  try {
    // Validate inputs
    if (!reportType || !config || !userId) {
      throw new Error('Missing required parameters: reportType, config, or userId');
    }

    if (!config.startDate || !config.endDate || !config.deviceIds || config.deviceIds.length === 0) {
      throw new Error('Invalid config: startDate, endDate, and deviceIds are required');
    }

    connection = await mysql.createConnection(getDbConfig());

    // Get template configuration
    const [templateRows] = await connection.execute(
      'SELECT * FROM report_templates WHERE template_key = ? AND active = 1',
      [reportType]
    );

    if (templateRows.length === 0) {
      throw new Error(`Report template not found or inactive: ${reportType}`);
    }

    const template = templateRows[0];

    // Create pending report record in database
    // Use scheduleName if provided (for scheduled reports), otherwise use generic name
    const reportName = config.scheduleName || `${template.name} - ${config.startDate} a ${config.endDate}`;
    const source = config.scheduleId ? 'scheduled' : 'manual';
    const scheduleId = config.scheduleId || null;

    const [insertResult] = await connection.execute(
      `INSERT INTO generated_reports
        (template_id, report_name, file_path, report_config, period_start_date, period_end_date,
         device_ids, generation_status, created_by, source, schedule_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'generating', ?, ?, ?)`,
      [
        template.id,
        reportName,
        'pending', // Will be updated with actual path
        JSON.stringify(config),
        config.startDate,
        config.endDate,
        JSON.stringify(config.deviceIds),
        userId,
        source,
        scheduleId
      ]
    );

    const reportId = insertResult.insertId;
    console.log(`[ReportGeneration] Created report record ID: ${reportId}`);

    // Update status to generating
    await connection.execute(
      'UPDATE generated_reports SET generation_status = ? WHERE id = ?',
      ['generating', reportId]
    );

    // Step 1: Fetch data and calculate KPIs (based on report type)
    console.log('[ReportGeneration] Step 1: Calculating KPIs...');

    let kpis, deviceStats, hourlyData, enrichedDeviceStats;
    let dailyTrend, typeDistribution, slaMetrics; // For alerts report

    if (reportType === 'executive_temperature') {
      // Temperature report data
      kpis = await temperatureAggregationService.calculateKPIs(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      // Get device statistics
      deviceStats = await temperatureAggregationService.getDeviceStatistics(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      // Get % Temp > 0°C for each device (for PDF table)
      const aboveZeroPercentages = await temperatureAggregationService.calculateTimeAboveZeroPercentage(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      // Enrich device stats with % Temp > 0°C indicator
      enrichedDeviceStats = deviceStats.map(device => ({
        ...device,
        percentAboveZero: aboveZeroPercentages[device.deviceId] !== undefined
          ? aboveZeroPercentages[device.deviceId]
          : null
      }));

      // Get hourly data for heatmap
      hourlyData = await temperatureAggregationService.getHourlyTemperatures(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

    } else if (reportType === 'executive_alerts') {
      // Alerts report data
      kpis = await alertsAggregationService.calculateKPIs(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      deviceStats = await alertsAggregationService.getDeviceStatistics(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      hourlyData = await alertsAggregationService.getHourlyDistribution(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      dailyTrend = await alertsAggregationService.getDailyTrend(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      typeDistribution = await alertsAggregationService.getAlertTypeDistribution(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      slaMetrics = await alertsAggregationService.getSLAMetrics(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

    } else if (reportType === 'executive_consumption') {
      // Consumption report data (Phase 9 - T096)
      console.log('[ReportGeneration] Generating consumption report...');
      
      // Get tariff configuration (or use defaults)
      const tariffConfig = configLoader.getValue('tariffs') || {
        punta: 150,
        valle: 80,
        fuera_punta: 100
      };
      console.log('[ReportGeneration] Using tariffs:', tariffConfig);

      // Calculate KPIs with tariff information
      kpis = await consumptionAggregationService.calculateKPIs(
        config.deviceIds,
        config.startDate,
        config.endDate,
        tariffConfig
      );

      // Get device statistics
      deviceStats = await consumptionAggregationService.getDeviceStatistics(
        config.deviceIds,
        config.startDate,
        config.endDate,
        tariffConfig
      );

      // Get hourly consumption for load profile chart
      hourlyData = await consumptionAggregationService.getHourlyConsumption(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      // Get daily consumption for trend chart
      dailyTrend = await consumptionAggregationService.getDailyConsumption(
        config.deviceIds,
        config.startDate,
        config.endDate
      );

      console.log('[ReportGeneration] Consumption data fetched successfully');

    } else {
      throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Step 2: Calculate comparative analysis (if requested)
    let comparativeData = null;
    if (config.includeComparative) {
      console.log('[ReportGeneration] Step 2: Calculating comparative analysis...');

      try {
        const { compStartDate, compEndDate } = reportAnalyticsService.calculateComparativePeriod(
          config.startDate,
          config.endDate
        );
        console.log(`[ReportGeneration] Comparative period: ${compStartDate} to ${compEndDate}`);

        const previousKPIsStartTime = Date.now();
        
        // Use appropriate service based on report type
        let previousKPIs;
        if (reportType === 'executive_temperature') {
          previousKPIs = await temperatureAggregationService.calculateKPIs(
            config.deviceIds,
            compStartDate,
            compEndDate
          );
        } else if (reportType === 'executive_consumption') {
          const tariffConfig = configLoader.getValue('tariffs') || {
            punta: 150,
            valle: 80,
            fuera_punta: 100
          };
          previousKPIs = await consumptionAggregationService.calculateKPIs(
            config.deviceIds,
            compStartDate,
            compEndDate,
            tariffConfig
          );
        } else if (reportType === 'executive_alerts') {
          previousKPIs = await alertsAggregationService.calculateKPIs(
            config.deviceIds,
            compStartDate,
            compEndDate
          );
        }
        
        const previousKPIsTime = Date.now() - previousKPIsStartTime;
        console.log(`[ReportGeneration] Previous period KPIs fetched in ${previousKPIsTime}ms`);
        
        // Log appropriate KPIs based on report type
        if (reportType === 'executive_consumption') {
          console.log('[ReportGeneration] Previous KPIs:', {
            totalKWh: previousKPIs.totalKWh,
            maxDemandKW: previousKPIs.maxDemandKW,
            loadFactor: previousKPIs.loadFactor,
            estimatedCost: previousKPIs.estimatedCost,
            avgDailyKWh: previousKPIs.avgDailyKWh,
            totalReadings: previousKPIs.totalReadings
          });
        } else if (reportType === 'executive_temperature') {
          console.log('[ReportGeneration] Previous KPIs:', {
            avg: previousKPIs.avg,
            max: previousKPIs.max,
            min: previousKPIs.min,
            alertsCount: previousKPIs.alertsCount,
            totalReadings: previousKPIs.totalReadings
          });
        } else {
          console.log('[ReportGeneration] Previous KPIs:', previousKPIs);
        }

        const comparisons = reportAnalyticsService.calculateComparativeAnalysis(kpis, previousKPIs, { reportType });

        // Check for partial data (warning if previous period has <80% readings)
        const hasPartialData = previousKPIs.totalReadings < (kpis.totalReadings * 0.8);
        if (hasPartialData) {
          console.warn('[ReportGeneration] ⚠ Previous period has partial data:', {
            current: kpis.totalReadings,
            previous: previousKPIs.totalReadings,
            percentage: ((previousKPIs.totalReadings / kpis.totalReadings) * 100).toFixed(1) + '%'
          });
        }

        comparativeData = {
          comparisons,
          previousPeriod: { start: compStartDate, end: compEndDate },
          hasPartialData
        };

        console.log(`[ReportGeneration] ✓ Comparative analysis completed: ${comparisons.length} metrics compared`);

      } catch (error) {
        console.error('[ReportGeneration] ❌ Error calculating comparative analysis:', error.message);
        console.warn('[ReportGeneration] Continuing report generation without comparative analysis');
        // Don't fail the entire report, just skip comparative section
        comparativeData = null;
      }
    }

    // Get user information (try-catch for testing bypass)
    let generatedBy = 'Sistema';
    try {
      const [userRows] = await connection.execute(
        'SELECT email FROM gen_usuario WHERE id_usuario = ?',
        [userId]
      );
      if (userRows.length > 0) {
        generatedBy = userRows[0].email || 'Sistema';
      }
    } catch (error) {
      console.log('[ReportGeneration] User lookup failed, using default:', error.message);
      // Use default generatedBy value
    }

    // Step 3: Generate HTML (based on report type)
    console.log('[ReportGeneration] Step 3: Generating HTML template...');
    let htmlContent;

    if (reportType === 'executive_temperature') {
      htmlContent = executiveTemperatureTemplate.generateHTML({
        kpis,
        deviceStats: enrichedDeviceStats,
        hourlyData,
        config,
        comparativeData,
        generatedBy
      });
    } else if (reportType === 'executive_alerts') {
      htmlContent = executiveAlertsTemplate.generateHTML({
        kpis,
        deviceStats,
        hourlyData,
        dailyTrend,
        typeDistribution,
        slaMetrics,
        config,
        generatedBy
      });
    } else if (reportType === 'executive_consumption') {
      // Consumption report HTML generation (Phase 9 - T103)
      htmlContent = executiveConsumptionTemplate.generateHTML({
        kpis,
        deviceStats,
        dailyData: dailyTrend,  // Daily consumption trend
        hourlyData,              // Hourly load profile
        config,
        comparativeData,
        generatedBy
      });
    } else {
      throw new Error(`Unsupported report type for template generation: ${reportType}`);
    }

    // Step 4: Generate PDF
    console.log('[ReportGeneration] Step 4: Converting HTML to PDF...');

    // Create filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedName = reportName.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const fileName = `${sanitizedName}_${timestamp}.pdf`;

    // Resolve storage path
    const storagePath = path.resolve(__dirname, '../../..', getStoragePath());
    const filePath = path.join(storagePath, fileName);

    // Generate PDF
    const pdfResult = await pdfGeneratorService.generatePDF(htmlContent, filePath, {
      format: 'A4',
      printBackground: true
    });

    // Step 5: Update database record
    console.log('[ReportGeneration] Step 5: Updating database record...');

    const generationTimeSeconds = Math.round((Date.now() - startTime) / 1000);

    await connection.execute(
      `UPDATE generated_reports
       SET file_path = ?, file_size_bytes = ?, generation_status = 'completed',
           generation_time_seconds = ?
       WHERE id = ?`,
      [fileName, pdfResult.fileSize, generationTimeSeconds, reportId]
    );

    console.log(`[ReportGeneration] ✅ Report generated successfully in ${generationTimeSeconds}s`);

    // Return report metadata
    const result = {
      reportId,
      reportName,
      filePath: fileName,
      fileUrl: `/api/reports/download/${reportId}`,
      fileSize: pdfResult.fileSize,
      generatedAt: new Date().toISOString(),
      generationTimeSeconds,
      kpis,
      // Add comparative period info if available
      comparativePeriod: comparativeData ? {
        start: comparativeData.previousPeriod.start,
        end: comparativeData.previousPeriod.end,
        hasPartialData: comparativeData.hasPartialData
      } : null
    };

    return result;

  } catch (error) {
    console.error('[ReportGeneration] ❌ Error generating report:', error.message);

    // Update database with error status if we have a connection and reportId
    if (connection) {
      try {
        // Try to find the report record that was being generated
        const [rows] = await connection.execute(
          `SELECT id FROM generated_reports
           WHERE created_by = ? AND generation_status = 'generating'
           ORDER BY created_at DESC LIMIT 1`,
          [userId]
        );

        if (rows.length > 0) {
          await connection.execute(
            `UPDATE generated_reports
             SET generation_status = 'failed', generation_error = ?
             WHERE id = ?`,
            [error.message, rows[0].id]
          );
        }
      } catch (dbError) {
        console.error('[ReportGeneration] Failed to update error status in DB:', dbError.message);
      }
    }

    throw error;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get report history with filters and pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination settings
 * @returns {Promise<Object>} Paginated report history
 */
async function getReportHistory(filters = {}, pagination = {}) {
  let connection;

  try {
    connection = await mysql.createConnection(getDbConfig());

    const { reportType, startDate, endDate, generatedBy, deviceIds, search, status } = filters;
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (reportType) {
      conditions.push('rt.template_key = ?');
      params.push(reportType);
    }

    if (startDate && endDate) {
      // Adjust end date to include the entire day (23:59:59)
      const endDateTime = `${endDate} 23:59:59`;
      conditions.push('gr.created_at BETWEEN ? AND ?');
      params.push(startDate, endDateTime);
    }

    if (generatedBy) {
      conditions.push('gr.created_by = ?');
      params.push(generatedBy);
    }

    if (search) {
      conditions.push('gr.report_name LIKE ?');
      params.push(`%${search}%`);
    }

    if (status) {
      if (status === 'new') {
        conditions.push('gr.downloaded_at IS NULL');
      } else if (status === 'downloaded') {
        conditions.push('gr.downloaded_at IS NOT NULL');
      }
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Build ORDER BY clause
    const allowedSortFields = {
      'created_at': 'gr.created_at',
      'report_name': 'gr.report_name',
      'file_size': 'gr.file_size_bytes'
    };
    const sortField = allowedSortFields[sortBy] || 'gr.created_at';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderByClause = `ORDER BY ${sortField} ${sortDirection}`;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM generated_reports gr
      LEFT JOIN report_templates rt ON gr.template_id = rt.id
      ${whereClause}
    `;

    const [countRows] = await connection.execute(countQuery, params);
    const totalCount = countRows[0].total;

    // Get paginated results
    // Note: LIMIT and OFFSET cannot be parameterized in mysql2, must be interpolated
    const dataQuery = `
      SELECT
        gr.id,
        gr.report_name,
        rt.name as template_name,
        rt.template_key,
        gr.created_at,
        gr.downloaded_at,
        gr.period_start_date,
        gr.period_end_date,
        gr.device_ids,
        gr.file_size_bytes,
        gr.generation_status,
        gr.generation_time_seconds,
        gr.created_by,
        u.email,
        gr.source,
        gr.schedule_id,
        sr.name as schedule_name
      FROM generated_reports gr
      LEFT JOIN report_templates rt ON gr.template_id = rt.id
      LEFT JOIN gen_usuario u ON gr.created_by = u.id_usuario
      LEFT JOIN scheduled_reports sr ON gr.schedule_id = sr.id
      ${whereClause}
      ${orderByClause}
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const [rows] = await connection.execute(dataQuery, params);

    const reports = rows.map(row => {
      // Parse device_ids safely
      let devices = [];
      try {
        if (row.device_ids) {
          // Check if it's already an array or needs parsing
          devices = typeof row.device_ids === 'string'
            ? JSON.parse(row.device_ids)
            : row.device_ids;
        }
      } catch (parseError) {
        console.error('[ReportHistory] Error parsing device_ids for report', row.id, ':', parseError.message);
        console.error('[ReportHistory] Raw device_ids value:', row.device_ids);
        // Fallback to empty array if parsing fails
        devices = [];
      }

      return {
        id: row.id,
        name: row.report_name,
        type: row.template_name,
        templateKey: row.template_key,  // Changed from typeKey to templateKey for consistency
        template_key: row.template_key, // Added snake_case version for compatibility
        createdAt: row.created_at,
        downloadedAt: row.downloaded_at,
        period: {
          start: row.period_start_date,
          end: row.period_end_date
        },
        periodStartDate: row.period_start_date, // Added for EmailModal compatibility
        periodEndDate: row.period_end_date,     // Added for EmailModal compatibility
        devices: devices,
        fileSize: row.file_size_bytes,
        status: row.generation_status,
        generationTime: row.generation_time_seconds,
        generatedBy: row.email || 'Sistema',
        source: row.source,
        scheduleId: row.schedule_id,
        scheduleName: row.schedule_name
      };
    });

    return {
      reports,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      pageSize: limit
    };

  } catch (error) {
    console.error('[ReportGeneration] Error getting report history:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

module.exports = {
  generateReport,
  getReportHistory
};
