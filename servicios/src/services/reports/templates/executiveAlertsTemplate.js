/**
 * Executive Alerts Report Template
 * Feature: 004-reportes-base-core (Phase 10 - US7)
 *
 * Generates HTML for executive alerts reports with:
 * - Cover page with logo and period
 * - Executive summary with 7 main KPIs
 * - Daily alert trend line chart
 * - Alert type distribution pie chart
 * - Hourly distribution heatmap
 * - SLA compliance table
 * - Top devices table
 *
 * Reuses 70-80% of the design from executiveTemperatureTemplate.js
 */

const QuickChart = require('quickchart-js');
const moment = require('moment-timezone');
const {
  generateBaseStyles,
  generateCoverPage,
  generateFooter,
  convertImageToBase64
} = require('./executiveTemperatureTemplate');
const path = require('path');

/**
 * Generate complete HTML for executive alerts report
 *
 * @param {Object} data - Report data
 * @param {Object} data.kpis - Alerts KPIs (7 metrics)
 * @param {Array} data.deviceStats - Per-device statistics
 * @param {Array} data.hourlyData - Hourly alert distribution
 * @param {Array} data.dailyTrend - Daily alert counts
 * @param {Object} data.typeDistribution - Alert type distribution
 * @param {Object} data.slaMetrics - SLA compliance metrics
 * @param {Object} data.config - Report configuration (startDate, endDate, deviceIds)
 * @param {string} data.generatedBy - User who generated the report
 * @returns {string} Complete HTML document
 */
