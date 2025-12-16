/**
 * @fileoverview useAlertActions Hook
 * @description Custom hook for managing alert actions (acknowledge, resolve, false alarm, observations)
 * @version 1.0.0
 * @module alerts/hooks/useAlertActions
 */

import { useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../constants/alertConstants";

/**
 * Custom hook for handling all alert actions
 * @param {string} alertId - The ID of the alert
 * @param {string} userEmail - Email of the current user
 * @param {Function} toast - Toast notification function
 * @param {Function} onSuccess - Callback after successful action
 * @returns {Object} Action handlers and state
 */
export const useAlertActions = (alertId, userEmail, toast, onSuccess) => {
  const [submitting, setSubmitting] = useState(false);

  /**
   * Marks the alert as acknowledged
   * @returns {Promise<boolean>} Success status
   */
  const handleAcknowledge = async () => {
    try {
      setSubmitting(true);
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(API_ENDPOINTS.acknowledgeAlert, {
        alertId,
        userId: userEmail,
        deviceInfo
      });

      if (response.data && response.data.success) {
        if (onSuccess) {
          onSuccess({
            status: "acknowledged",
            acknowledgedBy: userEmail,
            acknowledgedAt: new Date().toISOString()
          });
        }

        if (toast) {
          toast({
            title: "Éxito",
            description: "La alerta ha sido marcada como atendida",
            variant: "success"
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      if (toast) {
        toast({
          title: "Error",
          description: "No se pudo marcar la alerta como atendida",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Resolves the alert with optional notes
   * @param {string} resolutionNotes - Optional resolution notes
   * @returns {Promise<boolean>} Success status
   */
  const handleResolve = async (resolutionNotes = "") => {
    try {
      setSubmitting(true);
      const response = await axios.post(API_ENDPOINTS.resolveAlert, {
        alertId,
        userId: userEmail,
        resolutionNotes,
        resolvedAt: new Date().toISOString()
      });

      if (response.data && response.data.success) {
        if (onSuccess) {
          onSuccess({
            status: "resolved",
            resolvedBy: userEmail,
            resolvedAt: new Date().toISOString(),
            resolutionNotes
          });
        }

        if (toast) {
          toast({
            title: "Éxito",
            description: "La alerta ha sido resuelta",
            variant: "success"
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error resolving alert:", error);
      if (toast) {
        toast({
          title: "Error",
          description: "No se pudo resolver la alerta",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Marks the alert as false alarm
   * @returns {Promise<boolean>} Success status
   */
  const handleFalseAlarm = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post(API_ENDPOINTS.markFalseAlarm, {
        alertId,
        userId: userEmail,
        markedAt: new Date().toISOString()
      });

      if (response.data && response.data.success) {
        if (onSuccess) {
          onSuccess({
            status: "false_alarm",
            markedFalseBy: userEmail,
            markedFalseAt: new Date().toISOString()
          });
        }

        if (toast) {
          toast({
            title: "Éxito",
            description: "La alerta ha sido marcada como falsa alarma",
            variant: "success"
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error marking false alarm:", error);
      if (toast) {
        toast({
          title: "Error",
          description: "No se pudo marcar como falsa alarma",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Adds an observation to the alert
   * @param {string} observation - The observation text
   * @returns {Promise<Object|null>} The created observation or null
   */
  const handleAddObservation = async (observation) => {
    if (!observation || !observation.trim()) {
      if (toast) {
        toast({
          title: "Advertencia",
          description: "La observación no puede estar vacía",
          variant: "warning"
        });
      }
      return null;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(API_ENDPOINTS.addObservation, {
        alertId,
        userId: userEmail,
        observation,
        createdAt: new Date().toISOString()
      });

      if (response.data && response.data.success) {
        const newObservation = {
          id: Date.now(),
          text: observation,
          userId: userEmail,
          createdAt: new Date().toISOString()
        };

        if (onSuccess) {
          onSuccess({ newObservation });
        }

        if (toast) {
          toast({
            title: "Éxito",
            description: "La observación ha sido agregada",
            variant: "success"
          });
        }
        return newObservation;
      }
      return null;
    } catch (error) {
      console.error("Error adding observation:", error);
      if (toast) {
        toast({
          title: "Error",
          description: "No se pudo agregar la observación",
          variant: "destructive"
        });
      }
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    handleAcknowledge,
    handleResolve,
    handleFalseAlarm,
    handleAddObservation
  };
};
