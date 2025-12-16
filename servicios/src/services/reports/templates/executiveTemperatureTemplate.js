/**
 * Executive Temperature Report Template
 * Feature: 004-reportes-base-core (T015)
 *
 * Generates HTML for executive temperature reports with:
 * - Cover page with logo and period
 * - Executive summary with 6 main KPIs
 * - Device statistics table
 * - Temperature trends line chart (QuickChart)
 * - Temperature heatmap
 * - Comparative analysis (if enabled)
 */

const QuickChart = require('quickchart-js');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

/**
 * Convert image file to Base64 data URL
 * @param {string} imagePath - Absolute path to image file
 * @returns {string} Base64 data URL
 */
function convertImageToBase64(imagePath) {
  try {
    console.log('[Template] 🔍 Attempting to load image:', imagePath);
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`[Template] ✅ Image loaded successfully: ${imagePath} (${imageBuffer.length} bytes)`);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    console.error(`[Template] ❌ Error loading image ${imagePath}:`, error.message);
    console.error(`[Template] Full error:`, error);
    return ''; // Return empty string if image fails to load
  }
}

/**
 * Generate complete HTML for executive temperature report
 *
 * @param {Object} data - Report data
 * @param {Object} data.kpis - Temperature KPIs
 * @param {Array} data.deviceStats - Per-device statistics
 * @param {Array} data.hourlyData - Hourly temperature data for heatmap
 * @param {Object} data.config - Report configuration (startDate, endDate, deviceIds)
 * @param {Object} data.comparativeData - Comparative analysis (optional)
 * @param {string} data.generatedBy - User who generated the report
 * @returns {string} Complete HTML document
 */
