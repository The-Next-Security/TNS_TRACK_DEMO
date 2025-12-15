// src/utils/categoryUtils.js - Versión Mejorada Manteniendo Compatibilidad

/**
 * Constantes para categorización de consumo
 */
const CATEGORY_COLORS = {
  apagado: "#000000",
  bajo: "#22c55e",
  medio: "#eab308",
  alto: "#ef4444",
};

const CATEGORY_LABELS = {
  apagado: "Stand-by",
  bajo: "Bajo Consumo",
  medio: "Medio Consumo",
  alto: "Alto Consumo",
};

/**
 * Calcula los datos de categorización de consumo con porcentajes precisos
 * Maneja casos donde los datos pueden ser NULL o inconsistentes
 *
 * @param {Object} record - Registro con datos de categorización de la base de datos
 * @param {number} record.lecturas_limite_apagado - Cantidad de lecturas en estado apagado
 * @param {number} record.lecturas_consumo_bajo - Cantidad de lecturas de consumo bajo
 * @param {number} record.lecturas_consumo_medio - Cantidad de lecturas de consumo medio
 * @param {number} record.lecturas_consumo_alto - Cantidad de lecturas de consumo alto
 * @param {number} record.cantidad_datos - Total de lecturas procesadas
 * @param {number} record.energia_activa_total - Energía total en kWh
 * @returns {Object} Objeto con estructura de categorías incluyendo cantidades, porcentajes, colores y energía
 */
const calculateCategoryData = (record) => {
  // Validar que el record existe
  if (!record) {
    return createEmptyCategoryStructure();
  }

  // Extraer valores con conversión segura y fallback a 0 para manejar NULL/undefined
  const apagado = safeParseInt(record.lecturas_limite_apagado);
  const bajo = safeParseInt(record.lecturas_consumo_bajo);
  const medio = safeParseInt(record.lecturas_consumo_medio);
  const alto = safeParseInt(record.lecturas_consumo_alto);
  const total = safeParseInt(record.cantidad_datos);
  const energiaTotal = safeParseFloat(record.energia_activa_total);

  // Si no hay datos totales, retornar estructura con valores en 0
  if (total === 0) {
    return createEmptyCategoryStructure();
  }

  // Validar consistencia de datos
  const sumaCategoriasCalculadas = apagado + bajo + medio + alto;
  if (sumaCategoriasCalculadas > total) {
    console.warn(
      `Inconsistencia en datos: suma de categorías (${sumaCategoriasCalculadas}) > total (${total})`
    );
  }

  // Calcular porcentajes iniciales con máxima precisión
  const porcentajes = {
    apagado: (apagado / total) * 100,
    bajo: (bajo / total) * 100,
    medio: (medio / total) * 100,
    alto: (alto / total) * 100,
  };

  // Redondear a 1 decimal
  const porcentajesRedondeados = {
    apagado: Math.round(porcentajes.apagado * 10) / 10,
    bajo: Math.round(porcentajes.bajo * 10) / 10,
    medio: Math.round(porcentajes.medio * 10) / 10,
    alto: Math.round(porcentajes.alto * 10) / 10,
  };

  // Calcular diferencia para ajuste de precisión (debe sumar exactamente 100%)
  const suma =
    porcentajesRedondeados.apagado +
    porcentajesRedondeados.bajo +
    porcentajesRedondeados.medio +
    porcentajesRedondeados.alto;
  const diferencia = Math.round((100 - suma) * 10) / 10;

  // Ajustar el porcentaje de la categoría con mayor cantidad para precisión exacta
  if (diferencia !== 0) {
    const categorias = [
      { key: "apagado", cantidad: apagado },
      { key: "bajo", cantidad: bajo },
      { key: "medio", cantidad: medio },
      { key: "alto", cantidad: alto },
    ];

    // Encontrar la categoría con mayor cantidad para el ajuste
    const categoriaMaxima = categorias.reduce((max, cat) =>
      cat.cantidad > max.cantidad ? cat : max
    );

    // Aplicar el ajuste manteniendo el rango válido (0-100)
    const nuevoValor = porcentajesRedondeados[categoriaMaxima.key] + diferencia;
    porcentajesRedondeados[categoriaMaxima.key] = Math.max(
      0,
      Math.min(100, Math.round(nuevoValor * 10) / 10)
    );
  }

  // Calcular energía por categoría basada en porcentajes
  const energiaPorCategoria = {
    apagado: (energiaTotal * porcentajesRedondeados.apagado) / 100,
    bajo: (energiaTotal * porcentajesRedondeados.bajo) / 100,
    medio: (energiaTotal * porcentajesRedondeados.medio) / 100,
    alto: (energiaTotal * porcentajesRedondeados.alto) / 100,
  };

  return {
    apagado: {
      cantidad: apagado,
      porcentaje: porcentajesRedondeados.apagado,
      energia_kwh: Math.round(energiaPorCategoria.apagado * 1000) / 1000, // 3 decimales
      color: CATEGORY_COLORS.apagado,
      label: CATEGORY_LABELS.apagado,
    },
    bajo: {
      cantidad: bajo,
      porcentaje: porcentajesRedondeados.bajo,
      energia_kwh: Math.round(energiaPorCategoria.bajo * 1000) / 1000,
      color: CATEGORY_COLORS.bajo,
      label: CATEGORY_LABELS.bajo,
    },
    medio: {
      cantidad: medio,
      porcentaje: porcentajesRedondeados.medio,
      energia_kwh: Math.round(energiaPorCategoria.medio * 1000) / 1000,
      color: CATEGORY_COLORS.medio,
      label: CATEGORY_LABELS.medio,
    },
    alto: {
      cantidad: alto,
      porcentaje: porcentajesRedondeados.alto,
      energia_kwh: Math.round(energiaPorCategoria.alto * 1000) / 1000,
      color: CATEGORY_COLORS.alto,
      label: CATEGORY_LABELS.alto,
    },
  };
};

