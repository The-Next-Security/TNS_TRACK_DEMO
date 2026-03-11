const openaiService = require('../services/openai_Service');
const aiDataService = require('../services/aiData_Service');
const costTracker = require('../services/aiCostTracker_Service');
const databaseService = require('../services/database_Service');
const { DateTime } = require('../utils/date_Utils');

class AIAnalysisController {
  /**
   * Execute AI analysis query
   * POST /api/v1/ai-analysis/query
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
   * Get user's session history
   * GET /api/v1/ai-analysis/sessions
   */
  async getSessions(req, res) {
    try {
      const userId = req.user.userId || req.user.id_Usuario || req.user.id;
      const { limit = 20, offset = 0, startDate, endDate } = req.query;

      let query = `
        SELECT 
          id,
          user_id as userId,
          session_start as sessionStart,
          session_end as sessionEnd,
          model_used as modelUsed,
          total_cost_usd as totalCostUsd,
          query_count as queryCount,
          chambers_queried as chambersQueried,
          success
        FROM ai_session_costs
        WHERE user_id = ?
      `;

      const params = [userId];

      if (startDate && endDate) {
        query += ' AND session_start BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      query += ' ORDER BY session_start DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const sessions = await databaseService.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM ai_session_costs 
        WHERE user_id = ?
      `;
      const countParams = [userId];
      if (startDate && endDate) {
        countQuery += ' AND session_start BETWEEN ? AND ?';
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
   * GET /api/v1/ai-analysis/chambers
   */
  async getChambers(req, res) {
    try {
      const query = `
        SELECT 
          c.channel_id as id,
          c.name,
          c.threshold_min,
          c.threshold_max,
          c.id_parametrizacion,
          p.nombre_parametro as group_name,
          COUNT(DISTINCT DATE(sr.external_temperature_timestamp)) as days_with_data
        FROM channels_ubibot c
        LEFT JOIN parametrizaciones p ON c.id_parametrizacion = p.param_id
        LEFT JOIN sensor_readings_ubibot sr ON c.channel_id = sr.channel_id
          AND sr.external_temperature_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY c.channel_id, c.name, c.threshold_min, c.threshold_max, c.id_parametrizacion, p.nombre_parametro
        HAVING days_with_data > 0
        ORDER BY c.name
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
   * GET /api/v1/ai-analysis/suggested-questions
   */
  async getSuggestedQuestions(req, res) {
    try {
      const userId = req.user.userId || req.user.id_Usuario || req.user.id;
      
      // Get first 3 chambers with data for suggestions
      const chambersQuery = `
        SELECT DISTINCT c.channel_id
        FROM channels_ubibot c
        JOIN sensor_readings_ubibot sr ON c.channel_id = sr.channel_id
        WHERE sr.external_temperature_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY c.channel_id
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


