const OpenAI = require('openai');
const configLoader = require('../config/js_files/configLoader_Config');

class OpenAIService {
  constructor() {
    this.client = null;
    this.model = 'deepseek-chat';
    this.maxTokens = 2000;
  }

  /**
   * Carga config y crea el cliente. Llamar desde boot() tras configLoader.initialize().
   */
  init() {
    const config = configLoader.getConfig();
    this.model = config.OpenAI_API?.OPENAI_MODEL || 'deepseek-chat';
    this.maxTokens = parseInt(config.OpenAI_API?.OPENAI_MAX_TOKENS) || 2000;
    const apiKey = config.OpenAI_API?.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[OpenAIService] WARNING: OPENAI_API_KEY not set in configuration');
      return;
    }
    try {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com'
      });
      console.log(`[OpenAIService] ✅ Initialized with DeepSeek model: ${this.model} (max_tokens: ${this.maxTokens})`);
    } catch (error) {
      console.error('[OpenAIService] Error initializing DeepSeek client:', error.message);
      this.client = null;
    }
  }

  async analyzeChamberData(query, historicalData) {
    if (!this.client) {
      throw new Error('DeepSeek client not initialized. Please set OPENAI_API_KEY in configuration.');
    }

    try {
      // Format data efficiently for AI (reduce token usage)
      const formattedData = historicalData.map(d => ({
        date: d.date,
        chamber: d.chamber_name || d.channel_id,
        avgTemp: d.avg_temp,
        minTemp: d.min_temp,
        maxTemp: d.max_temp,
        breaches: d.breach_count || 0,
        thresholds: `${d.threshold_min}°C to ${d.threshold_max}°C`
      }));

      const requestParams = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en análisis de temperatura de cámaras de frío. Analiza los datos y proporciona una respuesta clara, concisa y estructurada en español. SIEMPRE incluye: 1) Un resumen de hallazgos principales, 2) Datos específicos de temperatura y brechas, 3) Observaciones y recomendaciones relevantes. Los datos están agregados por día.\n\nCONTEXTO IMPORTANTE: Las cámaras tienen ciclos de descongelamiento regulares y programados. Durante estos ciclos, es NORMAL que la temperatura suba temporalmente por encima del umbral máximo. Por lo tanto, las brechas de temperatura NO siempre indican problemas - muchas son parte de los ciclos normales de descongelamiento. Al analizar brechas, considera: 1) Patrones regulares/periódicos (probablemente descongelamientos normales), 2) Duración de las brechas (descongelamientos suelen ser cortos), 3) Magnitud del exceso de temperatura (descongelamientos suelen tener picos controlados). Solo señala como problemáticas las brechas que sean irregulares, prolongadas o excesivas.'
          },
          {
            role: 'user',
            content: `Consulta: ${query}\n\nDatos históricos (agregados por día):\n${JSON.stringify(formattedData)}`
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7
      };

      const response = await this.client.chat.completions.create(requestParams);
      
      // Log only if response is empty or truncated
      if (!response.choices[0].message.content || response.choices[0].finish_reason === 'length') {
        console.warn('[OpenAIService] ⚠️ Empty or truncated response!');
        console.warn('[OpenAIService] finish_reason:', response.choices[0].finish_reason);
        console.warn('[OpenAIService] usage:', JSON.stringify(response.usage, null, 2));
        console.warn('[OpenAIService] content length:', response.choices[0].message.content?.length || 0);
      }

      return {
        response: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      console.error('[OpenAIService] Error analyzing chamber data:', error);
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }
}

module.exports = new OpenAIService();