/**
 * Agrega múltiples registros de categorización
 * @param {Array} records - Array de registros con datos de categorización
 * @returns {Object} Datos agregados de todas las categorías
 */
const aggregateCategoryData = (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    return createEmptyCategoryStructure();
  }

  // Inicializar totales
  const totals = {
    apagado: 0,
    bajo: 0,
    medio: 0,
    alto: 0,
    total_cantidad: 0,
    total_energia: 0,
  };

  // Sumar todos los registros
  records.forEach((record) => {
    if (record) {
      totals.apagado += safeParseInt(record.lecturas_limite_apagado);
      totals.bajo += safeParseInt(record.lecturas_consumo_bajo);
      totals.medio += safeParseInt(record.lecturas_consumo_medio);
      totals.alto += safeParseInt(record.lecturas_consumo_alto);
      totals.total_cantidad += safeParseInt(record.cantidad_datos);
      totals.total_energia += safeParseFloat(record.energia_activa_total);
    }
  });

  // Crear objeto agregado artificial para usar calculateCategoryData
  const aggregatedRecord = {
    lecturas_limite_apagado: totals.apagado,
    lecturas_consumo_bajo: totals.bajo,
    lecturas_consumo_medio: totals.medio,
    lecturas_consumo_alto: totals.alto,
    cantidad_datos: totals.total_cantidad,
    energia_activa_total: totals.total_energia,
  };

  return calculateCategoryData(aggregatedRecord);
};

/**
 * Convierte un valor a entero de forma segura
 * @param {*} value - Valor a convertir
 * @returns {number} Entero o 0 si no es válido
 */
const safeParseInt = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Convierte un valor a float de forma segura
 * @param {*} value - Valor a convertir
 * @returns {number} Float o 0 si no es válido
 */
const safeParseFloat = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Crea una estructura de categorías vacía
 * @returns {Object} Estructura de categorías con valores en 0
 */
