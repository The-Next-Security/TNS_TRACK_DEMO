const OpenAI = require('openai'); // SDK compatible con API de Gemini
const configLoader = require('../config/js_files/configLoader_Config');

class GeminiService {
  constructor() {
    this.client = null;
    this.model = 'gemini-2.0-flash';
    this.maxTokens = 2000;
    this.maxRetries = 3;
  }

  /**
   * Carga config y crea el cliente Gemini. Llamar desde boot() tras configLoader.initialize().
   */
  init() {
    const config = configLoader.getConfig();
    this.model = config.Gemini_API?.GEMINI_MODEL || 'gemini-2.0-flash';
    this.maxTokens = parseInt(config.Gemini_API?.GEMINI_MAX_TOKENS) || 2000;
    const apiKey = config.Gemini_API?.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[GeminiService] WARNING: GEMINI_API_KEY not set in configuration');
      return;
    }
    try {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai'
      });
      console.log(`[GeminiService] Initialized with Gemini model: ${this.model} (max_tokens: ${this.maxTokens})`);
    } catch (error) {
      console.error('[GeminiService] Error initializing Gemini client:', error.message);
      this.client = null;
    }
  }

  /**
   * Retry con backoff exponencial para manejar 429 (rate limit)
   * Espera: 2s, 4s, 8s entre reintentos
   */
  async _callWithRetry(requestParams, maxRetries = this.maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.chat.completions.create(requestParams);
      } catch (error) {
        if (error.status === 429 && attempt < maxRetries) {
          const waitMs = Math.pow(2, attempt) * 1000;
          console.warn(`[GeminiService] Rate limit (429). Retry ${attempt}/${maxRetries} in ${waitMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        throw error;
      }
    }
  }

  async analyzeChamberData(query, historicalData) {
    if (!this.client) {
      throw new Error('Gemini client not initialized. Please set GEMINI_API_KEY in configuration.');
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

      const response = await this._callWithRetry(requestParams);

      // Log only if response is empty or truncated
      if (!response.choices[0].message.content || response.choices[0].finish_reason === 'length') {
        console.warn('[GeminiService] Empty or truncated response!');
        console.warn('[GeminiService] finish_reason:', response.choices[0].finish_reason);
        console.warn('[GeminiService] usage:', JSON.stringify(response.usage, null, 2));
        console.warn('[GeminiService] content length:', response.choices[0].message.content?.length || 0);
      }

      return {
        response: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      console.error('[GeminiService] Error analyzing chamber data:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();
