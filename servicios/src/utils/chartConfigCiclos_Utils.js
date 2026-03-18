// src/utils/chartConfigCiclos.js

/**
 * Configuración y utilidades para los gráficos de ciclos de descongelamiento
 * Maneja la creación de datasets, opciones y formateo para Chart.js
 */

// Colores por mes según especificación
export const COLORES_POR_MES = {
  mes1: {
    barras: "#FFEB3B", // Amarillo
    linea: "#20B2AA", // Azul claro
  },
  mes2: {
    barras: "#4CAF50", // Verde
    linea: "#1976D2", // Azul oscuro
  },
  mes3: {
    barras: "#F44336", // Rojo
    linea: "#7B1FA2", // Púrpura
  },
};

// Configuración de fuentes
export const CHART_FONTS = {
  family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  sizes: {
    small: 11,
    medium: 12,
    large: 14,
    xlarge: 16,
  },
};

// Configuración del grid
export const CHART_GRID = {
  color: "rgba(0, 0, 0, 0.1)",
  borderColor: "rgba(0, 0, 0, 0.2)",
};

/**
 * Genera los datasets para Chart.js con barras y líneas superpuestas
 * @param {Object} datosCiclos - Datos procesados de ciclos por mes
 * @param {string} mesSeleccionado - Mes seleccionado para mostrar
 * @returns {Object} Configuración completa para Chart.js
 */
export function generarDatasetsGrafico(datosCiclos, mesSeleccionado) {
  const labels = generarLabelsEjeX(mesSeleccionado);
  const datasets = [];

  const colorConfig = COLORES_POR_MES.mes1; // Siempre usar los colores del primer mes
  const datosDelMes = datosCiclos[mesSeleccionado];

  if (datosDelMes) {
    // Dataset de barras (ciclos)
    const datasetBarras = {
      label: `Ciclos ${datosDelMes.nombreMes} ${datosDelMes.año}`,
      type: "bar",
      data: generarDatosCiclosPorDia(datosDelMes, labels),
      backgroundColor: colorConfig.barras,
      borderColor: colorConfig.barras,
      borderWidth: 1,
      yAxisID: "y-left",
      order: 2,
      barThickness: 20,
      maxBarThickness: 25,
    };

    // Dataset de línea (porcentaje)
    const datasetLinea = {
      label: `% Tiempo ${datosDelMes.nombreMes} ${datosDelMes.año}`,
      type: "line",
      data: generarDatosPorcentajePorDia(datosDelMes, labels),
      borderColor: colorConfig.linea,
      backgroundColor: `${colorConfig.linea}20`, // Transparencia 20%
      borderWidth: 3,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: colorConfig.linea,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      yAxisID: "y-right",
      order: 1,
    };

    datasets.push(datasetBarras, datasetLinea);
  }

  return {
    labels,
    datasets,
  };
}

/**
 * Genera las etiquetas del eje X (días del mes)
 * @param {string} mesSeleccionado - Mes seleccionado
 * @returns {Array} Array de días (1-31)
 */
function generarLabelsEjeX(mesSeleccionado) {
  const [year, month] = mesSeleccionado.split("-");
  const maxDias = new Date(year, month, 0).getDate();
  return Array.from({ length: maxDias }, (_, i) => i + 1);
}

/**
 * Genera los datos de ciclos por día para un mes específico
 * @param {Object} datosDelMes - Datos del mes
 * @param {Array} labels - Etiquetas de días
 * @returns {Array} Array de valores de ciclos
 */
function generarDatosCiclosPorDia(datosDelMes, labels) {
  return labels.map((dia) => {
    const datosDia = datosDelMes.datos[dia];
    return datosDia ? datosDia.numeroCiclos || 0 : 0;
  });
}

/**
 * Genera los datos de porcentaje por día para un mes específico
 * @param {Object} datosDelMes - Datos del mes
 * @param {Array} labels - Etiquetas de días
 * @returns {Array} Array de valores de porcentaje
 */
function generarDatosPorcentajePorDia(datosDelMes, labels) {
  return labels.map((dia) => {
    const datosDia = datosDelMes.datos[dia];
    return datosDia ? datosDia.porcentajeTiempo || 0 : 0;
  });
}

