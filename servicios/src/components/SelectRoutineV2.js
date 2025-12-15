// SelectRoutineV2.js - Migrated to Shadcn/UI with Tailwind CSS - Sprint 3 Complete
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jwt from "jsonwebtoken";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import Header from "./HeaderV2";
import analyticsService from "../services/analyticsService";
// import SideNav from "./SideNavV2"; // Oculto temporalmente

// Import all routine images - preserving exact imports from original
import dashboardImage from "../assets/images/dashboard.png";
import temperaturaImage from "../assets/images/temperatura.png";
import ubicaciontiemporealinteriorImage from "../assets/images/ubicaciontiemporealinterior.png";
import personSearchImage from "../assets/images/person_search.png";
import interiorLocationsImage from "../assets/images/plano_super.png";
import historicalMovementsImage from "../assets/images/historical_movements1.png";
import dataIntelligenceImage from "../assets/images/data_intelligence.png";
import configurationImage from "../assets/images/configuration.png";
import presenciaImage from "../assets/images/presencia.png";
import smsDataImage from "../assets/images/sms_data.png";
import doorStatusImage from "../assets/images/door_status.png";
import userRegistrationImage from "../assets/images/user_registration.png";
import thermometerImage from "../assets/images/thermometer.png";
import detectionImage from "../assets/images/detection.png";
import dashboardTemperaturaImage from "../assets/images/dashboard_temperatura.png";
import dashboard_push from "../assets/images/dashboard_push.png";
import setting_push from "../assets/images/setting_push.png";
import notification_manager from "../assets/images/notification_manager.png";
import descargadatostemp from "../assets/images/descargadatostemp.png";
import paramTempIcon from "../assets/images/param_temp.png";
import frostIcon from "../assets/images/frost.png";
import thermo_electricImage from "../assets/images/thermo_electric.png";
import dashboard_electricImage from "../assets/images/dashboarelectrcio.png";
import reportsImage from "../assets/images/data_intelligence.png";
import consumototaldiario_electricImage from "../assets/images/consumototaldiario.png";
import consumoelectrico_electricImage from "../assets/images/consumoelectrico.png";
import consumototalmes_electricImage from "../assets/images/consumototalmes.png";
import consumototalano_electricImage from "../assets/images/consumototalano.png";
import aiAnalysisImage from "../assets/images/data_intelligence.png"; // Using data_intelligence for AI Analysis

// Skeleton Card Component para loading states
const SkeletonCard = () => (
  <Card className={cn(
    "cursor-default overflow-hidden",
    "flex flex-col items-center justify-between",
    "w-full mx-auto",
    "min-h-[180px] sm:min-h-[200px] md:min-h-[320px] lg:min-h-[350px]",
    "bg-white/80 dark:bg-gray-800/80 backdrop-blur-md",
    "border border-white/20 dark:border-gray-700/30",
    "rounded-2xl shadow-xl animate-pulse"
  )}>
    <div className="flex items-center justify-center p-1.5 md:p-6 flex-shrink-0 w-full">
      <div className="bg-gray-200 dark:bg-gray-600 rounded-lg h-[60px] sm:h-20 md:h-[180px] w-full" />
    </div>
    <CardContent className="flex-1 flex flex-col items-center justify-center text-center w-full p-2 md:p-4 gap-1.5 md:gap-2.5">
      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
    </CardContent>
    <CardFooter className="flex justify-center w-full p-1.5 md:p-4">
      <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded w-full max-w-[200px]" />
    </CardFooter>
  </Card>
);

// Preserving exact routines array from original with all commented and active routines
// Función auxiliar para obtener gradientes por categoría
const getCategoryGradient = (title) => {
  const lowerTitle = title.toLowerCase();

  // Categoría Temperatura
  if (lowerTitle.includes('temperatura') || lowerTitle.includes('temp')) {
    return 'from-blue-50 to-cyan-50';
  }

  // Categoría KW/Eléctrico
  if (lowerTitle.includes('kw') || lowerTitle.includes('eléctrico') || lowerTitle.includes('electrico') || lowerTitle.includes('consumo')) {
    return 'from-amber-50 to-orange-50';
  }

  // Categoría Alertas/Notificaciones
  if (lowerTitle.includes('alertas') || lowerTitle.includes('notificaciones')) {
    return 'from-purple-50 to-pink-50';
  }

  // Categoría Reportes
  if (lowerTitle.includes('reportes') || lowerTitle.includes('informes')) {
    return 'from-green-50 to-emerald-50';
  }

  // Otros/Default
  return 'from-gray-50 to-slate-50';
};