const createEmptyCategoryStructure = () => ({
  apagado: {
    cantidad: 0,
    porcentaje: 0.0,
    energia_kwh: 0.0,
    color: CATEGORY_COLORS.apagado,
    label: CATEGORY_LABELS.apagado,
  },
  bajo: {
    cantidad: 0,
    porcentaje: 0.0,
    energia_kwh: 0.0,
    color: CATEGORY_COLORS.bajo,
    label: CATEGORY_LABELS.bajo,
  },
  medio: {
    cantidad: 0,
    porcentaje: 0.0,
    energia_kwh: 0.0,
    color: CATEGORY_COLORS.medio,
    label: CATEGORY_LABELS.medio,
  },
  alto: {
    cantidad: 0,
    porcentaje: 0.0,
    energia_kwh: 0.0,
    color: CATEGORY_COLORS.alto,
    label: CATEGORY_LABELS.alto,
  },
});

/**
 * Valida que los porcentajes sumen exactamente 100%
 * @param {Object} categorias - Objeto de categorías
 * @returns {boolean} True si suma 100%, false en caso contrario
 */
const validatePercentageSum = (categorias) => {
  const suma =
    categorias.apagado.porcentaje +
    categorias.bajo.porcentaje +
    categorias.medio.porcentaje +
    categorias.alto.porcentaje;
  return Math.abs(suma - 100) < 0.01; // Tolerancia de 0.01% por precisión de punto flotante
};

/**
 * Valida la consistencia de datos de categorización
 * @param {Object} record - Registro a validar
 * @returns {Object} Resultado de validación con errores si los hay
 */
const validateCategoryConsistency = (record) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!record) {
    validation.isValid = false;
    validation.errors.push("Registro no proporcionado");
    return validation;
  }

  const apagado = safeParseInt(record.lecturas_limite_apagado);
  const bajo = safeParseInt(record.lecturas_consumo_bajo);
  const medio = safeParseInt(record.lecturas_consumo_medio);
  const alto = safeParseInt(record.lecturas_consumo_alto);
  const total = safeParseInt(record.cantidad_datos);

  // Validar valores negativos
  if (apagado < 0 || bajo < 0 || medio < 0 || alto < 0 || total < 0) {
    validation.isValid = false;
    validation.errors.push("Los valores de categorías no pueden ser negativos");
  }

  // Validar suma de categorías
  const suma = apagado + bajo + medio + alto;
  if (suma > total) {
    validation.isValid = false;
    validation.errors.push(
      `Suma de categorías (${suma}) mayor que total (${total})`
    );
  } else if (suma < total) {
    validation.warnings.push(
      `Suma de categorías (${suma}) menor que total (${total}). Datos pueden estar incompletos.`
    );
  }

  // Validar energía
  const energia = safeParseFloat(record.energia_activa_total);
  if (energia < 0) {
    validation.errors.push("La energía activa total no puede ser negativa");
    validation.isValid = false;
  }

  return validation;
};

/**
 * Obtiene un resumen estadístico de las categorías
 * @param {Object} categorias - Datos de categorías procesados
 * @returns {Object} Resumen estadístico
 */
const getCategorySummary = (categorias) => {
  const totalCantidad = Object.values(categorias).reduce(
    (sum, cat) => sum + cat.cantidad,
    0
  );
  const totalEnergia = Object.values(categorias).reduce(
    (sum, cat) => sum + cat.energia_kwh,
    0
  );

  // Encontrar categoría dominante
  const categoriaDominante = Object.entries(categorias).reduce(
    (max, [key, cat]) =>
      cat.porcentaje > max.porcentaje ? { key, ...cat } : max,
    { porcentaje: -1 }
  );

  return {
    total_lecturas: totalCantidad,
    total_energia_kwh: Math.round(totalEnergia * 1000) / 1000,
    categoria_dominante: {
      tipo: categoriaDominante.key,
      label: categoriaDominante.label,
      porcentaje: categoriaDominante.porcentaje,
    },
    distribucion_balanceada:
      Math.max(...Object.values(categorias).map((c) => c.porcentaje)) < 50,
    calidad_datos: totalCantidad > 0 ? "Buena" : "Sin datos",
  };
};

module.exports = {
  calculateCategoryData,
  aggregateCategoryData,
  safeParseInt,
  safeParseFloat,
  createEmptyCategoryStructure,
  validatePercentageSum,
  validateCategoryConsistency,
  getCategorySummary,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
};
