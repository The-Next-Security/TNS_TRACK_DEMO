# **TNS TRACK**

_The Next Security_

**PRD - Agente IA con Razonamiento Autónomo**

_Motor de Consultas Inteligentes sobre Datos de Energía y Temperatura_

| **Campo**    | **Valor**                | **Notas**                |
| ------------ | ------------------------ | ------------------------ |
| Versión      | 1.0.0                    | Primera emisión          |
| Fecha        | 20 Marzo 2026            | America/Santiago         |
| Estado       | APROBADO PARA DESARROLLO |                          |
| Autor        | TNSTRACK / Claude (AI)   | Product Owner + AI PM    |
| Destinatario | Claude Code Desktop      | Agente de implementación |
| Repositorio  | andresTNS/TNS_TRACK_DEMO | GitHub privado           |

# **1\. Resumen Ejecutivo**

TNS Track cuenta hoy con un módulo de análisis IA que permite a los usuarios hacer preguntas en lenguaje natural sobre los datos de temperatura (cámaras Ubibot) y consumo eléctrico (dispositivos Shelly). Sin embargo, el sistema actual es estático: el backend decide qué datos enviar a DeepSeek antes de que el modelo vea la pregunta, sin que el modelo pueda razonar sobre qué información realmente necesita.

Este PRD especifica el rediseño de ese módulo hacia un Agente IA con razonamiento autónomo, donde el modelo (Gemini Flash) decide dinámicamente qué datos consultar, los busca mediante herramientas definidas, y solo entonces elabora su respuesta. Esto permite responder preguntas complejas y cruzadas como:

**Ejemplo de consulta objetivo**

"Pronostica el gasto energético de la próxima semana dado el cambio de temperatura exterior pronosticado." - Esta pregunta requiere: (1) historial de consumo eléctrico reciente, (2) correlación consumo vs temperatura histórica, (3) pronóstico meteorológico externo. El modelo razona qué necesita y lo busca solo.

## **1.1 Objetivo Principal**

Transformar el módulo /api/ia de un sistema de análisis pasivo a un agente autónomo capaz de:

- Interpretar preguntas en lenguaje natural sin estructuración previa por parte del usuario
- Razonar qué datos son necesarios para responder correctamente
- Consultar esos datos de forma autónoma (BD interna + APIs externas)
- Responder de forma fundamentada citando las fuentes consultadas

## **1.2 Modelo LLM Seleccionado**

**Decisión de modelo**

Gemini 2.0 Flash (Google). Costo estimado: ~\$0.002-\$0.008 USD por consulta completa (muy por debajo del umbral de \$0.20 establecido). Compatible con OpenAI function calling API. API Key a incorporar posteriormente por el equipo TNS.

# **2\. Contexto Técnico - Sistema Actual**

## **2.1 Archivos Involucrados en el Módulo IA Actual**

| **Archivo**                                        | **Tipo**   | **Responsabilidad actual**                               |
| -------------------------------------------------- | ---------- | -------------------------------------------------------- |
| servicios/src/services/openai_Service.js           | Servicio   | Cliente DeepSeek, método analyzeChamberData()            |
| servicios/src/services/aiData_Service.js           | Servicio   | Fetching de datos de cámaras desde BD (fetchChamberData) |
| servicios/src/controllers/aiAnalysis_Controller.js | Controller | Endpoint POST /api/ia/consulta, orquestación fija        |
| servicios/src/services/aiCostTracker_Service.js    | Servicio   | Log de sesiones y costos en tabla ai_costos_sesion       |
| servicios/src/routes/ia_Routes.js                  | Router     | Rutas /api/ia - auth + permisos ai_analysis              |

## **2.2 Limitaciones del Sistema Actual**

