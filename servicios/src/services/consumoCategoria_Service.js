const databaseService = require('./database_Service');

class ConsumoCategoriaService {
    constructor() {
        this.cache = {
            umbrales: null,
            lastUpdate: null,
            configLastUpdate: null
        };
        // TTL de 30 minutos — igual que electricDashboard_Service
        this.CACHE_TTL = 30 * 60 * 1000;
    }

    /**
     * Consulta el MAX(fecha_actualizacion) de los parámetros de consumo en sem_configuracion.
     * Permite detectar si la configuración cambió sin invalidar la caché por tiempo.
     * Usa JOIN por nombre para no depender de IDs generados automáticamente.
     * @returns {Promise<Date|null>}
     */
    async getLastConfigUpdate() {
        try {
            const query = `
                SELECT MAX(sc.fecha_actualizacion) AS ultima_actualizacion
                FROM sem_configuracion sc
                JOIN sem_tipos_parametros stp ON sc.id_tipo_parametro = stp.id_tipo_parametro
                WHERE stp.nombre IN ('LIMITE APAGADO', 'CONSUMO BAJO', 'CONSUMO MEDIO', 'CONSUMO ALTO')
                  AND sc.activo = 1
                  AND sc.valido_desde <= NOW()
                  AND (sc.valido_hasta IS NULL OR sc.valido_hasta > NOW())
            `;
            const [rows] = await databaseService.pool.query(query);
            return rows?.[0]?.ultima_actualizacion || null;
        } catch (error) {
            console.error('[ConsumoCategoriaService] Error al verificar fecha de configuración:', error);
            return null;
        }
    }

    /**
     * Obtiene los umbrales de consumo para todos los grupos desde la base de datos o caché.
     * Usa JOIN con sem_tipos_parametros filtrando por nombre para no depender de IDs.
     * Respeta la vigencia temporal (valido_desde / valido_hasta) de cada registro.
     * @returns {Promise<Object>} Objeto con los umbrales por grupo
     */
    async getUmbralesConsumo() {
        // Verificar si la caché TTL sigue vigente
        const cacheVigente = this.cache.umbrales
            && this.cache.lastUpdate
            && (Date.now() - this.cache.lastUpdate < this.CACHE_TTL);

        if (cacheVigente) {
            // Verificar adicionalmente si la configuración cambió en BD
            try {
                const dbLastUpdate = await this.getLastConfigUpdate();
                const cacheLastUpdate = this.cache.configLastUpdate;

                if (dbLastUpdate && cacheLastUpdate) {
                    const dbTime = new Date(dbLastUpdate).getTime();
                    const cacheTime = new Date(cacheLastUpdate).getTime();
                    if (dbTime <= cacheTime) {
                        return this.cache.umbrales; // Caché válida
                    }
                    console.log('[ConsumoCategoriaService] Configuración actualizada en BD, invalidando caché');
                } else {
                    return this.cache.umbrales; // Sin datos de comparación, usar caché
                }
            } catch {
                return this.cache.umbrales; // Error verificando, usar caché existente
            }
        }

        const defaultUmbrales = {
            limiteApagado: 500,
            cuartilBajo:  { '1': { valor: 3000, nombre_grupo: 'General' } },
            cuartilMedio: { '1': { valor: 4000, nombre_grupo: 'General' } },
            cuartilAlto:  { '1': { valor: 5000, nombre_grupo: 'General' } }
        };

        try {
            // Query unificada: JOIN por nombre, sin IDs hardcodeados, con vigencia temporal
            const query = `
                SELECT stp.nombre AS parametro_nombre, sc.valor, sc.fecha_actualizacion
                FROM sem_configuracion sc
                JOIN sem_tipos_parametros stp ON sc.id_tipo_parametro = stp.id_tipo_parametro
                WHERE stp.nombre IN ('LIMITE APAGADO', 'CONSUMO BAJO', 'CONSUMO MEDIO', 'CONSUMO ALTO')
                  AND sc.activo = 1
                  AND sc.valido_desde <= NOW()
                  AND (sc.valido_hasta IS NULL OR sc.valido_hasta > NOW())
                ORDER BY stp.nombre
            `;

            const [rows] = await databaseService.pool.query(query);

            if (!rows || rows.length === 0) {
                console.warn('[ConsumoCategoriaService] Sin configuración en BD, usando valores predeterminados');
                this.cache.umbrales = defaultUmbrales;
                this.cache.lastUpdate = Date.now();
                return defaultUmbrales;
            }

            let limiteApagado = 500;
            const umbrales = { cuartilBajo: {}, cuartilMedio: {}, cuartilAlto: {} };
            let maxFechaActualizacion = null;

            for (const row of rows) {
                if (!row || !row.valor || !row.parametro_nombre) continue;

                // Rastrear la fecha de actualización más reciente para la caché
                if (row.fecha_actualizacion) {
                    const rowTime = new Date(row.fecha_actualizacion).getTime();
                    if (!maxFechaActualizacion || rowTime > new Date(maxFechaActualizacion).getTime()) {
                        maxFechaActualizacion = row.fecha_actualizacion;
                    }
                }

                const nombre = row.parametro_nombre;

                if (nombre === 'LIMITE APAGADO') {
                    limiteApagado = parseFloat(row.valor) || 500;
                    continue;
                }

                // CONSUMO BAJO / MEDIO / ALTO — valor es JSON con estructura por grupo
                try {
                    let valorJSON;
                    if (typeof row.valor === 'string') {
                        valorJSON = JSON.parse(row.valor);
                    } else if (typeof row.valor === 'object') {
                        valorJSON = row.valor;
                    } else {
                        continue;
                    }

                    const gruposData = {};
                    for (const key in valorJSON) {
                        if (key !== 'metadatos' && valorJSON[key] && typeof valorJSON[key] === 'object') {
                            gruposData[key] = {
                                valor: parseFloat(valorJSON[key].valor) || 0,
                                nombre_grupo: valorJSON[key].nombre_grupo || 'Desconocido'
                            };
                        }
                    }

                    switch (nombre) {
                        case 'CONSUMO BAJO':  umbrales.cuartilBajo  = { ...umbrales.cuartilBajo,  ...gruposData }; break;
                        case 'CONSUMO MEDIO': umbrales.cuartilMedio = { ...umbrales.cuartilMedio, ...gruposData }; break;
                        case 'CONSUMO ALTO':  umbrales.cuartilAlto  = { ...umbrales.cuartilAlto,  ...gruposData }; break;
                    }
                } catch (error) {
                    console.error('[ConsumoCategoriaService] Error al procesar JSON para', nombre, ':', error);
                }
            }

            umbrales.limiteApagado = limiteApagado;

            // Fallback por grupo si algún cuartil quedó vacío
            if (Object.keys(umbrales.cuartilBajo).length === 0)  umbrales.cuartilBajo['1']  = { valor: 3000, nombre_grupo: 'General' };
            if (Object.keys(umbrales.cuartilMedio).length === 0) umbrales.cuartilMedio['1'] = { valor: 4000, nombre_grupo: 'General' };
            if (Object.keys(umbrales.cuartilAlto).length === 0)  umbrales.cuartilAlto['1']  = { valor: 5000, nombre_grupo: 'General' };

            this.cache.umbrales = umbrales;
            this.cache.lastUpdate = Date.now();
            this.cache.configLastUpdate = maxFechaActualizacion;

            return umbrales;
        } catch (error) {
            console.error('[ConsumoCategoriaService] Error al obtener umbrales de consumo:', error);
            return defaultUmbrales;
        }
    }

