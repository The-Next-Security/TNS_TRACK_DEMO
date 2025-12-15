// src/utils/contadorCiclosUtils.js

/**
 * Utilidades para procesamiento de datos de ciclos de descongelamiento
 * Funciones auxiliares para formateo, cálculos estadísticos y transformación de datos
 */
class ContadorCiclosUtils {

  /**
   * Procesa los datos crudos de la base de datos para el frontend
   * @param {Array} resultados - Datos crudos de la consulta SQL
   * @param {Array} mesesSolicitados - Array de meses solicitados en formato YYYY-MM
   * @returns {Object} Datos procesados organizados por mes y día
   */
  procesarDatosCiclos(resultados, mesesSolicitados) {
    const datosPorMes = {};

    // Inicializar estructura para cada mes solicitado
    mesesSolicitados.forEach(mes => {
      datosPorMes[mes] = this.inicializarEstructuraMes(mes);
    });

    // Procesar cada registro
    resultados.forEach(registro => {
      const mes = registro.mes;
      const dia = parseInt(registro.dia);

      if (datosPorMes[mes]) {
        datosPorMes[mes].datos[dia] = {
          fecha: registro.fecha_ciclos,
          channelId: registro.channel_id,
          nombreUbicacion: registro.name,
          ubicacionReal: registro.nombre_ubicacion,
          numeroCiclos: parseInt(registro.numero_ciclos) || 0,
          tiempoPositivo: parseInt(registro.tiempo_en_positivo) || 0,
          porcentajeTiempo: parseFloat(registro.porcentaje_tiempo) || 0,
          dia: dia
        };

        // Actualizar metadatos del mes
        datosPorMes[mes].totalCiclos += parseInt(registro.numero_ciclos) || 0;
        datosPorMes[mes].totalMinutos += parseInt(registro.tiempo_en_positivo) || 0;
        datosPorMes[mes].diasConDatos++;
      }
    });

    // Calcular promedios para cada mes
    Object.keys(datosPorMes).forEach(mes => {
      const datosDelMes = datosPorMes[mes];
      const diasEnMes = this.obtenerDiasEnMes(mes);
      
      datosDelMes.promedioCiclos = datosDelMes.diasConDatos > 0 
        ? (datosDelMes.totalCiclos / datosDelMes.diasConDatos).toFixed(1)
        : 0;
      
      datosDelMes.promedioMinutos = datosDelMes.diasConDatos > 0 
        ? (datosDelMes.totalMinutos / datosDelMes.diasConDatos).toFixed(1)
        : 0;
      
      datosDelMes.porcentajeMes = datosDelMes.diasConDatos > 0 
        ? ((datosDelMes.diasConDatos / diasEnMes) * 100).toFixed(1)
        : 0;
    });

    return datosPorMes;
  }

  /**
   * Inicializa la estructura de datos para un mes específico
   * @param {string} mes - Mes en formato YYYY-MM
   * @returns {Object} Estructura inicializada del mes
   */
  inicializarEstructuraMes(mes) {
    const [year, month] = mes.split('-');
    const diasEnMes = new Date(year, month, 0).getDate();
    const datos = {};

    // Inicializar todos los días del mes con valores por defecto
    for (let dia = 1; dia <= diasEnMes; dia++) {
      datos[dia] = {
        fecha: null,
        channelId: null,
        nombreUbicacion: null,
        ubicacionReal: null,
        numeroCiclos: 0,
        tiempoPositivo: 0,
        porcentajeTiempo: 0,
        dia: dia,
        sinDatos: true
      };
    }

    return {
      mes: mes,
      año: parseInt(year),
      mesNumero: parseInt(month),
      nombreMes: this.obtenerNombreMes(parseInt(month)),
      diasEnMes: diasEnMes,
      datos: datos,
      totalCiclos: 0,
      totalMinutos: 0,
      diasConDatos: 0,
      promedioCiclos: 0,
      promedioMinutos: 0,
      porcentajeMes: 0
    };
  }

  /**
   * Calcula estadísticas generales para todos los meses
   * @param {Object} datosProcesados - Datos procesados por mes
   * @param {Array} mesesSolicitados - Meses solicitados
   * @returns {Object} Estadísticas calculadas
   */
  calcularEstadisticas(datosProcesados, mesesSolicitados) {
    const estadisticas = {
      totalMeses: mesesSolicitados.length,
      meses: [],
      resumenGeneral: {
        totalCiclos: 0,
        totalMinutos: 0,
        totalDiasConDatos: 0,
        promedioCiclosGeneral: 0,
        promedioMinutosGeneral: 0
      }
    };

    mesesSolicitados.forEach(mes => {
      const datosDelMes = datosProcesados[mes];
      
      if (datosDelMes) {
        const estadisticasMes = {
          mes: mes,
          nombreMes: datosDelMes.nombreMes,
          año: datosDelMes.año,
          promedioCiclos: parseFloat(datosDelMes.promedioCiclos),
          promedioMinutos: parseFloat(datosDelMes.promedioMinutos),
          porcentajeMes: parseFloat(datosDelMes.porcentajeMes),
          diasConDatos: datosDelMes.diasConDatos,
          diasEnMes: datosDelMes.diasEnMes,
          totalCiclos: datosDelMes.totalCiclos,
          totalMinutos: datosDelMes.totalMinutos
        };

        estadisticas.meses.push(estadisticasMes);

        // Acumular para estadísticas generales
        estadisticas.resumenGeneral.totalCiclos += datosDelMes.totalCiclos;
        estadisticas.resumenGeneral.totalMinutos += datosDelMes.totalMinutos;
        estadisticas.resumenGeneral.totalDiasConDatos += datosDelMes.diasConDatos;
      }
    });

    // Calcular promedios generales
    if (estadisticas.resumenGeneral.totalDiasConDatos > 0) {
      estadisticas.resumenGeneral.promedioCiclosGeneral = 
        (estadisticas.resumenGeneral.totalCiclos / estadisticas.resumenGeneral.totalDiasConDatos).toFixed(1);
      
      estadisticas.resumenGeneral.promedioMinutosGeneral = 
        (estadisticas.resumenGeneral.totalMinutos / estadisticas.resumenGeneral.totalDiasConDatos).toFixed(1);
    }

    return estadisticas;
  }

