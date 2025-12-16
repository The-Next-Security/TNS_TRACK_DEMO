/**
 * @fileoverview useAlertList Hook
 * @description Custom hook for fetching and managing alert list data
 * @version 1.0.0
 * @module alerts/hooks/useAlertList
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS, DEFAULT_VALUES } from "../constants/alertConstants";
import { getDateRangeParams, calculateAlertStats, getUniqueSensors } from "../utils/alertUtils";

/**
 * Custom hook for fetching and managing alert list
 * @param {string} dateRangeFilter - Date range filter value
 * @param {string} statusFilter - Status filter value
 * @param {string} typeFilter - Type filter value
 * @returns {Object} Alert list data and operations
 */
export const useAlertList = (dateRangeFilter, statusFilter, typeFilter) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    avgResponseTime: 0
  });
  const [uniqueSensors, setUniqueSensors] = useState([]);

  /**
   * Fetches alerts from the backend
   */
  const fetchAlerts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRangeParams(dateRangeFilter);

      const params = {
        startDate,
        endDate,
        limit: DEFAULT_VALUES.alertFetchLimit
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (typeFilter !== 'all') {
        params.alertType = typeFilter;
      }

      console.log('[useAlertList] Fetching alerts with params:', params);

      const response = await axios.get(API_ENDPOINTS.listAlerts, { params });

      if (response.data && response.data.success) {
        const alertsData = response.data.data || [];
        console.log(`[useAlertList] Loaded ${alertsData.length} alerts`);
        setAlerts(alertsData);

        // Calculate statistics
        const calculatedStats = calculateAlertStats(alertsData);
        setStats(calculatedStats);

        // Extract unique sensors
        const sensors = getUniqueSensors(alertsData);
        setUniqueSensors(sensors);
      } else {
        throw new Error(response.data?.message || 'Error al cargar alertas');
      }
    } catch (err) {
      console.error('[useAlertList] Error fetching alerts:', err);
      setError(err.message || 'Error al cargar el historial de alertas');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRangeFilter, statusFilter, typeFilter]);

  /**
   * Handles manual refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAlerts(false);
  }, [fetchAlerts]);

  /**
   * Fetch alerts when filters change
   */
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    isRefreshing,
    stats,
    uniqueSensors,
    fetchAlerts,
    handleRefresh
  };
};
