/**
 * @fileoverview AlertHistoryTable - Tabla de Historial de Alertas (Refactored)
 * @description Componente de tabla para mostrar historial completo de alertas con filtros
 * @version 3.0.0 - Refactored with improved modularity and maintainability
 * @module AlertHistoryTable
 */

import React from "react";
import { DateTime } from "luxon";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Separator } from "./ui/separator";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// Icons
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Activity,
  AlertCircle,
  RefreshCw,
  Download,
  MessageSquare,
  Hash,
  ChevronDown,
  Database,
  BarChart,
  Sparkles,
  Zap,
  Clock,
  AlertTriangle,
  CheckCheck
} from "lucide-react";

// Alert Module Imports
import {
  ALERT_STATUS_MAP,
  ALERT_TYPE_MAP,
  ANIMATION_VARIANTS,
  DATE_RANGE_OPTIONS
} from "./alerts/constants/alertConstants";
import { useAlertList, useAlertFilters } from "./alerts/hooks";
import {
  formatDate,
  formatRelativeTime,
  formatResponseTime,
  parseObservationCount,
  getLatestObservationPreview
} from "./alerts/utils/alertUtils";
import {
  StatCard,
  ActiveFilters,
  EmptyState,
  TableSkeleton
} from "./alerts/components";

// Utils
import { cn } from "../lib/utils";

/**
 * Componente principal de tabla de historial (refactored)
 * @param {Object} props - Component props
 * @param {Function} props.onSelectAlert - Callback when an alert is selected
 * @returns {JSX.Element} AlertHistoryTable component
 */