function generateHTML(data) {
  const {
    kpis,
    deviceStats = [],
    hourlyData = [],
    config,
    comparativeData = null,
    generatedBy = 'Sistema'
  } = data;

  const { startDate, endDate, deviceIds = [] } = config;

  // Format dates
  const formattedStartDate = moment(startDate).format('DD/MM/YYYY');
  const formattedEndDate = moment(endDate).format('DD/MM/YYYY');
  const generatedAt = moment().tz('America/Santiago').format('DD/MM/YYYY HH:mm:ss');

  // Generate charts using QuickChart
  const lineChartUrl = generateLineChart(deviceStats, startDate, endDate);
  const heatmapChartUrl = generateHeatmapChart(hourlyData);
  const comparativeChartUrl = comparativeData ? generateComparativeChart(comparativeData.comparisons) : null;

  // Convert logos to Base64
  // Resolve to project root (/servicios) and construct explicit path to images
  const projectRoot = path.resolve(__dirname, '../../../..');
  const imagesPath = path.join(projectRoot, 'src', 'assets', 'images');

  console.log('[Template] Project root:', projectRoot);
  console.log('[Template] Images path:', imagesPath);

  const tnsLogoBase64 = convertImageToBase64(path.join(imagesPath, 'tns_logo_blanco.png'));
  const tnsTrackLogoBase64 = convertImageToBase64(path.join(imagesPath, 'TNS Track White.png'));
  const storageLogoBase64 = convertImageToBase64(path.join(imagesPath, 'storagelogo.png'));

  // Build HTML using reusable components
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Ejecutivo de Temperaturas - ${formattedStartDate} a ${formattedEndDate}</title>
  <style>
    ${generateBaseStyles()}

    /* Temperature Report Specific Styles */
    /* Compact KPI Grid - Horizontal Layout (5 cards) */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      margin: 6px 0;
    }

    .kpi-card {
      background: #FFFFFF;
      border-left: 3px solid var(--color-primary);
      padding: 10px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0, 51, 102, 0.06);
      position: relative;
      overflow: hidden;
    }

    .kpi-icon {
      font-size: 9pt;
      margin-bottom: 2px;
      opacity: 0.85;
      display: inline-block;
    }

    /* Individual KPI Card Colors */
    .kpi-card.kpi-avg { border-left-color: #5B9BD5; }
    .kpi-card.kpi-min { border-left-color: #4FC3F7; }
    .kpi-card.kpi-max { border-left-color: #FF6B6B; }
    .kpi-card.kpi-uptime { border-left-color: #4CAF50; }
    .kpi-card.kpi-alerts { border-left-color: #FFA726; }

    .kpi-card .label {
      font-size: 7.5pt;
      color: var(--color-text-light);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-weight: 600;
      line-height: 1.2;
    }

    .kpi-card .value {
      font-size: 16pt;
      font-weight: 700;
      color: var(--color-text-dark);
      line-height: 1.1;
    }

    .kpi-card .unit {
      font-size: 10pt;
      color: var(--color-text-light);
      font-weight: 400;
    }

    /* Right-align numeric columns for temperature table */
    table td:nth-child(3), /* Temp. Promedio */
    table td:nth-child(4), /* Mín / Máx */
    table td:nth-child(5), /* Lecturas */
    table td:nth-child(6), /* % Temp > 0°C */
    table td:nth-child(7) { /* Fuera de Rango */
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Color code the last column (Fuera de Rango) */
    table tbody tr td:last-child {
      font-weight: 600;
    }
  </style>
</head>
<body>

  ${generateCoverPage({
    title: 'Reporte Ejecutivo de Temperaturas',
    subtitle: 'Sistema de Monitoreo TNS Track',
    periodStart: formattedStartDate,
    periodEnd: formattedEndDate,
    additionalInfo: `<strong>Dispositivos:</strong> ${deviceIds.length} cámaras monitoreadas`,
    storageLogoBase64,
    tnsTrackLogoBase64,
    tnsLogoBase64
  })}

  <!-- Compact Main Content Page (Page 2) -->
  <div class="page compact">
    <h2>
      <span>Resumen Ejecutivo</span>
      <span class="period-info">Período: ${formattedStartDate} - ${formattedEndDate}</span>
    </h2>

    <!-- KPI Cards - Horizontal Layout -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-avg">
        <div class="kpi-icon">🌡️</div>
        <div class="label">Temp. Promedio</div>
        <div class="value">${kpis.avg !== null ? kpis.avg.toFixed(1) : 'N/A'}<span class="unit">°C</span></div>
      </div>

      <div class="kpi-card kpi-min">
        <div class="kpi-icon">❄️</div>
        <div class="label">Temp. Mínima</div>
        <div class="value">${kpis.min !== null ? kpis.min.toFixed(1) : 'N/A'}<span class="unit">°C</span></div>
      </div>

      <div class="kpi-card kpi-max">
        <div class="kpi-icon">🔥</div>
        <div class="label">Temp. Máxima</div>
        <div class="value">${kpis.max !== null ? kpis.max.toFixed(1) : 'N/A'}<span class="unit">°C</span></div>
      </div>

      <div class="kpi-card kpi-uptime">
        <div class="kpi-icon">⚡</div>
        <div class="label">Uptime</div>
        <div class="value">${kpis.uptime.toFixed(1)}<span class="unit">%</span></div>
      </div>

      <div class="kpi-card kpi-alerts">
        <div class="kpi-icon">🔔</div>
        <div class="label">Alertas</div>
        <div class="value">${kpis.alertsCount}</div>
      </div>
    </div>

    <!-- 2-Column Layout: Charts + Insights Left / Tables Right -->
    <h3>Análisis de Temperaturas</h3>
    <div class="two-column-layout">
      <!-- Left Column: 3 Charts Stacked + Insights at Bottom -->
      <div class="left-column">
        <div class="chart-container">
          <img src="${lineChartUrl}" alt="Temperaturas por Dispositivo" />
        </div>
        <div class="chart-container">
          <img src="${heatmapChartUrl}" alt="Mapa de Calor Horario" />
        </div>
        ${comparativeChartUrl ? `
        <div class="chart-container">
          <img src="${comparativeChartUrl}" alt="Comparativa" />
        </div>
        ` : ''}

        <!-- Insights Moved Here -->
        ${comparativeData ? generateInsightsSection(comparativeData) : ''}
      </div>

      <!-- Right Column: Comparative Analysis Table + Device Statistics Table -->
      <div class="right-column">
        ${comparativeData ? generateCompactComparativeTable(comparativeData) : ''}

        <!-- Device Statistics Table with Rotated Headers -->
        <div style="margin-top: 10px;">
          <h4 style="font-size: 10pt; margin: 0 0 3px 0; color: var(--color-text-dark); font-weight: 700; line-height: 1.1;">Estadísticas por Dispositivo</h4>
          <table class="device-stats-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Ubicación</th>
                <th class="rotated">Temp. Prom.</th>
                <th class="rotated">Mín / Máx</th>
                <th class="rotated">Lecturas</th>
                <th class="rotated">% &gt; 0°C</th>
                <th class="rotated">Fuera Rango</th>
              </tr>
            </thead>
            <tbody>
              ${deviceStats.map(device => `
                <tr>
                  <td>${device.deviceName}</td>
                  <td>${device.location}</td>
                  <td>${device.avgTemp !== null ? device.avgTemp.toFixed(1) + '°C' : 'N/A'}</td>
                  <td>${device.minTemp !== null ? device.minTemp.toFixed(1) : 'N/A'}° / ${device.maxTemp !== null ? device.maxTemp.toFixed(1) : 'N/A'}°</td>
                  <td>${device.totalReadings.toLocaleString()}</td>
                  <td>${device.percentAboveZero !== null ? device.percentAboveZero.toFixed(1) + '%' : '--'}</td>
                  <td>${device.outOfRangePercentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    ${generateFooter(generatedAt, generatedBy)}
  </div>

</body>
</html>
  `;

  return html;
}

/**
 * Generate line chart using QuickChart API
 */
function generateLineChart(deviceStats, startDate, endDate) {
  const chart = new QuickChart();

  chart.setConfig({
    type: 'line',
    data: {
      labels: deviceStats.map(d => d.deviceName),
      datasets: [
        {
          label: 'Temperatura Promedio',
          data: deviceStats.map(d => d.avgTemp),
          borderColor: '#003366',
          backgroundColor: 'rgba(0, 51, 102, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#003366',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#003366',
          pointHoverBorderColor: '#FFFFFF',
          pointHoverBorderWidth: 3
        },
        {
          label: 'Temperatura Mínima',
          data: deviceStats.map(d => d.minTemp),
          borderColor: '#4FC3F7',
          backgroundColor: 'rgba(79, 195, 247, 0.1)',
          borderWidth: 2,
          borderDash: [8, 4],
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#4FC3F7',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2
        },
        {
          label: 'Temperatura Máxima',
          data: deviceStats.map(d => d.maxTemp),
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 2,
          borderDash: [8, 4],
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#FF6B6B',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: `Temperaturas por Dispositivo (${startDate} a ${endDate})`,
        fontSize: 12,
        fontFamily: 'Segoe UI, sans-serif',
        fontColor: '#2C3E50',
        fontStyle: 'bold',
        padding: 10
      },
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          fontSize: 8,
          fontColor: '#2C3E50',
          usePointStyle: true,
          padding: 8
        }
      },
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Temp (°C)',
            fontSize: 9,
            fontStyle: 'bold',
            fontColor: '#2C3E50'
          },
          gridLines: {
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1,
            drawBorder: false
          },
          ticks: {
            fontSize: 8,
            fontColor: '#7F8C8D'
          }
        }],
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Dispositivo',
            fontSize: 9,
            fontStyle: 'bold',
            fontColor: '#2C3E50'
          },
          gridLines: {
            display: false
          },
          ticks: {
            fontSize: 6,
            fontColor: '#7F8C8D'
          }
        }]
      },
      layout: {
        padding: {
          left: 5,
          right: 5,
          top: 5,
          bottom: 5
        }
      }
    }
  });

  chart.setWidth(360);
  chart.setHeight(240);
  chart.setBackgroundColor('white');

  return chart.getUrl();
}

