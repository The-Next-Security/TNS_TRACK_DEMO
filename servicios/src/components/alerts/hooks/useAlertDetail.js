/**
 * @fileoverview useAlertDetail Hook
 * @description Custom hook for managing alert detail state and API operations
 * @version 1.0.0
 * @module alerts/hooks/useAlertDetail
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../constants/alertConstants";

/**
 * Custom hook for managing alert detail data and operations
 * @param {string} alertId - The ID of the alert to fetch
 * @param {Function} toast - Toast notification function
 * @returns {Object} Alert state and operations
 * @property {Object|null} alert - Alert data object
 * @property {boolean} loading - Loading state
 * @property {Function} fetchAlertDetail - Function to fetch alert details
 * @property {Function} updateAlertState - Function to update local alert state
 */
export const useAlertDetail = (alertId, toast) => {
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * Fetches alert details from API
   */
  const fetchAlertDetail = useCallback(async () => {
    if (!alertId) {
      setAlert(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`[useAlertDetail] Fetching alert details for alertId: ${alertId}`);
      const response = await axios.get(API_ENDPOINTS.getAlertDetail(alertId));
      console.log(`[useAlertDetail] Response received:`, response.data);

      if (response.data && response.data.success) {
        setAlert(response.data.data);
        console.log(`[useAlertDetail] Alert data loaded successfully:`, response.data.data);
      } else {
        const errorMsg = response.data?.message || "No se pudo obtener la información de la alerta";
        console.error(`[useAlertDetail] API returned success=false:`, errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("[useAlertDetail] Error fetching alert detail:", error);
      console.error("[useAlertDetail] Error details:", {
        alertId,
        message: error.message,
        response: error.response?.data
      });
      setAlert(null); // Clear alert on error
      if (toast) {
        toast({
          title: "Error",
          description: error.message || "Error al cargar los detalles de la alerta",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [alertId, toast]);

  /**
   * Updates local alert state (useful after actions like acknowledge, resolve)
   * @param {Object} updates - Partial alert object with updates
   */
  const updateAlertState = useCallback((updates) => {
    setAlert(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Fetch alert details when alertId changes
  useEffect(() => {
    // Reset alert state immediately when alertId changes
    setAlert(null);

    if (alertId) {
      fetchAlertDetail();
    } else {
      setLoading(false);
    }
  }, [alertId, fetchAlertDetail]);

  return {
    alert,
    loading,
    fetchAlertDetail,
    updateAlertState
  };
};