// Función auxiliar para obtener etiquetas de categoría
const getCategoryLabel = (title) => {
  if (title.includes("Temperatura")) return "Temperatura";
  if (title.includes("KW") || title.includes("Gráfico KW")) return "Energía";
  if (title.includes("Alertas") || title.includes("Notificaciones")) return "Alertas";
  if (title.includes("Reportes") || title.includes("Informes")) return "Reportes";
  return "General";
};

// Función auxiliar para gradientes de badges
const getCategoryBadgeGradient = (title) => {
  if (title.includes("Temperatura")) return "from-[#6B9FD4] to-cyan-500";
  if (title.includes("KW") || title.includes("Gráfico KW")) return "from-amber-500 to-orange-500";
  if (title.includes("Alertas") || title.includes("Notificaciones")) return "from-purple-500 to-pink-500";
  if (title.includes("Reportes") || title.includes("Informes")) return "from-green-500 to-emerald-500";
  return "from-gray-500 to-slate-500";
};

// Función auxiliar para descripciones de las rutinas
const getDescriptionText = (title) => {
  const descriptions = {
    "Display Temperatura Cámaras": "Monitoreo en tiempo real de temperaturas",
    "Gráficos Temperatura Cámaras": "Visualización histórica y tendencias",
    "Gráfico Temperaturas vs KW": "Análisis de correlación energética",
    "📊 Monitor de Alertas": "Dashboard de métricas y estadísticas",
    "🔔 Gestión de Alertas": "Atender y resolver alertas activas",
    "⚙️ Config. Notificaciones": "Configurar horarios y preferencias",
    "Gráfico KW por Cámara": "Consumo eléctrico por unidad",
    "Gráfico KW por Dia": "Análisis diario de consumo",
    "Gráfico KW por Mes": "Tendencias mensuales de energía",
    "Gráfico KW por Año": "Patrones anuales de consumo",
    "Consulta Temperatura x Fecha": "Búsqueda histórica de datos",
    "Parámetros Temperatura Cámaras": "Configuración de alertas y límites",
    "📄 Reportes Temperatura": "Generar informes ejecutivos en PDF",
    "🤖 Análisis AI Cámaras": "Análisis inteligente con IA de datos históricos",
  };
  return descriptions[title] || "Explorar funcionalidad";
};