function generateHTML(data) {
  const {
    kpis,
    deviceStats = [],
    hourlyData = [],
    dailyTrend = [],
    typeDistribution = {},
    slaMetrics = {},
    config,
    generatedBy = 'Sistema'
  } = data;

  const { startDate, endDate, deviceIds = [] } = config;

  // Format dates
  const formattedStartDate = moment(startDate).format('DD/MM/YYYY');
  const formattedEndDate = moment(endDate).format('DD/MM/YYYY');
  const generatedAt = moment().tz('America/Santiago').format('DD/MM/YYYY HH:mm:ss');

  // Generate charts using QuickChart
  const dailyTrendChartUrl = generateDailyTrendChart(dailyTrend, startDate, endDate);
  const typeDistributionChartUrl = generateTypeDistributionChart(typeDistribution);
  const hourlyHeatmapChartUrl = generateHourlyHeatmapChart(hourlyData);

  // Convert logos to Base64
  const projectRoot = path.resolve(__dirname, '../../../..');
  const imagesPath = path.join(projectRoot, 'src', 'assets', 'images');

  console.log('[AlertsTemplate] Project root:', projectRoot);
  console.log('[AlertsTemplate] Images path:', imagesPath);

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
  <title>Reporte Ejecutivo de Alertas - ${formattedStartDate} a ${formattedEndDate}</title>
  <style>
    ${generateBaseStyles()}

    /* Alerts Report Specific Styles */
    /* KPI Grid - Horizontal Layout (7 cards) */
    .kpi-grid-alerts {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin: 6px 0;
    }

    .kpi-card {
      background: #FFFFFF;
      border-left: 3px solid var(--color-primary);
      padding: 8px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0, 51, 102, 0.06);
      position: relative;
      overflow: hidden;
    }

    .kpi-icon {
      font-size: 8pt;
      margin-bottom: 2px;
      opacity: 0.85;
      display: inline-block;
    }

    /* Individual KPI Card Colors for Alerts */
    .kpi-card.kpi-total { border-left-color: #FF6B6B; }
    .kpi-card.kpi-critical { border-left-color: #DC2626; }
    .kpi-card.kpi-response { border-left-color: #3B82F6; }
    .kpi-card.kpi-resolution { border-left-color: #8B5CF6; }
    .kpi-card.kpi-rate { border-left-color: #10B981; }
    .kpi-card.kpi-false { border-left-color: #F59E0B; }
    .kpi-card.kpi-pending { border-left-color: #EF4444; }

    .kpi-card .label {
      font-size: 6.5pt;
      color: var(--color-text-light);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 3px;
      font-weight: 600;
      line-height: 1.1;
    }

    .kpi-card .value {
      font-size: 14pt;
      font-weight: 700;
      color: var(--color-text-dark);
      line-height: 1.1;
    }

    .kpi-card .unit {
      font-size: 9pt;
      color: var(--color-text-light);
      font-weight: 400;
    }

    /* SLA Table Styles */
    .sla-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 3px 0;
      background: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }

    .sla-table thead {
      background: var(--color-primary);
      color: white;
    }

    .sla-table th {
      padding: 6px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: none;
    }

    .sla-table td {
      padding: 4px 6px;
      text-align: left;
      border: none;
      border-bottom: 1px solid #E9ECEF;
      font-size: 7pt;
    }

    .sla-table td:nth-child(2),
    .sla-table td:nth-child(3) {
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .sla-table tbody tr:nth-child(even) {
      background: #F8F9FA;
    }

    /* Status badges */
    .status-excellent {
      background: #d4edda;
      color: #155724;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 6.5pt;
    }

    .status-good {
      background: #d1ecf1;
      color: #0c5460;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 6.5pt;
    }

    .status-warning {
      background: #fff3cd;
      color: #856404;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 6.5pt;
    }

    .status-critical {
      background: #f8d7da;
      color: #721c24;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
      font-size: 6.5pt;
    }
  </style>
</head>
<body>

  ${generateCoverPage({
    title: 'Reporte Ejecutivo de Alertas',
    subtitle: 'Sistema de Monitoreo TNS Track',
    periodStart: formattedStartDate,
    periodEnd: formattedEndDate,
    additionalInfo: `<strong>Total Alertas Analizadas:</strong> ${kpis.totalAlerts} | <strong>Dispositivos:</strong> ${deviceIds.length}`,
    storageLogoBase64,
    tnsTrackLogoBase64,
    tnsLogoBase64
  })}

  <!-- Compact Main Content Page (Page 2) -->
  <div class="page compact">
    <h2>
      <span>Resumen Ejecutivo de Alertas</span>
      <span class="period-info">Período: ${formattedStartDate} - ${formattedEndDate}</span>
    </h2>

    <!-- KPI Cards - 7 Cards Horizontal Layout -->
    <div class="kpi-grid-alerts">
      <div class="kpi-card kpi-total">
        <div class="kpi-icon">🔔</div>
        <div class="label">Total Alertas</div>
        <div class="value">${kpis.totalAlerts}</div>
      </div>

      <div class="kpi-card kpi-critical">
        <div class="kpi-icon">🚨</div>
        <div class="label">Críticas</div>
        <div class="value">${kpis.criticalAlerts}</div>
      </div>

      <div class="kpi-card kpi-response">
        <div class="kpi-icon">⏱️</div>
        <div class="label">Tiempo Respuesta</div>
        <div class="value">${kpis.avgResponseTime !== null ? kpis.avgResponseTime.toFixed(1) : 'N/A'}<span class="unit">min</span></div>
      </div>

      <div class="kpi-card kpi-resolution">
        <div class="kpi-icon">✅</div>
        <div class="label">Tiempo Resolución</div>
        <div class="value">${kpis.avgResolutionTime !== null ? kpis.avgResolutionTime.toFixed(1) : 'N/A'}<span class="unit">hrs</span></div>
      </div>

      <div class="kpi-card kpi-rate">
        <div class="kpi-icon">📊</div>
        <div class="label">Tasa Resolución</div>
        <div class="value">${kpis.resolutionRate.toFixed(0)}<span class="unit">%</span></div>
      </div>

      <div class="kpi-card kpi-false">
        <div class="kpi-icon">⚠️</div>
        <div class="label">Falsas Alarmas</div>
        <div class="value">${kpis.falseAlarmRate.toFixed(0)}<span class="unit">%</span></div>
      </div>

      <div class="kpi-card kpi-pending">
        <div class="kpi-icon">⏳</div>
        <div class="label">Pendientes</div>
        <div class="value">${kpis.pendingAlerts}</div>
      </div>
    </div>

    <!-- 2-Column Layout: Charts Left / Tables Right -->
    <h3>Análisis de Alertas</h3>
    <div class="two-column-layout">
      <!-- Left Column: 3 Charts Stacked -->
      <div class="left-column">
        <div class="chart-container">
          <img src="${dailyTrendChartUrl}" alt="Tendencia Diaria de Alertas" />
        </div>
        <div class="chart-container">
          <img src="${typeDistributionChartUrl}" alt="Distribución por Tipo" />
        </div>
        <div class="chart-container">
          <img src="${hourlyHeatmapChartUrl}" alt="Distribución Horaria" />
        </div>
      </div>

      <!-- Right Column: SLA Table + Top Devices Table -->
      <div class="right-column">
        <!-- SLA Compliance Table -->
        <div>
          <h4 style="font-size: 10pt; margin: 0 0 3px 0; color: var(--color-text-dark); font-weight: 700; line-height: 1.1;">Cumplimiento SLA</h4>
          ${generateSLATable(slaMetrics)}
        </div>

        <!-- Top Devices Table -->
        <div style="margin-top: 10px;">
          <h4 style="font-size: 10pt; margin: 0 0 3px 0; color: var(--color-text-dark); font-weight: 700; line-height: 1.1;">Dispositivos con Más Alertas</h4>
          ${generateTopDevicesTable(deviceStats)}
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
 * Generate daily trend line chart using QuickChart API
 */
function generateDailyTrendChart(dailyTrend, startDate, endDate) {
  const chart = new QuickChart();

  // Prepare data
  const labels = dailyTrend.map(d => moment(d.date).format('DD/MM'));
  const totalData = dailyTrend.map(d => d.totalAlerts);
  const criticalData = dailyTrend.map(d => d.criticalAlerts);

  chart.setConfig({
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Alertas',
          data: totalData,
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#FF6B6B',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2
        },
        {
          label: 'Alertas Críticas',
          data: criticalData,
          borderColor: '#DC2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          borderWidth: 2,
          borderDash: [6, 3],
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#DC2626',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: `Tendencia Diaria de Alertas`,
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
            labelString: 'Cantidad de Alertas',
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
            fontColor: '#7F8C8D',
            beginAtZero: true
          }
        }],
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Fecha',
            fontSize: 9,
            fontStyle: 'bold',
            fontColor: '#2C3E50'
          },
          gridLines: {
            display: false
          },
          ticks: {
            fontSize: 7,
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
 * Generate alert type distribution pie chart
 */
function generateTypeDistributionChart(typeDistribution) {
  const chart = new QuickChart();

  chart.setConfig({
    type: 'pie',
    data: {
      labels: ['Temperatura', 'Desconexión'],
      datasets: [{
        data: [
          typeDistribution.temperature || 0,
          typeDistribution.disconnection || 0
        ],
        backgroundColor: [
          'rgba(220, 38, 38, 0.8)',
          'rgba(249, 115, 22, 0.8)'
        ],
        borderColor: [
          'rgba(220, 38, 38, 1)',
          'rgba(249, 115, 22, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Distribución por Tipo de Alerta',
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
          padding: 8
        }
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
 * Generate hourly distribution bar chart (heatmap simulation)
 */
function generateHourlyHeatmapChart(hourlyData) {
  const chart = new QuickChart();

  // Prepare 24-hour array with counts
  const hourlyCount = Array(24).fill(0);
  hourlyData.forEach(item => {
    if (item.hour >= 0 && item.hour < 24) {
      hourlyCount[item.hour] = item.alertCount;
    }
  });

  chart.setConfig({
    type: 'bar',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Alertas por Hora del Día',
        data: hourlyCount,
        backgroundColor: hourlyCount.map(count => {
          if (count === 0) return 'rgba(158, 158, 158, 0.3)';
          if (count < 5) return 'rgba(16, 185, 129, 0.7)';
          if (count < 10) return 'rgba(251, 191, 36, 0.7)';
          if (count < 20) return 'rgba(249, 115, 22, 0.7)';
          return 'rgba(239, 68, 68, 0.8)';
        }),
        borderColor: hourlyCount.map(count => {
          if (count === 0) return 'rgba(158, 158, 158, 0.5)';
          if (count < 5) return 'rgba(16, 185, 129, 1)';
          if (count < 10) return 'rgba(251, 191, 36, 1)';
          if (count < 20) return 'rgba(249, 115, 22, 1)';
          return 'rgba(239, 68, 68, 1)';
        }),
        borderWidth: 2,
        borderRadius: 4
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Distribución de Alertas por Hora del Día',
        fontSize: 12,
        fontFamily: 'Segoe UI, sans-serif',
        fontColor: '#2C3E50',
        fontStyle: 'bold',
        padding: 10
      },
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Cantidad de Alertas',
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
            fontColor: '#7F8C8D',
            beginAtZero: true
          }
        }],
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Hora del Día',
            fontSize: 9,
            fontStyle: 'bold',
            fontColor: '#2C3E50'
          },
          gridLines: {
            display: false
          },
          ticks: {
            fontSize: 7,
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
 * Generate SLA compliance table
 */
function generateSLATable(slaMetrics) {
  const getSLAStatusClass = (percent) => {
    if (percent >= 80) return 'status-excellent';
    if (percent >= 60) return 'status-good';
    if (percent >= 40) return 'status-warning';
    return 'status-critical';
  };

  return `
    <table class="sla-table">
      <thead>
        <tr>
          <th>Rango de Respuesta</th>
          <th>Cantidad</th>
          <th>Porcentaje</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>&lt; 5 minutos</td>
          <td style="text-align: center;">${slaMetrics.under5Min || 0}</td>
          <td style="text-align: center;">
            <span class="${getSLAStatusClass(slaMetrics.under5MinPercent || 0)}">
              ${(slaMetrics.under5MinPercent || 0).toFixed(0)}%
            </span>
          </td>
        </tr>
        <tr>
          <td>5 - 15 minutos</td>
          <td style="text-align: center;">${slaMetrics.between5And15Min || 0}</td>
          <td style="text-align: center;">
            <span class="${getSLAStatusClass(slaMetrics.between5And15MinPercent || 0)}">
              ${(slaMetrics.between5And15MinPercent || 0).toFixed(0)}%
            </span>
          </td>
        </tr>
        <tr>
          <td>15 - 30 minutos</td>
          <td style="text-align: center;">${slaMetrics.between15And30Min || 0}</td>
          <td style="text-align: center;">
            <span class="status-warning">
              ${(slaMetrics.between15And30MinPercent || 0).toFixed(0)}%
            </span>
          </td>
        </tr>
        <tr>
          <td>&gt; 30 minutos</td>
          <td style="text-align: center;">${slaMetrics.over30Min || 0}</td>
          <td style="text-align: center;">
            <span class="status-critical">
              ${(slaMetrics.over30MinPercent || 0).toFixed(0)}%
            </span>
          </td>
        </tr>
        <tr style="background: #E9ECEF; font-weight: 700;">
          <td>Total Reconocidas</td>
          <td style="text-align: center;">${slaMetrics.totalAcknowledged || 0}</td>
          <td style="text-align: center;">100%</td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Generate top devices table
 */
function generateTopDevicesTable(deviceStats) {
  // Take top 10 devices
  const topDevices = deviceStats.slice(0, 10);

  return `
    <table class="device-stats-table">
      <thead>
        <tr>
          <th>Dispositivo</th>
          <th class="rotated">Total</th>
          <th class="rotated">Críticas</th>
          <th class="rotated">Desconex.</th>
          <th class="rotated">T. Resp. (min)</th>
          <th class="rotated">% Resol.</th>
        </tr>
      </thead>
      <tbody>
        ${topDevices.map(device => `
          <tr>
            <td>${device.deviceName}</td>
            <td>${device.totalAlerts}</td>
            <td>${device.criticalCount}</td>
            <td>${device.disconnectionCount}</td>
            <td>${device.avgResponseTime !== null ? device.avgResponseTime.toFixed(1) : '--'}</td>
            <td>${device.resolutionRate.toFixed(0)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

module.exports = {
  generateHTML
};
