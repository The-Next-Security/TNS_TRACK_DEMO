/**
 * Executive Consumption Report Template
 * Feature: 004-reportes-base-core Phase 9 (T095)
 *
 * Generates HTML for executive electrical consumption reports with:
 * - Cover page with logo and period
 * - Executive summary with 6 electrical KPIs
 * - Device statistics table
 * - Daily consumption trend chart (QuickChart)
 * - Device ranking chart
 * - Hourly load profile chart
 * - Comparative analysis (if enabled)
 */

const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

// Helpers: safe formatting to avoid toFixed on undefined/null/NaN
function formatNumber(value, decimals = 2) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(decimals) : 'N/A';
}

function formatPercent(value, decimals = 1) {
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(decimals)}%` : 'N/A';
}

/**
 * Convert image file to Base64 data URL
 * @param {string} imagePath - Absolute path to image file
 * @returns {string} Base64 data URL
 */
function convertImageToBase64(imagePath) {
  try {
    console.log('[Consumption Template] 🔍 Attempting to load image:', imagePath);
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`[Consumption Template] ✅ Image loaded: ${imagePath} (${imageBuffer.length} bytes)`);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    console.error(`[Consumption Template] ❌ Error loading image ${imagePath}:`, error.message);
    return '';
  }
}

/**
 * Generate complete HTML for executive consumption report
 *
 * @param {Object} data - Report data
 * @param {Object} data.kpis - Consumption KPIs (totalKWh, maxDemandKW, loadFactor, etc.)
 * @param {Array} data.deviceStats - Per-device statistics
 * @param {Array} data.dailyData - Daily consumption data for trend chart
 * @param {Array} data.hourlyData - Hourly consumption data for load profile
 * @param {Object} data.config - Report configuration (startDate, endDate, deviceIds)
 * @param {Object} data.comparativeData - Comparative analysis (optional)
 * @param {string} data.generatedBy - User who generated the report
 * @returns {string} Complete HTML document
 */
function generateHTML(data) {
  const {
    kpis,
    deviceStats = [],
    dailyData = [],
    hourlyData = [],
    config,
    comparativeData = null,
    generatedBy = 'Sistema'
  } = data;

  const { startDate, endDate, deviceIds = [] } = config;

  // Format dates
  const formattedStartDate = DateTime.fromISO(String(startDate)).toFormat('dd/MM/yyyy');
  const formattedEndDate = DateTime.fromISO(String(endDate)).toFormat('dd/MM/yyyy');
  const generatedAt = DateTime.now().setZone('America/Santiago').toFormat('dd/MM/yyyy HH:mm:ss');

  // Generate charts using QuickChart API
  const lineChartUrl = generateDailyTrendChart(dailyData);
  const barChartUrl = generateDeviceRankingChart(deviceStats);
  const areaChartUrl = generateHourlyProfileChart(hourlyData);
  const comparativeChartUrl = comparativeData ? generateComparativeChart(comparativeData.comparisons) : null;

  // Convert logos to Base64
  const projectRoot = path.resolve(__dirname, '../../../..');
  const imagesPath = path.join(projectRoot, 'src', 'assets', 'images');

  const tnsLogoBase64 = convertImageToBase64(path.join(imagesPath, 'tns_logo_blanco.png'));
  const tnsTrackLogoBase64 = convertImageToBase64(path.join(imagesPath, 'TNS Track White.png'));
  const storageLogoBase64 = convertImageToBase64(path.join(imagesPath, 'storagelogo.png'));

  // Build HTML
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Ejecutivo de Consumo Eléctrico - ${formattedStartDate} a ${formattedEndDate}</title>
  <style>
    ${generateBaseStyles()}
  </style>
</head>
<body>

  <!-- PAGE 1: COVER + EXECUTIVE SUMMARY -->
  <div class="page page-cover">
    ${generateCoverPage(formattedStartDate, formattedEndDate, deviceIds.length, tnsLogoBase64, tnsTrackLogoBase64, storageLogoBase64)}
  </div>

  <!-- PAGE 2: CONTENT -->
  <div class="page page-content">
    ${generateHeader(tnsLogoBase64, tnsTrackLogoBase64, formattedStartDate, formattedEndDate)}
    
    <div class="two-column-grid">
      <!-- LEFT COLUMN -->
      <div class="column-left">
        ${generateKPICards(kpis)}
        ${generateDailyTrendSection(lineChartUrl)}
        ${deviceStats.length > 0 ? generateDeviceStatsTable(deviceStats) : ''}
      </div>

      <!-- RIGHT COLUMN -->
      <div class="column-right">
        ${generateDeviceRankingSection(barChartUrl)}
        ${generateHourlyProfileSection(areaChartUrl)}
        ${comparativeData ? generateComparativeSection(comparativeData, comparativeChartUrl) : ''}
      </div>
    </div>

    ${generateGlossarySection()}

    ${generateFooter(generatedBy, generatedAt)}
  </div>

</body>
</html>
  `;

  return html.trim();
}