  /**
   * Obtiene el número de días en un mes específico
   * @param {string} mes - Mes en formato YYYY-MM
   * @returns {number} Número de días en el mes
   */
  obtenerDiasEnMes(mes) {
    const [year, month] = mes.split('-');
    return new Date(year, month, 0).getDate();
  }

  /**
   * Convierte número de mes a nombre en español
   * @param {number} numeroMes - Número del mes (1-12)
   * @returns {string} Nombre del mes en español
   */
  obtenerNombreMes(numeroMes) {
    const meses = [
      '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[numeroMes] || '';
  }

  /**
   * Valida que un mes no sea futuro
   * @param {string} mes - Mes en formato YYYY-MM
   * @returns {boolean} True si el mes no es futuro
   */
  validarMesNoFuturo(mes) {
    const fechaActual = new Date();
    const mesActual = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
    return mes <= mesActual;
  }

  /**
   * Obtiene los últimos 3 meses desde el mes actual
   * @returns {Array} Array de meses en formato YYYY-MM
   */
  obtenerUltimosTresMeses() {
    const meses = [];
    const fechaActual = new Date();
    
    for (let i = 0; i < 3; i++) {
      const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      meses.push(mes);
    }
    
    return meses;
  }

  /**
   * Formatea una fecha para mostrar en tooltips
   * @param {string} fecha - Fecha en formato ISO
   * @param {number} dia - Día del mes
   * @param {string} mes - Mes en formato YYYY-MM
   * @returns {string} Fecha formateada para tooltip
   */
  formatearFechaTooltip(fecha, dia, mes) {
    if (!fecha) {
      const [year, month] = mes.split('-');
      const nombreMes = this.obtenerNombreMes(parseInt(month));
      return `${dia} de ${nombreMes} de ${year}`;
    }

    const fechaObj = new Date(fecha);
    const nombreMes = this.obtenerNombreMes(fechaObj.getMonth() + 1);
    return `${dia} de ${nombreMes} de ${fechaObj.getFullYear()}`;
  }

  /**
   * Prepara datos para Chart.js
   * @param {Object} datosProcesados - Datos procesados por mes
   * @param {Array} mesesSolicitados - Meses solicitados
   * @returns {Object} Datos formateados para Chart.js
   */
  prepararDatosParaGrafico(datosProcesados, mesesSolicitados) {
    // Se implementará en el frontend, esta función es placeholder
    // para futuras utilidades de backend si son necesarias
    return {
      labels: [],
      datasets: [],
      metadata: {
        meses: mesesSolicitados,
        procesadoEn: new Date().toISOString()
      }
    };
  }

  /**
   * Genera un reporte de texto plano con las estadísticas
   * @param {Object} estadisticas - Estadísticas calculadas
   * @returns {string} Reporte en texto plano
   */
  generarReporteTexto(estadisticas) {
    let reporte = "=== REPORTE DE CICLOS DE DESCONGELAMIENTO ===\n\n";
    
    reporte += `Total de meses analizados: ${estadisticas.totalMeses}\n`;
    reporte += `Total de ciclos: ${estadisticas.resumenGeneral.totalCiclos}\n`;
    reporte += `Total de minutos: ${estadisticas.resumenGeneral.totalMinutos}\n`;
    reporte += `Promedio de ciclos por día: ${estadisticas.resumenGeneral.promedioCiclosGeneral}\n`;
    reporte += `Promedio de minutos por día: ${estadisticas.resumenGeneral.promedioMinutosGeneral}\n\n`;

    reporte += "=== DETALLE POR MES ===\n";
    estadisticas.meses.forEach(mes => {
      reporte += `\n${mes.nombreMes} ${mes.año}:\n`;
      reporte += `  - Promedio ciclos: ${mes.promedioCiclos}\n`;
      reporte += `  - Promedio minutos: ${mes.promedioMinutos}\n`;
      reporte += `  - Porcentaje del mes: ${mes.porcentajeMes}%\n`;
      reporte += `  - Días con datos: ${mes.diasConDatos}/${mes.diasEnMes}\n`;
    });

    return reporte;
  }
}

module.exports = new ContadorCiclosUtils();