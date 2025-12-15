const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = null;
    // Use DeepSeek for more cost-effective AI analysis ($0.28/$0.42 per 1M tokens)
    // Compatible with OpenAI SDK, just requires different baseURL
    this.model = process.env.OPENAI_MODEL || 'deepseek-chat';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;
    this._initializeClient();
  }

  _initializeClient() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[OpenAIService] WARNING: OPENAI_API_KEY not set in environment variables');
      return; // Client will be null, will fail gracefully in analyzeChamberData
    }
    
    try {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
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
      throw new Error('DeepSeek client not initialized. Please set OPENAI_API_KEY environment variable.');
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
        max_completion_tokens: this.maxTokens,
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