/**
 * Generate base CSS styles
 */
function generateBaseStyles() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      font-size: 9pt;
      line-height: 1.3;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0.5cm 1cm;
      page-break-after: always;
      position: relative;
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* Cover Page */
    .page-cover {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      color: white;
      padding: 2cm;
    }

    .cover-logos {
      margin-bottom: 3cm;
      display: flex;
      gap: 2cm;
      align-items: center;
    }

    .cover-logo {
      height: 60px;
      width: auto;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      margin-bottom: 1.5cm;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .cover-subtitle {
      font-size: 16pt;
      font-weight: 400;
      margin-bottom: 0.5cm;
      opacity: 0.95;
    }

    .cover-period {
      font-size: 22pt;
      font-weight: 600;
      margin: 1.5cm 0;
      padding: 0.5cm 1.5cm;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .cover-meta {
      font-size: 11pt;
      margin-top: 2cm;
      opacity: 0.85;
    }

    /* Content Page Header */
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4cm;
      padding-bottom: 0.3cm;
      border-bottom: 2px solid #e5e7eb;
    }

    .header-logos {
      display: flex;
      gap: 0.5cm;
      align-items: center;
    }

    .header-logo {
      height: 28px;
      width: auto;
    }

    .header-info {
      text-align: right;
      font-size: 8pt;
      color: #6b7280;
    }

    /* Two Column Layout */
    .two-column-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4cm;
      margin-bottom: 0.3cm;
    }

    .column-left, .column-right {
      display: flex;
      flex-direction: column;
      gap: 0.3cm;
    }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.25cm;
      margin-bottom: 0.3cm;
    }

    .kpi-card {
      background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 0.25cm;
      text-align: center;
    }

    .kpi-label {
      font-size: 7pt;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.1cm;
    }

    .kpi-value {
      font-size: 16pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 0.05cm;
    }

    .kpi-unit {
      font-size: 6.5pt;
      color: #64748b;
      font-weight: 500;
    }

    .kpi-hint {
      font-size: 5.5pt;
      color: #94a3b8;
      margin-top: 0.05cm;
      line-height: 1.2;
      font-style: italic;
    }

    /* Charts */
    .chart-section {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.3cm;
      margin-bottom: 0.3cm;
    }

    .chart-title {
      font-size: 8.5pt;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.2cm;
      padding-bottom: 0.15cm;
      border-bottom: 1px solid #e5e7eb;
    }

    .chart-container {
      width: 100%;
      height: auto;
    }

    .chart-img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }

    /* Device Statistics Table */
    .device-stats-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }

    .device-stats-table thead {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
    }

    .device-stats-table th {
      padding: 0.15cm 0.1cm;
      text-align: center;
      font-weight: 600;
      font-size: 6.5pt;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      height: 1.8cm;
      white-space: nowrap;
    }

    .device-stats-table tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }

    .device-stats-table tbody tr:hover {
      background-color: #eff6ff;
    }

    .device-stats-table td {
      padding: 0.12cm 0.15cm;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
      color: #374151;
    }

    .device-name-cell {
      text-align: left;
      font-weight: 500;
      color: #1f2937;
    }

    /* Comparative Section */
    .comparative-section {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 6px;
      padding: 0.3cm;
      margin-top: 0.3cm;
    }

    .comparative-title {
      font-size: 8.5pt;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 0.2cm;
    }

    .comparative-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.5pt;
      background: white;
      border-radius: 4px;
      overflow: hidden;
    }

    .comparative-table th {
      background: #fbbf24;
      color: #78350f;
      padding: 0.1cm;
      text-align: center;
      font-weight: 600;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      height: 1.5cm;
    }

    .comparative-table td {
      padding: 0.1cm;
      text-align: center;
      border-bottom: 1px solid #fef3c7;
    }

    .trend-positive {
      color: #047857;
      font-weight: 600;
    }

    .trend-negative {
      color: #dc2626;
      font-weight: 600;
    }

    .trend-neutral {
      color: #64748b;
    }

    /* Footer */
    .content-footer {
      position: absolute;
      bottom: 0.5cm;
      left: 1cm;
      right: 1cm;
      font-size: 6.5pt;
      color: #9ca3af;
      text-align: center;
      padding-top: 0.2cm;
      border-top: 1px solid #e5e7eb;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .page {
        page-break-after: always;
      }

      .page:last-child {
        page-break-after: auto;
      }
    }
  `;
}

/**
 * Generate cover page HTML
 */
function generateCoverPage(startDate, endDate, deviceCount, tnsLogo, tnsTrackLogo, storageLogo) {
  return `
    <div class="cover-logos">
      ${tnsLogo ? `<img src="${tnsLogo}" alt="TNS Logo" class="cover-logo">` : ''}
      ${tnsTrackLogo ? `<img src="${tnsTrackLogo}" alt="TNS Track Logo" class="cover-logo">` : ''}
    </div>

    <div class="cover-title">
      ⚡ Reporte Ejecutivo<br>Consumo Eléctrico
    </div>

    <div class="cover-subtitle">
      Análisis de Consumo, Demanda y Costos Operacionales
    </div>

    <div class="cover-period">
      ${startDate} — ${endDate}
    </div>

    <div class="cover-meta">
      ${deviceCount} ${deviceCount === 1 ? 'Dispositivo Monitoread' : 'Dispositivos Monitoreados'}<br>
      Sistema de Monitoreo TNS Track
    </div>

    ${storageLogo ? `
      <div style="margin-top: 2cm;">
        <img src="${storageLogo}" alt="Storage Logo" style="height: 40px; opacity: 0.8;">
      </div>
    ` : ''}
  `;
}

/**
 * Generate content page header
 */
function generateHeader(tnsLogo, tnsTrackLogo, startDate, endDate) {
  return `
    <div class="content-header">
      <div class="header-logos">
        ${tnsLogo ? `<img src="${tnsLogo}" alt="TNS" class="header-logo">` : ''}
        ${tnsTrackLogo ? `<img src="${tnsTrackLogo}" alt="TNS Track" class="header-logo">` : ''}
      </div>
      <div class="header-info">
        <strong>Reporte de Consumo Eléctrico</strong><br>
        Período: ${startDate} - ${endDate}
      </div>
    </div>
  `;
}

/**
 * Generate KPI cards section
 */
function generateKPICards(kpis) {
  const {
    totalKWh = 0,
    maxDemandKW = 0,
    loadFactor = 0,
    estimatedCost = 0,
    avgDailyKWh = 0,
    peakHours = 0
  } = kpis;

  // Safe number conversion
  const safeTotalKWh = Number(totalKWh) || 0;
  const safeMaxDemandKW = Number(maxDemandKW) || 0;
  const safeLoadFactor = Number(loadFactor) || 0;
  const safeEstimatedCost = Number(estimatedCost) || 0;
  const safeAvgDailyKWh = Number(avgDailyKWh) || 0;
  const safePeakHours = Number(peakHours) || 0;

  return `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Consumo Total</div>
        <div class="kpi-value">${safeTotalKWh.toLocaleString('es-CL')}</div>
        <div class="kpi-unit">kWh</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Demanda Máxima</div>
        <div class="kpi-value">${safeMaxDemandKW.toLocaleString('es-CL')}</div>
        <div class="kpi-unit">kW</div>
        <div class="kpi-hint">Pico de consumo instantáneo</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Factor de Carga</div>
        <div class="kpi-value">${safeLoadFactor.toFixed(1)}%</div>
        <div class="kpi-unit">Eficiencia</div>
        <div class="kpi-hint">Uso promedio vs. capacidad máxima</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Costo Estimado</div>
        <div class="kpi-value">$${Math.round(safeEstimatedCost).toLocaleString('es-CL')}</div>
        <div class="kpi-unit">CLP</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Consumo Promedio</div>
        <div class="kpi-value">${safeAvgDailyKWh.toFixed(1)}</div>
        <div class="kpi-unit">kWh/día</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Horas Pico</div>
        <div class="kpi-value">${safePeakHours.toFixed(1)}%</div>
        <div class="kpi-unit">del período</div>
      </div>
    </div>
  `;
}

/**
 * Generate daily trend chart section
 */
function generateDailyTrendSection(chartUrl) {
  if (!chartUrl) return '';

  return `
    <div class="chart-section">
      <div class="chart-title">📊 Tendencia de Consumo Diario</div>
      <div class="chart-container">
        <img src="${chartUrl}" alt="Consumo Diario" class="chart-img">
      </div>
    </div>
  `;
}

/**
 * Generate device ranking chart section
 */
function generateDeviceRankingSection(chartUrl) {
  if (!chartUrl) return '';

  return `
    <div class="chart-section">
      <div class="chart-title">🏆 Ranking de Consumo por Dispositivo</div>
      <div class="chart-container">
        <img src="${chartUrl}" alt="Ranking Dispositivos" class="chart-img">
      </div>
    </div>
  `;
}

/**
 * Generate hourly profile chart section
 */
function generateHourlyProfileSection(chartUrl) {
  if (!chartUrl) return '';

  return `
    <div class="chart-section">
      <div class="chart-title">⏰ Perfil de Carga Horario</div>
      <div class="chart-container">
        <img src="${chartUrl}" alt="Perfil Horario" class="chart-img">
      </div>
    </div>
  `;
}

/**
 * Generate device statistics table
 */
function generateDeviceStatsTable(deviceStats) {
  if (!deviceStats || deviceStats.length === 0) return '';

  const rows = deviceStats.map(device => {
    // Safe number conversion
    const totalKWh = Number(device.totalKWh) || 0;
    const maxDemandKW = Number(device.maxDemandKW) || 0;
    const avgPowerKW = Number(device.avgPowerKW) || 0;
    const costEstimated = Number(device.costEstimated) || 0;
    const readingsCount = Number(device.readingsCount) || 0;
    
    return `
    <tr>
      <td class="device-name-cell">${device.device_name}</td>
      <td>${totalKWh.toLocaleString('es-CL')}</td>
      <td>${maxDemandKW.toFixed(2)}</td>
      <td>${avgPowerKW.toFixed(2)}</td>
      <td>$${Math.round(costEstimated).toLocaleString('es-CL')}</td>
      <td>${readingsCount.toLocaleString('es-CL')}</td>
    </tr>
  `;
  }).join('');

  return `
    <div class="chart-section">
      <div class="chart-title">📋 Estadísticas por Dispositivo</div>
      <table class="device-stats-table">
        <thead>
          <tr>
            <th style="writing-mode: horizontal-tb; transform: none; height: auto;">Dispositivo</th>
            <th>Consumo Total (kWh)</th>
            <th>Demanda Máx. (kW)</th>
            <th>Potencia Prom. (kW)</th>
            <th>Costo Estimado (CLP)</th>
            <th>N° Lecturas</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate comparative analysis section
 */