- El controller decide el rango de fechas y cámaras ANTES de consultar al LLM
- El LLM solo recibe datos de temperatura de cámaras Ubibot - nunca datos de energía eléctrica
- No existe correlación posible entre temperatura exterior y consumo
- Preguntas sobre el futuro o pronósticos son imposibles de responder
- El modelo no puede pedir datos adicionales si los recibidos son insuficientes

## **2.3 Flujo Actual (simplificado)**

Frontend → POST /api/ia/consulta { query, chambers, dateRange }

Controller → aiDataService.fetchChamberData(chambers, start, end)

Controller → openaiService.analyzeChamberData(query, historicalData)

DeepSeek → Responde solo con lo que le enviaron

## **2.4 Tablas de BD Relevantes para el Agente**

| **Tabla**              | **Dominio** | **Datos clave**                                                 |
| ---------------------- | ----------- | --------------------------------------------------------------- |
| sem_totales_dia        | Energía     | energia_activa_total (kWh), costo_total, fecha_local, shelly_id |
| sem_totales_hora       | Energía     | energia_activa_total por hora, potencia_maxima, hora_local      |
| sem_dispositivos       | Energía     | nombre, shelly_id, activo, id_ubicacion_real                    |
| ubi_lecturas_sensor    | Temperatura | temperatura_externa, fecha_lectura_externa, id_canal            |
| ubi_canal              | Temperatura | nombre, canal_id, umbral_min, umbral_max, id_preset             |
| gen_ubicaciones_reales | Común       | nombre_ubicacion - referencia de ubicación para ambos dominios  |

# **3\. Diseño del Sistema Agentic**

## **3.1 Patrón Arquitectónico: Function Calling + ReAct Loop**

El agente implementa el patrón ReAct (Reasoning + Acting). En cada iteración el modelo razona qué necesita, actúa llamando a una herramienta, observa el resultado y decide si necesita más datos o puede responder.

**Flujo del agente (hasta 5 iteraciones máximo)**

1\. Usuario envía pregunta en lenguaje natural 2. Gemini recibe pregunta + catálogo de tools disponibles 3. Gemini responde indicando qué tool(s) necesita y con qué parámetros 4. Backend ejecuta la(s) tool(s) y devuelve resultados 5. Se repite desde 3 hasta que Gemini indica "finish" o se alcanza max_iterations=5 6. Gemini elabora respuesta final con toda la información recopilada 7. Backend registra costo, tokens y sesión en BD

## **3.2 Catálogo de Herramientas (Tools)**

Cada tool tiene: nombre, descripción (para que el modelo entienda cuándo usarla), parámetros con tipos y si son requeridos, e implementación en el backend.

### **Tool 1: get_energy_history**

| **Campo**       | **Detalle**                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| Nombre          | get_energy_history                                                             |
| Cuándo usarla   | Cuando se necesita consumo eléctrico histórico para análisis o proyecciones    |
| Fuente de datos | sem_totales_dia JOIN sem_dispositivos JOIN gen_ubicaciones_reales              |
| Parámetros      | days: integer (1-180, requerido) \| shelly_ids: array&lt;string&gt; (opcional) |
| Retorna         | Resumen diario global (kWh total + costo) + detalle por dispositivo            |
| Límite de datos | Máximo 180 días. Datos siempre agregados diariamente (no raw)                  |

### **Tool 2: get_active_devices**

| **Campo**       | **Detalle**                                                            |
| --------------- | ---------------------------------------------------------------------- |
| Nombre          | get_active_devices                                                     |
| Cuándo usarla   | Cuando necesita saber qué dispositivos Shelly existen antes de filtrar |
| Fuente de datos | sem_dispositivos JOIN gen_ubicaciones_reales WHERE activo=1            |
| Parámetros      | Ninguno                                                                |
| Retorna         | Lista: shelly_id, nombre, ubicacion                                    |

### **Tool 3: get_weather_forecast**