/**
 * Generate heatmap chart using QuickChart API
 */
function generateHeatmapChart(hourlyData) {
  // QuickChart doesn't support heatmaps natively, use bar chart as alternative
  const chart = new QuickChart();

  // Group by hour
  const hourlyAverages = Array(24).fill(0);
  const hourlyCounts = Array(24).fill(0);

  hourlyData.forEach(item => {
    if (item.hour >= 0 && item.hour < 24 && item.avgTemp !== null) {
      hourlyAverages[item.hour] += item.avgTemp;
      hourlyCounts[item.hour]++;
    }
  });

  const avgByHour = hourlyAverages.map((sum, hour) =>
    hourlyCounts[hour] > 0 ? (sum / hourlyCounts[hour]).toFixed(1) : null
  );

  chart.setConfig({
    type: 'bar',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Temperatura Promedio por Hora',
        data: avgByHour,
        backgroundColor: avgByHour.map(temp => {
          if (temp === null) return 'rgba(158, 158, 158, 0.3)';
          if (temp < -15) return 'rgba(33, 150, 243, 0.8)';
          if (temp < -10) return 'rgba(79, 195, 247, 0.8)';
          if (temp < 0) return 'rgba(129, 212, 250, 0.8)';
          if (temp < 10) return 'rgba(255, 167, 38, 0.8)';
          return 'rgba(255, 107, 107, 0.8)';
        }),
        borderColor: avgByHour.map(temp => {
          if (temp === null) return 'rgba(158, 158, 158, 0.5)';
          if (temp < -15) return 'rgba(33, 150, 243, 1)';
          if (temp < -10) return 'rgba(79, 195, 247, 1)';
          if (temp < 0) return 'rgba(129, 212, 250, 1)';
          if (temp < 10) return 'rgba(255, 167, 38, 1)';
          return 'rgba(255, 107, 107, 1)';
        }),
        borderWidth: 2,
        borderRadius: 4
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Distribución de Temperatura por Hora del Día',
        fontSize: 16,
        fontFamily: 'Segoe UI, sans-serif',
        fontColor: '#2C3E50',
        fontStyle: 'bold',
        padding: 20
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Temperatura (°C)',
            fontSize: 13,
            fontStyle: 'bold',
            fontColor: '#2C3E50'
          },
          gridLines: {
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1,
            drawBorder: false
          },
          ticks: {
            fontSize: 11,
            fontColor: '#7F8C8D'
          }
        }],
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Hora del Día',
            fontSize: 13,
            fontStyle: 'bold',
            fontColor: '#2C3E50'
          },
          gridLines: {
            display: false
          },
          ticks: {
            fontSize: 10,
            fontColor: '#7F8C8D'
          }
        }]
      },
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10
        }
      }
    }
  });

  chart.setWidth(360);
  chart.setHeight(200);
  chart.setBackgroundColor('white');

  return chart.getUrl();
}

