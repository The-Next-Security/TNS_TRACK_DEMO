/**
 * @fileoverview AI Analysis V2 - Análisis Inteligente de Cámaras de Frío
 * @description Componente principal para análisis de datos históricos usando IA
 * @feature 005-ai-cold-chamber-analysis
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import HeaderV2 from "./Header_View";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription } from "./ui/alert";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";
import {
  Brain,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Thermometer,
  Sparkles,
  Wrench,
  DollarSign,
  RotateCw,
  Copy,
  Check,
  ShieldAlert
} from "lucide-react";

/**
 * Componente principal de AI Analysis
 */
const AIAnalysisV2 = ({ userPermissions = [] }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [chambers, setChambers] = useState([]);
  const [selectedChambers, setSelectedChambers] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loadingChambers, setLoadingChambers] = useState(true);
  const [copied, setCopied] = useState(false);

  // Cargar cámaras al montar
  useEffect(() => {
    fetchChambers();
  }, []);

  /**
   * Obtiene cámaras disponibles desde el API
   */
  const fetchChambers = async () => {
    try {
      setLoadingChambers(true);
      const _tok = localStorage.getItem('accessToken');
      const response = await fetch('/api/ia/camaras', {
        headers: _tok ? { Authorization: `Bearer ${_tok}` } : {}
      });

      if (!response.ok) {
        throw new Error('Error al obtener cámaras');
      }

      const data = await response.json();
      
      if (data.success && data.chambers) {
        setChambers(data.chambers);
        // Preseleccionar las primeras 3 cámaras por defecto
        if (data.chambers.length > 0) {
          setSelectedChambers(data.chambers.slice(0, 3).map(c => c.id));
        }
      }
    } catch (err) {
      console.error('[AIAnalysis] Error cargando cámaras:', err);
    } finally {
      setLoadingChambers(false);
    }
  };


  /**
   * Ejecuta una consulta de análisis
   */
  const handleQuery = async (queryText = null, customChambers = null, customDateRange = null) => {
    const finalQuery = queryText || query;
    const finalChambers = customChambers || selectedChambers;
    
    if (!finalQuery.trim()) {
      setError('Por favor ingresa una pregunta');
      return;
    }

    if (finalChambers.length === 0) {
      setError('Por favor selecciona al menos una cámara');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Endpoint agéntico con contexto de cámaras seleccionadas (id + nombre)
      const selectedChamberInfo = chambers
        .filter(c => finalChambers.includes(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          ubicacionId: c.ubicacionId,
          shellyId: c.shellyId || null
        }));

      const requestBody = {
        query: finalQuery,
        chambers: finalChambers,
        chamberInfo: selectedChamberInfo
      };

      console.log('[AIAnalysis] Enviando query avanzada:', requestBody);

      const _tok2 = localStorage.getItem('accessToken');
      const response = await fetch('/api/ia/consulta-avanzada', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(_tok2 ? { Authorization: `Bearer ${_tok2}` } : {})
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al ejecutar análisis');
      }

      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.response);
        setSessionInfo({
          sessionId: data.sessionId,
          cost: data.cost,
          executionTime: data.executionTime
        });
      }
    } catch (err) {
      console.error('[AIAnalysis] Error en query:', err);
      setError(err.message || 'Error al ejecutar análisis');
    } finally {
      setLoading(false);
    }
  };


  /**
   * Maneja selección/deselección de cámaras
   */
  const toggleChamber = (chamberId) => {
    setSelectedChambers(prev => 
      prev.includes(chamberId)
        ? prev.filter(id => id !== chamberId)
        : [...prev, chamberId]
    );
  };

  /**
   * Selecciona todas las cámaras
   */
  const selectAllChambers = () => {
    setSelectedChambers(chambers.map(c => c.id));
  };

  /**
   * Deselecciona todas las cámaras
   */
  const clearChambers = () => {
    setSelectedChambers([]);
  };

  /**
   * Copia el markdown crudo al clipboard
   */
  const handleCopyMarkdown = async () => {
    const markdownText = typeof analysis === 'object' && analysis?.summary
      ? analysis.summary
      : typeof analysis === 'string' ? analysis : '';

    if (!markdownText) return;

    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[AIAnalysis] Error copiando markdown:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <HeaderV2 userPermissions={userPermissions} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-[#6B9FD4]" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Análisis AI Cámaras
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Analiza datos históricos de temperatura con inteligencia artificial
          </p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}


        {/* Política de uso */}
        <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Política de uso:</strong> Este módulo es exclusivamente para análisis de temperaturas de cámaras de frío, reefers y consumo eléctrico. Las consultas fuera de este ámbito no serán procesadas.
          </p>
        </div>

        {/* Chamber Selection - Diseño mejorado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Thermometer className="w-6 h-6 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">
                      Seleccionar Cámaras
                    </span>
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {selectedChambers.length} seleccionadas
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2 text-gray-700 dark:text-gray-300">
                    Selecciona las cámaras que deseas incluir en el análisis
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllChambers}
                    disabled={loadingChambers || loading}
                    className="border-blue-300 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-950"
                  >
                    ✓ Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChambers}
                    disabled={loadingChambers || loading}
                    className="border-blue-300 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-950"
                  >
                    ✗ Ninguna
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingChambers ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : chambers.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No hay cámaras con datos disponibles. Verifica la conexión con los sensores.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[400px] overflow-y-auto pr-2">
                  {chambers.map((chamber) => {
                    const isSelected = selectedChambers.includes(chamber.id);
                    return (
                      <motion.div
                        key={chamber.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          onClick={() => !loading && toggleChamber(chamber.id)}
                          className={cn(
                            "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                            "hover:shadow-lg",
                            isSelected
                              ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 shadow-md"
                              : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-800",
                            loading && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {/* Checkbox absoluto en esquina */}
                          <div className="absolute top-3 right-3">
                            <Checkbox
                              id={`chamber-${chamber.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleChamber(chamber.id)}
                              disabled={loading}
                              className={cn(
                                "border-2",
                                isSelected && "border-blue-500"
                              )}
                            />
                          </div>

                          {/* Contenido del card */}
                          <div className="pr-8">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                isSelected 
                                  ? "bg-gradient-to-br from-blue-400 to-cyan-400" 
                                  : "bg-gray-200 dark:bg-gray-700"
                              )}>
                                <Thermometer className={cn(
                                  "w-5 h-5",
                                  isSelected ? "text-white" : "text-gray-600 dark:text-gray-400"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                  "font-semibold text-sm truncate",
                                  isSelected 
                                    ? "text-blue-700 dark:text-blue-300" 
                                    : "text-gray-900 dark:text-gray-100"
                                )}>
                                  {chamber.name}
                                </h4>
                                {chamber.groupName && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {chamber.groupName}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between">
                              <Badge 
                                variant={isSelected ? "default" : "secondary"} 
                                className={cn(
                                  "text-xs",
                                  isSelected && "bg-blue-500 hover:bg-blue-600"
                                )}
                              >
                                {chamber.daysWithData} días
                              </Badge>
                              {chamber.thresholdMin && chamber.thresholdMax && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {chamber.thresholdMin}° a {chamber.thresholdMax}°
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Query Input - Diseño tipo chat mejorado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="mb-6 border-2 border-green-200 dark:border-green-800 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
                  Haz tu Consulta
                </span>
              </CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300">
                Escribe tu pregunta sobre los datos históricos de temperatura
              </CardDescription>
            </CardHeader>
            
            {/* Área de chat con fondo diferenciado */}
            <div className="bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/50 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30 p-6">
              <div className="space-y-4">
                {/* Caja de texto con diseño tipo chat */}
                <div className="relative">
                  <Textarea
                    placeholder="Ejemplo: ¿Qué cámaras tuvieron problemas de temperatura esta semana? ¿Cuál fue el patrón de temperaturas en la última semana?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey && !loading && query.trim() && selectedChambers.length > 0) {
                        handleQuery();
                      }
                    }}
                    className={cn(
                      "min-h-[120px] pr-12 resize-none",
                      "bg-white dark:bg-gray-900",
                      "border-2 border-green-200 dark:border-green-700",
                      "focus:border-green-400 dark:focus:border-green-500",
                      "focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800",
                      "rounded-2xl shadow-sm",
                      "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                      "transition-all duration-200"
                    )}
                    disabled={loading}
                  />
                  
                  {/* Indicador de caracteres */}
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500">
                    {query.length} caracteres
                  </div>
                </div>

                {/* Botones y mensajes de ayuda */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleQuery()}
                      disabled={loading || !query.trim() || selectedChambers.length === 0}
                      size="lg"
                      className={cn(
                        "bg-gradient-to-r from-green-500 to-emerald-500",
                        "hover:from-green-600 hover:to-emerald-600",
                        "text-white font-semibold shadow-lg",
                        "transition-all duration-200",
                        "disabled:from-gray-400 disabled:to-gray-500"
                      )}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analizando con IA...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Analizar con IA
                        </>
                      )}
                    </Button>

                    {!loading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                        o presiona Ctrl + Enter
                      </span>
                    )}
                  </div>

                  {/* Mensajes de estado */}
                  <div className="flex items-center gap-2">
                    {selectedChambers.length === 0 && (
                      <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                        ⚠️ Selecciona cámaras primero
                      </Badge>
                    )}
                    {selectedChambers.length > 0 && !loading && (
                      <Badge variant="outline" className="border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
                        ✓ {selectedChambers.length} cámara{selectedChambers.length !== 1 ? 's' : ''} lista{selectedChambers.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {loading && (
                      <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 animate-pulse">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Procesando...
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tip de ayuda */}
                {!loading && query.length === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-green-100/50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-300">
                      <strong>Tip:</strong> Puedes preguntar sobre patrones de temperatura, brechas, comparaciones entre cámaras, tendencias y más. ¡Sé específico para mejores resultados!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Analysis Results */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Resultado del Análisis
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMarkdown}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar Markdown
                        </>
                      )}
                    </Button>
                    {sessionInfo && sessionInfo.executionTime && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{sessionInfo.executionTime}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              {/* Agent metadata: tools, iterations, cost */}
              {sessionInfo && (
                <div className="px-6 pb-3 flex flex-wrap gap-2">
                  {analysis?.toolsUsed && analysis.toolsUsed.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Wrench className="w-3 h-3" />
                      {analysis.toolsUsed.length} fuente{analysis.toolsUsed.length > 1 ? 's' : ''} consultada{analysis.toolsUsed.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {analysis?.iterations && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <RotateCw className="w-3 h-3" />
                      {analysis.iterations} iteracion{analysis.iterations > 1 ? 'es' : ''}
                    </Badge>
                  )}
                  {sessionInfo.cost && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <DollarSign className="w-3 h-3" />
                      ${sessionInfo.cost.queryCost} USD
                    </Badge>
                  )}
                  {sessionInfo.cost && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Brain className="w-3 h-3" />
                      {sessionInfo.cost.inputTokens + sessionInfo.cost.outputTokens} tokens
                    </Badge>
                  )}
                </div>
              )}
              <CardContent>
                <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 prose-headings:text-blue-700 dark:prose-headings:text-blue-400 prose-h2:border-b prose-h2:border-blue-200 dark:prose-h2:border-blue-800 prose-h2:pb-2 prose-h2:mb-4 prose-h3:text-blue-600 dark:prose-h3:text-blue-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-table:border-collapse prose-th:bg-blue-50 dark:prose-th:bg-blue-950 prose-th:border prose-th:border-blue-200 dark:prose-th:border-blue-800 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-td:px-3 prose-td:py-2 prose-hr:border-blue-200 dark:prose-hr:border-blue-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {typeof analysis === 'object' && analysis !== null && analysis.summary
                      ? analysis.summary
                      : typeof analysis === 'string'
                        ? analysis
                        : 'Sin respuesta del modelo de IA. Por favor, intenta con una pregunta más específica.'}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Back Button */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => navigate("/select-routine")}
            className="bg-[#6B9FD4] hover:bg-[#5A8DC4] text-white"
          >
            Volver
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisV2;

