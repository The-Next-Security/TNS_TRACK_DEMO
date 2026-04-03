-- ==============================================================================
-- ARCHIVO    : 05_actualizacion_openai_a_gemini_api.sql
-- PROPÓSITO  : Migrar el módulo de análisis AI de OpenAI/DeepSeek a Google Gemini.
--              Renombra el grupo y parámetros existentes, actualiza los valores
--              de API key y modelo, e inserta los 3 nuevos parámetros del loop
--              agentic (ReAct) requeridos por el orquestador IA (issue #70).
-- ISSUE      : #70 - Arquitectura, deuda técnica y mejoras del módulo de análisis IA
-- FECHA      : 2026-03-23
-- BD         : tns_cool_track
-- AUTOR      : Equipo TNS
-- ALCANCE    : SOLO bases de datos que AÚN tienen el grupo y rutas OpenAI_API
--              (instalación antigua). Si creaste la BD con 04_inserts_base.sql
--              ya actualizado (Gemini_API + 9 parámetros), NO ejecutes este script:
--              aplicaría 0 filas en UPDATEs y el BLOQUE 4 fallaría por UNIQUE en
--              ruta_completa. En instalación nueva: tras 01–04, ejecutar en local
--              04_valores_reales.sql (gitignored) para la API key y secretos.
-- PRECONDICIÓN: La BD debe tener ejecutados los archivos 01 al 04 **antiguos**
--              (con grupo OpenAI_API) antes de migrar.
-- PRECONDICIÓN: Reemplazar [CONFIGURAR_GEMINI_API_KEY] con la API Key real antes
--              de ejecutar en cada entorno (dev/producción), o dejar placeholder
--              y fijar la clave con 04_valores_reales.sql.
-- ==============================================================================

-- ==============================================================================
-- BLOQUE 1: Renombrar el grupo de configuración de OpenAI_API a Gemini_API
-- Afecta: gen_cofiguracion_grupos (1 fila, id=16)
-- Riesgo: Bajo — solo modifica nombre y descripción del grupo
-- ==============================================================================

UPDATE gen_cofiguracion_grupos
SET nombre      = 'Gemini_API',
    descripcion = 'Configuración de la API de Google Gemini para módulo de análisis AI'
WHERE nombre = 'OpenAI_API';

-- ==============================================================================
-- BLOQUE 2: Renombrar los 6 parámetros existentes del grupo
-- Afecta: gen_cofiguracion_parametros (6 filas, ids 68,79,80,81,82,83)
-- Riesgo: Medio — actualiza ruta_completa (campo UNIQUE) y ruta_padre
-- Nota: OPENAI_API_KEY → GEMINI_API_KEY
--       OPENAI_MODEL   → GEMINI_MODEL
--       OPENAI_MAX_TOKENS → GEMINI_MAX_TOKENS
--       Los 3 restantes mantienen su nombre_parametro, solo cambian de grupo
-- ==============================================================================

-- id=68: Clave de API
UPDATE gen_cofiguracion_parametros
SET ruta_completa    = 'Gemini_API.GEMINI_API_KEY',
    nombre_parametro = 'GEMINI_API_KEY',
    ruta_padre       = 'Gemini_API',
    descripcion      = 'API Key de Google Gemini para módulo de análisis AI'
WHERE ruta_completa = 'OpenAI_API.OPENAI_API_KEY';

-- id=79: Modelo
UPDATE gen_cofiguracion_parametros
SET ruta_completa    = 'Gemini_API.GEMINI_MODEL',
    nombre_parametro = 'GEMINI_MODEL',
    ruta_padre       = 'Gemini_API'
WHERE ruta_completa = 'OpenAI_API.OPENAI_MODEL';

-- id=80: Máximo de tokens de respuesta
UPDATE gen_cofiguracion_parametros
SET ruta_completa    = 'Gemini_API.GEMINI_MAX_TOKENS',
    nombre_parametro = 'GEMINI_MAX_TOKENS',
    ruta_padre       = 'Gemini_API'
WHERE ruta_completa = 'OpenAI_API.OPENAI_MAX_TOKENS';

-- id=82: Umbral de alerta de costo (mantiene nombre_parametro)
UPDATE gen_cofiguracion_parametros
SET ruta_completa = 'Gemini_API.AI_COST_ALERT_THRESHOLD',
    ruta_padre    = 'Gemini_API'
WHERE ruta_completa = 'OpenAI_API.AI_COST_ALERT_THRESHOLD';

-- id=81: Timeout de sesión (mantiene nombre_parametro)
UPDATE gen_cofiguracion_parametros
SET ruta_completa = 'Gemini_API.AI_SESSION_TIMEOUT_MINUTES',
    ruta_padre    = 'Gemini_API'
WHERE ruta_completa = 'OpenAI_API.AI_SESSION_TIMEOUT_MINUTES';

-- id=83: Flag de habilitación del módulo (mantiene nombre_parametro)
UPDATE gen_cofiguracion_parametros
SET ruta_completa = 'Gemini_API.ENABLE_AI_ANALYSIS',
    ruta_padre    = 'Gemini_API'
WHERE ruta_completa = 'OpenAI_API.ENABLE_AI_ANALYSIS';

-- ==============================================================================
-- BLOQUE 3: Actualizar los valores activos para API Key, modelo y max_tokens
-- Afecta: gen_cofiguracion_valores (3 filas)
-- Riesgo: Medio — sobreescribe valores anteriores (sk-... y deepseek-chat se pierden)
-- ⚠️  IMPORTANTE: Reemplazar [CONFIGURAR_GEMINI_API_KEY] con la API Key real
--     antes de ejecutar. No commitear este archivo con la key real.
-- ==============================================================================

UPDATE gen_cofiguracion_valores v
JOIN   gen_cofiguracion_parametros p ON v.id_cofiguracion_parametros = p.id_cofiguracion_parametros
SET    v.valor = '[CONFIGURAR_GEMINI_API_KEY]'
WHERE  p.ruta_completa = 'Gemini_API.GEMINI_API_KEY';

UPDATE gen_cofiguracion_valores v
JOIN   gen_cofiguracion_parametros p ON v.id_cofiguracion_parametros = p.id_cofiguracion_parametros
SET    v.valor = 'gemini-pro-latest'
WHERE  p.ruta_completa = 'Gemini_API.GEMINI_MODEL';

UPDATE gen_cofiguracion_valores v
JOIN   gen_cofiguracion_parametros p ON v.id_cofiguracion_parametros = p.id_cofiguracion_parametros
SET    v.valor = '16384'
WHERE  p.ruta_completa = 'Gemini_API.GEMINI_MAX_TOKENS';

-- ==============================================================================
-- BLOQUE 4: Insertar 3 nuevos parámetros del loop agentic (ReAct)
-- Afecta: gen_cofiguracion_parametros (INSERT 3 filas nuevas)
--         gen_cofiguracion_valores    (INSERT 3 filas con valor_default)
-- Riesgo: Medio — INSERT; fallará con error de UNIQUE KEY si ya fueron insertados
-- Tipos : id_tipo_parametro=7 (ENTERO) y 6 (DECIMAL)
-- ==============================================================================

-- Obtener id del grupo Gemini_API (resultado del bloque 1 = id 16)
SET @gid = (SELECT id_cofiguracion_grupos FROM gen_cofiguracion_grupos WHERE nombre = 'Gemini_API' LIMIT 1);

INSERT INTO gen_cofiguracion_parametros
  (id_cofiguracion_grupos, id_tipo_parametro, ruta_completa,
   nombre_parametro, nivel_anidacion, ruta_padre, es_sensible,
   descripcion, valor_default, es_requerido, activo)
VALUES
  -- Iteraciones máximas del loop ReAct antes de forzar cierre
  (@gid, 7, 'Gemini_API.GEMINI_MAX_ITERATIONS',
   'GEMINI_MAX_ITERATIONS', 2, 'Gemini_API', 0,
   'Iteraciones máximas del loop agentic ReAct', '5', 0, 1),

  -- Tokens de input acumulados máximos (anti-runaway cost)
  (@gid, 7, 'Gemini_API.GEMINI_MAX_INPUT_TOKENS',
   'GEMINI_MAX_INPUT_TOKENS', 2, 'Gemini_API', 0,
   'Tokens input acumulados máx antes de forzar cierre del agente', '50000', 0, 1),

  -- Umbral de advertencia de costo por consulta en USD
  (@gid, 6, 'Gemini_API.GEMINI_COST_WARNING_USD',
   'GEMINI_COST_WARNING_USD', 2, 'Gemini_API', 0,
   'Umbral de advertencia de costo por consulta en USD', '0.15', 0, 1);

-- Insertar los valores iniciales tomando el valor_default de cada parámetro nuevo
INSERT INTO gen_cofiguracion_valores (id_cofiguracion_parametros, valor, version, activo)
SELECT p.id_cofiguracion_parametros, p.valor_default, 1, 1
FROM   gen_cofiguracion_parametros p
WHERE  p.ruta_completa IN (
  'Gemini_API.GEMINI_MAX_ITERATIONS',
  'Gemini_API.GEMINI_MAX_INPUT_TOKENS',
  'Gemini_API.GEMINI_COST_WARNING_USD'
);

-- ==============================================================================
-- BLOQUE 5: Verificación final — debe retornar 9 filas
-- ==============================================================================

SELECT p.ruta_completa, v.valor, p.id_tipo_parametro
FROM   gen_cofiguracion_parametros p
JOIN   gen_cofiguracion_valores    v ON p.id_cofiguracion_parametros = v.id_cofiguracion_parametros
WHERE  p.ruta_completa LIKE 'Gemini_API%'
  AND  p.activo = 1
  AND  v.activo = 1
ORDER BY p.id_cofiguracion_parametros;

-- ==============================================================================
-- VERIFICACIÓN OPCIONAL: no deben quedar referencias OpenAI en configuración
-- Nota: en gen_cofiguracion_grupos la columna se llama `nombre`, NO `nombre_grupo`.
-- ==============================================================================
-- SELECT * FROM gen_cofiguracion_parametros WHERE ruta_completa LIKE '%OpenAI%';
-- SELECT * FROM gen_cofiguracion_grupos WHERE nombre LIKE '%OpenAI%';
