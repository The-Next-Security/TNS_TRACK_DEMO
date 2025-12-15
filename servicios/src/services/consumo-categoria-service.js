// src/services/consumo-categoria-service.js (versión corregida)
const databaseService = require('./database-service');
const config = require('../config/js_files/config-loader');

class ConsumoCategoriaService {
    constructor() {
        this.cache = {
            umbrales: null,
            lastUpdate: null
        };
        this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
    }

    /**
     * Obtiene los umbrales de consumo para todos los grupos desde la base de datos o caché
     * @returns {Promise<Object>} Objeto con los umbrales por grupo
     */
    // src/services/consumo-categoria-service.js (método getUmbralesConsumo corregido)
    async getUmbralesConsumo() {
        // Verificar si la caché es válida
        if (this.cache.umbrales && this.cache.lastUpdate && (Date.now() - this.cache.lastUpdate < this.CACHE_TTL)) {
            return this.cache.umbrales;
        }

        try {
            // Consulta para obtener el límite de dispositivo apagado
            const queryLimiteApagado = 'SELECT valor FROM sem_configuracion WHERE tipo_parametro_id = 10 AND activo = 1 LIMIT 1';

            // Usar pool.query directamente, siguiendo el patrón del DeviceController
            const [rowsLimiteApagado] = await databaseService.pool.query(queryLimiteApagado);

            // Valor predeterminado en caso de no encontrar registros
            const limiteApagado = rowsLimiteApagado && rowsLimiteApagado.length > 0 && rowsLimiteApagado[0].valor ?
                parseFloat(rowsLimiteApagado[0].valor) : 500;

            // Consulta para obtener todos los umbrales por grupo
            const query = `
        SELECT sc.tipo_parametro_id, sc.valor 
        FROM sem_configuracion sc
        WHERE sc.tipo_parametro_id IN (11, 12, 13) 
        AND sc.activo = 1
      `;

            // Usar pool.query y la desestructuración de array
            const [rows] = await databaseService.pool.query(query);

            // Verificar si hay resultados
            if (!rows || rows.length === 0) {
                const defaultUmbrales = {
                    limiteApagado,
                    cuartilBajo: { '1': { valor: 3000, nombre_grupo: 'General' } },
                    cuartilMedio: { '1': { valor: 4000, nombre_grupo: 'General' } },
                    cuartilAlto: { '1': { valor: 5000, nombre_grupo: 'General' } }
                };

                this.cache.umbrales = defaultUmbrales;
                this.cache.lastUpdate = Date.now();

                return defaultUmbrales;
            }

            // Procesar los resultados
            const umbrales = {
                limiteApagado
            };

            // Inicializar objetos de cuartiles
            umbrales.cuartilBajo = {};
            umbrales.cuartilMedio = {};
            umbrales.cuartilAlto = {};

            // Procesamos cada tipo de umbral
            for (const row of rows) {
                if (!row || !row.valor || !row.tipo_parametro_id) continue;

                try {
                    const tipoParametroId = parseInt(row.tipo_parametro_id, 10);
                    let valorJSON;

                    // Intentar parsear el valor como JSON
                    if (typeof row.valor === 'string') {
                        valorJSON = JSON.parse(row.valor);
                    } else if (typeof row.valor === 'object') {
                        valorJSON = row.valor;
                    } else {
                        continue;
                    }

                    // Extraer los valores por grupo del JSON
                    const gruposData = {};

                    // Recorrer todas las propiedades excepto "metadatos"
                    for (const key in valorJSON) {
                        if (key !== 'metadatos' && valorJSON[key] && typeof valorJSON[key] === 'object') {
                            // El key es el ID del grupo
                            gruposData[key] = {
                                valor: parseFloat(valorJSON[key].valor) || 0,
                                nombre_grupo: valorJSON[key].nombre_grupo || 'Desconocido'
                            };
                        }
                    }

                    // Asignar al objeto de umbrales según el tipo
                    switch (tipoParametroId) {
                        case 11:
                            umbrales.cuartilBajo = { ...umbrales.cuartilBajo, ...gruposData };
                            break;
                        case 12:
                            umbrales.cuartilMedio = { ...umbrales.cuartilMedio, ...gruposData };
                            break;
                        case 13:
                            umbrales.cuartilAlto = { ...umbrales.cuartilAlto, ...gruposData };
                            break;
                    }
                } catch (error) {
                    console.error('Error al procesar JSON para fila:', error);
                    // Continuar con la siguiente fila
                }
            }

            // Verificar que todos los cuartiles tengan al menos el grupo 1
            if (Object.keys(umbrales.cuartilBajo).length === 0) {
                umbrales.cuartilBajo['1'] = { valor: 3000, nombre_grupo: 'General' };
            }
            if (Object.keys(umbrales.cuartilMedio).length === 0) {
                umbrales.cuartilMedio['1'] = { valor: 4000, nombre_grupo: 'General' };
            }
            if (Object.keys(umbrales.cuartilAlto).length === 0) {
                umbrales.cuartilAlto['1'] = { valor: 5000, nombre_grupo: 'General' };
            }

            // Actualizar la caché
            this.cache.umbrales = umbrales;
            this.cache.lastUpdate = Date.now();

            return umbrales;
        } catch (error) {
            console.error('Error al obtener umbrales de consumo:', error);

            // En caso de error, devolver valores predeterminados
            const defaultUmbrales = {
                limiteApagado: 500,
                cuartilBajo: { '1': { valor: 3000, nombre_grupo: 'General' } },
                cuartilMedio: { '1': { valor: 4000, nombre_grupo: 'General' } },
                cuartilAlto: { '1': { valor: 5000, nombre_grupo: 'General' } }
            };

            return defaultUmbrales;
        }
    }

