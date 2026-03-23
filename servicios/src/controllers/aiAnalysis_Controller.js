const openaiService = require('../services/openai_Service');
const aiDataService = require('../services/aiData_Service');
const costTracker = require('../services/aiCostTracker_Service');
const agentOrchestrator = require('../services/aiAgentOrchestrator_Service');
const databaseService = require('../services/database_Service');
const configLoader = require('../config/js_files/configLoader_Config');
const { DateTime } = require('../utils/date_Utils');

class AIAnalysisController {
  /**
   * Execute AI analysis query
   * POST /api/ia/analisis/query
   */
  async query(req, res) {
    const startTime = Date.now();
    
    try {
      const { query: queryText, sessionId, chambers, dateRange } = req.body;
      const userId = req.user.userId || req.user.id_Usuario || req.user.id;

      if (!queryText) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Query text is required'
        });
      }

      // Determine date range (from request or default to last 7 days)
      let finalDateRange = dateRange;
      if (!finalDateRange) {
        finalDateRange = {
          start: DateTime.now().minus({ days: 7 }).toFormat('yyyy-MM-dd'),
          end: DateTime.now().toFormat('yyyy-MM-dd')
        };
      }

      // Determine chambers (from request or extract from query - simplified for now)
      let finalChambers = chambers;
      if (!finalChambers || finalChambers.length === 0) {
        // TODO: Extract chambers from query text using AI or user selection
        // For now, return error if not provided
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Chambers must be specified. Natural language extraction coming soon.'
        });
      }

      // Create or resume session
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        // Check for existing active session
        activeSessionId = await costTracker.getActiveSession(userId);
        if (!activeSessionId) {
          activeSessionId = await costTracker.createSession(userId);
        }
      }

      // Fetch historical data (always use daily aggregation to reduce token usage)
      console.log(`[AIAnalysisController] Fetching data for chambers ${finalChambers.join(',')} from ${finalDateRange.start} to ${finalDateRange.end}`);
      const historicalData = await aiDataService.fetchChamberData(
        finalChambers,
        finalDateRange.start,
        finalDateRange.end,
        true  // Force daily aggregation to stay under OpenAI token limits
      );

      if (!historicalData || historicalData.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No Data',
          message: `No temperature data found for the specified chambers and date range`
        });
      }

      // Analyze with AI
      console.log(`[AIAnalysisController] Analyzing ${historicalData.length} data points with AI`);
      const aiResponse = await openaiService.analyzeChamberData(queryText, historicalData);
      
      // Log response summary
      console.log(`[AIAnalysisController] ✅ AI Response received (${aiResponse.response?.length || 0} chars)`);

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Track costs
      const queryCost = await costTracker.logQuery(
        activeSessionId,
        userId,
        { query: queryText, chambers: finalChambers, dateRange: finalDateRange },
        aiResponse,
        executionTimeMs
      );

      // Get session total
      const sessionTotal = await costTracker.getSessionTotal(activeSessionId);

      // Return response
      res.json({
        success: true,
        sessionId: activeSessionId,
        response: {
          summary: aiResponse.response,
          data: historicalData.slice(0, 100) // Limit data in response to avoid huge payloads
        },
        cost: {
          queryCost: parseFloat(queryCost.toFixed(4)),
          sessionTotal: parseFloat(sessionTotal.toFixed(4)),
          inputTokens: aiResponse.usage.prompt_tokens,
          outputTokens: aiResponse.usage.completion_tokens,
          model: aiResponse.model
        },
        executionTime: executionTimeMs
      });

    } catch (error) {
      console.error('[AIAnalysisController] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An error occurred while processing the query'
      });
    }
  }

  /**
   * Consulta avanzada con agente autónomo (Gemini Flash + ReAct loop)
   * POST /api/ia/consulta-avanzada
   */
  async queryAvanzada(req, res) {
    const startTime = Date.now();

    try {
      const { query: queryText, sessionId } = req.body;
      const userId = req.user.userId || req.user.id_Usuario || req.user.id;

      if (!queryText) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Query text is required'
        });
      }

      // Verificar que el agente esté disponible
      if (!agentOrchestrator.isAvailable()) {
        const config = configLoader.getConfig();
        if (!config.Gemini_API?.GEMINI_API_KEY) {
          return res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: 'GEMINI_API_KEY not configured. Please contact your administrator.'
          });
        }
        // Intentar reinicializar
        agentOrchestrator.init();
        if (!agentOrchestrator.isAvailable()) {
          return res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: 'AI Agent could not be initialized. Please try again later.'
          });
        }
      }

      // Create or resume session
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await costTracker.getActiveSession(userId);
        if (!activeSessionId) {
          activeSessionId = await costTracker.createSession(userId);
        }
      }

      // Ejecutar agente autónomo
      console.log(`[AIAnalysisController] Starting advanced query for user ${userId}`);
      const agentResult = await agentOrchestrator.run(queryText, userId);

      const executionTimeMs = Date.now() - startTime;

      // Registrar costos (adaptar formato para costTracker)
      const aiResponse = {
        model: agentResult.model,
        usage: {
          prompt_tokens: agentResult.usage.prompt_tokens,
          completion_tokens: agentResult.usage.completion_tokens
        },
        response: agentResult.response
      };

      const queryCost = await costTracker.logQuery(
        activeSessionId,
        userId,
        { query: queryText, chambers: [], dateRange: null },
        aiResponse,
        executionTimeMs
      );

      const sessionTotal = await costTracker.getSessionTotal(activeSessionId);

      res.json({
        success: true,
        sessionId: activeSessionId,
        response: {
          summary: agentResult.response,
          toolsUsed: agentResult.toolsUsed,
          iterations: agentResult.iterations
        },
        cost: {
          queryCost: parseFloat(queryCost.toFixed(4)),
          sessionTotal: parseFloat(sessionTotal.toFixed(4)),
          inputTokens: agentResult.usage.prompt_tokens,
          outputTokens: agentResult.usage.completion_tokens,
          model: agentResult.model
        },
        executionTime: executionTimeMs
      });

    } catch (error) {
      console.error('[AIAnalysisController] Advanced query error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An error occurred while processing the advanced query'
      });
    }
  }

  /**
   * Get user's session history
   * GET /api/ia/analisis/sessions
   */
  async getSessions(req, res) {
    try {
      const userId = req.user.userId || req.user.id_Usuario || req.user.id;
      const { limit = 20, offset = 0, startDate, endDate } = req.query;

      let query = `
        SELECT
          id_sesion as id,
          id_usuario as userId,
          fecha_inicio as sessionStart,
          fecha_fin as sessionEnd,
          modelo_utilizado as modelUsed,
          costo_total_usd as totalCostUsd,
          cantidad_consultas as queryCount,
          camaras_consultadas as chambersQueried,
          exitoso as success
        FROM ai_costos_sesion
        WHERE id_usuario = ?
      `;

      const params = [userId];

      if (startDate && endDate) {
        query += ' AND fecha_inicio BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      query += ' ORDER BY fecha_inicio DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const sessions = await databaseService.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM ai_costos_sesion
        WHERE id_usuario = ?
      `;
      const countParams = [userId];
      if (startDate && endDate) {
        countQuery += ' AND fecha_inicio BETWEEN ? AND ?';
        countParams.push(startDate, endDate);
      }
      const [{ total }] = await databaseService.query(countQuery, countParams);

      res.json({
        success: true,
        sessions: sessions.map(s => ({
          ...s,
          totalCostUsd: parseFloat(s.totalCostUsd) || 0,
          chambersQueried: s.chambersQueried ? JSON.parse(s.chambersQueried) : []
        })),
        pagination: {
          total: parseInt(total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(total)
        }
      });

    } catch (error) {
      console.error('[AIAnalysisController] Error getting sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  /**
   * Get available chambers
   * GET /api/ia/analisis/chambers
   */
  async getChambers(req, res) {
    try {
      // Migrado: channels_ubibot → ubi_canal; sensor_readings_ubibot → ubi_lecturas_sensor;
      // parametrizaciones → ubi_grupo
      // Lógica dual: COALESCE(c.umbral_min, g.temperatura_minima) — override individual tiene prioridad sobre el grupo.
      // group_name: ubi_grupo no tiene columna nombre_parametro; se retorna g.nombre_preset como group_name.
      const query = `
        SELECT
          c.canal_id AS id,
          c.nombre AS name,
          COALESCE(c.umbral_min, g.temperatura_minima) AS threshold_min,
          COALESCE(c.umbral_max, g.temperatura_maxima) AS threshold_max,
          c.id_preset,
          g.nombre_preset AS group_name,
          COUNT(DISTINCT DATE(sr.fecha_lectura_externa)) as days_with_data
        FROM ubi_canal c
        LEFT JOIN ubi_grupo g ON c.id_preset = g.id_preset
        LEFT JOIN ubi_lecturas_sensor sr ON c.id_canal = sr.id_canal
          AND sr.fecha_lectura_externa >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY c.canal_id, c.nombre, c.umbral_min, c.umbral_max, g.temperatura_minima, g.temperatura_maxima, c.id_preset, g.nombre_preset
        HAVING days_with_data > 0
        ORDER BY c.nombre
      `;

      const chambers = await databaseService.query(query);

      res.json({
        success: true,
        chambers: chambers.map(ch => ({
          id: ch.id,
          name: ch.name,
          thresholdMin: ch.threshold_min,
          thresholdMax: ch.threshold_max,
          groupName: ch.group_name,
          daysWithData: ch.days_with_data
        }))
      });

    } catch (error) {
      console.error('[AIAnalysisController] Error getting chambers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  /**
   * Get suggested questions
   * GET /api/ia/analisis/suggested-questions
   */
  async getSuggestedQuestions(req, res) {
    try {
      const userId = req.user.userId || req.user.id_Usuario || req.user.id;
      
      // Migrado: channels_ubibot → ubi_canal; sensor_readings_ubibot → ubi_lecturas_sensor
      // Se retorna canal_id (API ID de Ubibot) con alias channel_id para compatibilidad con JS posterior
      // Get first 3 chambers with data for suggestions
      const chambersQuery = `
        SELECT DISTINCT c.canal_id AS channel_id
        FROM ubi_canal c
        JOIN ubi_lecturas_sensor sr ON c.id_canal = sr.id_canal
        WHERE sr.fecha_lectura_externa >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY c.canal_id
        LIMIT 3
      `;
      
      const chamberResults = await databaseService.query(chambersQuery);
      const defaultChambers = chamberResults.map(r => r.channel_id);

      const questions = [
        {
          text: "¿Qué cámaras tuvieron brechas de temperatura en los últimos 7 días?",
          chambers: defaultChambers,
          dateRange: {
            start: DateTime.now().minus({ days: 7 }).toFormat('yyyy-MM-dd'),
            end: DateTime.now().toFormat('yyyy-MM-dd')
          }
        },
        {
          text: "Compara la estabilidad de temperatura entre cámaras este mes",
          chambers: defaultChambers,
          dateRange: {
            start: DateTime.now().startOf('month').toFormat('yyyy-MM-dd'),
            end: DateTime.now().toFormat('yyyy-MM-dd')
          }
        },
        {
          text: "Muestra el patrón de temperatura de las cámaras durante el último evento de frío",
          chambers: defaultChambers.slice(0, 1), // Solo primera cámara para análisis de patrón
          dateRange: {
            start: DateTime.now().minus({ days: 7 }).toFormat('yyyy-MM-dd'),
            end: DateTime.now().toFormat('yyyy-MM-dd')
          }
        }
      ];

      res.json({
        success: true,
        questions
      });

    } catch (error) {
      console.error('[AIAnalysisController] Error getting suggested questions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
}

module.exports = new AIAnalysisController();


