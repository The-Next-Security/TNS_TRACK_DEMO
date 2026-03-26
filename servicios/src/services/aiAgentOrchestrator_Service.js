const OpenAI = require('openai');
const configLoader = require('../config/js_files/configLoader_Config');
const aiToolsService = require('./aiTools_Service');
const { TOOL_DEFINITIONS } = require('./aiTools_Service');
const { DateTime } = require('../utils/date_Utils');
const { SCHEMA_CONTEXT } = require('./aiSchema_Service');

const _debugEnabled = () => process.env.NODE_ENV !== 'production' || process.env.AI_DEBUG === 'true';

class AIAgentOrchestrator {
  constructor() {
    this.client = null;
    this.model = 'gemini-pro-latest';
    this.maxTokens = 2000;
    this.maxIterations = 5;
    this.maxInputTokens = 50000;
    this.costWarningUsd = 0.15;
    this.maxRetries = 3;
  }

  init() {
    const config = configLoader.getConfig();
    this.model = config.Gemini_API?.GEMINI_MODEL || 'gemini-pro-latest';
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

  /**
   * Retry con backoff exponencial para manejar 429 (rate limit)
   * Espera: 2s, 4s, 8s entre reintentos
   */
  async _callWithRetry(requestParams) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (_debugEnabled() && attempt > 1) {
          console.log(`[AIAgentOrchestrator] 🔁 Retry attempt ${attempt}/${this.maxRetries}`);
        }
        const startMs = Date.now();
        const result = await this.client.chat.completions.create(requestParams);
        const elapsed = Date.now() - startMs;
        if (_debugEnabled()) {
          console.log(`[AIAgentOrchestrator] ⏱️ Gemini API call took ${elapsed}ms (attempt ${attempt})`);
        }
        return result;
      } catch (error) {
        if (error.status === 429 && attempt < this.maxRetries) {
          const waitMs = Math.pow(2, attempt) * 1000;
          console.warn(`[AIAgentOrchestrator] Rate limit (429). Retry ${attempt}/${this.maxRetries} in ${waitMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        throw error;
      }
    }
  }

  async run(query, userId, context = {}) {
    if (!this.client) {
      throw new Error('Gemini client not initialized. Please set GEMINI_API_KEY in configuration.');
    }

    const now = DateTime.now().setZone('America/Santiago');
    const systemPrompt = this._buildSystemPrompt(now);

    // Enriquecer query con mapeo nombre→canal_id de cámaras seleccionadas
    let enrichedQuery = query;
    if (context.chamberInfo && context.chamberInfo.length > 0) {
      if (_debugEnabled()) {
        console.log(`[AIAgentOrchestrator] 📋 chamberInfo received:`, JSON.stringify(context.chamberInfo));
      }
      const chamberList = context.chamberInfo
        .map(c => {
          const energyInfo = c.shellyId
            ? `shelly_id: "${c.shellyId}" para energía`
            : 'sin medidor eléctrico';
          return `- ${c.name} (canal_id: "${c.id}", ${energyInfo})`;
        })
        .join('\n');
      enrichedQuery += `\n\n[INSTRUCCIÓN OBLIGATORIA - IDENTIFICADORES DE CÁMARAS:\nEl usuario seleccionó las siguientes cámaras para este análisis:\n${chamberList}\n\nREGLAS ESTRICTAS:\n1. Para get_temperature_chamber_data: usa EXACTAMENTE los canal_id numéricos listados arriba como chamber_ids. Ejemplo: chamber_ids: ["92521"], NO ["Reefer B"].\n2. Para get_energy_history: usa EXACTAMENTE los shelly_id listados arriba (solo para cámaras que tengan uno).\n3. NO uses nombres de cámaras como IDs. Los nombres son solo referencia humana.\n4. NO llames a get_active_devices para buscar IDs — ya los tienes aquí arriba.\nEnfoca tu análisis en estas cámaras específicamente.]`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: enrichedQuery }
    ];

    const toolsUsed = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let iterations = 0;
    const runStartMs = Date.now();

    if (_debugEnabled()) {
      console.log(`[AIAgentOrchestrator] 🚀 RUN START: query="${query.substring(0, 100)}" userId=${userId}`);
    } else {
      console.log(`[AIAgentOrchestrator] Starting agent loop for user ${userId}: "${query.substring(0, 80)}..."`);
    }

    while (iterations < this.maxIterations) {
      iterations++;

      if (_debugEnabled()) {
        console.log(`[AIAgentOrchestrator] 🔄 Iteration ${iterations}/${this.maxIterations}: Calling Gemini...`);
      }

      // Llamar a Gemini con tools (retry automático para 429)
      let response;
      try {
        response = await this._callWithRetry({
          model: this.model,
          messages,
          tools: TOOL_DEFINITIONS,
          tool_choice: 'auto',
          max_tokens: this.maxTokens,
          temperature: 0.3
        });
      } catch (error) {
        console.error(`[AIAgentOrchestrator] Gemini API error at iteration ${iterations}:`, error.message);
        throw new Error(`Gemini API error at iteration ${iterations}: ${error.message}`);
      }

      // Acumular tokens
      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens || 0;
        totalOutputTokens += response.usage.completion_tokens || 0;
      }

      if (_debugEnabled() && response.usage) {
        console.log(`[AIAgentOrchestrator] 📊 Iteration ${iterations} tokens: input=${response.usage.prompt_tokens || 0}, output=${response.usage.completion_tokens || 0} | Accumulated: input=${totalInputTokens}, output=${totalOutputTokens}`);
      }

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // Agregar mensaje del asistente al historial
      messages.push(assistantMessage);

      // Si no hay tool_calls y finish_reason es "stop" → respuesta final
      if (choice.finish_reason === 'stop' && (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0)) {
        if (_debugEnabled()) {
          console.log(`[AIAgentOrchestrator] ✅ Final response received (length: ${(assistantMessage.content || '').length} chars)`);
        } else {
          console.log(`[AIAgentOrchestrator] Agent finished at iteration ${iterations} (stop)`);
        }
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

          if (_debugEnabled()) {
            console.log(`[AIAgentOrchestrator] 🔧 Tool call: ${toolName}(${JSON.stringify(toolArgs)})`);
          } else {
            console.log(`[AIAgentOrchestrator] Iteration ${iterations}: Calling tool ${toolName} with args:`, JSON.stringify(toolArgs));
          }

          if (!toolsUsed.includes(toolName)) {
            toolsUsed.push(toolName);
          }

          // Ejecutar la tool
          const result = await aiToolsService.execute(toolName, toolArgs);

          if (_debugEnabled()) {
            const resultStr = JSON.stringify(result);
            console.log(`[AIAgentOrchestrator] 📊 Tool result (preview): ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
          }

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
        const finalResponse = await this._callWithRetry({
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
        const finalResponse = await this._callWithRetry({
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

    const totalTimeMs = Date.now() - runStartMs;
    if (_debugEnabled()) {
      console.log(`[AIAgentOrchestrator] 📈 RUN COMPLETE: iterations=${iterations}, tokens={input:${totalInputTokens},output:${totalOutputTokens}}, tools=[${toolsUsed.join(',')}], cost=$${estimatedCost.toFixed(4)}, time=${totalTimeMs}ms`);
    } else {
      console.log(`[AIAgentOrchestrator] Completed: ${iterations} iterations, ${toolsUsed.length} tools used, ${totalInputTokens}+${totalOutputTokens} tokens`);
    }

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

POLÍTICA DE USO ESTRICTA:
- Este sistema es EXCLUSIVAMENTE para consultas sobre temperaturas de cámaras de frío/reefers, consumo eléctrico y monitoreo IoT.
- Si la consulta NO es sobre temperaturas, brechas, consumo eléctrico, estado de cámaras o monitoreo IoT, responde ÚNICAMENTE con: "⚠️ **Esta consulta no puede ser procesada.** Este sistema es exclusivamente para análisis de temperaturas de cámaras de frío y consumo eléctrico. Por favor reformula tu pregunta dentro de este ámbito."
- NO ejecutes herramientas ni busques datos si la consulta no es pertinente al ámbito operativo.
- Ejemplos de consultas NO válidas: preguntas de cultura general, recetas, código, matemáticas genéricas, etc.

INSTRUCCIONES:
- Antes de responder, analiza qué datos necesitas. Usa las herramientas disponibles para obtener esos datos. Puedes llamar múltiples herramientas en secuencia.
- Si necesitas datos de energía Y temperatura, busca ambos.
- Si la pregunta requiere pronósticos, obtén tanto datos históricos como pronóstico meteorológico.
- Todos los datos están en zona horaria America/Santiago (Chile). La fecha actual es ${now.toFormat('dd/MM/yyyy HH:mm')}.
- Responde siempre en español.
- Si los datos disponibles son insuficientes para responder con certeza, indícalo explícitamente.
- Si una herramienta falla, indícalo en tu respuesta y continúa con los datos disponibles.
- IMPORTANTE: Cuando el usuario proporcione canal_id para sus cámaras, usa EXACTAMENTE esos valores como chamber_ids al llamar a get_temperature_chamber_data.

FORMATO DE RESPUESTA (Markdown rico):
- Usa ## para secciones principales y ### para subsecciones.
- Usa tablas Markdown para presentar datos numéricos comparativos.
- Usa **negrita** para hallazgos clave y valores importantes.
- Usa listas con viñetas (- o *) para recomendaciones y observaciones.
- Usa separadores --- entre secciones principales.
- Estructura obligatoria: ## Resumen Ejecutivo → ## Datos Analizados → ## Análisis Detallado → ## Recomendaciones (si aplica).

TRANSPARENCIA Y CONFIANZA:
- Cuando calcules correlaciones, proyecciones o estimaciones, indica el nivel de confianza (alta/media/baja) basado en la cantidad y calidad de datos disponibles.
- Si extrapolas o proyectas datos, indica claramente que es una estimación y menciona los supuestos utilizados.
- Distingue explícitamente entre DATOS REALES obtenidos de las herramientas y ESTIMACIONES o INFERENCIAS que tú calculas.
- Nunca inventes datos numéricos. Si no tienes un dato, di que no lo tienes.

─── DATABASE SCHEMA & TOOLS REFERENCE ───
${SCHEMA_CONTEXT}`;
  }
}

module.exports = new AIAgentOrchestrator();
