// controllers/analysisController.js
const databaseService = require('../services/database_Service');
const transformUtils = require('../utils/transform_Utils');
const { DateTime } = require('luxon');

class AnalysisController {
    async getTemperaturePowerAnalysis(req, res, next) {
        const { date } = req.validatedDates;
        const { ubicacion, channelId } = req.query;
    
        try {
            // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor; sem_dispositivos.ubicacion → id_ubicacion_real
            // SUPUESTO #4: catalogo_ubicaciones_reales → gen_ubicaciones_reales (nombre en lugar de nombre_ubicacion)
            // canal_id (API ID de Ubibot) se resuelve a id_canal via subquery en la CTE de temperatura
            const query = `
                WITH temp_mediciones AS (
                    SELECT
                        DATE_FORMAT(
                            DATE_ADD(timestamp_local,
                            INTERVAL -(MINUTE(timestamp_local) % 5) MINUTE
                        ), '%Y-%m-%d %H:%i:00') as intervalo_tiempo,
                        AVG(CASE
                            WHEN calidad_lectura = 'NORMAL' AND potencia_activa IS NOT NULL
                            THEN potencia_activa / 1000
                            ELSE NULL
                        END) as potencia_promedio,
                        COUNT(*) as lecturas_potencia
                    FROM sem_mediciones
                    WHERE DATE(timestamp_local) = ?
                        AND fase = 'TOTAL'
                        AND shelly_id IN (SELECT shelly_id FROM sem_dispositivos WHERE id_ubicacion_real = ?)
                    GROUP BY intervalo_tiempo
                ),
                temp_temperaturas AS (
                    SELECT
                        DATE_FORMAT(
                            DATE_ADD(fecha_lectura,
                            INTERVAL -(MINUTE(fecha_lectura) % 5) MINUTE
                        ), '%Y-%m-%d %H:%i:00') as intervalo_tiempo,
                        AVG(temperatura_externa) as temperatura_promedio,
                        COUNT(*) as lecturas_temperatura
                    FROM ubi_lecturas_sensor
                    WHERE DATE(fecha_lectura) = ?
                        AND id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
                    GROUP BY intervalo_tiempo
                )
                SELECT
                    m.intervalo_tiempo,
                    'Reefer A' as nombre_ubicacion,
                    ROUND(t.temperatura_promedio, 2) as promedio_temperatura_externa,
                    ROUND(m.potencia_promedio, 3) as promedio_potencia_kw,
                    t.lecturas_temperatura,
                    m.lecturas_potencia
                FROM temp_mediciones m
                LEFT JOIN temp_temperaturas t ON t.intervalo_tiempo = m.intervalo_tiempo
                ORDER BY m.intervalo_tiempo;
            `;
      
            const [results] = await databaseService.pool.query(query, [date, ubicacion, date, channelId]);
      
            // Procesar resultados para el frontend
            const processedData = results.map(row => ({
                ...row,
                intervalo_tiempo: DateTime.fromJSDate(row.intervalo_tiempo).toFormat('yyyy-MM-dd HH:mm:ss'),
                promedio_temperatura_externa: row.promedio_temperatura_externa || null,
                promedio_potencia_kw: row.promedio_potencia_kw || null
            }));
      
            res.json(transformUtils.transformApiResponse(processedData));
      
        } catch (error) {
            console.error('Error in temperature-power analysis:', error);
            res.status(500).json({ error: 'Error analyzing temperature and power data' });
             next(error)
        }
      }
    
    async getTemperaturePowerLocations(req, res, next) {
      try {
          // Migrado: channels_ubibot → ubi_canal; catalogo_ubicaciones_reales → gen_ubicaciones_reales;
          // sem_dispositivos.ubicacion → sem_dispositivos.id_ubicacion_real
          // Aliases preservan nombres JS: nombre_ubicacion, channel_id, channel_name, esOperativa
          const query = `
              SELECT DISTINCT
                  c.id_ubicacion_real AS ubicacion_id,
                  cat.nombre AS nombre_ubicacion,
                  c.canal_id AS channel_id,
                  c.nombre AS channel_name,
                  c.activo AS esOperativa,
                  d.shelly_id,
                  d.nombre as shelly_name
              FROM ubi_canal c
              JOIN gen_ubicaciones_reales cat ON c.id_ubicacion_real = cat.id_ubicacion_real
              JOIN sem_dispositivos d ON d.id_ubicacion_real = c.id_ubicacion_real
              WHERE d.activo = 1
              ORDER BY cat.nombre, c.nombre
          `;
    
          const [results] = await databaseService.pool.query(query);
    
          // Procesar los resultados para una estructura más organizada
          const locations = results.reduce((acc, item) => {
              if (!acc[item.ubicacion_id]) {
                  acc[item.ubicacion_id] = {
                      id: item.ubicacion_id,
                      nombre: item.nombre_ubicacion,
                      shellyDevice: {
                          id: item.shelly_id,
                          name: item.shelly_name
                      },
                      channels: []
                  };
              }
              
              acc[item.ubicacion_id].channels.push({
                  id: item.channel_id,
                  name: item.channel_name,
                  isOperative: item.esOperativa === 1
              });
              
              return acc;
          }, {});
    
          res.json(transformUtils.transformApiResponse(Object.values(locations)));
          
      } catch (error) {
          console.error('Error fetching locations and channels:', error);
          res.status(500).json({ 
              error: 'Error retrieving locations and channels data',
              details: error.message 
          });
          next(error)
      }
    }
}

module.exports = new AnalysisController();