function generateComparativeSection(comparativeData, chartUrl) {
  if (!comparativeData || !comparativeData.comparisons) return '';

  const rows = comparativeData.comparisons.map(comp => {
    const changeClass = comp.change > 0 ? 'trend-negative' : comp.change < 0 ? 'trend-positive' : 'trend-neutral';
    const changeSymbol = comp.change > 0 ? '↑' : comp.change < 0 ? '↓' : '→';
    
    // Safe formatting for all values - FIX: use percentChange (not changePercent)
    const changePercent = (comp.percentChange !== null && comp.percentChange !== undefined)
      ? formatPercent(comp.percentChange, 1)
      : 'N/A';

    const currentVal = (comp.current !== null && comp.current !== undefined)
      ? formatNumber(comp.current, 2)
      : 'N/A';

    const previousVal = (comp.previous !== null && comp.previous !== undefined)
      ? formatNumber(comp.previous, 2)
      : 'N/A';

    return `
      <tr>
        <td style="text-align: left;">${comp.metric}</td>
        <td>${currentVal}</td>
        <td>${previousVal}</td>
        <td class="${changeClass}">${changeSymbol} ${changePercent}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="comparative-section">
      <div class="comparative-title">📈 Análisis Comparativo con Período Anterior</div>
      <table class="comparative-table">
        <thead>
          <tr>
            <th style="writing-mode: horizontal-tb; transform: none; height: auto;">Métrica</th>
            <th>Actual</th>
            <th>Anterior</th>
            <th>Variación</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ${chartUrl ? `
        <div style="margin-top: 0.2cm;">
          <img src="${chartUrl}" alt="Comparativa" class="chart-img">
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate glossary section with KPI explanations
 */
function generateGlossarySection() {
  return `
    <div style="margin-top: 0.4cm; padding: 0.3cm; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
      <div style="font-size: 8pt; font-weight: 600; color: #1e40af; margin-bottom: 0.2cm; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.1cm;">
        📖 Glosario de KPIs
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.15cm; font-size: 6pt; color: #475569;">
        <div>
          <strong style="color: #1e40af;">Consumo Total (kWh):</strong>
          <span style="display: block; margin-top: 0.05cm;">Energía eléctrica consumida en el período. 1 kWh = usar 1,000 watts durante 1 hora.</span>
        </div>
        <div>
          <strong style="color: #1e40af;">Demanda Máxima (kW):</strong>
          <span style="display: block; margin-top: 0.05cm;">Pico de potencia instantánea registrado. Define los cargos por capacidad y dimensionamiento eléctrico.</span>
        </div>
        <div>
          <strong style="color: #1e40af;">Factor de Carga (%):</strong>
          <span style="display: block; margin-top: 0.05cm;">Eficiencia del uso de capacidad. Fórmula: (Demanda Promedio / Demanda Máxima) × 100. Valores >60% indican uso eficiente.</span>
        </div>
        <div>
          <strong style="color: #1e40af;">Costo Estimado (CLP):</strong>
          <span style="display: block; margin-top: 0.05cm;">Costo calculado según tarifas horarias (Punta: 18-22h, Valle: 23-6h, Fuera Punta: 7-17h).</span>
        </div>
        <div>
          <strong style="color: #1e40af;">Consumo Promedio (kWh/día):</strong>
          <span style="display: block; margin-top: 0.05cm;">Promedio diario de energía consumida. Útil para proyecciones y comparaciones mensuales.</span>
        </div>
        <div>
          <strong style="color: #1e40af;">Horas Pico (%):</strong>
          <span style="display: block; margin-top: 0.05cm;">Porcentaje de lecturas en horario pico (18-22h). Mayor uso en pico = mayor costo.</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate footer
 */
function generateFooter(generatedBy, generatedAt) {
  return `
    <div class="content-footer">
      Generado por: ${generatedBy} | Fecha: ${generatedAt} | TNS Track - Sistema de Monitoreo IoT
    </div>
  `;
}

/**
 * Generate daily trend line chart using QuickChart
 */
function generateDailyTrendChart(dailyData) {
  if (!dailyData || dailyData.length === 0) return null;

  const labels = dailyData.map(d => DateTime.fromISO(String(d.date)).toFormat('dd/MM'));
  const data = dailyData.map(d => d.totalKWh);

  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Consumo Diario (kWh)',
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => `${value} kWh` }
        }
      }
    }
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=360&height=200&backgroundColor=white`;
}

/**
 * Generate device ranking bar chart using QuickChart
 */
function generateDeviceRankingChart(deviceStats) {
  if (!deviceStats || deviceStats.length === 0) return null;

  // Take top 10 devices
  const topDevices = deviceStats.slice(0, 10);
  const labels = topDevices.map(d => d.device_name.substring(0, 15));
  const data = topDevices.map(d => d.totalKWh);

  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Consumo (kWh)',
        data,
        backgroundColor: '#3b82f6',
        borderColor: '#1e40af',
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => `${value} kWh` }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=360&height=240&backgroundColor=white`;
}

/**
 * Generate hourly load profile area chart using QuickChart
 */
function generateHourlyProfileChart(hourlyData) {
  if (!hourlyData || hourlyData.length === 0) return null;

  const labels = hourlyData.map(d => `${d.hour}:00`);
  const data = hourlyData.map(d => d.avgKW);

  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Potencia Promedio (kW)',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => `${value} kW` }
        },
        x: {
          ticks: {
            maxRotation: 90,
            minRotation: 90,
            autoSkip: true,
            maxTicksLimit: 12
          }
        }
      }
    }
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=360&height=200&backgroundColor=white`;
}

/**
 * Generate comparative bar chart using QuickChart
 */
function generateComparativeChart(comparisons) {
  if (!comparisons || comparisons.length === 0) return null;

  const labels = comparisons.map(c => c.metric.substring(0, 20));
  const currentData = comparisons.map(c => c.current);
  const previousData = comparisons.map(c => c.previous);

  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data: currentData,
          backgroundColor: '#3b82f6'
        },
        {
          label: 'Anterior',
          data: previousData,
          backgroundColor: '#94a3b8'
        }
      ]
    },
    options: {
      plugins: {
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: { beginAtZero: true },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=360&height=200&backgroundColor=white`;
}

module.exports = {
  generateHTML
};