/**
 * Generate comparative analysis bar chart
 */
function generateComparativeChart(comparisons) {
  const chart = new QuickChart();

  const metrics = comparisons.map(c => c.metric);
  const currentValues = comparisons.map(c => c.current);
  const previousValues = comparisons.map(c => c.previous);

  chart.setConfig({
    type: 'bar',
    data: {
      labels: metrics,
      datasets: [
        {
          label: 'Período Actual',
          data: currentValues,
          backgroundColor: 'rgba(102, 126, 234, 0.7)'
        },
        {
          label: 'Período Anterior',
          data: previousValues,
          backgroundColor: 'rgba(149, 165, 166, 0.5)'
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: 'Comparación KPIs',
        fontSize: 12
      },
      legend: {
        labels: {
          fontSize: 9
        }
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            fontSize: 8
          }
        }],
        xAxes: [{
          ticks: {
            fontSize: 8
          }
        }]
      }
    }
  });

  chart.setWidth(360);
  chart.setHeight(240);
  chart.setBackgroundColor('white');

  return chart.getUrl();
}

/**
 * Generate compact comparative table (right column - top)
 */
function generateCompactComparativeTable(comparativeData) {
  const { comparisons, hasPartialData } = comparativeData;

  return `
    <div>
      <h4 style="font-size: 10pt; margin: 0 0 3px 0; color: var(--color-text-dark); font-weight: 700; line-height: 1.1;">Análisis Comparativo</h4>
      ${hasPartialData ? '<div class="warning" style="font-size: 6.5pt; padding: 6px; margin: 4px 0;">⚠ Datos parciales: El período anterior tiene menos lecturas que el actual (&lt;80%). Los resultados comparativos pueden no ser precisos.</div>' : ''}

      <table class="compact-comparative-table">
        <thead>
          <tr>
            <th>Métrica</th>
            <th class="rotated">Actual</th>
            <th class="rotated">Anterior</th>
            <th class="rotated">Cambio</th>
            <th class="rotated">Tend.</th>
          </tr>
        </thead>
        <tbody>
          ${comparisons.map(comp => {
            const trendClass = comp.trendColor === 'green' ? 'trend-up' :
                              comp.trendColor === 'red' ? 'trend-down' : 'trend-neutral';
            const trendIndicator = comp.trendColor === 'green' ? '🟢▲' :
                                   comp.trendColor === 'red' ? '🔴▼' : '⚪━';

            // Format values: integers for alerts, decimals for others
            const isInteger = comp.metric.includes('Alertas') || comp.metric.includes('Lecturas');
            const formatValue = (val) => {
              if (val == null || isNaN(val)) return 'N/A';
              return isInteger ? Math.round(val).toString() : Number(val).toFixed(1);
            };

            return `
              <tr>
                <td>${comp.metric}</td>
                <td>${formatValue(comp.current)}</td>
                <td style="color: var(--color-text-light);">${formatValue(comp.previous)}</td>
                <td class="${trendClass}">${comp.absoluteChange != null && !isNaN(comp.absoluteChange) ? (comp.absoluteChange > 0 ? '+' : '') + formatValue(comp.absoluteChange) : 'N/A'}</td>
                <td style="font-size: 9pt;">${trendIndicator}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate insights section (left column - bottom)
 */
function generateInsightsSection(comparativeData) {
  const { comparisons } = comparativeData;

  return `
    <div style="margin-top: 10px;">
      <h4 style="font-size: 10pt; margin: 0 0 3px 0; color: var(--color-text-dark); font-weight: 700; line-height: 1.1;">💡 Insights</h4>
      <div class="insights-box" style="padding: 8px 10px;">
        <ul class="insights-list">
          ${comparisons.map(comp => {
            if (Math.abs(comp.percentChange) > 20 && comp.percentChange !== null && !isNaN(comp.percentChange)) {
              const direction = comp.percentChange > 0 ? 'aumentó' : 'disminuyó';
              const indicator = comp.trendColor === 'green' ? '✓' : '⚠';
              return `<li>${indicator} <strong>${comp.metric}</strong> ${direction} <strong>${Math.abs(comp.percentChange).toFixed(1)}%</strong></li>`;
            }
            return null;
          }).filter(Boolean).join('')}
          ${comparisons.filter(comp => Math.abs(comp.percentChange) > 20 && comp.percentChange !== null && !isNaN(comp.percentChange)).length === 0
            ? '<li>✓ Sin cambios significativos (>20%)</li>'
            : ''}
        </ul>
      </div>
    </div>
  `;
}

/**
 * Generate base CSS styles (reusable across all executive reports)
 * @returns {string} CSS string
 */
function generateBaseStyles() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* CSS Variables for Corporate Colors */
    :root {
      --color-primary: #003366;        /* Dark blue professional */
      --color-secondary: #5B9BD5;      /* Medium blue */
      --color-accent: #FF6B6B;         /* Red for alerts */
      --color-success: #4CAF50;        /* Green for positive */
      --color-warning: #FFA726;        /* Orange for warnings */
      --color-neutral: #9E9E9E;        /* Gray for neutral */
      --color-background: #F5F7FA;     /* Light background */
      --color-text-dark: #2C3E50;      /* Primary text */
      --color-text-light: #7F8C8D;     /* Secondary text */
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: var(--color-text-dark);
      font-feature-settings: 'kern' 1;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .page {
      page-break-after: always;
      padding: 1.89px 9.375px;
    }

    /* Compact page - no page break */
    .page.compact {
      page-break-after: avoid;
      padding: 1.89px 7.8125px;
    }

    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      text-align: center;
      background: linear-gradient(135deg, #003366 0%, #6B9FD4 50%, #5B9BD5 100%);
      color: white;
      position: relative;
      overflow: hidden;
    }

    /* Subtle pattern overlay */
    .cover-page::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.03) 35px, rgba(255,255,255,.03) 70px);
      pointer-events: none;
    }

    .cover-page h1 {
      font-size: 42pt;
      margin-bottom: 20px;
      font-weight: 700;
      text-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
    }

    .cover-page .subtitle {
      font-size: 20pt;
      margin-bottom: 40px;
      opacity: 0.95;
      font-weight: 300;
      position: relative;
      z-index: 1;
    }

    .cover-page .period {
      font-size: 16pt;
      margin-top: 20px;
      padding: 20px 40px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.18);
      position: relative;
      z-index: 1;
    }

    .logos-container {
      width: 100%;
      max-width: 600px;
      margin-bottom: 40px;
      position: relative;
    }

    .logo-top {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo-top img {
      max-width: 200px;
      height: auto;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
    }

    .logos-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px;
    }

    .logos-bottom img {
      max-width: 120px;
      height: auto;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }

    h2 {
      font-size: 14pt;
      color: var(--color-primary);
      border-bottom: 2px solid var(--color-primary);
      padding-bottom: 3px;
      margin-bottom: 6px;
      margin-top: 0;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h2 .period-info {
      font-size: 10pt;
      font-weight: 400;
      color: var(--color-text-light);
      letter-spacing: 0;
    }

    h3 {
      font-size: 11pt;
      color: var(--color-text-dark);
      margin-top: 8px;
      margin-bottom: 4px;
      font-weight: 600;
      letter-spacing: -0.1px;
    }

    h4 {
      font-size: 10pt;
      color: var(--color-text-dark);
      margin-top: 4px;
      margin-bottom: 3px;
      font-weight: 700;
      line-height: 1.1;
    }

    /* 2-Column Layout: 50% Left (Charts) / 50% Right (Tables) */
    .two-column-layout {
      display: grid;
      grid-template-columns: 50% 50%;
      gap: 10px;
      margin: 6px 0;
    }

    .left-column {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .right-column {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .chart-container {
      text-align: center;
    }

    .chart-container img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 4px 0;
      background: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }

    table thead {
      background: var(--color-primary);
      color: white;
    }

    table th {
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: none;
    }

    table td {
      padding: 4px 6px;
      text-align: left;
      border: none;
      border-bottom: 1px solid #E9ECEF;
      font-size: 7.5pt;
    }

    table tbody tr:nth-child(even) {
      background: #F8F9FA;
    }

    /* Compact Comparative Table with Rotated Headers */
    .compact-comparative-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 3px 0;
      background: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }

    .compact-comparative-table thead {
      background: var(--color-primary);
      color: white;
    }

    .compact-comparative-table th {
      padding: 6px 3px;
      text-align: center;
      font-weight: 600;
      font-size: 6.5pt;
      border: none;
      line-height: 1.2;
      text-transform: none;
      letter-spacing: 0.5px;
    }

    .compact-comparative-table th.rotated {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(-180deg);
      padding: 18px 3px;
      white-space: nowrap;
      min-height: 70px;
    }

    .compact-comparative-table th:first-child {
      text-align: left;
      writing-mode: horizontal-tb;
      transform: none;
      padding: 6px 6px;
    }

    .compact-comparative-table td {
      padding: 3px 3px;
      text-align: center;
      border: none;
      border-bottom: 1px solid #E9ECEF;
      font-size: 6.5pt;
    }

    .compact-comparative-table td:first-child {
      text-align: left;
      font-weight: 600;
      padding: 4px 6px;
    }

    .compact-comparative-table tbody tr:nth-child(even) {
      background: #F8F9FA;
    }

    /* Device Statistics Table with Rotated Headers (Right Column) */
    .device-stats-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 3px 0;
      background: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }

    .device-stats-table thead {
      background: var(--color-primary);
      color: white;
    }

    .device-stats-table th {
      padding: 6px 3px;
      text-align: center;
      font-weight: 600;
      font-size: 6.5pt;
      border: none;
      line-height: 1.2;
      text-transform: none;
      letter-spacing: 0.5px;
    }

    .device-stats-table th.rotated {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(-180deg);
      padding: 18px 3px;
      white-space: nowrap;
      min-height: 70px;
    }

    .device-stats-table th:first-child,
    .device-stats-table th:nth-child(2) {
      writing-mode: horizontal-tb;
      transform: none;
      padding: 6px 6px;
      text-align: left;
    }

    .device-stats-table td {
      padding: 3px 3px;
      text-align: center;
      border: none;
      border-bottom: 1px solid #E9ECEF;
      font-size: 6.5pt;
    }

    .device-stats-table td:first-child,
    .device-stats-table td:nth-child(2) {
      text-align: left;
      padding: 4px 6px;
    }

    .device-stats-table td:first-child {
      font-weight: 600;
    }

    .device-stats-table tbody tr:nth-child(even) {
      background: #F8F9FA;
    }

    /* Simple BTG-style footer */
    .simple-footer {
      margin-top: 3px;
      padding-top: 2px;
      border-top: 1px solid #ddd;
      font-size: 6.5pt;
      color: #999;
      text-align: center;
      line-height: 1.2;
    }

    .trend-up {
      color: var(--color-success);
      font-weight: 600;
    }

    .trend-down {
      color: var(--color-accent);
      font-weight: 600;
    }

    .trend-neutral {
      color: var(--color-neutral);
      font-weight: 500;
    }

    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }

    /* Compact Insights Section */
    .insights-box {
      background: linear-gradient(135deg, rgba(91, 155, 213, 0.05) 0%, rgba(79, 195, 247, 0.05) 100%);
      border-left: 2px solid var(--color-secondary);
      border-radius: 4px;
      padding: 10px 12px;
      margin: 10px 0;
      box-shadow: 0 1px 4px rgba(0, 51, 102, 0.06);
    }

    .insights-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .insights-list li {
      padding: 4px 0;
      border-bottom: 1px solid rgba(91, 155, 213, 0.1);
      font-size: 7.5pt;
      line-height: 1.4;
      color: var(--color-text-dark);
    }

    .insights-list li:last-child {
      border-bottom: none;
    }

    .insights-list li strong {
      color: var(--color-primary);
      font-weight: 600;
    }
  `;
}

/**
 * Generate cover page HTML (reusable across all executive reports)
 * @param {Object} options - Cover page options
 * @param {string} options.title - Report title
 * @param {string} options.subtitle - Report subtitle
 * @param {string} options.periodStart - Formatted start date
 * @param {string} options.periodEnd - Formatted end date
 * @param {string} options.additionalInfo - Additional info (e.g., device count)
 * @param {string} options.storageLogoBase64 - Storage logo Base64
 * @param {string} options.tnsTrackLogoBase64 - TNS Track logo Base64
 * @param {string} options.tnsLogoBase64 - TNS logo Base64
 * @returns {string} Cover page HTML
 */
function generateCoverPage(options) {
  const {
    title,
    subtitle = 'Sistema de Monitoreo TNS Track',
    periodStart,
    periodEnd,
    additionalInfo = '',
    storageLogoBase64,
    tnsTrackLogoBase64,
    tnsLogoBase64
  } = options;

  return `
  <!-- Cover Page -->
  <div class="page cover-page">
    <!-- Logos Container -->
    <div class="logos-container">
      <!-- Storage Logo - Top Center -->
      <div class="logo-top">
        ${storageLogoBase64 ? `<img src="${storageLogoBase64}" alt="Storage Logo" />` : ''}
      </div>
      <!-- TNS Track and TNS Logos - Bottom -->
      <div class="logos-bottom">
        <div class="logo-left">
          ${tnsTrackLogoBase64 ? `<img src="${tnsTrackLogoBase64}" alt="TNS Track Logo" />` : ''}
        </div>
        <div class="logo-right">
          ${tnsLogoBase64 ? `<img src="${tnsLogoBase64}" alt="TNS Logo" />` : ''}
        </div>
      </div>
    </div>

    <h1>${title}</h1>
    <div class="subtitle">${subtitle}</div>
    <div class="period">
      <strong>Período:</strong> ${periodStart} - ${periodEnd}
    </div>
    ${additionalInfo ? `
    <div class="period" style="margin-top: 10px;">
      ${additionalInfo}
    </div>
    ` : ''}
  </div>
  `;
}

/**
 * Generate footer HTML (reusable across all executive reports)
 * @param {string} generatedAt - Formatted generation timestamp
 * @param {string} generatedBy - User who generated the report
 * @returns {string} Footer HTML
 */
function generateFooter(generatedAt, generatedBy) {
  const currentYear = moment().tz('America/Santiago').format('YYYY');
  return `
    <!-- Simple BTG-style Footer -->
    <div class="simple-footer">
      <p><strong>TNS Track</strong> - Sistema de Monitoreo de Temperaturas | Generado: ${generatedAt} | Usuario: ${generatedBy} | © ${currentYear} The Next Security</p>
    </div>
  `;
}

/**
 * Generate KPI card HTML (reusable across all executive reports)
 * @param {Object} options - KPI card options
 * @param {string} options.icon - Emoji icon
 * @param {string} options.value - KPI value
 * @param {string} options.unit - Unit of measurement (optional)
 * @param {string} options.label - KPI label
 * @param {string} options.colorClass - CSS class for border color
 * @returns {string} KPI card HTML
 */
function generateKPICard(options) {
  const { icon, value, unit = '', label, colorClass } = options;
  return `
    <div class="kpi-card ${colorClass}">
      <div class="kpi-icon">${icon}</div>
      <div class="label">${label}</div>
      <div class="value">${value}${unit ? `<span class="unit">${unit}</span>` : ''}</div>
    </div>
  `;
}

module.exports = {
  generateHTML,
  generateBaseStyles,
  generateCoverPage,
  generateFooter,
  generateKPICard,
  convertImageToBase64
};