| **Campo**       | **Detalle**                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| Nombre          | get_weather_forecast                                                             |
| Cuándo usarla   | Para preguntas sobre consumo futuro o proyecciones que dependan del clima        |
| Fuente de datos | Open-Meteo API (gratuita, sin API key) - endpoint /v1/forecast                   |
| Parámetros      | days: integer (1-14, requerido) \| location: string (opcional, default Santiago) |
| Retorna         | Array diario: fecha, temp_max_c, temp_min_c, temp_media_c, precipitacion_mm      |
| Geocoding       | Open-Meteo Geocoding API para resolver nombre de ciudad a coordenadas            |

### **Tool 4: get_historical_weather**

| **Campo**       | **Detalle**                                                          |
| --------------- | -------------------------------------------------------------------- |
| Nombre          | get_historical_weather                                               |
| Cuándo usarla   | Para correlacionar temperatura exterior histórica con consumo pasado |
| Fuente de datos | Open-Meteo API - endpoint /v1/archive                                |
| Parámetros      | days: integer (1-60, requerido) \| location: string (opcional)       |
| Retorna         | Array diario: fecha, temp_max_c, temp_min_c, temp_media_c            |

### **Tool 5: get_energy_stats_summary**

| **Campo**       | **Detalle**                                                                         |
| --------------- | ----------------------------------------------------------------------------------- |
| Nombre          | get_energy_stats_summary                                                            |
| Cuándo usarla   | Para tener contexto estadístico general antes de proyecciones o comparaciones       |
| Fuente de datos | sem_totales_dia GROUP BY YEARWEEK                                                   |
| Parámetros      | weeks: integer (1-12, opcional, default 4)                                          |
| Retorna         | Resumen semanal: energia_semana_kwh, promedio_dia, tendencia reciente (% variación) |

### **Tool 6: get_temperature_chamber_data**

| **Campo**       | **Detalle**                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| Nombre          | get_temperature_chamber_data                                                          |
| Cuándo usarla   | Cuando la pregunta involucra temperatura de cámaras frigoríficas o brechas de umbral  |
| Fuente de datos | ubi_lecturas_sensor JOIN ubi_canal JOIN ubi_grupo (lógica dual de umbrales existente) |
| Parámetros      | chamber_ids: array&lt;string&gt; (requerido) \| days: integer (1-90, requerido)       |
| Retorna         | Datos agregados diarios: avg_temp, min_temp, max_temp, breach_count por cámara        |
| Nota            | Reutiliza la lógica de aiData_Service.fetchChamberDataAggregated() ya existente       |

# **4\. Arquitectura de Archivos - Qué Crear y Qué Modificar**

**Principio de implementación**

Máxima reutilización del código existente. Se crean 2 archivos nuevos y se modifican 3 existentes. No se elimina ningún endpoint existente - el nuevo endpoint /api/ia/consulta-avanzada convive con el actual /api/ia/consulta.

## **4.1 Archivos Nuevos a Crear**

### **NUEVO: servicios/src/services/aiTools_Service.js**

Responsabilidad única: contiene el catálogo de tools (definiciones OpenAI) y la implementación de cada una.

Estructura interna:

- TOOL_DEFINITIONS: array con los 6 schemas de tools en formato OpenAI function calling
- Clase AIToolsService con método execute(toolName, args) como dispatcher
- Método getEnergyHistory({ days, shelly_ids }) - consulta sem_totales_dia
- Método getActiveDevices() - consulta sem_dispositivos
- Método getWeatherForecast({ days, location }) - Open-Meteo /v1/forecast
- Método getHistoricalWeather({ days, location }) - Open-Meteo /v1/archive
- Método getEnergyStatsSummary({ weeks }) - agrupación semanal
- Método getTemperatureChamberData({ chamber_ids, days }) - wrapper de aiData_Service existente
- Helper privado \_resolveCoords(location) - geocoding Open-Meteo
- Helper privado \_fetchJson(url, timeoutMs) - fetch con timeout y abort controller

