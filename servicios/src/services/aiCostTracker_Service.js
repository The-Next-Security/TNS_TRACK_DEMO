const databaseService = require('./database_Service');
const configLoader = require('../config/js_files/configLoader_Config');

// Fallback si no existe ai-pricing.json (DeepSeek por millón de tokens)
const DEFAULT_PRICING = {
  'deepseek-chat': { input_per_million: 0.14, output_per_million: 0.28 }
};

class AICostTracker {
  constructor() {
    this.pricing = DEFAULT_PRICING;
  }

  _ensurePricing() {
    if (this._pricingLoaded) return;
    try {
      const custom = configLoader.getValue('OpenAI_API.pricing') || configLoader.getConfig().ai_pricing;
      if (custom && typeof custom === 'object') this.pricing = { ...DEFAULT_PRICING, ...custom };
    } catch (_) { /* config no lista aún */ }
    this._pricingLoaded = true;
  }

  calculateCost(modelName, inputTokens, outputTokens) {
    this._ensurePricing();
    const modelPricing = this.pricing[modelName] || this.pricing['deepseek-chat'];
    if (!modelPricing) {
      console.warn(`[AICostTracker] Unknown model: ${modelName}, using deepseek-chat pricing`);
      return this.calculateCost('deepseek-chat', inputTokens, outputTokens);
    }
    
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input_per_million;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output_per_million;
    return inputCost + outputCost;
  }

  async createSession(userId) {
    try {
      // Use pool directly to get insertId
      const connection = await databaseService.pool.getConnection();
      const config = configLoader.getConfig();
      try {
        const [result] = await connection.execute(
          'INSERT INTO ai_costos_sesion (id_usuario, modelo_utilizado) VALUES (?, ?)',
          [userId, config.OpenAI_API?.OPENAI_MODEL || 'deepseek-chat']
        );

        const sessionId = result.insertId;
        console.log(`[AICostTracker] Created session ${sessionId} for user ${userId}`);
        return sessionId;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[AICostTracker] Error creating session:', error);
      throw error;
    }
  }

  async logQuery(sessionId, userId, queryData, aiResponse, executionTimeMs = null) {
    try {
      const cost = this.calculateCost(
        aiResponse.model,
        aiResponse.usage.prompt_tokens,
        aiResponse.usage.completion_tokens
      );

      // Insert query log
      await databaseService.query(`
        INSERT INTO log_ai_consultas
        (id_sesion, id_usuario, texto_consulta, camaras, fecha_rango_inicio, fecha_rango_fin,
         tokens_entrada, tokens_salida, costo_usd, tiempo_ejecucion_ms, resumen_respuesta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sessionId,
        userId,
        queryData.query || '',
        JSON.stringify(queryData.chambers || []),
        queryData.dateRange?.start || null,
        queryData.dateRange?.end || null,
        aiResponse.usage.prompt_tokens,
        aiResponse.usage.completion_tokens,
        cost,
        executionTimeMs,
        (aiResponse.response || '').substring(0, 500)
      ]);

      // Update session totals
      await databaseService.query(`
        UPDATE ai_costos_sesion
        SET total_tokens_entrada = total_tokens_entrada + ?,
            total_tokens_salida = total_tokens_salida + ?,
            costo_total_usd = costo_total_usd + ?,
            cantidad_consultas = cantidad_consultas + 1
        WHERE id_sesion = ?
      `, [
        aiResponse.usage.prompt_tokens,
        aiResponse.usage.completion_tokens,
        cost,
        sessionId
      ]);

      console.log(`[AICostTracker] Logged query: ${cost.toFixed(4)} USD, session ${sessionId}`);
      return cost;
    } catch (error) {
      console.error('[AICostTracker] Error logging query:', error);
      throw error;
    }
  }

  async getSessionTotal(sessionId) {
    try {
      const sessions = await databaseService.query(
        'SELECT costo_total_usd FROM ai_costos_sesion WHERE id_sesion = ?',
        [sessionId]
      );

      if (sessions.length === 0) {
        return 0;
      }

      return parseFloat(sessions[0].costo_total_usd) || 0;
    } catch (error) {
      console.error('[AICostTracker] Error getting session total:', error);
      return 0;
    }
  }

  async getActiveSession(userId) {
    try {
      const config = configLoader.getConfig();
      const timeoutMinutes = parseInt(config.OpenAI_API?.AI_SESSION_TIMEOUT_MINUTES) || 30;

      // Close expired sessions for this user before looking for an active one
      await databaseService.query(
        `UPDATE ai_costos_sesion
         SET fecha_fin = NOW()
         WHERE id_usuario = ?
           AND fecha_fin IS NULL
           AND fecha_inicio < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [userId, timeoutMinutes]
      );

      const sessions = await databaseService.query(
        `SELECT id_sesion FROM ai_costos_sesion
         WHERE id_usuario = ? AND fecha_fin IS NULL
         ORDER BY fecha_inicio DESC LIMIT 1`,
        [userId]
      );

      if (sessions.length === 0) {
        return null;
      }

      return sessions[0].id_sesion;
    } catch (error) {
      console.error('[AICostTracker] Error getting active session:', error);
      return null;
    }
  }
}

module.exports = new AICostTracker();