const AlertHistoryTable = ({ onSelectAlert }) => {
  // Alert list hook
  const {
    alerts,
    loading,
    error,
    isRefreshing,
    stats,
    uniqueSensors,
    handleRefresh
  } = useAlertList("week", "all", "all");

  // Filter hooks - pass alerts from useAlertList
  const {
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    sensorFilter,
    setSensorFilter,
    dateRangeFilter,
    setDateRangeFilter,
    alertIdSearch,
    setAlertIdSearch,
    filteredAlerts,
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    currentAlerts,
    activeFilters,
    clearAllFilters
  } = useAlertFilters(alerts);

  /**
   * Handles row click
   * @param {string} alertId - The ID of the alert
   */
  const handleRowClick = (alertId) => {
    if (onSelectAlert) {
      onSelectAlert(alertId);
    }
  };

  return (
    <TooltipProvider>
      <motion.div
        initial="initial"
        animate="animate"
        variants={ANIMATION_VARIANTS.staggerChildren}
        className="space-y-6"
      >
        {/* Statistics Cards */}
        <motion.div
          variants={ANIMATION_VARIANTS.slideInUp}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            icon={AlertTriangle}
            label="Total Alertas"
            value={stats.total}
            color="text-gray-700"
          />
          <StatCard
            icon={AlertCircle}
            label="Pendientes"
            value={stats.pending}
            trend={10}
            color="text-red-600"
          />
          <StatCard
            icon={CheckCheck}
            label="Resueltas"
            value={stats.resolved}
            trend={-5}
            color="text-emerald-600"
          />
          <StatCard
            icon={Clock}
            label="Tiempo Promedio"
            value={formatResponseTime(stats.avgResponseTime)}
            color="text-blue-600"
          />
        </motion.div>

        {/* Enhanced Filters */}
        <motion.div variants={ANIMATION_VARIANTS.slideInUp}>
          <Card className="shadow-lg border-2 border-gray-100 dark:border-gray-800">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Filtros Avanzados
                  </CardTitle>
                  <CardDescription>
                    Encuentra rápidamente las alertas que necesitas
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                      >
                        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                        <span className="hidden sm:inline">Actualizar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Actualizar datos</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Exportar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Exportar a CSV</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Enhanced Period Filter */}
                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                  <SelectTrigger className="focus:ring-2 focus:ring-purple-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Período" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Hoy
                      </div>
                    </SelectItem>
                    <SelectItem value="week">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Última semana
                      </div>
                    </SelectItem>
                    <SelectItem value="month">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        Último mes
                      </div>
                    </SelectItem>
                    <SelectItem value="quarter">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        Último trimestre
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Enhanced Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="focus:ring-2 focus:ring-purple-500">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Estado" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <Separator className="my-1" />
                    {Object.entries(ALERT_STATUS_MAP).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <value.icon className={cn("h-4 w-4", value.color)} />
                          {value.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Enhanced Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="focus:ring-2 focus:ring-purple-500">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Tipo" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <Separator className="my-1" />
                    {Object.entries(ALERT_TYPE_MAP).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <value.icon className={cn("h-4 w-4", value.color)} />
                          {value.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Enhanced Sensor Filter */}
                <Select value={sensorFilter} onValueChange={setSensorFilter}>
                  <SelectTrigger className="focus:ring-2 focus:ring-purple-500">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-gray-500" />
                      <SelectValue placeholder="Sensor" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        Todos los sensores
                      </div>
                    </SelectItem>
                    <Separator className="my-1" />
                    {uniqueSensors.map((sensor) => (
                      <SelectItem key={sensor} value={sensor}>
                        <div className="flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-blue-600" />
                          {sensor}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Enhanced Alert ID Search */}
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Núm. alerta"
                    value={alertIdSearch}
                    onChange={(e) => setAlertIdSearch(e.target.value)}
                    className="pl-10 pr-10 focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  {alertIdSearch && (
                    <button
                      onClick={() => setAlertIdSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-1 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              <AnimatePresence>
                {activeFilters.length > 0 && (
                  <ActiveFilters
                    filters={activeFilters}
                    onClear={clearAllFilters}
                  />
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Table */}
        <motion.div variants={ANIMATION_VARIANTS.slideInUp}>
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-blue-600" />
                    Historial de Alertas
                  </CardTitle>
                  <CardDescription>
                    {filteredAlerts.length} alertas encontradas
                  </CardDescription>
                </div>
                {filteredAlerts.length > 0 && (
                  <div className="text-sm text-muted-foreground bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">
                    {startIndex + 1}-{Math.min(endIndex, filteredAlerts.length)} de {filteredAlerts.length}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    variants={ANIMATION_VARIANTS.fadeIn}
                    className="p-6"
                  >
                    <TableSkeleton />
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="error"
                    variants={ANIMATION_VARIANTS.fadeIn}
                    className="p-6"
                  >
                    <Alert variant="destructive" className="shadow-md">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                ) : filteredAlerts.length === 0 ? (
                  <motion.div
                    key="empty"
                    variants={ANIMATION_VARIANTS.fadeIn}
                    className="p-6"
                  >
                    <EmptyState
                      message={
                        activeFilters.length > 0
                          ? "No se encontraron alertas con los filtros seleccionados. Intenta ajustar los criterios de búsqueda."
                          : "No hay alertas registradas en el período seleccionado."
                      }
                      icon={activeFilters.length > 0 ? Search : Database}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="content" variants={ANIMATION_VARIANTS.fadeIn}>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <ScrollArea className="w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-50/50">
                              <TableHead className="font-semibold">ID</TableHead>
                              <TableHead className="font-semibold">Fecha/Hora</TableHead>
                              <TableHead className="font-semibold">Sensor</TableHead>
                              <TableHead className="font-semibold">Tipo</TableHead>
                              <TableHead className="font-semibold">Estado</TableHead>
                              <TableHead className="text-center font-semibold">Observaciones</TableHead>
                              <TableHead className="text-center font-semibold">T. Respuesta</TableHead>
                              <TableHead className="text-center font-semibold">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {currentAlerts.map((alert, index) => {
                                const statusInfo = ALERT_STATUS_MAP[alert.status] || ALERT_STATUS_MAP.pending;
                                const typeInfo = ALERT_TYPE_MAP[alert.alertType] || ALERT_TYPE_MAP.temperature;
                                const TypeIcon = typeInfo.icon;
                                const obsCount = parseObservationCount(alert.observations);
                                const obsPreview = getLatestObservationPreview(alert.observations);

                                return (
                                  <motion.tr
                                    key={alert.alertId}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={cn(
                                      "cursor-pointer transition-all duration-200",
                                      "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50",
                                      "dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20"
                                    )}
                                    onClick={() => handleRowClick(alert.alertId)}
                                  >
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Hash className="h-3 w-3 text-gray-400" />
                                        {alert.alertId}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="space-y-0.5">
                                            <p className="text-sm font-medium">{formatDate(alert.alertTimestamp)}</p>
                                            <p className="text-xs text-muted-foreground">{formatRelativeTime(alert.alertTimestamp)}</p>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{DateTime.fromISO(alert.alertTimestamp).setZone('America/Santiago').toFormat('cccc, d LLLL yyyy HH:mm')}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium text-sm">{alert.channelName}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-md", typeInfo.bgColor)}>
                                          <TypeIcon className={cn("h-4 w-4", typeInfo.color)} />
                                        </div>
                                        <span className="text-sm font-medium">{typeInfo.label}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={statusInfo.variant}
                                        className="gap-1 shadow-sm"
                                      >
                                        <statusInfo.icon className="h-3 w-3" />
                                        {statusInfo.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {obsPreview ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                                              <span className="text-xs font-medium">{obsPreview}</span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{obsCount} observación{obsCount > 1 ? 'es' : ''} - Click para ver detalles</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="text-sm font-medium">
                                        {formatResponseTime(alert.responseTimeMinutes)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRowClick(alert.alertId);
                                            }}
                                            className="hover:bg-blue-100 dark:hover:bg-blue-950/30 hover:text-blue-600 transition-colors"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Ver detalles</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TableCell>
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden p-4 space-y-3">
                      <AnimatePresence>
                        {currentAlerts.map((alert, index) => {
                          const statusInfo = ALERT_STATUS_MAP[alert.status] || ALERT_STATUS_MAP.pending;
                          const typeInfo = ALERT_TYPE_MAP[alert.alertType] || ALERT_TYPE_MAP.temperature;
                          const TypeIcon = typeInfo.icon;
                          const obsCount = parseObservationCount(alert.observations);
                          const obsPreview = getLatestObservationPreview(alert.observations);

                          return (
                            <motion.div
                              key={alert.alertId}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.05 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Card
                                className={cn(
                                  "cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden",
                                  "border-l-4",
                                  statusInfo.borderColor
                                )}
                                onClick={() => handleRowClick(alert.alertId)}
                              >
                                <CardContent className="p-4 space-y-3">
                                  {/* Header */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("p-2 rounded-lg", typeInfo.bgColor)}>
                                        <TypeIcon className={cn("h-5 w-5", typeInfo.color)} />
                                      </div>
                                      <div>
                                        <p className="font-semibold flex items-center gap-1">
                                          <Hash className="h-3 w-3" />
                                          {alert.alertId}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {typeInfo.label}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant={statusInfo.variant} className="shadow-sm">
                                      {statusInfo.label}
                                    </Badge>
                                  </div>

                                  {/* Content */}
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">{alert.channelName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(alert.alertTimestamp)} • {formatRelativeTime(alert.alertTimestamp)}
                                    </p>
                                  </div>

                                  {/* Footer */}
                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex flex-col gap-2 flex-1">
                                      {obsPreview && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                          <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                                          <span className="text-xs font-medium">{obsPreview}</span>
                                        </div>
                                      )}
                                      {alert.responseTimeMinutes && (
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <Clock className="h-3.5 w-3.5" />
                                          <span className="text-xs font-medium">
                                            {formatResponseTime(alert.responseTimeMinutes)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <Button variant="ghost" size="sm" className="gap-1">
                                      Ver más
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Enhanced Pagination */}
                    {totalPages > 1 && (
                      <div className="p-4 border-t bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center justify-between">
                          <div className="hidden sm:block text-sm text-muted-foreground">
                            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredAlerts.length)} de {filteredAlerts.length} registros
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              className="hidden sm:flex"
                            >
                              Primera
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">Anterior</span>
                            </Button>

                            <div className="flex items-center gap-1">
                              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                let pageNumber;
                                if (totalPages <= 5) {
                                  pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNumber = totalPages - 4 + i;
                                } else {
                                  pageNumber = currentPage - 2 + i;
                                }

                                return (
                                  <Button
                                    key={i}
                                    variant={currentPage === pageNumber ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNumber)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {pageNumber}
                                  </Button>
                                );
                              })}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              <span className="hidden sm:inline mr-1">Siguiente</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                              className="hidden sm:flex"
                            >
                              Última
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
};

export default AlertHistoryTable;
