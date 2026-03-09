const databaseService = require('./database-service');
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
          'INSERT INTO ai_session_costs (user_id, model_used) VALUES (?, ?)',
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
        INSERT INTO ai_query_logs 
        (session_id, user_id, query_text, chambers, date_range_start, date_range_end,
         input_tokens, output_tokens, cost_usd, execution_time_ms, response_summary)
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
        UPDATE ai_session_costs 
        SET total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?,
            total_cost_usd = total_cost_usd + ?,
            query_count = query_count + 1
        WHERE id = ?
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
        'SELECT total_cost_usd FROM ai_session_costs WHERE id = ?',
        [sessionId]
      );
      
      if (sessions.length === 0) {
        return 0;
      }
      
      return parseFloat(sessions[0].total_cost_usd) || 0;
    } catch (error) {
      console.error('[AICostTracker] Error getting session total:', error);
      return 0;
    }
  }

  async getActiveSession(userId) {
    try {
      const sessions = await databaseService.query(
        `SELECT id FROM ai_session_costs 
         WHERE user_id = ? AND session_end IS NULL 
         ORDER BY session_start DESC LIMIT 1`,
        [userId]
      );
      
      if (sessions.length === 0) {
        return null;
      }
      
      return sessions[0].id;
    } catch (error) {
      console.error('[AICostTracker] Error getting active session:', error);
      return null;
    }
  }
}

module.exports = new AICostTracker();

