// src/utils/consumption/chartUtils.js
import moment from "moment-timezone";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "./category_Utils";

// Configurar zona horaria por defecto
moment.tz.setDefault("America/Santiago");

/**
 * Configuraciones de colores para gráficos
 */
export const CHART_COLORS = {
  ...CATEGORY_COLORS,
  costLine: "#06b6d4", // Color celeste para línea de costo
  grid: "rgba(0, 0, 0, 0.1)",
  background: "#ffffff",
};

/**
 * Configuración de fuentes para gráficos
 */
export const CHART_FONTS = {
  family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
  sizes: {
    small: 11,
    medium: 12,
    large: 14,
    xlarge: 16,
    title: 18,
  },
};

/**
 * Configuraciones base para diferentes tipos de período
 */
export const PERIOD_CONFIGS = {
  daily: {
    xAxisLabel: "Hora del Día",
    yAxisLeftLabel: "Costo Total Hora (CLP)",
    yAxisRightLabel: "Consumo por Intervalo (kWh)",
    timeFormat: "HH:mm",
    maxTicksLimit: 24,
    tooltipPrefix: "Hora: ",
  },
  monthly: {
    xAxisLabel: "Día del Mes",
    yAxisLeftLabel: "Costo Total Día (CLP)",
    yAxisRightLabel: "Consumo Diario (kWh)",
    timeFormat: "DD/MM",
    maxTicksLimit: 31,
    tooltipPrefix: "Día: ",
  },
  yearly: {
    xAxisLabel: "Mes",
    yAxisLeftLabel: "Costo Total Mensual (CLP)",
    yAxisRightLabel: "Consumo Mensual (kWh)",
    timeFormat: "MMM",
    maxTicksLimit: 12,
    tooltipPrefix: "Mes: ",
  },
};

/**
 * Genera etiquetas del eje X según el período
 * @param {Array} data - Datos del gráfico
 * @param {string} period - Tipo de período (daily, monthly, yearly)
 * @returns {Array} Array de etiquetas formateadas
 */
export const generateXAxisLabels = (data, period) => {
  if (!data || data.length === 0) return [];

  const config = PERIOD_CONFIGS[period];
  if (!config) {
    console.warn(`Período desconocido: ${period}, usando configuración diaria`);
    return data.map((item, index) => `Item ${index + 1}`);
  }

  return data.map((item) => {
    if (!item.periodo) return "Sin fecha";

    try {
      return moment(item.periodo).format(config.timeFormat);
    } catch (error) {
      console.warn(`Error formateando fecha ${item.periodo}:`, error);
      return "Fecha inválida";
    }
  });
};

/**
 * Genera datasets para gráfico mixto (barras + línea)
 * @param {Array} data - Datos procesados del backend
 * @param {string} period - Tipo de período
 * @returns {Object} Configuración de datasets para Chart.js
 */