Dependencias: database_Service.js, aiData_Service.js (existentes), date_Utils.js, fetch nativo de Node 18+

### **NUEVO: servicios/src/services/aiAgentOrchestrator_Service.js**

Responsabilidad única: ejecuta el loop agentic ReAct con Gemini Flash.

Estructura interna:

- Clase AIAgentOrchestrator con método run(query, userId) como punto de entrada
- Inicialización del cliente Gemini usando SDK compatible con OpenAI (baseURL: <https://generativelanguage.googleapis.com/v1beta/openai>)
- API Key leída desde configLoader: config.Gemini_API.GEMINI_API_KEY
- Modelo configurable: config.Gemini_API.GEMINI_MODEL (default: gemini-2.0-flash)
- Sistema de prompt (system message) con contexto del negocio TNS Track
- Loop principal: máximo MAX_ITERATIONS = 5 turnos
- En cada turno: llamar a Gemini con messages + tools, procesar tool_calls, ejecutar via aiToolsService.execute(), agregar resultados al historial
- Detección de finish: cuando Gemini devuelve finish_reason = "stop" sin tool_calls
- Retorno: { response: string, toolsUsed: \[\], iterations: number, usage: {tokens} }

Control de costos:

- Registra tokens de cada iteración acumulativamente
- Si tokens_input acumulados supera 50.000, fuerza finalización en el siguiente turno
- Log de advertencia si el costo estimado supera \$0.15 USD

## **4.2 Archivos Existentes a Modificar**

### **MODIFICAR: servicios/src/controllers/aiAnalysis_Controller.js**

Cambio: añadir el método queryAvanzada() que usa el orquestador. El método query() existente permanece sin cambios.

El nuevo método queryAvanzada():

- Acepta solo { query: string, sessionId?: string } - sin chambers ni dateRange (el agente los decide)
- Valida que query no esté vacío
- Crea o reutiliza sesión via costTracker (lógica existente)
- Llama a agentOrchestrator.run(query, userId)
- Registra resultado en costTracker (adaptar para Gemini: modelo, tokens, costo)
- Responde con: { success, sessionId, response: { summary, toolsUsed, iterations }, cost, executionTime }

### **MODIFICAR: servicios/src/routes/ia_Routes.js**

Cambio: añadir una línea para registrar la nueva ruta:

router.post('/consulta-avanzada', aiAnalysisController.queryAvanzada.bind(aiAnalysisController));

El middleware de auth y permiso ai_analysis existente se aplica automáticamente a todas las rutas del router.

### **MODIFICAR: Base de Datos - tabla gen*cofiguracion*\* (o equivalente)**

Añadir configuración de Gemini siguiendo el mismo patrón que la configuración existente de DeepSeek (OpenAI_API):

**Registros a insertar en BD**

Gemini_API.GEMINI_API_KEY = \[a completar por equipo TNS\] Gemini_API.GEMINI_MODEL = gemini-2.0-flash Gemini_API.GEMINI_MAX_TOKENS = 2000 Gemini_API.GEMINI_MAX_ITERATIONS = 5 Gemini_API.GEMINI_MAX_INPUT_TOKENS = 50000 Gemini_API.GEMINI_COST_WARNING_USD = 0.15

# **5\. Especificación Técnica Detallada**

## **5.1 System Prompt del Agente**

El system prompt que recibirá Gemini en cada sesión debe incluir:

- Contexto del negocio: "Eres un asistente experto en análisis de consumo eléctrico y temperatura de cámaras frigoríficas para TNS Track, un sistema de monitoreo IoT industrial."
- Instrucción de razonamiento: "Antes de responder, analiza qué datos necesitas. Usa las herramientas disponibles para obtener esos datos. Puedes llamar múltiples herramientas en secuencia."
- Zona horaria: "Todos los datos están en zona horaria America/Santiago (Chile). La fecha actual es \[inyectada dinámicamente\]."
- Formato de respuesta: "Responde siempre en español. Estructura tu respuesta con: resumen ejecutivo, datos encontrados, análisis, y recomendaciones si aplica."
- Restricción de honestidad: "Si los datos disponibles son insuficientes para responder con certeza, indícalo explícitamente."

## **5.2 Formato de Llamada a Gemini (OpenAI-compatible)**

POST <https://generativelanguage.googleapis.com/v1beta/openai/chat/completions>

Authorization: Bearer {GEMINI_API_KEY}

Content-Type: application/json

Body: {

model: "gemini-2.0-flash",

messages: \[ { role: "system", content: systemPrompt }, ...historial \],

tools: TOOL_DEFINITIONS,

tool_choice: "auto",

max_tokens: 2000,

temperature: 0.3

}

## **5.3 Lógica del Loop ReAct**

- Inicializar messages = \[systemMessage, { role: "user", content: query }\]
- Llamar a Gemini con messages + tools
- Si response.choices\[0\].finish_reason === "stop" y no hay tool_calls → salir del loop con la respuesta
- Si hay tool_calls → para cada tool_call: parsear arguments (JSON), ejecutar aiToolsService.execute(name, args), añadir { role: "tool", tool_call_id, content: JSON.stringify(result) } a messages
- Añadir el mensaje del asistente (con tool_calls) a messages
- Incrementar iteración. Si iteración >= MAX_ITERATIONS → forzar respuesta final pasando un user message adicional: "Resume con los datos obtenidos hasta ahora."
- Volver al paso 2

## **5.4 Manejo de Errores por Tool**

Cada tool debe capturar excepciones y retornar un objeto de error en lugar de lanzar. Esto permite que el agente continúe el razonamiento incluso si una herramienta falla:

try {

return await this.getWeatherForecast(args);

} catch (err) {

return { error: true, message: err.message, tool: toolName };

}

## **5.5 Control de Costos Gemini Flash**

| **Escenario**                              | **Tokens estimados**          | **Costo estimado USD** |
| ------------------------------------------ | ----------------------------- | ---------------------- |
| Consulta simple (1 tool, 1 iteración)      | ~5.000 input / ~500 output    | ~\$0.001               |
| Consulta media (3 tools, 3 iteraciones)    | ~15.000 input / ~1.000 output | ~\$0.004               |
| Consulta compleja (5 tools, 5 iteraciones) | ~35.000 input / ~1.500 output | ~\$0.008               |
| Umbral máximo configurado                  | 50.000 input                  | ~\$0.013               |
| Límite de alerta establecido (sistema)     | -                             | \$0.15 USD/consulta    |
| Límite del negocio (TNS)                   | -                             | \$0.20 USD/consulta    |

**Conclusión de costos**

El escenario más costoso realista (~\$0.013 USD) está 15x por debajo del límite de negocio de \$0.20 USD. El modelo Gemini 2.0 Flash es la opción óptima precio/rendimiento para este caso de uso.

# **6\. Especificación del Nuevo Endpoint**

## **POST /api/ia/consulta-avanzada**

### **Request**

| **Campo** | **Tipo** | **Requerido** | **Descripción**                                     |
| --------- | -------- | ------------- | --------------------------------------------------- |
| query     | string   | Sí            | Pregunta en lenguaje natural del usuario            |
| sessionId | string   | No            | ID de sesión previa para continuar el hilo de costo |

### **Response 200 OK**

{

"success": true,

"sessionId": "uuid-de-la-sesion",

"response": {

"summary": "Texto de respuesta en lenguaje natural (markdown)",

"toolsUsed": \["get_energy_history", "get_weather_forecast"\],

"iterations": 3

},

"cost": {

"queryCost": 0.0042,

"sessionTotal": 0.0042,

"inputTokens": 14200,

"outputTokens": 980,

"model": "gemini-2.0-flash"

},

"executionTime": 4821

}

### **Response 400 Bad Request**

{ "success": false, "error": "Bad Request", "message": "Query text is required" }

### **Response 403 Forbidden**

{ "success": false, "error": "Forbidden", "message": "AI Analysis permission required." }

### **Response 500 Internal Server Error**

{ "success": false, "error": "Internal Server Error", "message": "..." }

## **6.1 Autenticación y Permisos**

Idénticos al endpoint existente /api/ia/consulta:

- Requiere JWT válido via authMiddleware.authenticate
- Requiere permiso ai_analysis en el objeto user (o role=admin en desarrollo)
- El middleware requireAIPermission existente en ia_Routes.js aplica automáticamente

# **7\. Cambios en Base de Datos**

## **7.1 No se crean tablas nuevas**

El sistema de tracking de costos existente (ai_costos_sesion, ai_costos_query) se reutiliza. El campo modelo_utilizado ya acepta strings arbitrarios, por lo que "gemini-2.0-flash" se almacenará correctamente.

## **7.2 Configuración a Insertar**

Siguiendo el patrón existente de configuración en BD (gen*cofiguracion*\* o el mecanismo vigente en configLoader), se deben insertar los siguientes parámetros:

| **Clave (tipo_parametro.nombre)**  | **Valor por defecto**      | **Descripción**                                    |
| ---------------------------------- | -------------------------- | -------------------------------------------------- |
| Gemini_API.GEMINI_API_KEY          | \[PENDIENTE - equipo TNS\] | API Key de Google AI Studio                        |
| Gemini_API.GEMINI_MODEL            | gemini-2.0-flash           | Modelo a usar                                      |
| Gemini_API.GEMINI_MAX_TOKENS       | 2000                       | Tokens máx de respuesta por turno                  |
| Gemini_API.GEMINI_MAX_ITERATIONS   | 5                          | Iteraciones máx del loop agentic                   |
| Gemini_API.GEMINI_MAX_INPUT_TOKENS | 50000                      | Tokens input acumulados máx antes de forzar cierre |
| Gemini_API.GEMINI_COST_WARNING_USD | 0.15                       | Umbral de log de advertencia de costo              |

**Instrucción para el equipo TNS**

El valor de GEMINI_API_KEY debe obtenerse desde Google AI Studio (aistudio.google.com). Una vez obtenida, insertar en BD usando el mismo mecanismo que se usa para OPENAI_API_KEY. No incluir en ningún archivo versionado.

# **8\. Criterios de Aceptación**

## **8.1 Funcionales - Obligatorios**

| **#** | **Criterio**                                                                                          | **Cómo verificar**                                                         |
| ----- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| F1    | POST /api/ia/consulta-avanzada responde correctamente con una pregunta simple sobre consumo eléctrico | Curl/Postman con auth válido                                               |
| F2    | El agente usa mínimo 2 tools para la consulta de pronóstico energético con temperatura                | toolsUsed en la response incluye get_energy_history + get_weather_forecast |
| F3    | El loop no excede 5 iteraciones en ningún caso                                                        | iterations <= 5 en todas las pruebas                                       |
| F4    | El endpoint existente /api/ia/consulta sigue funcionando sin cambios                                  | Tests de regresión manuales                                                |
| F5    | Si Gemini_API.GEMINI_API_KEY no está configurada, el endpoint responde 503 con mensaje claro          | Prueba sin key en BD                                                       |
| F6    | El costo y tokens se registran en ai_costos_sesion/query igual que el flujo existente                 | Verificar registros en BD tras cada consulta                               |
| F7    | Las tools de clima (Open-Meteo) funcionan sin API key adicional                                       | Llamada directa a la tool desde test                                       |
| F8    | Si una tool falla, el agente continúa razonando e indica en su respuesta que no pudo obtener ese dato | Simular fallo de BD en una tool                                            |

## **8.2 No Funcionales**

| **#** | **Criterio**                                                 | **Umbral**                |
| ----- | ------------------------------------------------------------ | ------------------------- |
| NF1   | Tiempo de respuesta total (consulta compleja, 5 iteraciones) | < 30 segundos             |
| NF2   | Costo máximo por consulta en el 95% de los casos             | < \$0.05 USD              |
| NF3   | Timeout de Open-Meteo API                                    | 10 segundos               |
| NF4   | Timeout total del endpoint                                   | 60 segundos (Express)     |
| NF5   | Zona horaria de todos los datos                              | America/Santiago estricto |

# **9\. Dependencias, Orden de Implementación y Edge Cases**

## **9.1 Dependencias npm Nuevas**

El SDK de OpenAI ya instalado (openai ^6.8.1) es compatible con la API de Gemini en modo OpenAI-compatible. No se requieren nuevas dependencias npm. Se usa fetch nativo de Node.js 18+ para Open-Meteo.

**Verificación requerida**

Confirmar que el entorno usa Node.js 18+ (que incluye fetch nativo). Si la versión es anterior, añadir: npm install node-fetch@3 y ajustar los imports en aiTools_Service.js.

## **9.2 Orden de Implementación Recomendado**

- Insertar configuración Gemini en BD (sin API key aún - solo la estructura)
- Crear aiTools_Service.js con las 6 tools - testear cada tool de forma aislada contra la BD
- Crear aiAgentOrchestrator_Service.js - testear con API key de Gemini cuando esté disponible
- Modificar aiAnalysis_Controller.js - añadir método queryAvanzada()
- Modificar ia_Routes.js - registrar la nueva ruta
- Tests de integración end-to-end con preguntas reales
- Insertar GEMINI_API_KEY real en BD

## **9.3 Edge Cases a Manejar**

| **Edge Case**                                               | **Manejo esperado**                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Gemini no devuelve tool_calls ni respuesta de texto         | Reintentar una vez; si falla, responder error 500                                              |
| Open-Meteo no disponible (timeout)                          | Tool retorna { error: true, message: "Servicio de clima no disponible" }; el agente continúa   |
| BD sin datos para el rango pedido                           | Tool retorna array vacío con metadata del rango; el agente lo indica en su respuesta           |
| Pregunta en inglés                                          | El agente responde en español (instrucción en system prompt)                                   |
| Pregunta sin relación con el negocio ("cuéntame un chiste") | El agente responde educadamente que solo puede responder preguntas sobre energía y temperatura |
| Geocoding falla para la ciudad pedida                       | Fallback a coordenadas de Santiago. Log de advertencia.                                        |
| Loop llega a iteración 5 sin finish_reason=stop             | Inyectar mensaje "Resume con datos disponibles" y forzar respuesta final en turno 6            |
| Gemini pide una tool que no existe en el catálogo           | Retornar { error: true, message: "Tool no disponible" } y continuar                            |

# **10\. Instrucciones Específicas para Claude Code Desktop**

**Destinatario de este PRD**

Esta sección está dirigida directamente al agente Claude Code Desktop que implementará el sistema. Leer antes de escribir cualquier línea de código.

## **10.1 Convenciones del Proyecto (OBLIGATORIO respetar)**

- Nombres de archivos: PascalCase con guión bajo antes de \_Service, \_Controller, \_Routes: aiTools_Service.js
- No usar variables de entorno (.env) - toda configuración va en BD vía configLoader
- Zona horaria: siempre DateTime.now().setZone("America/Santiago") con Luxon
- Librería de fechas: solo Luxon - no importar moment, dayjs, ni date-fns
- Logging: usar console.log/error con prefijo \[NombreClase\] - ej: \[AIAgentOrchestrator\]
- Exports: module.exports = new MiClase() (singleton) - igual que todos los services existentes
- Manejo de errores: try/catch en todos los métodos públicos; nunca dejar promesas sin catch
- No hardcodear strings de configuración - siempre leer de configLoader.getConfig()

## **10.2 Patrón de configLoader a Seguir**

Observar cómo openai_Service.js carga su config en el método init() y replicar el mismo patrón para Gemini:

init() {

const config = configLoader.getConfig();

this.model = config.Gemini_API?.GEMINI_MODEL || "gemini-2.0-flash";

this.maxTokens = parseInt(config.Gemini_API?.GEMINI_MAX_TOKENS) || 2000;

this.maxIterations = parseInt(config.Gemini_API?.GEMINI_MAX_ITERATIONS) || 5;

const apiKey = config.Gemini_API?.GEMINI_API_KEY;

if (!apiKey) {

console.warn("\[AIAgentOrchestrator\] WARNING: GEMINI_API_KEY not set");

return;

}

this.client = new OpenAI({

apiKey,

baseURL: "<https://generativelanguage.googleapis.com/v1beta/openai>"

});

}

## **10.3 Archivos de Referencia Clave**

Antes de implementar, leer y comprender estos archivos existentes:

- servicios/src/services/openai_Service.js - patrón de cliente LLM y método de análisis
- servicios/src/services/aiData_Service.js - queries de BD de temperatura a reutilizar en Tool 6
- servicios/src/controllers/aiAnalysis_Controller.js - patrón de controller IA existente
- servicios/src/services/aiCostTracker_Service.js - cómo registrar sesiones y costos
- servicios/src/config/js_files/configLoader_Config.js - cómo cargar configuración de BD

## **10.4 Tests Mínimos a Ejecutar antes de Declarar Done**

- curl -X POST /api/ia/consulta-avanzada con pregunta simple → 200 OK con response.summary
- curl con pregunta de pronóstico energético → toolsUsed debe incluir get_energy_history y get_weather_forecast
- curl sin auth → 401
- curl con auth pero sin permiso ai_analysis → 403
- Verificar en BD que se creó registro en ai_costos_sesion con modelo="gemini-2.0-flash"
- Verificar que /api/ia/consulta (endpoint antiguo) sigue respondiendo correctamente

## **10.5 Lo Que NO Hacer**

- NO eliminar ni modificar el endpoint /api/ia/consulta existente
- NO crear variables de entorno GEMINI_API_KEY - va en BD
- NO instalar dependencias npm adicionales sin verificar primero si ya existe una equivalente
- NO usar axios para llamar a Open-Meteo - usar fetch nativo con AbortController para timeout
- NO retornar datos raw de BD sin agregar - máximo 180 días y siempre agrupado por día
- NO cambiar la estructura de ai_costos_sesion ni ai_costos_query existentes

# **11\. Resumen de Cambios - Checklist para Claude Code**

| **#** | **Archivo**                                           | **Acción** | **Descripción**                        |
| ----- | ----------------------------------------------------- | ---------- | -------------------------------------- |
| 1     | servicios/src/services/aiTools_Service.js             | CREAR      | 6 tools + dispatcher                   |
| 2     | servicios/src/services/aiAgentOrchestrator_Service.js | CREAR      | Loop ReAct + cliente Gemini            |
| 3     | servicios/src/controllers/aiAnalysis_Controller.js    | MODIFICAR  | Añadir método queryAvanzada()          |
| 4     | servicios/src/routes/ia_Routes.js                     | MODIFICAR  | Añadir ruta POST /consulta-avanzada    |
| 5     | Base de Datos - configuración Gemini_API              | MODIFICAR  | Insertar 6 parámetros de configuración |

**Estado final esperado**

Al completar la implementación, TNS Track contará con un agente IA autónomo (Gemini Flash) capaz de responder cualquier pregunta sobre energía y temperatura razonando dinámicamente qué datos necesita. El costo por consulta será inferior a \$0.02 USD en el 95% de los casos. El sistema coexiste con el módulo IA existente sin romper ninguna funcionalidad actual.