/**
 * Calcula el grosor de las barras (simplificado para un solo mes)
 * @returns {number} Grosor de barra apropiado
 */
function calcularBarThickness() {
  return 20; // Grosor fijo para un solo mes
}

/**
 * Genera las opciones de configuración para Chart.js
 * @param {number} altura - Altura del contenedor del gráfico
 * @returns {Object} Configuración de opciones para Chart.js
 */
export function generarOpcionesGrafico(altura = 600) {
  return {
    responsive: true,
    maintainAspectRatio: false,
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
        radius: 3,
        hoverRadius: 6,
        borderWidth: 2,
      },
    },
    scales: {
      x: {
        type: "category",
        title: {
          display: true,
          text: "Día del Mes",
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.large,
            weight: "bold",
          },
        },
        grid: {
          color: CHART_GRID.color,
          drawBorder: false,
        },
        ticks: {
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.small,
          },
          maxRotation: 0,
          callback: function (value, index) {
            // Mostrar solo cada 5 días para evitar aglomeración
            const dia = this.getLabelForValue(value);
            return dia % 5 === 0 || dia === 1 ? dia : "";
          },
        },
      },
      "y-left": {
        type: "linear",
        position: "left",
        title: {
          display: true,
          text: "Número de Ciclos",
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.large,
            weight: "bold",
          },
          color: "#333333",
        },
        grid: {
          color: CHART_GRID.color,
          drawBorder: false,
        },
        ticks: {
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.medium,
          },
          beginAtZero: true,
          stepSize: 1,
          callback: function (value) {
            return Number.isInteger(value) ? value : "";
          },
        },
        beginAtZero: true,
      },
      "y-right": {
        type: "linear",
        position: "right",
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Porcentaje de Tiempo (%)",
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.large,
            weight: "bold",
          },
          color: "#666666",
        },
        grid: {
          display: false, // No mostrar grid para el eje derecho
        },
        ticks: {
          font: {
            family: CHART_FONTS.family,
            size: CHART_FONTS.sizes.medium,
          },
          callback: function (value) {
            return value + "%";
          },
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "center",
        labels: {
          padding: 20,
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
              lineWidth: dataset.type === "line" ? dataset.borderWidth : 0,
              pointStyle: dataset.type === "bar" ? "rect" : "circle",
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i,
            }));
          },
        },
      },
      tooltip: {
        enabled: true,
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          title: function (tooltipItems) {
            const dia = tooltipItems[0].label;
            return `Día ${dia}`;
          },
          label: function (context) {
            const dataset = context.dataset;
            const value = context.parsed.y;

            if (dataset.type === "bar") {
              return `${dataset.label}: ${value} ciclos`;
            } else {
              return `${dataset.label}: ${value.toFixed(1)}%`;
            }
          },
          afterBody: function (tooltipItems) {
            // Información adicional del día seleccionado
            const dia = tooltipItems[0].label;
            return [``, `Día ${dia} del mes`];
          },
        },
      },
    },
    onHover: function (event, elements) {
      event.native.target.style.cursor =
        elements.length > 0 ? "pointer" : "default";
    },
  };
}

/**
 * Formatea una fecha para mostrar en tooltips
 * @param {number} dia - Día del mes
 * @param {string} mes - Mes en formato YYYY-MM
 * @returns {string} Fecha formateada
 */
export function formatearFechaTooltip(dia, mes) {
  const [year, month] = mes.split("-");
  const meses = [
    "",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const nombreMes = meses[parseInt(month)];
  return `${dia} de ${nombreMes} de ${year}`;
}

/**
 * Valida que los datos sean apropiados para el gráfico
 * @param {Object} datosCiclos - Datos de ciclos
 * @param {string} mesSeleccionado - Mes seleccionado
 * @returns {Object} Resultado de validación
 */
export function validarDatosGrafico(datosCiclos, mesSeleccionado) {
  const errores = [];

  if (!datosCiclos || typeof datosCiclos !== "object") {
    errores.push("Los datos de ciclos no son válidos");
  }

  if (!mesSeleccionado || typeof mesSeleccionado !== "string") {
    errores.push("Debe seleccionar un mes");
  }

  return {
    esValido: errores.length === 0,
    errores,
  };
}