export const generateMixedChartDatasets = (data, period) => {
  if (!data || data.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const config = PERIOD_CONFIGS[period];
  const labels = generateXAxisLabels(data, period);

  const datasets = [
    // Línea de costo (se dibuja encima)
    {
      label: config.yAxisLeftLabel,
      type: "line",
      data: data.map((item) => parseFloat(item.costo_total || 0)),
      borderColor: CHART_COLORS.costLine,
      backgroundColor: "rgba(6, 182, 212, 0.1)",
      fill: false,
      yAxisID: "y-left",
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: CHART_COLORS.costLine,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1,
      order: -1, // Se dibuja encima
      z: 10,
    },
    // Barras apiladas por categoría
    {
      label: CATEGORY_LABELS.apagado,
      type: "bar",
      data: data.map((item) => {
        const total = parseFloat(item.energia_activa_total || 0);
        const categoria = item.categorias?.apagado;
        return categoria
          ? categoria.energia_kwh || (total * categoria.porcentaje) / 100
          : 0;
      }),
      backgroundColor: CHART_COLORS.apagado,
      borderColor: CHART_COLORS.apagado,
      borderWidth: 1,
      stack: "consumo",
      yAxisID: "y-right",
      order: 1,
    },
    {
      label: CATEGORY_LABELS.bajo,
      type: "bar",
      data: data.map((item) => {
        const total = parseFloat(item.energia_activa_total || 0);
        const categoria = item.categorias?.bajo;
        return categoria
          ? categoria.energia_kwh || (total * categoria.porcentaje) / 100
          : 0;
      }),
      backgroundColor: CHART_COLORS.bajo,
      borderColor: CHART_COLORS.bajo,
      borderWidth: 1,
      stack: "consumo",
      yAxisID: "y-right",
      order: 1,
    },
    {
      label: CATEGORY_LABELS.medio,
      type: "bar",
      data: data.map((item) => {
        const total = parseFloat(item.energia_activa_total || 0);
        const categoria = item.categorias?.medio;
        return categoria
          ? categoria.energia_kwh || (total * categoria.porcentaje) / 100
          : 0;
      }),
      backgroundColor: CHART_COLORS.medio,
      borderColor: CHART_COLORS.medio,
      borderWidth: 1,
      stack: "consumo",
      yAxisID: "y-right",
      order: 1,
    },
    {
      label: CATEGORY_LABELS.alto,
      type: "bar",
      data: data.map((item) => {
        const total = parseFloat(item.energia_activa_total || 0);
        const categoria = item.categorias?.alto;
        return categoria
          ? categoria.energia_kwh || (total * categoria.porcentaje) / 100
          : 0;
      }),
      backgroundColor: CHART_COLORS.alto,
      borderColor: CHART_COLORS.alto,
      borderWidth: 1,
      stack: "consumo",
      yAxisID: "y-right",
      order: 1,
    },
  ];

  return {
    labels,
    datasets,
    originalData: data, // Incluir datos originales para tooltips
  };
};

/**
 * Genera configuración de opciones para Chart.js
 * @param {string} period - Tipo de período
 * @param {Object} customOptions - Opciones personalizadas
 * @returns {Object} Configuración de opciones para Chart.js
 */
export const generateChartOptions = (period, customOptions = {}) => {
  const config = PERIOD_CONFIGS[period];

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false, // ✅ CLAVE: No mantener aspect ratio para ancho completo
    height: customOptions.height || 400,
    maxHeight: customOptions.maxHeight || 600,
    layout: {
      padding: {
        left: 0, // ✅ Sin padding izquierdo
        right: 0, // ✅ Sin padding derecho
        top: 10,
        bottom: 10,
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
      point: {
        radius: 2,
        hoverRadius: 5,
        borderWidth: 1,
      },
    },
    datasets: {
      line: {
        pointBackgroundColor: CHART_COLORS.costLine,
        pointBorderColor: "#ffffff",
        borderColor: CHART_COLORS.costLine,
      },
    },
    scales: {
      x: {
        type: "category",
        grid: {
          color: CHART_COLORS.grid,
          drawBorder: false,
        },
        ticks: {
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.small,
          },
          maxRotation: period === "daily" ? 45 : 0,
          minRotation: 0,
          maxTicksLimit: config.maxTicksLimit,
        },
        title: {
          display: true,
          text: config.xAxisLabel,
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.large,
            weight: "bold",
          },
        },
      },
      "y-left": {
        position: "left",
        grid: {
          color: CHART_COLORS.grid,
          drawBorder: false,
        },
        ticks: {
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.medium,
          },
          callback: (value) => formatCurrency(value),
        },
        title: {
          display: true,
          text: config.yAxisLeftLabel,
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.large,
            weight: "bold",
          },
          color: CHART_COLORS.costLine,
        },
        beginAtZero: true,
      },
      "y-right": {
        position: "right",
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.medium,
          },
          callback: (value) => `${value.toFixed(2)} kWh`,
        },
        title: {
          display: true,
          text: config.yAxisRightLabel,
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.large,
            weight: "bold",
          },
        },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "center",
        labels: {
          padding: 15,
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.medium,
          },
          usePointStyle: true,
          pointStyle: "rect",
          generateLabels: function (chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: dataset.backgroundColor,
              strokeStyle: dataset.borderColor,
              lineWidth: dataset.borderWidth,
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i,
            }));
          },
        },
      },
      tooltip: generateTooltipConfig(period),
    },
  };

  // Combinar con opciones personalizadas
  return mergeDeep(baseOptions, customOptions);
};

/**
 * Genera configuración de tooltips
 * @param {string} period - Tipo de período
 * @returns {Object} Configuración de tooltips
 */