    /**
     * Determina la categoría de consumo para un valor en watts y un grupo específico
     * @param {number} valorWatts - El valor de consumo en watts
     * @param {number} grupoId - ID del grupo al que pertenece el dispositivo
     * @returns {Promise<number>} Categoría de consumo (0, 1, 2, 3)
     */
    async categorizarConsumo(valorWatts, grupoId) {
        try {
            // Convertir a números para asegurar comparaciones correctas
            valorWatts = parseFloat(valorWatts);
            grupoId = parseInt(grupoId, 10);

            // Si el valor es 0 o no es un número válido, considerarlo como apagado directamente
            if (isNaN(valorWatts) || valorWatts === 0) {
                return 0; // Apagado
            }

            if (isNaN(grupoId)) {
                console.warn('El ID de grupo proporcionado no es válido, usando grupo 1 por defecto');
                grupoId = 1; // Usar grupo General como fallback
            }

            // Obtener los umbrales
            const umbrales = await this.getUmbralesConsumo();

            // Verificar si el dispositivo está apagado (esto es redundante con la verificación anterior, pero lo mantenemos por claridad)
            if (valorWatts <= umbrales.limiteApagado) {
                return 0; // Apagado
            }

            // Obtener los umbrales específicos para el grupo
            const grupoIdStr = grupoId.toString();

            // CORRECCIÓN: Verificar si existen umbrales para este grupo
            // Si no existen, usar los del grupo 1 (General) como fallback
            if (!umbrales.cuartilBajo[grupoIdStr] ||
                !umbrales.cuartilMedio[grupoIdStr] ||
                !umbrales.cuartilAlto[grupoIdStr]) {

                console.warn(`No se encontraron umbrales para el grupo ${grupoId}, usando grupo 1 (General)`);

                // Verificar si existen umbrales para el grupo 1
                if (!umbrales.cuartilBajo['1'] ||
                    !umbrales.cuartilMedio['1'] ||
                    !umbrales.cuartilAlto['1']) {

                    // Si tampoco hay umbrales para el grupo 1, usar valores predeterminados
                    const cuartilBajo = 3000;
                    const cuartilAlto = 5000;

                    if (valorWatts <= cuartilBajo) {
                        return 1; // Bajo consumo
                    } else if (valorWatts <= cuartilAlto) {
                        return 2; // Consumo normal
                    } else {
                        return 3; // Consumo alto
                    }
                }

                // Usar umbrales del grupo 1
                const cuartilBajo = umbrales.cuartilBajo['1'].valor;
                const cuartilAlto = umbrales.cuartilAlto['1'].valor;

                // Categorizar según los umbrales
                if (valorWatts <= cuartilBajo) {
                    return 1; // Bajo consumo
                } else if (valorWatts <= cuartilAlto) {
                    return 2; // Consumo normal
                } else {
                    return 3; // Consumo alto
                }
            }

            // Usar umbrales del grupo específico
            const cuartilBajo = umbrales.cuartilBajo[grupoIdStr].valor;
            const cuartilAlto = umbrales.cuartilAlto[grupoIdStr].valor;

            // Categorizar según los umbrales
            if (valorWatts <= cuartilBajo) {
                return 1; // Bajo consumo
            } else if (valorWatts <= cuartilAlto) {
                return 2; // Consumo normal
            } else {
                return 3; // Consumo alto
            }
        } catch (error) {
            console.error('Error al categorizar consumo:', error);
            // En caso de error, devolver 0 como valor predeterminado
            return 0;
        }
    }

    /**
     * Obtiene la información del grupo al que pertenece un dispositivo
     * @param {string} deviceId - ID del dispositivo (shelly_id)
     * @returns {Promise<number>} ID del grupo al que pertenece el dispositivo
     */
    async getGrupoIdForDevice(deviceId) {
        try {
            // Verificar que deviceId es válido
            if (!deviceId) {
                console.warn('Se proporcionó un deviceId vacío o inválido');
                return 1; // Retornar grupo General como fallback
            }

            const query = `
            SELECT grupo_id 
            FROM sem_dispositivos 
            WHERE shelly_id = ? AND activo = 1
            LIMIT 1
          `;

            // Usar pool.query y desestructuración de array
            const [rows] = await databaseService.pool.query(query, [deviceId]);

            // Verificar si hay resultados
            if (!rows || rows.length === 0 || !rows[0] || typeof rows[0].grupo_id === 'undefined') {
                console.warn(`No se encontró información del grupo para el dispositivo ${deviceId}, usando grupo 1 (General)`);
                return 1; // Retornar grupo General como fallback
            }

            return parseInt(rows[0].grupo_id, 10) || 1; // Asegurar que es un número y fallback a 1
        } catch (error) {
            console.error('Error al obtener grupo para el dispositivo:', error);
            // Si no se puede obtener el grupo, asumimos que pertenece al grupo general (1)
            return 1;
        }
    }
}

module.exports = new ConsumoCategoriaService();