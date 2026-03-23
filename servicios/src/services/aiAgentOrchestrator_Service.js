const OpenAI = require('openai');
const configLoader = require('../config/js_files/configLoader_Config');
const aiToolsService = require('./aiTools_Service');
const { TOOL_DEFINITIONS } = require('./aiTools_Service');
const { DateTime } = require('../utils/date_Utils');

class AIAgentOrchestrator {
  constructor() {
    this.client = null;
    this.model = 'gemini-2.0-flash';
    this.maxTokens = 2000;
    this.maxIterations = 5;
    this.maxInputTokens = 50000;
    this.costWarningUsd = 0.15;
  }

  init() {
    const config = configLoader.getConfig();
    this.model = config.Gemini_API?.GEMINI_MODEL || 'gemini-2.0-flash';
    this.maxTokens = parseInt(config.Gemini_API?.GEMINI_MAX_TOKENS) || 2000;
    this.maxIterations = parseInt(config.Gemini_API?.GEMINI_MAX_ITERATIONS) || 5;
    this.maxInputTokens = parseInt(config.Gemini_API?.GEMINI_MAX_INPUT_TOKENS) || 50000;
    this.costWarningUsd = parseFloat(config.Gemini_API?.GEMINI_COST_WARNING_USD) || 0.15;

    const apiKey = config.Gemini_API?.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AIAgentOrchestrator] WARNING: GEMINI_API_KEY not set');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai'
      });
      console.log(`[AIAgentOrchestrator] Initialized with model: ${this.model} (maxIter: ${this.maxIterations})`);
    } catch (error) {
      console.error('[AIAgentOrchestrator] Error initializing Gemini client:', error.message);
      this.client = null;
    }
  }

  isAvailable() {
    return this.client !== null;
  }

  async run(query, userId) {
    if (!this.client) {
      throw new Error('Gemini client not initialized. Please set GEMINI_API_KEY in configuration.');
    }

    const now = DateTime.now().setZone('America/Santiago');
    const systemPrompt = this._buildSystemPrompt(now);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ];

    const toolsUsed = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterations = 0;

    console.log(`[AIAgentOrchestrator] Starting agent loop for user ${userId}: "${query.substring(0, 80)}..."`);

    while (iterations < this.maxIterations) {
      iterations++;

      // Llamar a Gemini con tools
      let response;
      try {
        response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          tools: TOOL_DEFINITIONS,
          tool_choice: 'auto',
          max_tokens: this.maxTokens,
          temperature: 0.3
        });
      } catch (error) {
        console.error(`[AIAgentOrchestrator] Gemini API error at iteration ${iterations}:`, error.message);
        // Si es la primera iteración, reintentar una vez
        if (iterations === 1) {
          console.log('[AIAgentOrchestrator] Retrying first iteration...');
          try {
            response = await this.client.chat.completions.create({
              model: this.model,
              messages,
              tools: TOOL_DEFINITIONS,
              tool_choice: 'auto',
              max_tokens: this.maxTokens,
              temperature: 0.3
            });
          } catch (retryError) {
            throw new Error(`Gemini API error after retry: ${retryError.message}`);
          }
        } else {
          throw new Error(`Gemini API error at iteration ${iterations}: ${error.message}`);
        }
      }

      // Acumular tokens
      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens || 0;
        totalOutputTokens += response.usage.completion_tokens || 0;
      }

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // Agregar mensaje del asistente al historial
      messages.push(assistantMessage);

      // Si no hay tool_calls y finish_reason es "stop" → respuesta final
      if (choice.finish_reason === 'stop' && (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0)) {
        console.log(`[AIAgentOrchestrator] Agent finished at iteration ${iterations} (stop)`);
        break;
      }

      // Si hay tool_calls → ejecutar cada una
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch (parseErr) {
            console.warn(`[AIAgentOrchestrator] Failed to parse args for ${toolName}:`, parseErr.message);
          }

          console.log(`[AIAgentOrchestrator] Iteration ${iterations}: Calling tool ${toolName} with args:`, JSON.stringify(toolArgs));

          if (!toolsUsed.includes(toolName)) {
            toolsUsed.push(toolName);
          }

          // Ejecutar la tool
          const result = await aiToolsService.execute(toolName, toolArgs);

          // Agregar resultado al historial
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
      } else if (!assistantMessage.content) {
        // Gemini no devolvió ni tool_calls ni texto → reintentar
        console.warn(`[AIAgentOrchestrator] Empty response at iteration ${iterations}, no tool_calls and no content`);
        if (iterations === 1) {
          continue;
        }
        break;
      }

      // Control de tokens acumulados
      if (totalInputTokens > this.maxInputTokens) {
        console.warn(`[AIAgentOrchestrator] Token limit reached (${totalInputTokens} > ${this.maxInputTokens}), forcing final response`);
        messages.push({
          role: 'user',
          content: 'Has alcanzado el límite de datos consultados. Resume tu respuesta con los datos obtenidos hasta ahora.'
        });
        // Forzar una respuesta final sin tools
        const finalResponse = await this.client.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.3
        });
        if (finalResponse.usage) {
          totalInputTokens += finalResponse.usage.prompt_tokens || 0;
          totalOutputTokens += finalResponse.usage.completion_tokens || 0;
        }
        messages.push(finalResponse.choices[0].message);
        iterations++;
        break;
      }
    }

    // Si se alcanzó max iteraciones sin stop, forzar respuesta final
    if (iterations >= this.maxIterations) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'tool' || (lastMsg.role === 'assistant' && lastMsg.tool_calls)) {
        console.log('[AIAgentOrchestrator] Max iterations reached, forcing final summary');
        messages.push({
          role: 'user',
          content: 'Resume con los datos obtenidos hasta ahora. Indica si faltó información para completar el análisis.'
        });
        const finalResponse = await this.client.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: 0.3
        });
        if (finalResponse.usage) {
          totalInputTokens += finalResponse.usage.prompt_tokens || 0;
          totalOutputTokens += finalResponse.usage.completion_tokens || 0;
        }
        messages.push(finalResponse.choices[0].message);
      }
    }

    // Extraer respuesta final
    const finalMessage = messages[messages.length - 1];
    const responseText = finalMessage.content || 'No se pudo generar una respuesta.';

    // Warning de costo
    const estimatedCost = (totalInputTokens / 1_000_000) * 0.075 + (totalOutputTokens / 1_000_000) * 0.30;
    if (estimatedCost > this.costWarningUsd) {
      console.warn(`[AIAgentOrchestrator] Cost warning: estimated $${estimatedCost.toFixed(4)} USD exceeds threshold $${this.costWarningUsd}`);
    }

    console.log(`[AIAgentOrchestrator] Completed: ${iterations} iterations, ${toolsUsed.length} tools used, ${totalInputTokens}+${totalOutputTokens} tokens`);

    return {
      response: responseText,
      toolsUsed,
      iterations,
      usage: {
        prompt_tokens: totalInputTokens,
        completion_tokens: totalOutputTokens
      },
      model: this.model
    };
  }

  _buildSystemPrompt(now) {
    return `Eres un asistente experto en análisis de consumo eléctrico y temperatura de cámaras frigoríficas para TNS Track, un sistema de monitoreo IoT industrial.

CONTEXTO DEL SISTEMA:
- TNS Track monitorea dispositivos Shelly (consumo eléctrico) y sensores Ubibot (temperatura de cámaras de frío)
- Los dispositivos Shelly miden energía activa (kWh), costos y potencia en ubicaciones industriales
- Los sensores Ubibot miden temperatura en cámaras frigoríficas con umbrales configurados
- Las cámaras tienen ciclos de descongelamiento regulares que causan brechas de temperatura normales

INSTRUCCIONES:
- Antes de responder, analiza qué datos necesitas. Usa las herramientas disponibles para obtener esos datos. Puedes llamar múltiples herramientas en secuencia.
- Si necesitas datos de energía Y temperatura, busca ambos.
- Si la pregunta requiere pronósticos, obtén tanto datos históricos como pronóstico meteorológico.
- Todos los datos están en zona horaria America/Santiago (Chile). La fecha actual es ${now.toFormat('dd/MM/yyyy HH:mm')}.
- Responde siempre en español.
- Estructura tu respuesta con: resumen ejecutivo, datos encontrados, análisis, y recomendaciones si aplica.
- Usa formato Markdown para estructurar la respuesta.
- Si los datos disponibles son insuficientes para responder con certeza, indícalo explícitamente.
- Si una herramienta falla, indícalo en tu respuesta y continúa con los datos disponibles.
- Solo puedes responder preguntas relacionadas con consumo eléctrico, temperatura de cámaras y operaciones de monitoreo IoT. Para preguntas no relacionadas, responde educadamente que solo puedes ayudar con esos temas.`;
  }
}

module.exports = new AIAgentOrchestrator();
