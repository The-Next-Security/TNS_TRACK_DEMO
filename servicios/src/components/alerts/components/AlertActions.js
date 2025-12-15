/**
 * @fileoverview AlertActions Component
 * @description Action buttons and dialogs for alert management
 * @version 1.0.0
 * @module alerts/components/AlertActions
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  CheckCheck,
  Shield,
  XCircle,
  Send,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { cn } from "../../../lib/utils";
import { ANIMATION_VARIANTS, DEFAULT_VALUES } from "../constants/alertConstants";

/**
 * AlertActions - Quick action buttons and observation form
 * @param {Object} props - Component props
 * @param {Object} props.alert - Alert object
 * @param {boolean} props.submitting - Whether an action is in progress
 * @param {Function} props.onAcknowledge - Acknowledge handler
 * @param {Function} props.onResolve - Resolve handler
 * @param {Function} props.onFalseAlarm - False alarm handler
 * @param {Function} props.onAddObservation - Add observation handler
 * @returns {JSX.Element} AlertActions component
 */
export const AlertActions = ({
  alert,
  submitting,
  onAcknowledge,
  onResolve,
  onFalseAlarm,
  onAddObservation
}) => {
  const [observation, setObservation] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showFalseAlarmDialog, setShowFalseAlarmDialog] = useState(false);

  const handleResolveClick = async () => {
    const success = await onResolve(resolutionNotes);
    if (success) {
      setShowResolveDialog(false);
      setResolutionNotes("");
    }
  };

  const handleFalseAlarmClick = async () => {
    const success = await onFalseAlarm();
    if (success) {
      setShowFalseAlarmDialog(false);
    }
  };

  const handleAddObservationClick = async () => {
    const newObs = await onAddObservation(observation);
    if (newObs) {
      setObservation("");
    }
  };

  const isPending = alert.status === "pending" || alert.status === "acknowledged";
  const isFinalState = alert.status === "resolved" || alert.status === "false_alarm";

  return (
    <>
      {/* Quick Actions Card */}
      {isPending && (
        <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
          <Card className="shadow-lg border-2 border-blue-100 dark:border-blue-900">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Acciones Rápidas
              </CardTitle>
              <CardDescription>
                Gestiona el estado de esta alerta
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onAcknowledge}
                      disabled={submitting || alert.status === "acknowledged"}
                      variant={alert.status === "acknowledged" ? "secondary" : "default"}
                      className={cn(
                        "flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200",
                        alert.status === "acknowledged" && "opacity-60"
                      )}
                    >
                      {alert.status === "acknowledged" ? (
                        <CheckCheck className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      {alert.status === "acknowledged" ? "Atendida" : "Atender"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{alert.status === "acknowledged" ? "Esta alerta ya fue atendida" : "Atender esta alerta"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setShowResolveDialog(true)}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Shield className="h-4 w-4" />
                      Resuelta
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Marca esta alerta como resuelta</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={() => setShowFalseAlarmDialog(true)}
                      disabled={submitting}
                      className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <XCircle className="h-4 w-4" />
                      Falsa Alarma
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Marca como falsa alarma</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Final State Alert */}
      {isFinalState && (
        <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
          <Alert className="shadow-lg border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CheckCheck className="h-5 w-5 text-green-600" />
            <AlertTitle>Estado Final</AlertTitle>
            <AlertDescription className="text-base">
              Esta alerta ya ha sido {alert.status === "resolved" ? "resuelta" : "procesada"} y no requiere más acciones.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Add Observation Card */}
      <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              Agregar Observación
            </CardTitle>
            <CardDescription>
              Documenta información adicional sobre esta alerta
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Textarea
                placeholder="Escriba aquí sus observaciones sobre esta alerta..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={4}
                className="w-full resize-none pr-16 focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                disabled={submitting}
                maxLength={DEFAULT_VALUES.observationMaxLength}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {observation.length}/{DEFAULT_VALUES.observationMaxLength}
              </div>
            </div>
            <Button
              onClick={handleAddObservationClick}
              disabled={submitting || !observation.trim()}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Send className="h-4 w-4 mr-2" />
              Guardar Observación
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Resolve Dialog */}
      <AlertDialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Resolver Alerta
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea marcar esta alerta como resuelta?
              Puede agregar notas opcionales sobre la resolución.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Textarea
              placeholder="Notas de resolución (opcional)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
              className="w-full focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolveClick}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Resolver Alerta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* False Alarm Dialog */}
      <AlertDialog open={showFalseAlarmDialog} onOpenChange={setShowFalseAlarmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Marcar como Falsa Alarma
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea marcar esta alerta como falsa alarma?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFalseAlarmClick}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Falsa Alarma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
