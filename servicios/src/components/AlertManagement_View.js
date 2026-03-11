/**
 * @fileoverview AlertManagementV2 - Gestión de Alertas Push (Refactored)
 * @description Pantalla de detalle y gestión de una alerta específica con acciones rápidas
 * @version 4.0.0 - Refactored with improved modularity and maintainability
 * @module AlertManagementV2
 */

import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DateTime } from "luxon";

// UI Components
import HeaderV2 from "./Header_View";
import AlertHistoryTable from "./AlertHistoryTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";

// Icons
import {
  FileText,
  List,
  Info,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  TrendingUp,
  MoreHorizontal,
  Gauge
} from "lucide-react";

// Alert Module Imports
import {
  ALERT_STATUS_MAP,
  ALERT_TYPE_MAP,
  ANIMATION_VARIANTS,
  DEFAULT_VALUES
} from "./alerts/constants/alertConstants";
import { useAlertDetail, useAlertActions } from "./alerts/hooks";
import { formatDateTime, formatRelativeTime, getElapsedTime } from "./alerts/utils/alertUtils";
import {
  InfoCard,
  AlertDetailSkeleton,
  ObservationTimeline,
  AlertActions
} from "./alerts/components";

// Hooks
import { useToast } from "../hooks/useToast_Hook";
import { cn } from "../lib/utils";

/**
 * Componente principal de gestión de alertas (refactored)
 * @returns {JSX.Element} AlertManagementV2 component
 */