export const generateTooltipConfig = (period) => {
  const config = PERIOD_CONFIGS[period];

  return {
    callbacks: {
      title: function (context) {
        if (!context || !context[0]) return "Datos no disponibles";
        return `${config.tooltipPrefix}${context[0].label}`;
      },
      label: function (context) {
        try {
          const datasetLabel = context.dataset.label || "Sin etiqueta";
          const value = context.raw || 0;

          // Para la línea de costo
          if (datasetLabel.toLowerCase().includes("costo")) {
            return `${datasetLabel}: ${formatCurrency(value)}`;
          }

          // Para las barras de categorías
          const originalData = context.chart?.data?.originalData;
          if (!originalData || !originalData[context.dataIndex]) {
            return `${datasetLabel}: ${value.toFixed(3)} kWh`;
          }

          const record = originalData[context.dataIndex];
          if (!record.categorias) {
            return `${datasetLabel}: ${value.toFixed(3)} kWh`;
          }

          // Mapear el label del dataset a la clave de categoría
          const categoriaKey = getCategoriaKeyFromLabel(datasetLabel);

          if (categoriaKey && record.categorias[categoriaKey]) {
            const categoriaData = record.categorias[categoriaKey];
            return `${datasetLabel}: ${categoriaData.cantidad} lecturas (${
              categoriaData.porcentaje
            }%) - ${value.toFixed(3)} kWh`;
          }

          return `${datasetLabel}: ${value.toFixed(3)} kWh`;
        } catch (error) {
          console.error("Error en tooltip label:", error);
          return `${context.dataset.label}: ${(context.raw || 0).toFixed(
            3
          )} kWh`;
        }
      },
      afterLabel: function (context) {
        try {
          const originalData = context.chart?.data?.originalData;
          if (!originalData || !originalData[context.dataIndex]) {
            return [];
          }

          const record = originalData[context.dataIndex];

          // Información adicional con costo y distribución de categorías
          const extraInfo = [
            `Energía Total: ${parseFloat(
              record.energia_activa_total || 0
            ).toFixed(3)} kWh`,
            `Costo Total: ${formatCurrency(record.costo_total || 0)}`,
            `Total Lecturas: ${record.metadata?.cantidad_datos || 0}`,
          ];

          // Agregar distribución por categorías
          if (record.categorias) {
            extraInfo.push("--- Distribución ---");
            Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
              const porcentaje = record.categorias[key]?.porcentaje || 0;
              extraInfo.push(`${label}: ${porcentaje}%`);
            });
          }

          return extraInfo;
        } catch (error) {
          console.error("Error en tooltip afterLabel:", error);
          return [];
        }
      },
    },
  };
};

/**
 * Mapea el label del dataset a la clave de categoría
 * @param {string} datasetLabel - Label del dataset
 * @returns {string|null} Clave de categoría correspondiente
 */
const getCategoriaKeyFromLabel = (datasetLabel) => {
  const labelLower = datasetLabel.toLowerCase();

  if (labelLower.includes("stand-by") || labelLower.includes("apagado")) {
    return "apagado";
  }
  if (labelLower.includes("bajo")) {
    return "bajo";
  }
  if (labelLower.includes("medio")) {
    return "medio";
  }
  if (labelLower.includes("alto")) {
    return "alto";
  }

  return null;
};

/**
 * Formatea valores monetarios
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado como moneda chilena
 */
export const formatCurrency = (value) => {
  if (isNaN(value) || value === null || value === undefined) {
    return "$0 CLP";
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatea valores de energía
 * @param {number} value - Valor en kWh
 * @returns {string} Valor formateado
 */
export const formatEnergy = (value) => {
  if (isNaN(value) || value === null || value === undefined) {
    return "0.000 kWh";
  }

  return `${value.toFixed(3)} kWh`;
};

/**
 * Formatea números con separadores de miles
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado
 */
export const formatNumber = (value) => {
  if (isNaN(value) || value === null || value === undefined) {
    return "0";
  }

  return new Intl.NumberFormat("es-CL").format(value);
};

/**
 * Función utilitaria para combinar objetos profundamente
 * @param {Object} target - Objeto destino
 * @param {Object} source - Objeto fuente
 * @returns {Object} Objeto combinado
 */
const mergeDeep = (target, source) => {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
};

/**
 * Valida datos antes de crear el gráfico
 * @param {Array} data - Datos a validar
 * @param {string} period - Tipo de período
 * @returns {Object} Resultado de validación
 */
export const validateChartData = (data, period) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!Array.isArray(data)) {
    validation.isValid = false;
    validation.errors.push("Los datos deben ser un array");
    return validation;
  }

  if (data.length === 0) {
    validation.warnings.push("No hay datos para mostrar");
    return validation;
  }

  if (!PERIOD_CONFIGS[period]) {
    validation.isValid = false;
    validation.errors.push(`Período desconocido: ${period}`);
    return validation;
  }

  // Validar estructura de datos
  const requiredFields = [
    "periodo",
    "costo_total",
    "energia_activa_total",
    "categorias",
  ];
  const firstRecord = data[0];

  requiredFields.forEach((field) => {
    if (!(field in firstRecord)) {
      validation.warnings.push(`Campo faltante en datos: ${field}`);
    }
  });

  return validation;
};

export default {
  CHART_COLORS,
  CHART_FONTS,
  PERIOD_CONFIGS,
  generateXAxisLabels,
  generateMixedChartDatasets,
  generateChartOptions,
  generateTooltipConfig,
  formatCurrency,
  formatEnergy,
  formatNumber,
  validateChartData,
};
