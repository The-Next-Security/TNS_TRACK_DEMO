/**
 * Report Analytics Service
 * Feature: 004-reportes-base-core (T013)
 *
 * Provides comparative analysis and trend calculations for reports
 */

/**
 * Calculate comparative analysis between current and previous period KPIs
 *
 * @param {Object} currentKPIs - Current period KPIs
 * @param {Object} previousKPIs - Previous period KPIs
 * @param {Object} options - Options including reportType, neutralThreshold
 * @returns {Array} Array of KPI comparisons with trend indicators
 */
function calculateComparativeAnalysis(currentKPIs, previousKPIs, options = {}) {
  if (!currentKPIs || !previousKPIs) {
    console.warn('[ReportAnalytics] Missing KPIs for comparative analysis');
    return [];
  }

  // Configurable threshold for neutral trend (default 5%)
  const { neutralThreshold = 5, reportType = 'executive_temperature' } = options;

  const comparisons = [];

  // Helper function to determine trend
  const getTrend = (current, previous, lowerIsBetter = false) => {
    if (current === null || previous === null) {
      return { direction: 'neutral', color: 'gray', icon: '→', emoji: '⚪' };
    }

    const change = current - previous;
    const percentChange = previous !== 0 ? (change / previous) * 100 : 0;

    // Neutral if change < threshold%
    if (Math.abs(percentChange) < neutralThreshold) {
      return { direction: 'neutral', color: 'gray', icon: '→', emoji: '⚪' };
    }

    const isImprovement = lowerIsBetter ? change < 0 : change > 0;

    if (isImprovement) {
      return {
        direction: change > 0 ? 'up' : 'down',
        color: 'green',
        icon: change > 0 ? '↑' : '↓',
        emoji: '🟢'
      };
    } else {
      return {
        direction: change > 0 ? 'up' : 'down',
        color: 'red',
        icon: change > 0 ? '↑' : '↓',
        emoji: '🔴'
      };
    }
  };

  // Helper to calculate changes
  const calculateChange = (current, previous) => {
    if (current === null || previous === null) {
      return { absolute: null, percent: null };
    }

    const absolute = current - previous;
    const percent = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      absolute: parseFloat(absolute.toFixed(2)),
      percent: parseFloat(percent.toFixed(2))
    };
  };

  // Generate comparisons based on report type
  if (reportType === 'executive_consumption') {
    // Consumption Report Metrics
    
    // Consumo Total (kWh) - Higher is informational, not necessarily good/bad
    const totalKWhChange = calculateChange(currentKPIs.totalKWh, previousKPIs.totalKWh);
    const totalKWhTrend = getTrend(currentKPIs.totalKWh, previousKPIs.totalKWh, true); // Lower consumption is better
    comparisons.push({
      metric: 'Consumo Total',
      current: currentKPIs.totalKWh,
      previous: previousKPIs.totalKWh,
      absoluteChange: totalKWhChange.absolute,
      percentChange: totalKWhChange.percent,
      trend: totalKWhTrend.direction,
      trendColor: totalKWhTrend.color,
      trendIcon: totalKWhTrend.icon,
      trendEmoji: totalKWhTrend.emoji,
      unit: 'kWh',
      change: totalKWhChange.absolute
    });

    // Demanda Máxima (kW) - Lower is better (less stress on grid)
    const maxDemandChange = calculateChange(currentKPIs.maxDemandKW, previousKPIs.maxDemandKW);
    const maxDemandTrend = getTrend(currentKPIs.maxDemandKW, previousKPIs.maxDemandKW, true);
    comparisons.push({
      metric: 'Demanda Máxima',
      current: currentKPIs.maxDemandKW,
      previous: previousKPIs.maxDemandKW,
      absoluteChange: maxDemandChange.absolute,
      percentChange: maxDemandChange.percent,
      trend: maxDemandTrend.direction,
      trendColor: maxDemandTrend.color,
      trendIcon: maxDemandTrend.icon,
      trendEmoji: maxDemandTrend.emoji,
      unit: 'kW',
      change: maxDemandChange.absolute
    });

    // Factor de Carga (%) - Higher is better (more efficient)
    const loadFactorChange = calculateChange(currentKPIs.loadFactor, previousKPIs.loadFactor);
    const loadFactorTrend = getTrend(currentKPIs.loadFactor, previousKPIs.loadFactor, false);
    comparisons.push({
      metric: 'Factor de Carga',
      current: currentKPIs.loadFactor,
      previous: previousKPIs.loadFactor,
      absoluteChange: loadFactorChange.absolute,
      percentChange: loadFactorChange.percent,
      trend: loadFactorTrend.direction,
      trendColor: loadFactorTrend.color,
      trendIcon: loadFactorTrend.icon,
      trendEmoji: loadFactorTrend.emoji,
      unit: '%',
      change: loadFactorChange.absolute
    });

    // Costo Estimado (CLP) - Lower is better
    const costChange = calculateChange(currentKPIs.estimatedCost, previousKPIs.estimatedCost);
    const costTrend = getTrend(currentKPIs.estimatedCost, previousKPIs.estimatedCost, true);
    comparisons.push({
      metric: 'Costo Estimado',
      current: currentKPIs.estimatedCost,
      previous: previousKPIs.estimatedCost,
      absoluteChange: costChange.absolute,
      percentChange: costChange.percent,
      trend: costTrend.direction,
      trendColor: costTrend.color,
      trendIcon: costTrend.icon,
      trendEmoji: costTrend.emoji,
      unit: 'CLP',
      change: costChange.absolute
    });

    // Consumo Promedio Diario (kWh/día) - Lower is better
    const avgDailyChange = calculateChange(currentKPIs.avgDailyKWh, previousKPIs.avgDailyKWh);
    const avgDailyTrend = getTrend(currentKPIs.avgDailyKWh, previousKPIs.avgDailyKWh, true);
    comparisons.push({
      metric: 'Consumo Promedio Diario',
      current: currentKPIs.avgDailyKWh,
      previous: previousKPIs.avgDailyKWh,
      absoluteChange: avgDailyChange.absolute,
      percentChange: avgDailyChange.percent,
      trend: avgDailyTrend.direction,
      trendColor: avgDailyTrend.color,
      trendIcon: avgDailyTrend.icon,
      trendEmoji: avgDailyTrend.emoji,
      unit: 'kWh/día',
      change: avgDailyChange.absolute
    });

  } else if (reportType === 'executive_temperature') {
    // Temperature Report Metrics
    
    // Temperature Promedio
    const avgTempChange = calculateChange(currentKPIs.avg, previousKPIs.avg);
    const avgTempTrend = getTrend(currentKPIs.avg, previousKPIs.avg, false);
    comparisons.push({
      metric: 'Temperatura Promedio',
      current: currentKPIs.avg,
      previous: previousKPIs.avg,
      absoluteChange: avgTempChange.absolute,
      percentChange: avgTempChange.percent,
      trend: avgTempTrend.direction,
      trendColor: avgTempTrend.color,
      trendIcon: avgTempTrend.icon,
      trendEmoji: avgTempTrend.emoji,
      unit: '°C',
      change: avgTempChange.absolute
    });

    // Temperatura Mínima
    const minTempChange = calculateChange(currentKPIs.min, previousKPIs.min);
    const minTempTrend = getTrend(currentKPIs.min, previousKPIs.min, false);
    comparisons.push({
      metric: 'Temperatura Mínima',
      current: currentKPIs.min,
      previous: previousKPIs.min,
      absoluteChange: minTempChange.absolute,
      percentChange: minTempChange.percent,
      trend: minTempTrend.direction,
      trendColor: minTempTrend.color,
      trendIcon: minTempTrend.icon,
      trendEmoji: minTempTrend.emoji,
      unit: '°C',
      change: minTempChange.absolute
    });

    // Temperatura Máxima
    const maxTempChange = calculateChange(currentKPIs.max, previousKPIs.max);
    const maxTempTrend = getTrend(currentKPIs.max, previousKPIs.max, false);
    comparisons.push({
      metric: 'Temperatura Máxima',
      current: currentKPIs.max,
      previous: previousKPIs.max,
      absoluteChange: maxTempChange.absolute,
      percentChange: maxTempChange.percent,
      trend: maxTempTrend.direction,
      trendColor: maxTempTrend.color,
      trendIcon: maxTempTrend.icon,
      trendEmoji: maxTempTrend.emoji,
      unit: '°C',
      change: maxTempChange.absolute
    });

    // Uptime
    const uptimeChange = calculateChange(currentKPIs.uptime, previousKPIs.uptime);
    const uptimeTrend = getTrend(currentKPIs.uptime, previousKPIs.uptime, false); // Higher is better
    comparisons.push({
      metric: 'Uptime',
      current: currentKPIs.uptime,
      previous: previousKPIs.uptime,
      absoluteChange: uptimeChange.absolute,
      percentChange: uptimeChange.percent,
      trend: uptimeTrend.direction,
      trendColor: uptimeTrend.color,
      trendIcon: uptimeTrend.icon,
      trendEmoji: uptimeTrend.emoji,
      unit: '%',
      change: uptimeChange.absolute
    });

    // Alertas Generadas (lower is better)
    const alertsChange = calculateChange(currentKPIs.alertsCount, previousKPIs.alertsCount);
    const alertsTrend = getTrend(currentKPIs.alertsCount, previousKPIs.alertsCount, true); // Lower is better
    comparisons.push({
      metric: 'Alertas Generadas',
      current: currentKPIs.alertsCount,
      previous: previousKPIs.alertsCount,
      absoluteChange: alertsChange.absolute,
      percentChange: alertsChange.percent,
      trend: alertsTrend.direction,
      trendColor: alertsTrend.color,
      trendIcon: alertsTrend.icon,
      trendEmoji: alertsTrend.emoji,
      unit: '',
      change: alertsChange.absolute
    });
  }

  console.log(`[ReportAnalytics] Calculated ${comparisons.length} comparative metrics`);

  return comparisons;
}

/**
 * Calculate the comparative period (same length, immediately before current period)
 *
 * @param {string} startDate - Current period start date (YYYY-MM-DD)
 * @param {string} endDate - Current period end date (YYYY-MM-DD)
 * @returns {Object} {compStartDate, compEndDate}
 */
function calculateComparativePeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate period length in days
  const periodLengthDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Comparative period ends the day before current period starts
  const compEnd = new Date(start);
  compEnd.setDate(compEnd.getDate() - 1);

  // Comparative period starts periodLength days before compEnd
  const compStart = new Date(compEnd);
  compStart.setDate(compStart.getDate() - periodLengthDays + 1);

  // Format as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const result = {
    compStartDate: formatDate(compStart),
    compEndDate: formatDate(compEnd),
    periodLengthDays
  };

  console.log(`[ReportAnalytics] Comparative period: ${result.compStartDate} to ${result.compEndDate} (${periodLengthDays} days)`);

  return result;
}

module.exports = {
  calculateComparativeAnalysis,
  calculateComparativePeriod
};
