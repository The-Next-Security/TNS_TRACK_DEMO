// src/controllers/powerAnalysisController.js
const databaseService = require("../services/database_Service");
const { DateTime } = require("luxon");

class PowerAnalysisController {
  async handleTemperaturePowerLocations(req, res) {
    try {
      // Migrado: channels_ubibot → ubi_canal; catalogo_ubicaciones_reales → gen_ubicaciones_reales;
      // sem_dispositivos.ubicacion → sem_dispositivos.id_ubicacion_real
      // Se preservan aliases solo para campos computados o de formato API
      const query = `
                SELECT DISTINCT
                    c.id_ubicacion_real AS ubicacion_id,
                    cat.nombre,
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
            nombre: item.nombre,
            shellyDevice: {
              id: item.shelly_id,
              name: item.shelly_name,
            },
            channels: [],
          };
        }

        acc[item.ubicacion_id].channels.push({
          id: item.channel_id,
          name: item.channel_name,
          isOperative: item.esOperativa === 1,
        });

        return acc;
      }, {});

      res.json(Object.values(locations));
    } catch (error) {
      console.error("Error fetching locations and channels:", error);
      res.status(500).json({
        error: "Error retrieving locations and channels data",
        details: error.message,
      });
    }
  }
  async handleTemperaturePowerAnalysis(req, res) {
    const { ubicacion, channelId } = req.query;
    const date = req.params.date;

    try {
      // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor; catalogo_ubicaciones_reales → gen_ubicaciones_reales;
      // sem_dispositivos.ubicacion → sem_dispositivos.id_ubicacion_real
      // canal_id (API ID de Ubibot) se resuelve a id_canal via subquery en la CTE de temperatura
      // SUPUESTO #4: gen_ubicaciones_reales.nombre reemplaza a catalogo_ubicaciones_reales.nombre_ubicacion
      const query = `
        WITH temp_mediciones AS (
          SELECT
            DATE_FORMAT(
              DATE_ADD(timestamp_local,
              INTERVAL -(MINUTE(timestamp_local) % 15) MINUTE
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
              INTERVAL -(MINUTE(fecha_lectura) % 15) MINUTE
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
          cat.nombre,
          ROUND(t.temperatura_promedio, 2) as promedio_temperatura_externa,
          ROUND(m.potencia_promedio, 3) as promedio_potencia_kw,
          t.lecturas_temperatura,
          m.lecturas_potencia
        FROM temp_mediciones m
        LEFT JOIN temp_temperaturas t ON t.intervalo_tiempo = m.intervalo_tiempo
        JOIN sem_dispositivos d ON d.id_ubicacion_real = ?
        JOIN gen_ubicaciones_reales cat ON cat.id_ubicacion_real = d.id_ubicacion_real
        ORDER BY m.intervalo_tiempo;
      `;

      const [results] = await databaseService.pool.query(query, [
        date,
        ubicacion,
        date,
        channelId,
        ubicacion
      ]);

      res.json(results);
    } catch (error) {
      console.error("Error in temperature-power analysis:", error);
      res.status(500).json({ error: "Error analyzing temperature and power data" });
    }
  }
}

module.exports = new PowerAnalysisController();