const AlertManagementV2 = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // URL parameters
  const alertId = searchParams.get("alertId");
  const channelId = searchParams.get("channelId");
  const alertType = searchParams.get("type") || "temperature";

  // Tab state
  const [activeTab, setActiveTab] = useState(alertId ? "detail" : "history");

  // User email
  const userEmail = localStorage.getItem("userEmail") || DEFAULT_VALUES.defaultUserEmail;

  // Custom hooks
  const { alert, loading, updateAlertState } = useAlertDetail(alertId, toast);

  const {
    submitting,
    handleAcknowledge,
    handleResolve,
    handleFalseAlarm,
    handleAddObservation
  } = useAlertActions(alertId, userEmail, toast, (updates) => {
    // Handle observation addition differently
    if (updates.newObservation) {
      updateAlertState({
        observations: [...(alert?.observations || []), updates.newObservation]
      });
    } else {
      updateAlertState(updates);
    }
  });

  /**
   * Handles alert selection from history table
   * @param {string} selectedAlertId - The ID of the selected alert
   */
  const handleSelectAlert = (selectedAlertId) => {
    console.log(`[AlertManagementV2] Selecting alert from history: ${selectedAlertId}`);
    setSearchParams({ alertId: selectedAlertId });
    setActiveTab("detail");
  };

  // Pending alerts count for badge (would come from API in production)
  const pendingAlertsCount = 0;

  // Loading state for detail tab
  const isLoadingDetail = loading && alertId;

  // Extract alert information
  const alertStatus = alert ? (ALERT_STATUS_MAP[alert.status] || ALERT_STATUS_MAP.pending) : null;
  const alertTypeInfo = alert ? (ALERT_TYPE_MAP[alert.type] || ALERT_TYPE_MAP.temperature) : null;
  const AlertIcon = alertTypeInfo?.icon;
  const StatusIcon = alertStatus?.icon;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900"
      >
        <HeaderV2 title="Gestión de Alertas" />

        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Enhanced Tabs System */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-16 p-2 gap-3 bg-gradient-to-r from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900/80 dark:via-blue-950/50 dark:to-slate-900/80 backdrop-blur-sm shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl">
                <TabsTrigger
                  value="detail"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-transparent transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:border-blue-400 data-[state=active]:shadow-2xl data-[state=active]:shadow-blue-500/50 data-[state=active]:scale-105
                  data-[state=inactive]:bg-white/60 dark:data-[state=inactive]:bg-slate-800/60 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400
                  hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg hover:scale-102 hover:border-blue-300 dark:hover:border-blue-700"
                >
                  <FileText className="h-5 w-5" />
                  <span className="hidden sm:inline font-semibold">Detalle de Alerta</span>
                  <span className="sm:hidden font-semibold">Detalle</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-transparent transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:border-purple-400 data-[state=active]:shadow-2xl data-[state=active]:shadow-purple-500/50 data-[state=active]:scale-105
                  data-[state=inactive]:bg-white/60 dark:data-[state=inactive]:bg-slate-800/60 data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400
                  hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg hover:scale-102 hover:border-purple-300 dark:hover:border-purple-700"
                >
                  <List className="h-5 w-5" />
                  <span className="hidden sm:inline font-semibold">Historial Completo</span>
                  <span className="sm:hidden font-semibold">Historial</span>
                  {pendingAlertsCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs shadow-lg">
                      {pendingAlertsCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Enhanced Detail Tab */}
              <TabsContent value="detail" className="mt-6 space-y-6">
                <AnimatePresence mode="wait">
                  {isLoadingDetail ? (
                    <motion.div
                      key="skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <AlertDetailSkeleton />
                    </motion.div>
                  ) : !alert && alertId ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Alert variant="destructive" className="shadow-lg">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          No se encontró la alerta solicitada. Por favor, verifica el ID o selecciona otra alerta del historial.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  ) : !alertId ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Alert className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle>Información</AlertTitle>
                        <AlertDescription>
                          Selecciona una alerta del historial para ver sus detalles completos y gestionar su estado.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      variants={ANIMATION_VARIANTS.staggerChildren}
                      initial="initial"
                      animate="animate"
                      className="space-y-6"
                    >
                      {/* Enhanced Main Alert Card */}
                      <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                        <Card className={cn(
                          "overflow-hidden shadow-xl border-2 transition-all duration-300",
                          alertStatus.borderColor
                        )}>
                          <CardHeader className={cn("relative pb-6", alertStatus.bgColor)}>
                            {/* Animated background pattern */}
                            <div className="absolute inset-0 opacity-10">
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent animate-pulse" />
                            </div>

                            <div className="relative">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                  <motion.div
                                    initial={{ rotate: -180, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                    className={cn("p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-lg", alertTypeInfo.color)}
                                  >
                                    <AlertIcon className="h-6 w-6" />
                                  </motion.div>
                                  <div className="space-y-1">
                                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                                      Alerta de {alertTypeInfo.label}
                                    </CardTitle>
                                    <CardDescription className="text-base">
                                      ID #{alert.id || alertId} • {formatRelativeTime(alert.createdAt)}
                                    </CardDescription>
                                    <div className="flex items-center gap-2 mt-3">
                                      <StatusIcon className={cn("h-5 w-5", alertStatus.color)} />
                                      <Badge
                                        variant={alertStatus.variant}
                                        className="text-sm px-3 py-1 shadow-sm"
                                      >
                                        {alertStatus.label}
                                      </Badge>
                                      {alert.severity && (
                                        <Badge
                                          variant={alert.severity === "high" ? "destructive" : "warning"}
                                          className="text-sm px-3 py-1 shadow-sm"
                                        >
                                          <Gauge className="h-3 w-3 mr-1" />
                                          Severidad {alert.severity === "high" ? "Alta" : "Media"}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-white/50 dark:hover:bg-slate-700/50">
                                      <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Más opciones</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-6">
                            <motion.div
                              variants={ANIMATION_VARIANTS.staggerChildren}
                              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                              <InfoCard
                                icon={MapPin}
                                label="Sensor"
                                value={alert.channelName || alert.sensorName || "N/A"}
                                color="text-blue-600"
                              />
                              <InfoCard
                                icon={Calendar}
                                label="Fecha/Hora"
                                value={formatDateTime(alert.createdAt)}
                                color="text-green-600"
                              />
                              <InfoCard
                                icon={Clock}
                                label="Tiempo Transcurrido"
                                value={getElapsedTime(alert.createdAt)}
                                color="text-orange-600"
                              />
                            </motion.div>

                            {alert.type === "temperature" && (
                              <motion.div
                                variants={ANIMATION_VARIANTS.fadeInUp}
                                className="mt-6 p-6 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200 dark:border-red-800"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                      Temperatura Actual
                                    </p>
                                    <p className="text-4xl font-bold text-red-600">
                                      {alert.currentValue || "N/A"}°C
                                    </p>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                      Rango Permitido
                                    </p>
                                    <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                                      {alert.minThreshold || "N/A"}°C - {alert.maxThreshold || "N/A"}°C
                                    </p>
                                  </div>
                                  <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full"
                                  >
                                    <TrendingUp className="h-8 w-8 text-red-600" />
                                  </motion.div>
                                </div>
                              </motion.div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Alert Actions Component */}
                      <AlertActions
                        alert={alert}
                        submitting={submitting}
                        onAcknowledge={handleAcknowledge}
                        onResolve={handleResolve}
                        onFalseAlarm={handleFalseAlarm}
                        onAddObservation={handleAddObservation}
                      />

                      {/* Observation Timeline Component */}
                      <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                        <ObservationTimeline alert={alert} userEmail={userEmail} />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Enhanced History Tab */}
              <TabsContent value="history" className="mt-6 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <AlertHistoryTable onSelectAlert={handleSelectAlert} />
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

export default AlertManagementV2;