    /**
     * Determina la categoría de consumo para un valor en watts y un grupo específico.
     * @param {number} valorWatts - El valor de consumo en watts
     * @param {number} grupoId - ID del grupo al que pertenece el dispositivo
     * @returns {Promise<number>} Categoría de consumo (0=apagado, 1=bajo, 2=medio, 3=alto)
     */
    async categorizarConsumo(valorWatts, grupoId) {
        try {
            valorWatts = parseFloat(valorWatts);
            grupoId = parseInt(grupoId, 10);

            if (isNaN(valorWatts) || valorWatts === 0) {
                return 0; // Apagado
            }

            if (isNaN(grupoId)) {
                console.warn('[ConsumoCategoriaService] ID de grupo no válido, usando grupo 1 por defecto');
                grupoId = 1;
            }

            const umbrales = await this.getUmbralesConsumo();

            if (valorWatts <= umbrales.limiteApagado) {
                return 0; // Apagado
            }

            const grupoIdStr = grupoId.toString();

            // Si no hay umbrales para este grupo, usar grupo 1 (General) como fallback
            if (!umbrales.cuartilBajo[grupoIdStr] || !umbrales.cuartilMedio[grupoIdStr] || !umbrales.cuartilAlto[grupoIdStr]) {
                console.warn(`[ConsumoCategoriaService] Sin umbrales para grupo ${grupoId}, usando grupo 1`);

                if (!umbrales.cuartilBajo['1'] || !umbrales.cuartilMedio['1'] || !umbrales.cuartilAlto['1']) {
                    // Sin umbrales para grupo 1 tampoco → valores hardcodeados de emergencia
                    if (valorWatts <= 3000) return 1;
                    if (valorWatts <= 5000) return 2;
                    return 3;
                }

                const cuartilBajo = umbrales.cuartilBajo['1'].valor;
                const cuartilAlto = umbrales.cuartilAlto['1'].valor;
                if (valorWatts <= cuartilBajo) return 1;
                if (valorWatts <= cuartilAlto) return 2;
                return 3;
            }

            const cuartilBajo = umbrales.cuartilBajo[grupoIdStr].valor;
            const cuartilAlto = umbrales.cuartilAlto[grupoIdStr].valor;
            if (valorWatts <= cuartilBajo) return 1;
            if (valorWatts <= cuartilAlto) return 2;
            return 3;
        } catch (error) {
            console.error('[ConsumoCategoriaService] Error al categorizar consumo:', error);
            return 0;
        }
    }

    /**
     * Obtiene el id_grupo del dispositivo en sem_dispositivos por su shelly_id.
     * @param {string} deviceId - shelly_id del dispositivo
     * @returns {Promise<number>} id_grupo o 1 si no se encuentra
     */
    async getGrupoIdForDevice(deviceId) {
        try {
            if (!deviceId) {
                console.warn('[ConsumoCategoriaService] deviceId vacío o inválido');
                return 1;
            }

            const query = `
                SELECT id_grupo
                FROM sem_dispositivos
                WHERE shelly_id = ? AND activo = 1
                LIMIT 1
            `;

            const [rows] = await databaseService.pool.query(query, [deviceId]);

            if (!rows || rows.length === 0 || !rows[0] || typeof rows[0].id_grupo === 'undefined') {
                console.warn(`[ConsumoCategoriaService] Sin grupo para dispositivo ${deviceId}, usando grupo 1`);
                return 1;
            }

            return parseInt(rows[0].id_grupo, 10) || 1;
        } catch (error) {
            console.error('[ConsumoCategoriaService] Error al obtener grupo para el dispositivo:', error);
            return 1;
        }
    }
}

module.exports = new ConsumoCategoriaService();