const routines = [
  //  { title: "Dashboard", image: dashboardImage, route: "/dashboard", permission: "view_dashboard" },
  //  { title: "Intrusiones Blind Spot", image: detectionImage, route: "/blind-spot-intrusions", permission: "view_blind_spot_intrusions" },
  //
  //  { title: "Sectores Presencia Personal", image: presenciaImage, route: "/presencia", permission: "view_presence" },
  //  { title: "Mensajes SOS Visualización por Ubicación", image: smsDataImage, route: "/sms-data", permission: "view_sms" },
  //  { title: "Temperatura", image: temperaturaImage, route: "/temperatura", permission: "view_temperature" },
  {
    title: "Display Temperatura Cámaras",
    image: dashboardTemperaturaImage,
    route: "/dashboard-temperatura",
    permission: "view_temperature_dashboard",
  },
  {
    title: "Gráficos Temperatura Cámaras",
    image: thermometerImage,
    route: "/temperatura-camaras",
    permission: "view_temperature_camaras",
  },
  {
    title: "Gráfico Temperaturas vs KW",
    image: thermo_electricImage,
    route: "/analisis-temperatura-potencia",
    permission: "view_temperature_data_intelligence",
  },
  {
    title: "📄 Reportes Temperatura",
    image: reportsImage,
    route: "/reports",
    permission: "view_temperature_reports",
  },
  {
    title: "🤖 Análisis AI Cámaras",
    image: aiAnalysisImage,
    route: "/ai-analysis",
    permission: "ai_analysis", // Special permission check
  },
  // Nuevas rutinas de Alertas
  {
    title: "📊 Monitor de Alertas",
    image: dashboard_push, // Placeholder
    route: "/metricas-alertas",
    permission: "view_alerts",
  },
  {
    title: "🔔 Gestión de Alertas",
    image: notification_manager, // Placeholder
    route: "/gestion-alertas",
    permission: "manage_alerts",
  },
  {
    title: "Display KW Cámaras",
    image: dashboard_electricImage,
    route: "/dashboard-electrico",
    permission: "view_temperature_data_intelligence",
  },

/*
 {
    title: "Puertas Status Cierre / Apertura",
    image: doorStatusImage,
    route: "/door-status-matrix",
    permission: "view_door_status",
  },*/
  //  { title: "Datos Análisis Forense", image: dataIntelligenceImage, route: "/inteligencia-de-datos", permission: "view_data_intelligence" },
  //  { title: "Parametrización", image: configurationImage, route: "/configuracion", permission: "view_configuration" },

  /*
  {
    title: "Interior Ubicación en Tiempo Real",
    image: ubicaciontiemporealinteriorImage,
    route: "/ubicaciones-interior",
    permission: "view_interior",
  },
  {
    title: "Interior Búsqueda Histórica Ubicación",
    image: personSearchImage,
    route: "/busqueda-entradas-persona",
    permission: "search_interior",
  },
  {
    title: "Exterior Ubicación Tiempo Real",
    image: interiorLocationsImage,
    route: "/last-known-position",
    permission: "view_exterior",
  },
  {
    title: "Exterior Búsqueda Histórica Ubicación",
    image: historicalMovementsImage,
    route: "/consulta-historica-movimientos",
    permission: "search_exterior",
  },

  {
    title: "Análisis de Deshielo",
    image: frostIcon,
    route: "/analisis-deshielo",
    permission: "view_defrost_analysis",
  } */,


  {
    title: "Gráfico KW por Cámara",
    image: consumoelectrico_electricImage,
    route: "/consumo-electrico",
    permission: "view_temperature_data_intelligence",
  },
  {
    title: "Gráfico KW por Dia",
    image: consumototaldiario_electricImage,
    route: "/consumo-total-diario",
    permission: "view_temperature_data_intelligence",
  },
  {
    title: "Gráfico KW por Mes",
    image: consumototalmes_electricImage,
    route: "/consumo-total-mensual",
    permission: "view_temperature_data_intelligence",
  },
  {
    title: "Gráfico KW por Año",
    image: consumototalano_electricImage,
    route: "/consumo-total-anual",
    permission: "view_temperature_data_intelligence",
  },
  {
    title: "Consulta Temperatura x Fecha",
    image: descargadatostemp,
    route: "/inteligencia-datos-temperatura",
    permission: "view_temperature_data_intelligence",
  },
  {
    title: "⚙️ Config. Alertas",
    image: setting_push, // Placeholder
    route: "/configuracion-notificaciones",
    permission: "config_notifications",
  },
  {
    title: "Parámetros Temperatura Cámaras",
    image: paramTempIcon,
    route: "/parametro-temp-camaras",
    permission: "view_temp_params",
  },
  {
    title: "Registrar Usuario",
    image: userRegistrationImage,
    route: "/register-user",
    permission: "create_users",
  }
];

const SelectRoutineV2 = () => {
  const navigate = useNavigate();
  const [userPermissions, setUserPermissions] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ✅ Obtener permisos desde el endpoint de validación (usando cookies httpOnly)
    fetch('/api/auth/validate', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) {
          // Handle permissions (string or array)
          const perms = data.user.permissions 
            ? (typeof data.user.permissions === 'string'
                ? data.user.permissions.split(",")
                : data.user.permissions)
            : [];
          
          // Add ai_analysis as a permission if user has it
          const hasAIAnalysis = data.user.ai_analysis === true || data.user.ai_analysis === 1 || data.user.ai_analysis === '1';
          
          if (hasAIAnalysis && !perms.includes('ai_analysis')) {
            perms.push('ai_analysis');
          }
          
          setUserPermissions(perms);
        } else {
          setUserPermissions([]);
        }
      })
      .catch(error => {
        console.error("[SelectRoutine] ❌ Error al obtener permisos:", error);
        setUserPermissions([]);
      });


    // Detectar si es un dispositivo móvil - exactly as original
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Verificar inicialmente
    checkMobile();

    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkMobile);

    // Simular loading para mostrar skeletons
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // 800ms para dar tiempo a ver el skeleton

    // Limpiar el listener cuando el componente se desmonte
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);

  // Preserve exact handleCardClick logic from original
  const handleCardClick = (routine) => {
    if (userPermissions.includes(routine.permission)) {
      // 🆕 ANALYTICS: Trackear selección de routine
      try {
        analyticsService.trackRoutineAccess(routine.title, routine.route);
      } catch (error) {
        console.error('[Analytics] Error tracking routine:', error);
      }

      navigate(routine.route, {
        state: { title: routine.title, image: routine.image },
      });
    } else {
      alert("No tienes permiso para acceder a esta rutina");
    }
  };

  // Preserve exact formatTitle logic from original
  const formatTitle = (title) => {
    // Versiones abreviadas para móviles - exact mapping from original
    if (isMobile) {
      const shortTitles = {
        "Dashboard de Temperatura": "Dash Temp",
        "Temperaturas Cámaras de Frío": "Cámaras Frío",
        "Análisis de Temperatura y Potencia": "Temp/Potencia",
        "Dashboard Electrico": "Dash Eléctrico",
        "Inteligencia de Datos Temperatura": "Intel. Datos",
        "Consumo Electrico": "Consumo Eléc.",
        "Consumo Total por Dia": "Consumo Día",
        "Consumo Total por Mes": "Consumo Mes",
        "Consumo Total por Año": "Consumo Año",
        "Parámetros Temperatura Cámaras": "Param. Temp",
        "🤖 Análisis AI Cámaras": "AI Análisis"
      };

      return <span className="inline-block">{shortTitles[title] || title}</span>;
    }

    // Versión para escritorio (manteniendo el comportamiento original)
    const parts = title.split(":");
    if (parts.length > 1) {
      return (
        <>
          <span className="block">{parts[0].trim()}</span>
          <span className="block">{parts[1].trim()}</span>
        </>
      );
    }
    return <span className="inline-block">{title}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "min-h-screen w-full relative p-5 md:p-5",
        "bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100",
        "dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900"
      )}
    >
      {/* Patrón de grid sutil con soporte dark mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Contenido - envolver en div con z-10 */}
      <div className="relative z-10">
        <Header title="Dashboard TNS Track" className="text-white" />
        {/* <SideNav userPermissions={userPermissions} /> */}

        {/* Main content - removed SideNav margin */}
        <div className={cn(
          "transition-all duration-300",
          "pt-4"
        )}>
          {/* Grid of routine cards - responsive grid optimizado para 1920x1080 */}
          <div className={cn(
            "grid w-full",
            "gap-3 sm:gap-4 md:gap-5 lg:gap-6", // Gaps reducidos
            "p-4 sm:p-5 md:p-6 lg:p-6", // Padding reducido
            // Grid columns optimizado para mostrar todas las apps:
            "grid-cols-2", // Móvil: 2 columnas
            "sm:grid-cols-3", // Tablet pequeño: 3 columnas
            "md:grid-cols-3", // Tablet: 3 columnas
            "lg:grid-cols-4", // Desktop: 4 columnas
            "xl:grid-cols-5" // Desktop XL (1920+): 5 columnas para 9 items = 2 filas completas
          )}>
          {isLoading ? (
            // Mostrar 8 skeleton cards mientras carga
            Array(8).fill(0).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <SkeletonCard />
              </motion.div>
            ))
          ) : (
            // Cards reales
            routines.map((routine, index) => (
              <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.05, // Stagger effect
                ease: "easeOut"
              }}
              whileHover={{
                scale: 1.03,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                onClick={() => handleCardClick(routine)}
                className={cn(
                  "group cursor-pointer overflow-hidden relative",
                  "flex flex-col",
                  "w-full mx-auto",
                  // Height responsive MÁS COMPACTO para 1920x1080
                  "min-h-[200px]",
                  "sm:min-h-[220px]",
                  "md:min-h-[230px]",
                  "lg:min-h-[240px]",
                  "xl:min-h-[245px]", // Más pequeño en pantallas grandes
                  // Modern card style
                  "bg-white dark:bg-gray-800",
                  "border border-gray-200/60 dark:border-gray-700/60",
                  "shadow-md hover:shadow-xl",
                  "hover:shadow-[#6B9FD4]/25",
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-1",
                  "rounded-xl"
                )}
              >
                {/* Header con ícono y badge */}
                <div className="relative p-3 pb-2 lg:p-4 lg:pb-2">
                  {/* Ícono centrado y MÁS PEQUEÑO */}
                  <div className="flex items-center justify-center mb-2">
                    <div className={cn(
                      "relative rounded-lg p-2 lg:p-2.5",
                      "bg-gradient-to-br",
                      routine.title.includes("Temperatura")
                        ? "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
                        : routine.title.includes("Alertas") || routine.title.includes("Notificaciones")
                        ? "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
                        : routine.title.includes("Reportes") || routine.title.includes("Informes")
                        ? "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                        : "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
                      "ring-1",
                      routine.title.includes("Temperatura")
                        ? "ring-blue-200/50 dark:ring-blue-500/20"
                        : routine.title.includes("Alertas") || routine.title.includes("Notificaciones")
                        ? "ring-purple-200/50 dark:ring-purple-500/20"
                        : routine.title.includes("Reportes") || routine.title.includes("Informes")
                        ? "ring-green-200/50 dark:ring-green-500/20"
                        : "ring-amber-200/50 dark:ring-amber-500/20",
                      "group-hover:ring-2",
                      "group-hover:ring-[#6B9FD4]/50",
                      "transition-all duration-300"
                    )}>
                      <img
                        src={routine.image}
                        alt={routine.title}
                        className={cn(
                          "object-contain",
                          "group-hover:scale-110 transition-transform duration-300",
                          "h-[40px] w-[40px]",
                          "sm:h-[48px] sm:w-[48px]",
                          "md:h-[52px] md:w-[52px]",
                          "lg:h-[56px] lg:w-[56px]",
                          "drop-shadow-sm"
                        )}
                      />
                    </div>
                  </div>

                  {/* Badge inferior izquierda */}
                  <div className="absolute bottom-1 left-2">
                    <span className={cn(
                      "inline-flex items-center gap-1",
                      "px-2 py-0.5 text-[9px] font-medium rounded",
                      "bg-gradient-to-r",
                      getCategoryBadgeGradient(routine.title),
                      "text-white",
                      "shadow-sm"
                    )}>
                      <span className="w-1 h-1 rounded-full bg-white/80" />
                      {getCategoryLabel(routine.title)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <CardContent className={cn(
                  "flex-1 flex flex-col px-3 pt-1 pb-2 lg:px-4 lg:pt-2 lg:pb-3",
                  "gap-1"
                )}>
                  <h3 className={cn(
                    "font-semibold text-center leading-tight",
                    "text-xs sm:text-sm md:text-sm lg:text-base",
                    "text-gray-800 dark:text-gray-100",
                    "group-hover:text-[#6B9FD4]",
                    "transition-colors duration-300"
                  )}>
                    {formatTitle(routine.title)}
                  </h3>

                  {/* Descripción siempre visible */}
                  <p className={cn(
                    "text-[10px] lg:text-xs text-gray-500 dark:text-gray-400",
                    "text-center leading-tight",
                    "line-clamp-2"
                  )}>
                    {getDescriptionText(routine.title)}
                  </p>
                </CardContent>

                {/* Footer con botón */}
                <CardFooter className="px-3 pb-3 pt-0 lg:px-4 lg:pb-4">
                  <Button
                    variant="default"
                    size="sm"
                    className={cn(
                      "w-full relative overflow-hidden group/button",
                      "bg-[#6B9FD4] hover:bg-[#5A8DC4]",
                      "text-white font-medium text-[10px] sm:text-xs",
                      "shadow-sm hover:shadow-md",
                      "transition-all duration-200",
                      "h-7 lg:h-8"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(routine);
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      Abrir
                      <svg className="w-3 h-3 group-hover/button:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))
          )}
          </div>

        {/* Back button - preserving exact functionality */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => navigate("/")}
            className={cn(
              "bg-[#6B9FD4] hover:bg-[#5A8DC4] text-white",
              "dark:bg-[#6B9FD4] dark:hover:bg-[#5A8DC4]",
              "shadow-md shadow-[#6B9FD4]/30 hover:shadow-lg hover:shadow-[#6B9FD4]/40",
              "transition-all duration-300",
              // Responsive sizing matching CSS media queries
              "px-4 py-2 text-sm",
              "md:px-6 md:py-2.5 md:text-base"
            )}
          >
            Volver a la Página Principal
          </Button>
        </div>
      </div>
    </div>
  </motion.div>
  );
};

export default SelectRoutineV2;